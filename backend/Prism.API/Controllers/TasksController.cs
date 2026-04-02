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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetAllTasks()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Tasks.Where(t => !t.IsDeleted);

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                query = query.Where(t => t.AssigneeId == userId);
            }

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status.ToString(),
                    DueDate = t.DueDate,
                    AssigneeId = t.AssigneeId,
                    ListId = t.ListId
                })
                .ToListAsync();

            return Ok(tasks);
        }

        [HttpGet("list/{listId}")]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasksByList(Guid listId)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.Tasks.Where(t => t.ListId == listId && !t.IsDeleted);

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                query = query.Where(t => t.AssigneeId == userId);
            }

            var tasks = await query
                .Select(t => new TaskDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status.ToString(),
                    DueDate = t.DueDate,
                    AssigneeId = t.AssigneeId,
                    ListId = t.ListId
                })
                .ToListAsync();

            return Ok(tasks);
        }

        // POST create task
        [HttpPost]
        public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskDto dto)
        {
            var task = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(),
                ListId = dto.ListId,
                Title = dto.Title,
                Description = dto.Description,
                AssigneeId = dto.AssigneeId,
                Status = Enum.TryParse<Prism.Domain.Entities.TaskStatus>(dto.Status, true, out var st) ? st : Prism.Domain.Entities.TaskStatus.ToDo,
                DueDate = dto.DueDate,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAllTasks), new { id = task.Id }, new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status.ToString(),
                DueDate = task.DueDate,
                AssigneeId = task.AssigneeId,
                ListId = task.ListId
            });
        }

        // PATCH update task status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(Guid id, [FromBody] string status)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return NotFound();

            if (Enum.TryParse<Prism.Domain.Entities.TaskStatus>(status, true, out var newStatus))
            {
                task.Status = newStatus;
                task.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return NoContent();
            }

            return BadRequest("Invalid status");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(Guid id, CreateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.AssigneeId = dto.AssigneeId;
            if (Enum.TryParse<Prism.Domain.Entities.TaskStatus>(dto.Status, true, out var st))
            {
                task.Status = st;
            }
            task.DueDate = dto.DueDate;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(Guid id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            task.IsDeleted = true;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}
