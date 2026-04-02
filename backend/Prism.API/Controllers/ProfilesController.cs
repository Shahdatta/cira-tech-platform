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
                    HourlyRate = p.HourlyRate,
                    ContractType = p.ContractType.ToString().ToLower(),
                    IsActive = p.IsActive,
                    Role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
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
                HourlyRate = p.HourlyRate,
                ContractType = p.ContractType.ToString().ToLower(),
                IsActive = p.IsActive,
                Role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
                CreatedAt = p.CreatedAt
            });
        }

        [HttpPost]
        public async Task<ActionResult<ProfileDto>> CreateProfile(CreateProfileDto dto)
        {
            var profile = new Profile
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId ?? Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                HourlyRate = dto.HourlyRate,
                ContractType = Enum.TryParse<ContractType>(dto.ContractType, true, out var ct) ? ct : ContractType.FT,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Profiles.Add(profile);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProfile), new { id = profile.Id }, new ProfileDto
            {
                Id = profile.Id,
                UserId = profile.UserId,
                FullName = profile.FullName,
                Email = profile.Email,
                HourlyRate = profile.HourlyRate,
                ContractType = profile.ContractType.ToString().ToLower(),
                IsActive = profile.IsActive,
                CreatedAt = profile.CreatedAt
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(Guid id, CreateProfileDto dto)
        {
            var profile = await _context.Profiles.FindAsync(id);
            if (profile == null || profile.IsDeleted) return NotFound();

            profile.FullName = dto.FullName;
            profile.Email = dto.Email;
            profile.HourlyRate = dto.HourlyRate;
            if (Enum.TryParse<ContractType>(dto.ContractType, true, out var ct))
            {
                profile.ContractType = ct;
            }
            profile.IsActive = dto.IsActive;
            profile.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
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
