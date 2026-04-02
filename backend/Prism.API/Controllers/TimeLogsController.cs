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
    public class TimeLogsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TimeLogsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TimeLogDto>>> GetTimeLogs()
        {
            var logs = await _context.TimeLogs
                .Where(t => !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAt)
                .Take(50)
                .Select(t => new TimeLogDto
                {
                    Id = t.Id,
                    TaskId = t.TaskId,
                    UserId = t.UserId,
                    StartTime = t.StartTime,
                    EndTime = t.EndTime,
                    DurationHours = t.DurationHours,
                    IsBillable = t.IsBillable,
                    IsManualEntry = t.IsManualEntry,
                    ReasonManual = t.ReasonManual,
                    Status = t.Status.ToString(),
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            return Ok(logs);
        }

        [HttpPost]
        public async Task<ActionResult<TimeLogDto>> CreateTimeLog(CreateTimeLogDto dto)
        {
            var log = new TimeLog
            {
                Id = Guid.NewGuid(),
                TaskId = dto.TaskId,
                UserId = dto.UserId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                DurationHours = dto.DurationHours,
                IsBillable = dto.IsBillable,
                IsManualEntry = dto.IsManualEntry,
                ReasonManual = dto.ReasonManual,
                Status = TimeLogStatus.Unbilled,
                CreatedAt = DateTime.UtcNow
            };

            _context.TimeLogs.Add(log);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTimeLogs), new { id = log.Id }, new TimeLogDto
            {
                Id = log.Id,
                TaskId = log.TaskId,
                UserId = log.UserId,
                StartTime = log.StartTime,
                EndTime = log.EndTime,
                DurationHours = log.DurationHours,
                IsBillable = log.IsBillable,
                IsManualEntry = log.IsManualEntry,
                ReasonManual = log.ReasonManual,
                Status = log.Status.ToString(),
                CreatedAt = log.CreatedAt
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTimeLog(Guid id, CreateTimeLogDto dto)
        {
            var log = await _context.TimeLogs.FindAsync(id);
            if (log == null || log.IsDeleted) return NotFound();

            log.DurationHours = dto.DurationHours;
            log.IsBillable = dto.IsBillable;
            log.ReasonManual = dto.ReasonManual;
            log.TaskId = dto.TaskId;
            
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTimeLog(Guid id)
        {
            var log = await _context.TimeLogs.FindAsync(id);
            if (log == null || log.IsDeleted) return NotFound();

            log.IsDeleted = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
