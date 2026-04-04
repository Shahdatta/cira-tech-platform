using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.API.Services;
using Prism.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly RateLimitService _rateLimiter;

        public AuthController(ApplicationDbContext context, IConfiguration config, RateLimitService rateLimiter)
        {
            _context = context;
            _config = config;
            _rateLimiter = rateLimiter;
        }

        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
        {
            // Rate limiting by IP
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (!_rateLimiter.IsAllowed($"login:{clientIp}"))
                return StatusCode(429, new { message = "Too many login attempts. Please try again later." });

            var user = await _context.Profiles
                .Include(p => p.Roles)
                .FirstOrDefaultAsync(x => x.Email == loginDto.Email);

            if (user == null)
                return Unauthorized(new { message = "Invalid email or password" });

            if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid email or password" });

            var role = user.Roles.FirstOrDefault()?.Role.ToString() ?? "Member";
            var token = CreateToken(user, role);

            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Token = token,
                Role = role
            };
        }

        // POST /api/auth/register — self-service registration (creates Member role)
        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register(RegisterDto dto)
        {
            dto.Email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new { message = "Full name, email, and password are required." });

            var existing = await _context.Profiles.AnyAsync(p => p.Email == dto.Email);
            if (existing)
                return Conflict(new { message = "A user with this email already exists." });

            var id = Guid.NewGuid();
            var profile = new Profile
            {
                Id = id,
                UserId = id,
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                ContractType = ContractType.FT,
                IsActive = true
            };
            await _context.Profiles.AddAsync(profile);
            await _context.UserRoles.AddAsync(new UserRole { Id = Guid.NewGuid(), UserId = id, Role = AppRole.Member });
            await _context.SaveChangesAsync();

            var token = CreateToken(profile, "Member");
            return StatusCode(201, new UserDto { Id = id, Email = profile.Email, FullName = profile.FullName, Token = token, Role = "Member" });
        }

        // GET /api/auth/me — get own profile
        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<object>> GetMe()
        {
            var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idStr, out var userId)) return Unauthorized();

            var p = await _context.Profiles.Include(x => x.Roles)
                .FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
            if (p == null) return NotFound();

            return Ok(new
            {
                id = p.Id,
                user_id = p.UserId,
                full_name = p.FullName,
                email = p.Email,
                phone = p.Phone,
                hourly_rate = p.HourlyRate,
                base_salary = p.BaseSalary,
                hours_per_week = p.HoursPerWeek,
                contract_type = p.ContractType.ToString().ToLower(),
                is_active = p.IsActive,
                role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
                bank_name = p.BankName,
                account_number = p.AccountNumber,
                iban = p.Iban,
                payment_method = p.PaymentMethod.ToString(),
                created_at = p.CreatedAt
            });
        }

        // PUT /api/auth/me — update own display name and phone
        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe(UpdateProfileDto dto)
        {
            var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idStr, out var userId)) return Unauthorized();

            var p = await _context.Profiles.FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
            if (p == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.FullName)) p.FullName = dto.FullName.Trim();
            if (dto.Phone != null) p.Phone = dto.Phone.Trim();
            if (dto.BankName != null) p.BankName = dto.BankName.Trim();
            if (dto.AccountNumber != null) p.AccountNumber = dto.AccountNumber.Trim();
            if (dto.Iban != null) p.Iban = dto.Iban.Trim();
            if (dto.PaymentMethod != null && Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var pm))
                p.PaymentMethod = pm;
            p.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated" });
        }

        // POST /api/auth/change-password
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
        {
            var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(idStr, out var userId)) return Unauthorized();

            var p = await _context.Profiles.FirstOrDefaultAsync(x => x.Id == userId && !x.IsDeleted);
            if (p == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, p.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect" });

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest(new { message = "New password must be at least 6 characters" });

            p.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            p.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        // GET /api/auth/roles — list all user roles
        [Authorize(Policy = "AdminOnly")]
        [HttpGet("roles")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllRoles()
        {
            var roles = await _context.UserRoles
                .Select(r => new
                {
                    r.Id,
                    r.UserId,
                    Role = r.Role.ToString()
                })
                .ToListAsync();

            return Ok(roles);
        }

        // PUT /api/auth/role — admin changes a user's role
        [Authorize(Policy = "AdminOnly")]
        [HttpPut("role")]
        public async Task<IActionResult> ChangeRole(ChangeRoleDto dto)
        {
            // Validate the role string
            if (!Enum.TryParse<AppRole>(dto.Role, true, out var newRole))
                return BadRequest(new { message = $"Invalid role '{dto.Role}'. Valid roles: Admin, PM, HR, Member, Guest" });

            // Find the user's existing role record
            var userRole = await _context.UserRoles
                .FirstOrDefaultAsync(r => r.UserId == dto.UserId);

            if (userRole == null)
            {
                // If no role exists, create one
                userRole = new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = dto.UserId,
                    Role = newRole
                };
                await _context.UserRoles.AddAsync(userRole);
            }
            else
            {
                userRole.Role = newRole;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Role updated successfully", userId = dto.UserId, role = newRole.ToString() });
        }

        private string CreateToken(Profile user, string role)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.NameId, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, role)
            };

            var jwtSettings = _config.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.Now.AddDays(7),
                SigningCredentials = creds,
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"]
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}
