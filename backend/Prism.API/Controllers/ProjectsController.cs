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

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                query = query.Where(s => s.ManagerId == userId || 
                    s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted))));
            }

            var spaces = await query
                .Select(s => new ProjectSpaceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    TotalBudget = s.TotalBudget,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt
                })
                .ToListAsync();

            return Ok(spaces);
        }

        [HttpPost]
        public async Task<ActionResult<ProjectSpaceDto>> CreateProjectSpace(ProjectSpaceDto spaceDto)
        {
            var space = new ProjectSpace
            {
                Id = Guid.NewGuid(),
                Name = spaceDto.Name,
                Description = spaceDto.Description,
                TotalBudget = spaceDto.TotalBudget,
                Status = spaceDto.Status,
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
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Channels.Add(channel);
            
            await _context.SaveChangesAsync();
            spaceDto.Id = space.Id;
            return CreatedAtAction(nameof(GetProjectSpaces), new { id = space.Id }, spaceDto);
        }

        [HttpPut("{id}")]
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
        public async Task<IActionResult> DeleteProjectSpace(Guid id)
        {
            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            space.IsDeleted = true;
            space.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
