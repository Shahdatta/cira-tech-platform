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
    // [Authorize] // Disabled for testing
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
            var lists = await _context.Lists
                .Select(l => new ListDto
                {
                    Id = l.Id,
                    FolderId = l.FolderId,
                    Name = l.Name,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return Ok(lists);
        }

        [HttpPost]
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
