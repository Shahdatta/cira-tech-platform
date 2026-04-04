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
    public class FoldersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public FoldersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FolderDto>>> GetAllFolders()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            IQueryable<Folder> query = _context.Folders;

            if (roleString == "Admin")
            {
                // Admin sees all
            }
            else if (roleString == "PM" && userId != Guid.Empty)
            {
                var pmSpaceIds = await _context.ProjectSpaces
                    .Where(s => !s.IsDeleted && s.ManagerId == userId)
                    .Select(s => s.Id).ToListAsync();
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId).ToListAsync();
                var allSpaceIds = pmSpaceIds.Union(memberSpaceIds).ToList();
                query = query.Where(f => allSpaceIds.Contains(f.SpaceId));
            }
            else if (userId != Guid.Empty)
            {
                // Member sees folders of projects they are a member or assignee of
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId).ToListAsync();
                var taskSpaceIds = await (
                    from ta in _context.TaskAssignees
                    join t in _context.Tasks on ta.TaskId equals t.Id
                    join l in _context.Lists on t.ListId equals l.Id
                    join f2 in _context.Folders on l.FolderId equals f2.Id
                    where ta.AssigneeId == userId && !t.IsDeleted
                    select f2.SpaceId
                ).ToListAsync();
                var allSpaceIds = memberSpaceIds.Union(taskSpaceIds).Distinct().ToList();
                query = query.Where(f => allSpaceIds.Contains(f.SpaceId));
            }

            var folders = await query
                .Select(f => new FolderDto
                {
                    Id = f.Id,
                    SpaceId = f.SpaceId,
                    Name = f.Name,
                    CreatedAt = f.CreatedAt
                })
                .ToListAsync();

            return Ok(folders);
        }

        [HttpPost]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<ActionResult<FolderDto>> CreateFolder(CreateFolderDto dto)
        {
            var folder = new Folder
            {
                Id = Guid.NewGuid(),
                SpaceId = dto.SpaceId,
                Name = dto.Name,
                CreatedAt = DateTime.UtcNow
            };

            _context.Folders.Add(folder);
            await _context.SaveChangesAsync();

            return Created($"/api/folders/{folder.Id}", new FolderDto
            {
                Id = folder.Id,
                SpaceId = folder.SpaceId,
                Name = folder.Name,
                CreatedAt = folder.CreatedAt
            });
        }
    }
}
