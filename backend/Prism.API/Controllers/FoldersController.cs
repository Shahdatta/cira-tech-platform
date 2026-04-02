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
            var folders = await _context.Folders
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
