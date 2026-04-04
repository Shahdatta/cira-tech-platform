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
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TasksController(ApplicationDbContext context)
        {
            _context = context;
        }

        // InMemory-safe: fetch assignee rows then group in C#
        private async Task<Dictionary<Guid, List<Guid>>> GetAssigneeMapAsync(List<Guid> taskIds)
        {
            var rows = await _context.TaskAssignees
                .Where(ta => taskIds.Contains(ta.TaskId))
                .ToListAsync();
            return rows
                .GroupBy(ta => ta.TaskId)
                .ToDictionary(g => g.Key, g => g.Select(ta => ta.AssigneeId).ToList());
        }

        private static List<TaskDto> BuildDtos(
            IEnumerable<Prism.Domain.Entities.Task> rawTasks,
            Dictionary<Guid, List<Guid>> assigneeMap)
        {
            return rawTasks.Select(t =>
            {
                var ids = assigneeMap.TryGetValue(t.Id, out var list)
                    ? list
                    : (t.AssigneeId.HasValue ? new List<Guid> { t.AssigneeId.Value } : new List<Guid>());
                return new TaskDto
                {
                    Id = t.Id, Title = t.Title, Description = t.Description,
                    Status = t.Status.ToString(), Priority = t.Priority.ToString(),
                    EstimatedHours = t.EstimatedHours, ReviewerId = t.ReviewerId,
                    ReviewedAt = t.ReviewedAt, DueDate = t.DueDate,
                    AssigneeId = ids.Count > 0 ? ids[0] : t.AssigneeId,
                    AssigneeIds = ids, ListId = t.ListId
                };
            }).ToList();
        }

        // Creates notification rows for each userId (skips empty GUIDs)
        private async System.Threading.Tasks.Task NotifyUsersAsync(
            IEnumerable<Guid> userIds, string title, string message, string type, Guid? relatedTaskId = null)
        {
            var notifs = userIds.Distinct().Where(id => id != Guid.Empty).Select(uid =>
                new Prism.Domain.Entities.Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = uid,
                    Title = title,
                    Message = message,
                    Type = type,
                    IsRead = false,
                    RelatedTaskId = relatedTaskId,
                    CreatedAt = DateTime.UtcNow
                }).ToList();
            if (notifs.Count > 0)
            {
                _context.Notifications.AddRange(notifs);
                await _context.SaveChangesAsync();
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetAllTasks()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Tasks.Where(t => !t.IsDeleted);

            if (roleString == "Admin")
            {
                // Admin sees everything
            }
            else if (roleString == "PM" && userId != Guid.Empty)
            {
                // PM sees only tasks inside projects they manage or are a member of
                var pmSpaceIds = await _context.ProjectSpaces
                    .Where(s => !s.IsDeleted && s.ManagerId == userId)
                    .Select(s => s.Id).ToListAsync();
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId).ToListAsync();
                var allSpaceIds = pmSpaceIds.Union(memberSpaceIds).ToList();

                var listIds = await _context.Lists
                    .Where(l => _context.Folders.Any(f => f.Id == l.FolderId && allSpaceIds.Contains(f.SpaceId)))
                    .Select(l => l.Id).ToListAsync();

                query = query.Where(t => listIds.Contains(t.ListId));
            }
            else if (userId != Guid.Empty)
            {
                // Member sees only tasks assigned to them
                var assignedIds = await _context.TaskAssignees
                    .Where(ta => ta.AssigneeId == userId)
                    .Select(ta => ta.TaskId).ToListAsync();
                query = query.Where(t => assignedIds.Contains(t.Id) || t.AssigneeId == userId);
            }

            var raw = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            var map = await GetAssigneeMapAsync(raw.Select(t => t.Id).ToList());
            return Ok(BuildDtos(raw, map));
        }

        [HttpGet("list/{listId}")]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasksByList(Guid listId)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Tasks.Where(t => t.ListId == listId && !t.IsDeleted);

            if (roleString == "Admin")
            {
                // Admin sees all
            }
            else if (roleString == "PM" && userId != Guid.Empty)
            {
                // Verify PM has access to the folder/space this list belongs to
                var pmSpaceIds = await _context.ProjectSpaces
                    .Where(s => !s.IsDeleted && s.ManagerId == userId)
                    .Select(s => s.Id).ToListAsync();
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId).ToListAsync();
                var allSpaceIds = pmSpaceIds.Union(memberSpaceIds).ToList();

                var hasAccess = await _context.Lists
                    .Where(l => l.Id == listId)
                    .AnyAsync(l => _context.Folders.Any(f => f.Id == l.FolderId && allSpaceIds.Contains(f.SpaceId)));
                if (!hasAccess) return Forbid();
            }
            else if (userId != Guid.Empty)
            {
                var assignedIds = await _context.TaskAssignees
                    .Where(ta => ta.AssigneeId == userId)
                    .Select(ta => ta.TaskId).ToListAsync();
                query = query.Where(t => assignedIds.Contains(t.Id) || t.AssigneeId == userId);
            }

            var raw = await query.ToListAsync();
            var map = await GetAssigneeMapAsync(raw.Select(t => t.Id).ToList());
            return Ok(BuildDtos(raw, map));
        }

        [HttpPost]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskDto dto)
        {
            var effectiveIds = dto.AssigneeIds?.Count > 0
                ? dto.AssigneeIds
                : (dto.AssigneeId.HasValue ? new List<Guid> { dto.AssigneeId.Value } : new List<Guid>());

            var task = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = dto.ListId, Title = dto.Title,
                Description = dto.Description,
                AssigneeId = effectiveIds.Count > 0 ? effectiveIds[0] : null,
                Status = Enum.TryParse<Prism.Domain.Entities.TaskStatus>(dto.Status, true, out var st)
                    ? st : Prism.Domain.Entities.TaskStatus.ToDo,
                Priority = Enum.TryParse<Prism.Domain.Entities.TaskPriority>(dto.Priority, true, out var pr)
                    ? pr : Prism.Domain.Entities.TaskPriority.Medium,
                EstimatedHours = dto.EstimatedHours,
                DueDate = dto.DueDate, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            if (effectiveIds.Count > 0)
            {
                _context.TaskAssignees.AddRange(effectiveIds.Select(id =>
                    new TaskAssignee { Id = Guid.NewGuid(), TaskId = task.Id, AssigneeId = id }));
                await _context.SaveChangesAsync();
                await NotifyUsersAsync(effectiveIds,
                    "New Task Assigned",
                    $"You have been assigned to '{task.Title}'",
                    "TaskAssigned", task.Id);
            }

            return CreatedAtAction(nameof(GetAllTasks), new { id = task.Id }, new TaskDto
            {
                Id = task.Id, Title = task.Title, Description = task.Description,
                Status = task.Status.ToString(), Priority = task.Priority.ToString(),
                EstimatedHours = task.EstimatedHours, DueDate = task.DueDate,
                AssigneeId = task.AssigneeId, AssigneeIds = effectiveIds, ListId = task.ListId
            });
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(Guid id, [FromBody] UpdateTaskStatusDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return NotFound();

            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var isAssignee = userId != Guid.Empty && (task.AssigneeId == userId ||
                await _context.TaskAssignees.AnyAsync(ta => ta.TaskId == id && ta.AssigneeId == userId));

            if (roleString != "Admin" && roleString != "PM" && !isAssignee)
                return Forbid();

            if (Enum.TryParse<Prism.Domain.Entities.TaskStatus>(dto.Status, true, out var newStatus))
            {
                task.Status = newStatus;
                task.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                if (newStatus == Prism.Domain.Entities.TaskStatus.Done)
                {
                    var doneAssignees = await _context.TaskAssignees
                        .Where(ta => ta.TaskId == id)
                        .Select(ta => ta.AssigneeId).ToListAsync();
                    if (task.AssigneeId.HasValue && !doneAssignees.Contains(task.AssigneeId.Value))
                        doneAssignees.Add(task.AssigneeId.Value);
                    if (doneAssignees.Count > 0)
                        await NotifyUsersAsync(doneAssignees,
                            "Task Completed",
                            $"The task '{task.Title}' has been marked as Done.",
                            "TaskCompleted", id);
                }
                return NoContent();
            }
            return BadRequest("Invalid status");
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> UpdateTask(Guid id, CreateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            var effectiveIds = dto.AssigneeIds?.Count > 0
                ? dto.AssigneeIds
                : (dto.AssigneeId.HasValue ? new List<Guid> { dto.AssigneeId.Value } : new List<Guid>());

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.AssigneeId = effectiveIds.Count > 0 ? effectiveIds[0] : null;
            // Only update status when explicitly provided (not the CreateTaskDto default "todo")
            if (!string.IsNullOrWhiteSpace(dto.Status) &&
                !dto.Status.Equals("todo", StringComparison.OrdinalIgnoreCase) &&
                Enum.TryParse<Prism.Domain.Entities.TaskStatus>(dto.Status, true, out var st))
                task.Status = st;
            if (Enum.TryParse<Prism.Domain.Entities.TaskPriority>(dto.Priority, true, out var pr))
                task.Priority = pr;
            task.EstimatedHours = dto.EstimatedHours;
            task.DueDate = dto.DueDate;
            task.UpdatedAt = DateTime.UtcNow;

            // Replace assignees
            var existing = _context.TaskAssignees.Where(ta => ta.TaskId == id).ToList();
            var existingIds = existing.Select(e => e.AssigneeId).ToList();
            _context.TaskAssignees.RemoveRange(existing);
            if (effectiveIds.Count > 0)
            {
                _context.TaskAssignees.AddRange(effectiveIds.Select(aid =>
                    new TaskAssignee { Id = Guid.NewGuid(), TaskId = id, AssigneeId = aid }));
            }

            await _context.SaveChangesAsync();

            // Notify only newly added assignees
            var newlyAssigned = effectiveIds.Except(existingIds).ToList();
            if (newlyAssigned.Count > 0)
                await NotifyUsersAsync(newlyAssigned,
                    "New Task Assigned",
                    $"You have been assigned to '{task.Title}'",
                    "TaskAssigned", id);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> DeleteTask(Guid id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();
            task.IsDeleted = true;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id}/submit-review")]
        public async Task<IActionResult> SubmitForReview(Guid id, [FromBody] SubmitReviewDto? dto)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            bool isAssignee = await _context.TaskAssignees
                .AnyAsync(ta => ta.TaskId == id && ta.AssigneeId == userId)
                || task.AssigneeId == userId;

            if (roleString != "Admin" && roleString != "PM" && !isAssignee)
                return Forbid();

            if (task.Status != Prism.Domain.Entities.TaskStatus.InProgress)
                return BadRequest(new { message = "Task must be In Progress to submit for review." });

            task.Status = Prism.Domain.Entities.TaskStatus.InReview;
            task.UpdatedAt = DateTime.UtcNow;

            // Auto-stop any running time logs for this task
            var runningLogs = await _context.TimeLogs
                .Where(tl => tl.TaskId == id && tl.EndTime == null && !tl.IsDeleted)
                .ToListAsync();
            var now = DateTime.UtcNow;
            foreach (var tl in runningLogs)
            {
                tl.EndTime = now;
                tl.DurationHours = (decimal)(now - tl.StartTime).TotalHours;
            }

            // Save member report if content provided
            if (!string.IsNullOrWhiteSpace(dto?.Content))
            {
                _context.TaskReports.Add(new TaskReport
                {
                    Id = Guid.NewGuid(),
                    TaskId = id,
                    AuthorId = userId,
                    ReportType = "submit",
                    Content = dto.Content,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            // Notify only the manager of the project this task belongs to (+ any Admin)
            var projectManagerIds = await (
                from t2 in _context.Tasks
                join l in _context.Lists on t2.ListId equals l.Id
                join f in _context.Folders on l.FolderId equals f.Id
                join s in _context.ProjectSpaces on f.SpaceId equals s.Id
                where t2.Id == id && s.ManagerId.HasValue
                select s.ManagerId.Value
            ).Distinct().ToListAsync();

            var adminIds = await _context.UserRoles
                .Where(r => r.Role == AppRole.Admin)
                .Select(r => r.UserId).ToListAsync();

            var notifyIds = projectManagerIds.Union(adminIds).Distinct().ToList();
            if (notifyIds.Count > 0)
                await NotifyUsersAsync(notifyIds,
                    "Review Requested",
                    $"Task '" + task.Title + "' has been submitted for review.",
                    "TaskInReview", id);
            return Ok(new { message = "Task submitted for review." });
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveTask(Guid id, [FromBody] ReviewActionDto? dto)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (roleString != "Admin" && roleString != "PM") return Forbid();

            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var reviewerId);

            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            if (task.Status != Prism.Domain.Entities.TaskStatus.InReview)
                return BadRequest(new { message = "Task must be In Review to approve." });

            task.Status = Prism.Domain.Entities.TaskStatus.Done;
            task.ReviewerId = reviewerId != Guid.Empty ? reviewerId : null;
            task.ReviewedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;

            // Save PM/Admin approval report if content provided
            if (!string.IsNullOrWhiteSpace(dto?.Content))
            {
                _context.TaskReports.Add(new TaskReport
                {
                    Id = Guid.NewGuid(),
                    TaskId = id,
                    AuthorId = reviewerId,
                    ReportType = "approve",
                    Content = dto.Content,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            var approvedAssignees = await _context.TaskAssignees
                .Where(ta => ta.TaskId == id).Select(ta => ta.AssigneeId).ToListAsync();
            if (task.AssigneeId.HasValue && !approvedAssignees.Contains(task.AssigneeId.Value))
                approvedAssignees.Add(task.AssigneeId.Value);
            if (approvedAssignees.Count > 0)
                await NotifyUsersAsync(approvedAssignees,
                    "Task Approved ✓",
                    $"Your task '{task.Title}' has been approved!",
                    "TaskApproved", id);
            return Ok(new { message = "Task approved and marked as Done." });
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectTask(Guid id, [FromBody] ReviewActionDto? dto)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (roleString != "Admin" && roleString != "PM") return Forbid();

            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            if (task.Status != Prism.Domain.Entities.TaskStatus.InReview)
                return BadRequest(new { message = "Task must be In Review to reject." });

            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var reviewerId);

            task.Status = Prism.Domain.Entities.TaskStatus.InProgress;
            task.UpdatedAt = DateTime.UtcNow;

            // Save PM/Admin rejection report (content required for reject)
            var rejectContent = string.IsNullOrWhiteSpace(dto?.Content) ? "Task rejected." : dto.Content;
            _context.TaskReports.Add(new TaskReport
            {
                Id = Guid.NewGuid(),
                TaskId = id,
                AuthorId = reviewerId,
                ReportType = "reject",
                Content = rejectContent,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var rejectedAssignees = await _context.TaskAssignees
                .Where(ta => ta.TaskId == id).Select(ta => ta.AssigneeId).ToListAsync();
            if (task.AssigneeId.HasValue && !rejectedAssignees.Contains(task.AssigneeId.Value))
                rejectedAssignees.Add(task.AssigneeId.Value);
            if (rejectedAssignees.Count > 0)
                await NotifyUsersAsync(rejectedAssignees,
                    "Task Returned for Revision",
                    $"Your task '{task.Title}' was returned for revision.",
                    "TaskRejected", id);
            return Ok(new { message = "Task rejected, moved back to In Progress." });
        }
    }
}
