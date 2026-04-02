using Microsoft.EntityFrameworkCore;
using Prism.Domain.Entities;
using TaskStatus = Prism.Domain.Entities.TaskStatus;

namespace Prism.API.Data
{
    public static class DbSeeder
    {
        public static async System.Threading.Tasks.Task SeedAsync(ApplicationDbContext context)
        {
            if (await context.Profiles.AnyAsync()) return; // Already seeded

            var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("password123");

            // 1. Seed Profiles (Employees)
            var managerId = Guid.NewGuid();
            var devId = Guid.NewGuid();
            var hrId = Guid.NewGuid();
            var pmId = Guid.NewGuid();
            var guestId = Guid.NewGuid();

            var manager = new Profile
            {
                Id = managerId,
                UserId = managerId,
                FullName = "Sarah Jenkins",
                Email = "sarah.jenkins@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 55.00m,
                ContractType = ContractType.FT,
                IsActive = true
            };

            var dev = new Profile
            {
                Id = devId,
                UserId = devId,
                FullName = "Ahmed Nabil",
                Email = "ahmed.nabil@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 45.00m,
                ContractType = ContractType.FT,
                IsActive = true
            };

            var hr = new Profile
            {
                Id = hrId,
                UserId = hrId,
                FullName = "Fatima Omar",
                Email = "fatima.omar@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 35.00m,
                ContractType = ContractType.PT,
                IsActive = true
            };

            var pm = new Profile
            {
                Id = pmId,
                UserId = pmId,
                FullName = "Youssef Khalil",
                Email = "youssef.khalil@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 50.00m,
                ContractType = ContractType.FT,
                IsActive = true
            };

            var guest = new Profile
            {
                Id = guestId,
                UserId = guestId,
                FullName = "Nour Ali",
                Email = "nour.ali@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 0m,
                ContractType = ContractType.PT,
                IsActive = true
            };

            await context.Profiles.AddRangeAsync(manager, dev, hr, pm, guest);

            // 1b. Seed User Roles
            var roles = new[]
            {
                new UserRole { Id = Guid.NewGuid(), UserId = managerId, Role = AppRole.Admin },
                new UserRole { Id = Guid.NewGuid(), UserId = devId, Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = hrId, Role = AppRole.HR },
                new UserRole { Id = Guid.NewGuid(), UserId = pmId, Role = AppRole.PM },
                new UserRole { Id = Guid.NewGuid(), UserId = guestId, Role = AppRole.Guest }
            };
            await context.UserRoles.AddRangeAsync(roles);

            // 2. Seed Project Spaces
            var pSpace1 = new ProjectSpace
            {
                Id = Guid.NewGuid(),
                Name = "E-Commerce Replatforming",
                Description = "Migrating legacy system to modern .NET + Next.js stack",
                Status = "active",
                TotalBudget = 150000m,
                ManagerId = manager.Id
            };

            var pSpace2 = new ProjectSpace
            {
                Id = Guid.NewGuid(),
                Name = "AI Chatbot Integration",
                Description = "LLM integration for customer support",
                Status = "active",
                TotalBudget = 50000m,
                ManagerId = manager.Id
            };

            await context.ProjectSpaces.AddRangeAsync(pSpace1, pSpace2);

            // 3. Seed Folders & Lists for pSpace1
            var folder = new Folder
            {
                Id = Guid.NewGuid(),
                SpaceId = pSpace1.Id,
                Name = "Frontend Phase"
            };
            await context.Folders.AddAsync(folder);

            var sprintList = new List
            {
                Id = Guid.NewGuid(),
                FolderId = folder.Id,
                Name = "Sprint 1"
            };
            await context.Lists.AddAsync(sprintList);

            // 4. Seed Tasks
            var task1 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(),
                ListId = sprintList.Id,
                AssigneeId = dev.Id,
                Title = "Implement Product Grid",
                Description = "Create a responsive product grid using CSS Grid and standard components.",
                Status = TaskStatus.InProgress,
                DueDate = DateTime.UtcNow.AddDays(2)
            };

            var task2 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(),
                ListId = sprintList.Id,
                AssigneeId = dev.Id,
                Title = "Design System Refactor",
                Description = "Align existing components with new figma tokens.",
                Status = TaskStatus.Done,
                DueDate = DateTime.UtcNow.AddDays(-1)
            };

            var task3 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(),
                ListId = sprintList.Id,
                AssigneeId = manager.Id,
                Title = "Review Security Policies",
                Description = "Ensure CORS and Auth match security standards.",
                Status = TaskStatus.ToDo,
                DueDate = DateTime.UtcNow.AddDays(5)
            };

            await context.Tasks.AddRangeAsync(task1, task2, task3);

            // 5. Seed Time Logs
            var tLog1 = new TimeLog
            {
                Id = Guid.NewGuid(),
                TaskId = task2.Id,
                UserId = dev.UserId,
                StartTime = DateTime.UtcNow.AddDays(-2),
                EndTime = DateTime.UtcNow.AddDays(-2).AddHours(4),
                DurationHours = 4,
                IsBillable = true,
                IsManualEntry = true,
                ReasonManual = "Finished design system refactor"
            };

            var tLog2 = new TimeLog
            {
                Id = Guid.NewGuid(),
                TaskId = task1.Id,
                UserId = dev.UserId,
                StartTime = DateTime.UtcNow.AddHours(-3),
                EndTime = DateTime.UtcNow.AddHours(-1),
                DurationHours = 2,
                IsBillable = true,
                IsManualEntry = false
            };

            await context.TimeLogs.AddRangeAsync(tLog1, tLog2);

            // 6. Seed Payroll
            var payroll1 = new Payroll
            {
                Id = Guid.NewGuid(),
                UserId = dev.UserId,
                PeriodStart = DateTime.UtcNow.AddDays(-30),
                PeriodEnd = DateTime.UtcNow.AddDays(-1),
                TotalHours = 120,
                TotalAmount = 120 * dev.HourlyRate,
                Status = PayrollStatus.Draft
            };
            
            var payroll2 = new Payroll
            {
                Id = Guid.NewGuid(),
                UserId = hr.UserId,
                PeriodStart = DateTime.UtcNow.AddDays(-30),
                PeriodEnd = DateTime.UtcNow.AddDays(-1),
                TotalHours = 60,
                TotalAmount = 60 * hr.HourlyRate,
                Status = PayrollStatus.Paid
            };

            await context.Payrolls.AddRangeAsync(payroll1, payroll2);

            await context.SaveChangesAsync();
        }
    }
}
