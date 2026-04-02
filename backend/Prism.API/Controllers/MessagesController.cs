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
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MessageDto>>> GetMessages([FromQuery] Guid channelId)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                bool hasAccess = await _context.Channels
                    .Where(c => c.Id == channelId && c.SpaceId != null)
                    .AnyAsync(c => c.ProjectSpace.ManagerId == userId || 
                                   c.ProjectSpace.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted))));
                
                if (!hasAccess) return Forbid();
            }

            var messages = await _context.Messages
                .Where(m => m.ChannelId == channelId)
                .OrderBy(m => m.CreatedAt)
                .Take(50)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    ChannelId = m.ChannelId,
                    SenderId = m.SenderId,
                    Content = m.Content,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost]
        public async Task<ActionResult<MessageDto>> CreateMessage(CreateMessageDto dto)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                bool hasAccess = await _context.Channels
                    .Where(c => c.Id == dto.ChannelId && c.SpaceId != null)
                    .AnyAsync(c => c.ProjectSpace.ManagerId == userId || 
                                   c.ProjectSpace.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted))));
                
                if (!hasAccess) return Forbid();
            }

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ChannelId = dto.ChannelId,
                SenderId = dto.SenderId,
                Content = dto.Content,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMessages), new { channelId = message.ChannelId }, new MessageDto
            {
                Id = message.Id,
                ChannelId = message.ChannelId,
                SenderId = message.SenderId,
                Content = message.Content,
                CreatedAt = message.CreatedAt
            });
        }
    }
}
