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

        // GET /api/channels
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ChannelDto>>> GetChannels()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Channels.AsQueryable();

            if (roleString != "Admin" && userId != Guid.Empty)
            {
                query = query.Where(c =>
                    // Private channels: only if user is an explicit member
                    (!c.IsPrivate || _context.ChannelMembers.Any(cm => cm.ChannelId == c.Id && cm.UserId == userId)) &&
                    // Project-scoped channels: only if user has access to the project
                    (c.SpaceId == null ||
                     (c.ProjectSpace != null &&
                      (c.ProjectSpace.ManagerId == userId ||
                       _context.ProjectMembers.Any(pm => pm.SpaceId == c.SpaceId && pm.UserId == userId) ||
                       c.ProjectSpace.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => !t.IsDeleted &&
                           (t.AssigneeId == userId ||
                            _context.TaskAssignees.Any(ta => ta.TaskId == t.Id && ta.AssigneeId == userId)))))))));
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

        // POST /api/channels
        [HttpPost]
        [Authorize(Policy = "NotGuest")]
        public async Task<ActionResult<ChannelDto>> CreateChannel(CreateChannelDto dto)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

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

            // Auto-add creator as member for private channels
            if (dto.IsPrivate && userId != Guid.Empty)
            {
                _context.ChannelMembers.Add(new ChannelMember
                {
                    Id = Guid.NewGuid(),
                    ChannelId = channel.Id,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetChannels), new { id = channel.Id }, new ChannelDto
            {
                Id = channel.Id,
                Name = channel.Name,
                IsPrivate = channel.IsPrivate,
                SpaceId = channel.SpaceId,
                CreatedAt = channel.CreatedAt
            });
        }

        // GET /api/channels/{id}/members
        [HttpGet("{id}/members")]
        public async Task<ActionResult<IEnumerable<ChannelMemberDto>>> GetChannelMembers(Guid id)
        {
            var exists = await _context.Channels.AnyAsync(c => c.Id == id);
            if (!exists) return NotFound();

            var members = await _context.ChannelMembers
                .Where(cm => cm.ChannelId == id)
                .Include(cm => cm.User)
                .Select(cm => new ChannelMemberDto
                {
                    UserId = cm.UserId,
                    FullName = cm.User.FullName,
                    JoinedAt = cm.JoinedAt
                })
                .ToListAsync();

            return Ok(members);
        }

        // GET /api/channels/invitations/pending
        [HttpGet("invitations/pending")]
        public async Task<ActionResult<IEnumerable<ChannelInvitationDto>>> GetPendingInvitations()
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var invitations = await _context.ChannelInvitations
                .Where(ci => ci.InviteeId == userId && ci.Status == "Pending")
                .Include(ci => ci.Channel)
                .Include(ci => ci.Inviter)
                .Select(ci => new ChannelInvitationDto
                {
                    Id = ci.Id,
                    ChannelId = ci.ChannelId,
                    ChannelName = ci.Channel.Name,
                    InviterName = ci.Inviter.FullName,
                    Status = ci.Status,
                    CreatedAt = ci.CreatedAt
                })
                .ToListAsync();

            return Ok(invitations);
        }

        // POST /api/channels/{id}/invite
        [HttpPost("{id}/invite")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> InviteToChannel(Guid id, [FromBody] InviteToChannelDto dto)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var inviterId)) return Unauthorized();

            var channel = await _context.Channels.FindAsync(id);
            if (channel == null) return NotFound();
            if (!channel.IsPrivate) return BadRequest(new { message = "Only private channels support invitations." });

            var inviterProfile = await _context.Profiles.FindAsync(inviterId);

            foreach (var inviteeId in dto.UserIds.Distinct())
            {
                if (inviteeId == inviterId) continue;

                // Skip if already a member
                if (await _context.ChannelMembers.AnyAsync(cm => cm.ChannelId == id && cm.UserId == inviteeId))
                    continue;

                // Skip if already has a pending invite
                if (await _context.ChannelInvitations.AnyAsync(ci =>
                    ci.ChannelId == id && ci.InviteeId == inviteeId && ci.Status == "Pending"))
                    continue;

                var invitation = new ChannelInvitation
                {
                    Id = Guid.NewGuid(),
                    ChannelId = id,
                    InviterId = inviterId,
                    InviteeId = inviteeId,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };
                _context.ChannelInvitations.Add(invitation);
                await _context.SaveChangesAsync();

                var notif = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = inviteeId,
                    Title = "Channel Invitation",
                    Message = $"{inviterProfile?.FullName ?? "Someone"} invited you to join #{channel.Name}",
                    Type = "ChannelInvite",
                    IsRead = false,
                    RelatedChannelInvitationId = invitation.Id,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notif);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Invitations sent." });
        }

        // POST /api/channels/invitations/{invId}/accept
        [HttpPost("invitations/{invId}/accept")]
        public async Task<IActionResult> AcceptInvitation(Guid invId)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var invitation = await _context.ChannelInvitations.FindAsync(invId);
            if (invitation == null || invitation.InviteeId != userId) return NotFound();
            if (invitation.Status != "Pending")
                return BadRequest(new { message = "Invitation is no longer pending." });

            invitation.Status = "Accepted";

            if (!await _context.ChannelMembers.AnyAsync(cm =>
                cm.ChannelId == invitation.ChannelId && cm.UserId == userId))
            {
                _context.ChannelMembers.Add(new ChannelMember
                {
                    Id = Guid.NewGuid(),
                    ChannelId = invitation.ChannelId,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { channel_id = invitation.ChannelId });
        }

        // POST /api/channels/invitations/{invId}/decline
        [HttpPost("invitations/{invId}/decline")]
        public async Task<IActionResult> DeclineInvitation(Guid invId)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

            var invitation = await _context.ChannelInvitations.FindAsync(invId);
            if (invitation == null || invitation.InviteeId != userId) return NotFound();
            if (invitation.Status != "Pending")
                return BadRequest(new { message = "Invitation is no longer pending." });

            invitation.Status = "Declined";
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}

