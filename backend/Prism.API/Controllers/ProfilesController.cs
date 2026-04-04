using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.Domain.Entities;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfilesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProfilesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProfileDto>>> GetProfiles()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Profiles
                .Include(p => p.Roles)
                .Where(p => !p.IsDeleted);

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                var mySpaceIds = _context.ProjectSpaces
                    .Where(s => s.ManagerId == userId || 
                                s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted))))
                    .Select(s => s.Id);

                query = query.Where(p => 
                    p.UserId == userId || 
                    _context.ProjectSpaces.Any(s => mySpaceIds.Contains(s.Id) && 
                        (s.ManagerId == p.UserId || 
                         s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == p.UserId && !t.IsDeleted)))))
                );
            }

            var profiles = await query
                .OrderBy(p => p.FullName)
                .Select(p => new ProfileDto
                {
                    Id = p.Id,
                    UserId = p.UserId,
                    FullName = p.FullName,
                    Email = p.Email,
                    Phone = p.Phone,
                    HourlyRate = p.HourlyRate,
                    BaseSalary = p.BaseSalary,
                    HoursPerWeek = p.HoursPerWeek,
                    ContractType = p.ContractType.ToString().ToLower(),
                    IsActive = p.IsActive,
                    Role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
                    BankName = p.BankName,
                    AccountNumber = p.AccountNumber,
                    Iban = p.Iban,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(profiles);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProfileDto>> GetProfile(Guid id)
        {
            var p = await _context.Profiles
                .Include(pr => pr.Roles)
                .FirstOrDefaultAsync(pr => pr.Id == id);
            if (p == null || p.IsDeleted) return NotFound();

            return Ok(new ProfileDto
            {
                Id = p.Id,
                UserId = p.UserId,
                FullName = p.FullName,
                Email = p.Email,
                Phone = p.Phone,
                HourlyRate = p.HourlyRate,
                BaseSalary = p.BaseSalary,
                HoursPerWeek = p.HoursPerWeek,
                ContractType = p.ContractType.ToString().ToLower(),
                IsActive = p.IsActive,
                Role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
                BankName = p.BankName,
                AccountNumber = p.AccountNumber,
                Iban = p.Iban,
                PaymentMethod = p.PaymentMethod.ToString(),
                CreatedAt = p.CreatedAt
            });
        }

        [HttpPost]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<ProfileDto>> CreateProfile(CreateProfileDto dto)
        {
            if (await _context.Profiles.AnyAsync(p => p.Email == dto.Email && !p.IsDeleted))
                return BadRequest("A user with this email already exists.");

            var newId = dto.UserId ?? Guid.NewGuid();
            var profile = new Profile
            {
                Id = newId,
                UserId = newId,
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = !string.IsNullOrEmpty(dto.Password)
                    ? BCrypt.Net.BCrypt.HashPassword(dto.Password)
                    : BCrypt.Net.BCrypt.HashPassword("password123"),
                HourlyRate = dto.HourlyRate,
                ContractType = Enum.TryParse<ContractType>(dto.ContractType, true, out var ct) ? ct : ContractType.FT,
                BaseSalary = dto.BaseSalary,
                HoursPerWeek = dto.HoursPerWeek > 0 ? dto.HoursPerWeek : 40,
                IsActive = dto.IsActive,
                BankName = dto.BankName,
                AccountNumber = dto.AccountNumber,
                Iban = dto.Iban,
                PaymentMethod = Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var payMethod) ? payMethod : PaymentMethod.BankTransfer,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Profiles.Add(profile);

            var appRole = Enum.TryParse<AppRole>(dto.Role, true, out var r) ? r : AppRole.Member;
            _context.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = newId, Role = appRole });

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProfile), new { id = profile.Id }, new ProfileDto
            {
                Id = profile.Id,
                UserId = profile.UserId,
                FullName = profile.FullName,
                Email = profile.Email,
                Phone = profile.Phone,
                HourlyRate = profile.HourlyRate,
                BaseSalary = profile.BaseSalary,
                HoursPerWeek = profile.HoursPerWeek,
                ContractType = profile.ContractType.ToString().ToLower(),
                IsActive = profile.IsActive,
                Role = appRole.ToString(),
                BankName = profile.BankName,
                AccountNumber = profile.AccountNumber,
                Iban = profile.Iban,
                PaymentMethod = profile.PaymentMethod.ToString(),
                CreatedAt = profile.CreatedAt
            });
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<IActionResult> UpdateProfile(Guid id, CreateProfileDto dto)
        {
            var profile = await _context.Profiles.FindAsync(id);
            if (profile == null || profile.IsDeleted) return NotFound();

            profile.FullName = dto.FullName;
            profile.Email = dto.Email;
            profile.Phone = dto.Phone;
            profile.HourlyRate = dto.HourlyRate;
            profile.BaseSalary = dto.BaseSalary;
            profile.HoursPerWeek = dto.HoursPerWeek > 0 ? dto.HoursPerWeek : 40;
            if (Enum.TryParse<ContractType>(dto.ContractType, true, out var ct))
            {
                profile.ContractType = ct;
            }
            profile.IsActive = dto.IsActive;
            if (dto.BankName != null) profile.BankName = dto.BankName;
            if (dto.AccountNumber != null) profile.AccountNumber = dto.AccountNumber;
            if (dto.Iban != null) profile.Iban = dto.Iban;
            if (Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var payMethod))
                profile.PaymentMethod = payMethod;
            profile.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteProfile(Guid id)
        {
            var profile = await _context.Profiles.FindAsync(id);
            if (profile == null || profile.IsDeleted) return NotFound();

            profile.IsDeleted = true;
            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
