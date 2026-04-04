using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.Domain.Entities;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class TaskReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TaskReportsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET /api/reports/task/{taskId}
        [HttpGet("task/{taskId}")]
        public async Task<ActionResult<IEnumerable<TaskReportDto>>> GetTaskReports(Guid taskId)
        {
            var reports = await _context.TaskReports
                .Include(r => r.Author).ThenInclude(a => a!.Roles)
                .Where(r => r.TaskId == taskId)
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reports.Select(ToDto));
        }

        // GET /api/reports/project/{spaceId}
        [HttpGet("project/{spaceId}")]
        public async Task<ActionResult<IEnumerable<TaskReportDto>>> GetProjectReports(Guid spaceId)
        {
            var reports = await _context.TaskReports
                .Include(r => r.Author).ThenInclude(a => a!.Roles)
                .Where(r => r.SpaceId == spaceId)
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reports.Select(ToDto));
        }

        // POST /api/reports
        [HttpPost]
        public async Task<ActionResult<TaskReportDto>> CreateReport(CreateTaskReportDto dto)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            Guid.TryParse(userIdString, out var authorId);

            if (authorId == Guid.Empty) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.Content))
                return BadRequest(new { message = "Report content cannot be empty." });

            // Validate allowed report types per role
            var allowed = roleString switch
            {
                "Admin" => new[] { "submit", "approve", "reject", "project" },
                "PM"    => new[] { "submit", "approve", "reject" },
                _       => new[] { "submit" }
            };
            if (!allowed.Contains(dto.ReportType))
                return Forbid();

            // For task-level reports make sure task exists
            if (dto.TaskId.HasValue)
            {
                var task = await _context.Tasks.FindAsync(dto.TaskId.Value);
                if (task == null || task.IsDeleted) return NotFound(new { message = "Task not found." });

                // Members can only report on their own tasks
                if (roleString != "Admin" && roleString != "PM")
                {
                    bool isAssignee = task.AssigneeId == authorId ||
                        await _context.TaskAssignees.AnyAsync(ta => ta.TaskId == dto.TaskId && ta.AssigneeId == authorId);
                    if (!isAssignee) return Forbid();
                }
            }

            // For project-level reports only Admin
            if (dto.SpaceId.HasValue && !dto.TaskId.HasValue && roleString != "Admin")
                return Forbid();

            var report = new TaskReport
            {
                Id = Guid.NewGuid(),
                TaskId = dto.TaskId,
                SpaceId = dto.SpaceId,
                AuthorId = authorId,
                ReportType = dto.ReportType,
                Content = dto.Content,
                CreatedAt = DateTime.UtcNow
            };

            _context.TaskReports.Add(report);
            await _context.SaveChangesAsync();

            // Reload with author
            var created = await _context.TaskReports
                .Include(r => r.Author).ThenInclude(a => a!.Roles)
                .FirstAsync(r => r.Id == report.Id);

            // CreatedAtAction needs a valid route; use it only when a taskId is present
            if (report.TaskId.HasValue)
                return CreatedAtAction(nameof(GetTaskReports), new { taskId = report.TaskId }, ToDto(created));

            return StatusCode(201, ToDto(created));
        }

        // DELETE /api/reports/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(Guid id)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var report = await _context.TaskReports.FindAsync(id);
            if (report == null) return NotFound();

            // Only author or admin can delete
            if (report.AuthorId != userId && roleString != "Admin")
                return Forbid();

            _context.TaskReports.Remove(report);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static TaskReportDto ToDto(TaskReport r) => new()
        {
            Id = r.Id,
            TaskId = r.TaskId,
            SpaceId = r.SpaceId,
            AuthorId = r.AuthorId,
            AuthorName = r.Author?.FullName ?? "Unknown",
            AuthorRole = r.Author?.Roles?.FirstOrDefault()?.Role.ToString() ?? "Member",
            ReportType = r.ReportType,
            Content = r.Content,
            CreatedAt = r.CreatedAt
        };
    }
}
