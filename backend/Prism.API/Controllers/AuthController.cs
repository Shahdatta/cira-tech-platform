using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Prism.API.Data;
using Prism.API.DTOs;
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

        public AuthController(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
        {
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

        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register(RegisterDto registerDto)
        {
            // Validate
            if (string.IsNullOrWhiteSpace(registerDto.FullName))
                return BadRequest(new { message = "Full name is required" });

            if (string.IsNullOrWhiteSpace(registerDto.Email))
                return BadRequest(new { message = "Email is required" });

            if (string.IsNullOrWhiteSpace(registerDto.Password) || registerDto.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters" });

            // Check if email already exists
            var existingUser = await _context.Profiles
                .FirstOrDefaultAsync(x => x.Email == registerDto.Email);

            if (existingUser != null)
                return Conflict(new { message = "An account with this email already exists" });

            // Create profile
            var userId = Guid.NewGuid();
            var profile = new Profile
            {
                Id = userId,
                UserId = userId,
                FullName = registerDto.FullName,
                Email = registerDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                HourlyRate = 0,
                ContractType = ContractType.FT,
                IsActive = true
            };

            // Assign default Member role
            var userRole = new UserRole
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Role = AppRole.Member
            };

            await _context.Profiles.AddAsync(profile);
            await _context.UserRoles.AddAsync(userRole);
            await _context.SaveChangesAsync();

            var role = userRole.Role.ToString();
            var token = CreateToken(profile, role);

            return new UserDto
            {
                Id = profile.Id,
                Email = profile.Email,
                FullName = profile.FullName,
                Token = token,
                Role = role
            };
        }

        // GET /api/auth/roles — list all user roles
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
