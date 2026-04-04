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
    public class ListsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ListsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ListDto>>> GetAllLists()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            IQueryable<Prism.Domain.Entities.List> query = _context.Lists;

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
                var folderIds = await _context.Folders
                    .Where(f => allSpaceIds.Contains(f.SpaceId))
                    .Select(f => f.Id).ToListAsync();
                query = query.Where(l => folderIds.Contains(l.FolderId));
            }
            else if (userId != Guid.Empty)
            {
                // Member sees lists in folders of their accessible projects
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId).ToListAsync();
                var taskSpaceIds = await (
                    from ta in _context.TaskAssignees
                    join t in _context.Tasks on ta.TaskId equals t.Id
                    join l2 in _context.Lists on t.ListId equals l2.Id
                    join f in _context.Folders on l2.FolderId equals f.Id
                    where ta.AssigneeId == userId && !t.IsDeleted
                    select f.SpaceId
                ).ToListAsync();
                var allSpaceIds = memberSpaceIds.Union(taskSpaceIds).Distinct().ToList();
                var folderIds = await _context.Folders
                    .Where(f => allSpaceIds.Contains(f.SpaceId))
                    .Select(f => f.Id).ToListAsync();
                query = query.Where(l => folderIds.Contains(l.FolderId));
            }

            var lists = await query
                .Include(l => l.Folder)
                .Select(l => new ListDto
                {
                    Id = l.Id,
                    FolderId = l.FolderId,
                    SpaceId = l.Folder.SpaceId,
                    Name = l.Name,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return Ok(lists);
        }

        [HttpPost]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<ActionResult<ListDto>> CreateList(CreateListDto dto)
        {
            var list = new Prism.Domain.Entities.List
            {
                Id = Guid.NewGuid(),
                FolderId = dto.FolderId,
                Name = dto.Name,
                CreatedAt = DateTime.UtcNow
            };

            _context.Lists.Add(list);
            await _context.SaveChangesAsync();

            return Created($"/api/lists/{list.Id}", new ListDto
            {
                Id = list.Id,
                FolderId = list.FolderId,
                Name = list.Name,
                CreatedAt = list.CreatedAt
            });
        }
    }
}
