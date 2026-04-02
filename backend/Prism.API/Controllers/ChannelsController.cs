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
    public class ChannelsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ChannelsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ChannelDto>>> GetChannels()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Channels.AsQueryable();

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                // Members only see channels linked to projects where they are manager or have assigned tasks
                query = query.Where(c => c.SpaceId != null && 
                    (c.ProjectSpace.ManagerId == userId || 
                     c.ProjectSpace.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted)))));
            }

            var channels = await query
                .OrderBy(c => c.CreatedAt)
                .Select(c => new ChannelDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    IsPrivate = c.IsPrivate,
                    SpaceId = c.SpaceId,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            return Ok(channels);
        }

        [HttpPost]
        public async Task<ActionResult<ChannelDto>> CreateChannel(CreateChannelDto dto)
        {
            var channel = new Channel
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                IsPrivate = dto.IsPrivate,
                SpaceId = dto.SpaceId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Channels.Add(channel);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetChannels), new { id = channel.Id }, new ChannelDto
            {
                Id = channel.Id,
                Name = channel.Name,
                IsPrivate = channel.IsPrivate,
                SpaceId = channel.SpaceId,
                CreatedAt = channel.CreatedAt
            });
        }
    }
}
