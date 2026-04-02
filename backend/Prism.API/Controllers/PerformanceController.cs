using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize] // Disabled for testing
    public class PerformanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PerformanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PerformanceDto>>> GetAppraisals()
        {
            var appraisals = await _context.PerformanceAppraisals
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new PerformanceDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    EvaluatorId = a.EvaluatorId,
                    OverallScore = a.OverallScore,
                    AvgTurnaroundTime = a.AvgTurnaroundTime,
                    BugRate = a.BugRate,
                    HrComments = a.HrComments,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return Ok(appraisals);
        }
    }
}
