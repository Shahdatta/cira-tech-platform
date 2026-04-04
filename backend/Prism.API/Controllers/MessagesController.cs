using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.API.Services;
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

            if (roleString != "Admin" && userId != Guid.Empty)
            {
                bool hasAccess = await _context.Channels
                    .Where(c => c.Id == channelId)
                    .AnyAsync(c => c.SpaceId == null ||
                                   (c.ProjectSpace != null &&
                                    (c.ProjectSpace.ManagerId == userId ||
                                     _context.ProjectMembers.Any(pm => pm.SpaceId == c.SpaceId && pm.UserId == userId) ||
                                     c.ProjectSpace.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => !t.IsDeleted &&
                                         (t.AssigneeId == userId ||
                                          _context.TaskAssignees.Any(ta => ta.TaskId == t.Id && ta.AssigneeId == userId))))))));

                if (!hasAccess) return Forbid();
            }

            var rawMessages = await _context.Messages
                .Where(m => m.ChannelId == channelId)
                .OrderBy(m => m.CreatedAt)
                .Take(50)
                .ToListAsync();

            var senderIds = rawMessages.Select(m => m.SenderId).Distinct().ToList();
            var profileMap = await _context.Profiles
                .Where(p => senderIds.Contains(p.UserId) && !p.IsDeleted)
                .ToDictionaryAsync(p => p.UserId, p => p.FullName);

            var messages = rawMessages.Select(m => new MessageDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                SenderId = m.SenderId,
                SenderName = profileMap.TryGetValue(m.SenderId, out var n) ? n : "Unknown",
                Content = m.Content,
                CreatedAt = m.CreatedAt
            }).ToList();

            return Ok(messages);
        }

        [HttpPost]
        public async Task<ActionResult<MessageDto>> CreateMessage(CreateMessageDto dto)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            if (roleString != "Admin" && userId != Guid.Empty)
            {
                bool hasAccess = await _context.Channels
                    .Where(c => c.Id == dto.ChannelId)
                    .AnyAsync(c => c.SpaceId == null ||
                                   (c.ProjectSpace != null &&
                                    (c.ProjectSpace.ManagerId == userId ||
                                     _context.ProjectMembers.Any(pm => pm.SpaceId == c.SpaceId && pm.UserId == userId) ||
                                     c.ProjectSpace.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => !t.IsDeleted &&
                                         (t.AssigneeId == userId ||
                                          _context.TaskAssignees.Any(ta => ta.TaskId == t.Id && ta.AssigneeId == userId))))))));

                if (!hasAccess) return Forbid();
            }

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ChannelId = dto.ChannelId,
                SenderId = userId != Guid.Empty ? userId : dto.SenderId,
                Content = InputSanitizer.SanitizeRichText(dto.Content),
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var senderProfile = await _context.Profiles
                .Where(p => p.UserId == message.SenderId && !p.IsDeleted)
                .FirstOrDefaultAsync();
            var senderName = senderProfile?.FullName ?? "Unknown";

            return CreatedAtAction(nameof(GetMessages), new { channelId = message.ChannelId }, new MessageDto
            {
                Id = message.Id,
                ChannelId = message.ChannelId,
                SenderId = message.SenderId,
                SenderName = senderName,
                Content = message.Content,
                CreatedAt = message.CreatedAt
            });
        }
    }
}
