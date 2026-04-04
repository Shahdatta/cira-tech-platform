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
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProjectsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectSpaceDto>>> GetProjectSpaces()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.ProjectSpaces.Where(s => !s.IsDeleted);

            if (roleString != "Admin" && userId != Guid.Empty)
            {
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId)
                    .ToListAsync();

                query = query.Where(s =>
                    s.ManagerId == userId ||
                    memberSpaceIds.Contains(s.Id) ||
                    s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted))));
            }

            var spaces = await query
                .Select(s => new ProjectSpaceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    TotalBudget = s.TotalBudget,
                    SpentBudget = s.SpentBudget,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    TaskCount = s.Folders
                        .SelectMany(f => f.Lists)
                        .SelectMany(l => l.Tasks)
                        .Count(t => !t.IsDeleted),
                    CompletionPercent = s.Folders
                        .SelectMany(f => f.Lists)
                        .SelectMany(l => l.Tasks)
                        .Count(t => !t.IsDeleted) == 0
                        ? 0
                        : (int)Math.Round(
                            s.Folders
                                .SelectMany(f => f.Lists)
                                .SelectMany(l => l.Tasks)
                                .Count(t => !t.IsDeleted && t.Status == Prism.Domain.Entities.TaskStatus.Done)
                            * 100.0 /
                            s.Folders
                                .SelectMany(f => f.Lists)
                                .SelectMany(l => l.Tasks)
                                .Count(t => !t.IsDeleted))
                })
                .ToListAsync();

            return Ok(spaces);
        }

        [HttpPost]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<ActionResult<ProjectSpaceDto>> CreateProjectSpace(ProjectSpaceDto spaceDto)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var requesterId);

            var space = new ProjectSpace
            {
                Id = Guid.NewGuid(),
                Name = spaceDto.Name,
                Description = spaceDto.Description,
                TotalBudget = spaceDto.TotalBudget,
                Status = spaceDto.Status,
                ManagerId = requesterId != Guid.Empty ? requesterId : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ProjectSpaces.Add(space);
            
            // Auto-create a primary channel for this project
            var channel = new Prism.Domain.Entities.Channel
            {
                Id = Guid.NewGuid(),
                Name = space.Name.ToLower().Replace(" ", "-"),
                SpaceId = space.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.Channels.Add(channel);
            
            await _context.SaveChangesAsync();
            spaceDto.Id = space.Id;
            return CreatedAtAction(nameof(GetProjectSpaces), new { id = space.Id }, spaceDto);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> UpdateProjectSpace(Guid id, ProjectSpaceDto spaceDto)
        {
            if (id != spaceDto.Id) return BadRequest("ID mismatch");

            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            space.Name = spaceDto.Name;
            space.Description = spaceDto.Description;
            space.TotalBudget = spaceDto.TotalBudget;
            space.Status = spaceDto.Status;
            space.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> DeleteProjectSpace(Guid id)
        {
            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            space.IsDeleted = true;
            space.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET /api/projects/{id}/members
        [HttpGet("{id}/members")]
        public async Task<ActionResult<IEnumerable<object>>> GetProjectMembers(Guid id)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var space = await _context.ProjectSpaces
                .Where(s => s.Id == id && !s.IsDeleted)
                .FirstOrDefaultAsync();
            if (space == null) return NotFound();

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                var hasAccess = await _context.ProjectSpaces
                    .Where(s => s.Id == id && !s.IsDeleted)
                    .AnyAsync(s => s.ManagerId == userId ||
                        s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => !t.IsDeleted &&
                            (t.AssigneeId == userId ||
                             _context.TaskAssignees.Any(ta => ta.TaskId == t.Id && ta.AssigneeId == userId)))))
                        || _context.ProjectMembers.Any(pm => pm.SpaceId == id && pm.UserId == userId));
                if (!hasAccess) return Forbid();
            }

            // Collect ids from: manager, explicit project members, task assignees
            var managerIds = space.ManagerId.HasValue
                ? new List<Guid> { space.ManagerId.Value } : new List<Guid>();

            var explicitMemberIds = await _context.ProjectMembers
                .Where(pm => pm.SpaceId == id)
                .Select(pm => pm.UserId)
                .ToListAsync();

            var assigneeIds = await _context.ProjectSpaces
                .Where(s => s.Id == id)
                .SelectMany(s => s.Folders)
                .SelectMany(f => f.Lists)
                .SelectMany(l => l.Tasks)
                .Where(t => !t.IsDeleted && t.AssigneeId.HasValue)
                .Select(t => t.AssigneeId!.Value)
                .Distinct()
                .ToListAsync();

            var multiAssigneeIds = await _context.TaskAssignees
                .Where(ta => _context.ProjectSpaces
                    .Where(s => s.Id == id)
                    .SelectMany(s => s.Folders)
                    .SelectMany(f => f.Lists)
                    .SelectMany(l => l.Tasks)
                    .Any(t => t.Id == ta.TaskId))
                .Select(ta => ta.AssigneeId)
                .Distinct()
                .ToListAsync();

            var allIds = managerIds
                .Concat(explicitMemberIds)
                .Concat(assigneeIds)
                .Concat(multiAssigneeIds)
                .Distinct()
                .ToList();

            var members = await _context.Profiles
                .Include(p => p.Roles)
                .Where(p => allIds.Contains(p.UserId) && !p.IsDeleted)
                .Select(p => new
                {
                    id = p.Id,
                    user_id = p.UserId,
                    full_name = p.FullName,
                    email = p.Email,
                    role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
                    is_manager = p.UserId == space.ManagerId,
                    contract_type = p.ContractType.ToString().ToLower()
                })
                .ToListAsync();

            return Ok(members);
        }

        // POST /api/projects/{id}/members  — body: { user_ids: ["guid1","guid2"] }
        [HttpPost("{id}/members")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> AddProjectMembers(Guid id, [FromBody] AddProjectMembersDto dto)
        {
            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            foreach (var uid in dto.UserIds.Distinct())
            {
                if (!Guid.TryParse(uid, out var userGuid)) continue;
                var already = await _context.ProjectMembers
                    .AnyAsync(pm => pm.SpaceId == id && pm.UserId == userGuid);
                if (already) continue;
                _context.ProjectMembers.Add(new ProjectMember
                {
                    Id = Guid.NewGuid(),
                    SpaceId = id,
                    UserId = userGuid,
                    JoinedAt = DateTime.UtcNow,
                });
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/projects/{id}/members/{userId}
        [HttpDelete("{id}/members/{userId}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> RemoveProjectMember(Guid id, Guid userId)
        {
            var pm = await _context.ProjectMembers
                .FirstOrDefaultAsync(m => m.SpaceId == id && m.UserId == userId);
            if (pm == null) return NotFound();
            _context.ProjectMembers.Remove(pm);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
