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
    public class PayrollsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PayrollsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PayrollDto>>> GetPayrolls()
        {
            var payrolls = await _context.Payrolls
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PayrollDto
                {
                    Id = p.Id,
                    UserId = p.UserId,
                    PeriodStart = p.PeriodStart,
                    PeriodEnd = p.PeriodEnd,
                    BaseSalary = p.BaseSalary,
                    OvertimeHours = p.OvertimeHours,
                    TotalHours = p.TotalHours,
                    TotalAmount = p.TotalAmount,
                    Status = p.Status.ToString(),
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(payrolls);
        }
    }
}
