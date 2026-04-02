using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.Domain.Entities;

namespace Prism.API.Services
{
    public interface IPayrollService
    {
        Task<Payroll> CalculatePayrollAsync(Guid userId, DateTime start, DateTime end);
    }

    public class PayrollService : IPayrollService
    {
        private readonly ApplicationDbContext _context;

        public PayrollService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Payroll> CalculatePayrollAsync(Guid userId, DateTime start, DateTime end)
        {
            var profile = await _context.Profiles
                .Include(p => p.TimeLogs)
                .FirstOrDefaultAsync(p => p.Id == userId);

            if (profile == null) throw new Exception("User not found");

            // Filter time logs within period
            var logs = profile.TimeLogs
                .Where(l => l.StartTime >= start && l.EndTime <= end && l.Status == TimeLogStatus.Unbilled)
                .ToList();

            decimal totalHours = (decimal)logs.Sum(l => l.DurationHours ?? 0);
            decimal totalAmount = 0;
            decimal overtimeHours = 0;

            if (profile.ContractType == ContractType.FT)
            {
                // Full-time Logic: Base + Overtime (e.g. > 160 hrs/month)
                decimal standardHours = 160; 
                totalAmount = 5000; // Mock Base Salary from SRS
                if (totalHours > standardHours)
                {
                    overtimeHours = totalHours - standardHours;
                    totalAmount += overtimeHours * (profile.HourlyRate > 0 ? profile.HourlyRate : 25);
                }
            }
            else
            {
                // Part-time / Freelance Logic: Hourly
                totalAmount = totalHours * profile.HourlyRate;
            }

            return new Payroll
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PeriodStart = start,
                PeriodEnd = end,
                BaseSalary = profile.ContractType == ContractType.FT ? 5000 : 0,
                OvertimeHours = overtimeHours,
                TotalHours = totalHours,
                TotalAmount = totalAmount,
                Status = PayrollStatus.Draft,
                CreatedAt = DateTime.UtcNow
            };
        }
    }
}
