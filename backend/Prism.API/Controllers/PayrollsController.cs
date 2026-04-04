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
    public class PayrollsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PayrollsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── Performance bonus tier ──────────────────────────────────────────────
        // score ≥ 90  → 10 %   |   score ≥ 75 → 5 %   |   below → 0 %
        private static decimal PerfBonusPct(decimal score) =>
            score >= 90m ? 0.10m : score >= 75m ? 0.05m : 0m;

        [HttpGet]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<IEnumerable<PayrollDto>>> GetPayrolls([FromQuery] Guid? userId)
        {
            var query = _context.Payrolls
                .Include(p => p.Profile)
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(p => p.UserId == userId.Value);

            var payrolls = await query
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            // Fetch latest appraisal score per user in one query
            var userIds = payrolls.Select(p => p.UserId).Distinct().ToList();
            var latestScores = await _context.PerformanceAppraisals
                .Where(a => userIds.Contains(a.UserId))
                .GroupBy(a => a.UserId)
                .Select(g => new { UserId = g.Key, Score = g.OrderByDescending(a => a.CreatedAt).First().OverallScore })
                .ToDictionaryAsync(x => x.UserId, x => x.Score);

            var result = payrolls.Select(p =>
            {
                latestScores.TryGetValue(p.UserId, out var score);
                return MapToDto(p, p.Profile, score);
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<PayrollDto>> GetPayroll(Guid id)
        {
            var p = await _context.Payrolls
                .Include(x => x.Profile)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFound();

            var latestAppraisal = await _context.PerformanceAppraisals
                .Where(a => a.UserId == p.UserId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            return Ok(MapToDto(p, p.Profile, latestAppraisal?.OverallScore ?? 0m));
        }

        [HttpGet("summary")]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<PayrollSummaryDto>> GetSummary()
        {
            var payrolls = await _context.Payrolls
                .Include(p => p.Profile)
                .ToListAsync();

            var summary = new PayrollSummaryDto
            {
                FtCount     = payrolls.Count(p => p.Profile?.ContractType == ContractType.FT),
                FtTotal     = payrolls.Where(p => p.Profile?.ContractType == ContractType.FT).Sum(p => p.NetAmount),
                PtCount     = payrolls.Count(p => p.Profile?.ContractType == ContractType.PT),
                PtTotal     = payrolls.Where(p => p.Profile?.ContractType == ContractType.PT).Sum(p => p.NetAmount),
                FlCount     = payrolls.Count(p => p.Profile?.ContractType == ContractType.FL),
                FlTotal     = payrolls.Where(p => p.Profile?.ContractType == ContractType.FL).Sum(p => p.NetAmount),
                GrandTotal  = payrolls.Sum(p => p.NetAmount),
                DraftCount    = payrolls.Count(p => p.Status == PayrollStatus.Draft),
                ApprovedCount = payrolls.Count(p => p.Status == PayrollStatus.Approved),
                PaidCount     = payrolls.Count(p => p.Status == PayrollStatus.Paid),
            };

            return Ok(summary);
        }

        // GET /api/payrolls/preview?userId=...&periodStart=yyyy-MM-dd&periodEnd=yyyy-MM-dd
        // Returns hours actually logged in the period and estimated pay — used to auto-fill the Generate form
        [HttpGet("preview")]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<PayrollPreviewDto>> Preview(
            [FromQuery] Guid userId,
            [FromQuery] DateTime periodStart,
            [FromQuery] DateTime periodEnd)
        {
            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => (p.UserId == userId || p.Id == userId) && !p.IsDeleted);
            if (profile == null) return NotFound("Employee not found.");

            // Inclusive end: count logs whose start time falls within [periodStart, periodEnd + 1 day)
            var endExclusive = periodEnd.Date.AddDays(1);
            var logs = await _context.TimeLogs
                .Where(l => l.UserId == profile.Id
                         && !l.IsDeleted
                         && l.StartTime >= periodStart.Date
                         && l.StartTime < endExclusive)
                .ToListAsync();

            var totalHours = logs.Sum(l => l.DurationHours ?? 0m);

            // FT standard is 160 hrs/month; anything above is overtime
            const decimal standardHours = 160m;
            var overtimeHours = profile.ContractType == ContractType.FT
                ? Math.Max(0m, totalHours - standardHours)
                : 0m;

            var hourlyRate  = profile.HourlyRate > 0 ? profile.HourlyRate : 0m;
            var baseSalary  = profile.ContractType == ContractType.FT
                ? (profile.BaseSalary > 0 ? profile.BaseSalary : 5000m)
                : 0m;

            var estimatedPay = profile.ContractType switch
            {
                ContractType.FT => baseSalary + overtimeHours * hourlyRate * 1.5m,
                ContractType.PT => totalHours * hourlyRate,
                ContractType.FL => totalHours * hourlyRate,
                _               => totalHours * hourlyRate,
            };

            return Ok(new PayrollPreviewDto
            {
                UserId       = profile.Id,
                EmployeeName = profile.FullName,
                ContractType = profile.ContractType.ToString().ToLower(),
                TotalHours   = totalHours,
                OvertimeHours = overtimeHours,
                LogsCount    = logs.Count,
                HourlyRate   = hourlyRate,
                BaseSalary   = baseSalary,
                EstimatedPay = Math.Round(estimatedPay, 2),
            });
        }

        [HttpPost]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<ActionResult<PayrollDto>> CreatePayroll([FromBody] CreatePayrollDto dto)
        {
            var profile = await _context.Profiles
                .FirstOrDefaultAsync(p => p.UserId == dto.UserId && !p.IsDeleted);
            if (profile == null) return NotFound("Employee not found.");

            // Fetch latest performance score for this employee
            var latestAppraisal = await _context.PerformanceAppraisals
                .Where(a => a.UserId == dto.UserId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            var perfScore = latestAppraisal?.OverallScore ?? 0m;
            var perfPct   = PerfBonusPct(perfScore);

            decimal regularPay   = 0m;
            decimal overtimePay  = 0m;
            decimal baseSalaryForPeriod = 0m;

            switch (profile.ContractType)
            {
                case ContractType.FT:
                    // Full-Time: fixed monthly base salary + overtime at 1.5× hourly rate
                    baseSalaryForPeriod = profile.BaseSalary > 0 ? profile.BaseSalary : 5000m;
                    overtimePay  = dto.OvertimeHours * (profile.HourlyRate > 0 ? profile.HourlyRate : 25m) * 1.5m;
                    regularPay   = baseSalaryForPeriod + overtimePay;
                    break;

                case ContractType.PT:
                    // Part-Time: hourly rate × total hours logged
                    regularPay = dto.TotalHours * profile.HourlyRate;
                    break;

                case ContractType.FL:
                    // Freelancer: contracted hourly rate × hours delivered
                    regularPay = dto.TotalHours * profile.HourlyRate;
                    break;
            }

            var performanceBonus = Math.Round(regularPay * perfPct, 2);
            var totalAmount      = regularPay;
            var netAmount        = totalAmount + performanceBonus - dto.Deductions;

            var perfNote = perfScore > 0
                ? $" Perf score {perfScore} → {perfPct * 100:0}% bonus (${performanceBonus})."
                : " No performance appraisal on file.";

            var payroll = new Payroll
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                PeriodStart  = dto.PeriodStart,
                PeriodEnd    = dto.PeriodEnd,
                BaseSalary   = baseSalaryForPeriod > 0 ? baseSalaryForPeriod : regularPay,
                OvertimeHours = dto.OvertimeHours,
                TotalHours   = dto.TotalHours,
                Bonuses      = performanceBonus,
                Deductions   = dto.Deductions,
                TotalAmount  = totalAmount,
                NetAmount    = netAmount,
                Notes        = (dto.Notes ?? string.Empty) + perfNote,
                PaymentMethod = !string.IsNullOrEmpty(dto.PaymentMethod) ? dto.PaymentMethod : profile.PaymentMethod.ToString(),
                Status       = PayrollStatus.Draft,
                CreatedAt    = DateTime.UtcNow
            };

            _context.Payrolls.Add(payroll);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPayroll), new { id = payroll.Id },
                MapToDto(payroll, profile, perfScore));
        }

        [HttpPatch("{id}/status")]
        [Authorize(Policy = "AdminPMorHR")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdatePayrollStatusDto dto)
        {
            var payroll = await _context.Payrolls.FindAsync(id);
            if (payroll == null) return NotFound();

            if (!Enum.TryParse<PayrollStatus>(dto.Status, true, out var status))
                return BadRequest("Invalid status. Use: Draft, Approved, or Paid.");

            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdStr, out var approverId);

            // Payroll can only be set to Paid via invoice payment — block direct change
            if (status == PayrollStatus.Paid)
                return BadRequest("Payroll can only be marked Paid after its invoice is settled.");

            payroll.Status = status;
            if (status == PayrollStatus.Approved)
            {
                payroll.ApprovedBy = approverId != Guid.Empty ? approverId : null;
                payroll.ApprovedAt = DateTime.UtcNow;

                // Auto-create a Payroll-type invoice so finance can record payment
                var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.Id == payroll.UserId);
                var invoiceCount = await _context.Invoices.CountAsync() + 1;
                var invoiceNumber = $"INV-{DateTime.UtcNow.Year}-{invoiceCount:D3}";
                var periodLabel = $"{payroll.PeriodStart:MMM d} – {payroll.PeriodEnd:MMM d, yyyy}";
                var amount = payroll.NetAmount > 0 ? payroll.NetAmount : payroll.TotalAmount;

                var invoice = new Invoice
                {
                    Id            = Guid.NewGuid(),
                    InvoiceNumber = invoiceNumber,
                    UserId        = payroll.UserId,
                    InvoiceType   = InvoiceType.Payroll,
                    PayrollRefId  = payroll.Id,
                    RecipientName = profile?.FullName ?? "Employee",
                    Notes         = $"Salary payment for {periodLabel}",
                    IssueDate     = DateTime.UtcNow,
                    DueDate       = DateTime.UtcNow.AddDays(7),
                    SubTotal      = amount,
                    TaxAmount     = 0m,
                    TotalAmount   = amount,
                    Status        = InvoiceStatus.Sent,
                    CreatedAt     = DateTime.UtcNow,
                    UpdatedAt     = DateTime.UtcNow,
                };
                var lineItem = new InvoiceLineItem
                {
                    Id          = Guid.NewGuid(),
                    InvoiceId   = invoice.Id,
                    Description = $"Salary – {periodLabel} ({profile?.ContractType} / {payroll.TotalHours}h)",
                    Quantity    = 1,
                    Unit        = "mo",
                    UnitPrice   = amount,
                    LineTotal   = amount,
                };
                invoice.LineItems.Add(lineItem);
                _context.Invoices.Add(invoice);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeletePayroll(Guid id)
        {
            var payroll = await _context.Payrolls.FindAsync(id);
            if (payroll == null) return NotFound();
            _context.Payrolls.Remove(payroll);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static PayrollDto MapToDto(Payroll p, Profile? profile, decimal perfScore)
        {
            var contractType = profile?.ContractType ?? ContractType.FT;
            decimal overtimePay = contractType == ContractType.FT
                ? p.OvertimeHours * (profile?.HourlyRate > 0 ? profile!.HourlyRate : 25m) * 1.5m
                : 0m;

            return new PayrollDto
            {
                Id              = p.Id,
                UserId          = p.UserId,
                EmployeeName    = profile?.FullName ?? "Unknown",
                ContractType    = contractType.ToString().ToLower(),
                HourlyRate      = profile?.HourlyRate ?? 0,
                BaseSalary      = p.BaseSalary,
                PeriodStart     = p.PeriodStart,
                PeriodEnd       = p.PeriodEnd,
                TotalHours      = p.TotalHours,
                OvertimeHours   = p.OvertimeHours,
                OvertimePay     = overtimePay,
                Bonuses         = p.Bonuses,
                PerformanceBonus = p.Bonuses,  // Bonuses column stores perf bonus
                Deductions      = p.Deductions,
                ReimbursementAmount = p.ReimbursementAmount,
                ReimbursementNotes = p.ReimbursementNotes,
                TotalAmount     = p.TotalAmount,
                NetAmount       = p.NetAmount,
                PerformanceScore = perfScore,
                Status          = p.Status.ToString(),
                PaymentMethod   = p.PaymentMethod ?? "BankTransfer",
                BankName        = profile?.BankName,
                AccountNumber   = profile?.AccountNumber,
                Iban            = profile?.Iban,
                ApprovedBy      = p.ApprovedBy,
                ApprovedAt      = p.ApprovedAt,
                PaidAt          = p.PaidAt,
                Notes           = p.Notes,
                CreatedAt       = p.CreatedAt
            };
        }

        // GET /api/payrolls/my — employee self-view payroll
        [HttpGet("my")]
        public async Task<ActionResult<MyPayrollSummaryDto>> GetMyPayrolls()
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var payrolls = await _context.Payrolls
                .Include(p => p.Profile)
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var userIds = new List<Guid> { userId };
            var latestScores = await _context.PerformanceAppraisals
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => a.OverallScore)
                .FirstOrDefaultAsync();

            var dtos = payrolls.Select(p => MapToDto(p, p.Profile, latestScores)).ToList();

            return Ok(new MyPayrollSummaryDto
            {
                Payrolls = dtos,
                TotalEarned = payrolls.Sum(p => p.NetAmount),
                PendingAmount = payrolls.Where(p => p.Status == PayrollStatus.Draft).Sum(p => p.NetAmount),
                ApprovedAmount = payrolls.Where(p => p.Status == PayrollStatus.Approved).Sum(p => p.NetAmount),
                PaidAmount = payrolls.Where(p => p.Status == PayrollStatus.Paid).Sum(p => p.NetAmount)
            });
        }
    }
}
