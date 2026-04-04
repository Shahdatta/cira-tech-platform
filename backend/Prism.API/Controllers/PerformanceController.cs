using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.Domain.Entities;
using System.Security.Claims;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PerformanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PerformanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PerformanceDto>>> GetAppraisals([FromQuery] Guid? userId)
        {
            var query = _context.PerformanceAppraisals
                .Include(a => a.Profile)
                .Include(a => a.Evaluator)
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(a => a.UserId == userId.Value);

            var appraisals = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(appraisals.Select(a => new PerformanceDto
            {
                Id = a.Id,
                UserId = a.UserId,
                EmployeeName = a.Profile?.FullName ?? "Unknown",
                EvaluatorId = a.EvaluatorId,
                EvaluatorName = a.Evaluator?.FullName,
                OverallScore = a.OverallScore,
                AvgTurnaroundTime = a.AvgTurnaroundTime,
                BugRate = a.BugRate,
                HrComments = a.HrComments,
                CreatedAt = a.CreatedAt
            }));
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var profiles = await _context.Profiles
                .Where(p => !p.IsDeleted && p.IsActive)
                .ToListAsync();

            var appraisals = await _context.PerformanceAppraisals
                .Include(a => a.Profile)
                .ToListAsync();

            var summary = profiles.Select(p =>
            {
                var emp = appraisals.Where(a => a.UserId == p.UserId).ToList();
                return new
                {
                    UserId = p.UserId,
                    EmployeeName = p.FullName,
                    ContractType = p.ContractType.ToString().ToLower(),
                    AppraisalCount = emp.Count,
                    AvgScore = emp.Any() ? Math.Round(emp.Average(a => (double)a.OverallScore), 1) : 0.0,
                    AvgTurnaround = emp.Any() ? Math.Round(emp.Average(a => (double)a.AvgTurnaroundTime), 1) : 0.0,
                    AvgBugRate = emp.Any() ? Math.Round(emp.Average(a => (double)a.BugRate), 2) : 0.0,
                    LatestReview = emp.Any() ? emp.Max(a => a.CreatedAt) : (DateTime?)null
                };
            }).OrderByDescending(x => x.AvgScore).ToList();

            return Ok(summary);
        }

        [HttpPost]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<PerformanceDto>> CreateAppraisal([FromBody] CreatePerformanceDto dto)
        {
            var evaluatorIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(evaluatorIdStr, out var evaluatorId);

            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.UserId == dto.UserId && !p.IsDeleted);
            if (profile == null) return NotFound("Employee not found.");

            var evaluator = evaluatorId != Guid.Empty
                ? await _context.Profiles.FirstOrDefaultAsync(p => p.UserId == evaluatorId)
                : null;

            var appraisal = new PerformanceAppraisal
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                EvaluatorId = evaluatorId != Guid.Empty ? evaluatorId : null,
                OverallScore = dto.OverallScore,
                AvgTurnaroundTime = dto.AvgTurnaroundTime,
                BugRate = dto.BugRate,
                HrComments = dto.HrComments,
                CreatedAt = DateTime.UtcNow
            };

            _context.PerformanceAppraisals.Add(appraisal);
            await _context.SaveChangesAsync();

            return Ok(new PerformanceDto
            {
                Id = appraisal.Id,
                UserId = appraisal.UserId,
                EmployeeName = profile.FullName,
                EvaluatorId = appraisal.EvaluatorId,
                EvaluatorName = evaluator?.FullName,
                OverallScore = appraisal.OverallScore,
                AvgTurnaroundTime = appraisal.AvgTurnaroundTime,
                BugRate = appraisal.BugRate,
                HrComments = appraisal.HrComments,
                CreatedAt = appraisal.CreatedAt
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteAppraisal(Guid id)
        {
            var appraisal = await _context.PerformanceAppraisals.FindAsync(id);
            if (appraisal == null) return NotFound();
            _context.PerformanceAppraisals.Remove(appraisal);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
