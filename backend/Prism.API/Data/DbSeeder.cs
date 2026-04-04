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

            // 1. Seed Profiles (Employees) — fixed GUIDs so JWTs remain valid across restarts
            var adminId    = new Guid("aaaaaaaa-0000-0000-0000-000000000000");
            var managerId  = new Guid("aaaaaaaa-0001-0001-0001-000000000001");
            var devId      = new Guid("aaaaaaaa-0002-0002-0002-000000000002");
            var hrId       = new Guid("aaaaaaaa-0003-0003-0003-000000000003");
            var pmId       = new Guid("aaaaaaaa-0004-0004-0004-000000000004");
            var guestId    = new Guid("aaaaaaaa-0005-0005-0005-000000000005");
            var freelancId = new Guid("aaaaaaaa-0006-0006-0006-000000000006");

            var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword("password123");

            var admin = new Profile
            {
                Id = adminId,
                UserId = adminId,
                FullName = "CIRA Admin",
                Email = "admin@ciratech.com",
                PasswordHash = adminPasswordHash,
                HourlyRate = 0m,
                ContractType = ContractType.FT,
                IsActive = true
            };

            var manager = new Profile
            {
                Id = managerId,
                UserId = managerId,
                FullName = "Sarah Jenkins",
                Email = "sarah.jenkins@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 55.00m,
                BaseSalary = 9000m,
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
                BaseSalary = 7200m,
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
                BaseSalary = 8000m,
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
                HourlyRate = 20m,
                ContractType = ContractType.PT,
                IsActive = true
            };

            var freelancer = new Profile
            {
                Id = freelancId,
                UserId = freelancId,
                FullName = "Karim Hassan",
                Email = "karim.hassan@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 60m,
                ContractType = ContractType.FL,
                IsActive = true
            };

            await context.Profiles.AddRangeAsync(admin, manager, dev, hr, pm, guest, freelancer);

            // 1b. Seed User Roles
            var roles = new[]
            {
                new UserRole { Id = Guid.NewGuid(), UserId = adminId,    Role = AppRole.Admin },
                new UserRole { Id = Guid.NewGuid(), UserId = managerId,  Role = AppRole.Admin },
                new UserRole { Id = Guid.NewGuid(), UserId = devId,      Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = hrId,       Role = AppRole.HR },
                new UserRole { Id = Guid.NewGuid(), UserId = pmId,       Role = AppRole.PM },
                new UserRole { Id = Guid.NewGuid(), UserId = guestId,    Role = AppRole.Guest },
                new UserRole { Id = Guid.NewGuid(), UserId = freelancId, Role = AppRole.Member }
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

            // 4b. Seed TaskAssignees
            await context.TaskAssignees.AddRangeAsync(
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task1.Id, AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task2.Id, AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task3.Id, AssigneeId = manager.Id }
            );

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

            // 6. Seed Performance Appraisals
            var appraisals = new[]
            {
                // Manager — excellent performer
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = managerId, EvaluatorId = adminId,
                    OverallScore = 92m, AvgTurnaroundTime = 1.2m, BugRate = 0.02m,
                    HrComments = "Outstanding leadership and delivery, consistently exceeds targets.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // Dev — good performer
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = devId, EvaluatorId = managerId,
                    OverallScore = 82m, AvgTurnaroundTime = 1.8m, BugRate = 0.05m,
                    HrComments = "Solid technical output. Could improve code review participation.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // HR — average performer
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = hrId, EvaluatorId = adminId,
                    OverallScore = 74m, AvgTurnaroundTime = 2.5m, BugRate = 0.10m,
                    HrComments = "Meets expectations. Needs to improve response times.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // PM — very good
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = pmId, EvaluatorId = adminId,
                    OverallScore = 88m, AvgTurnaroundTime = 1.5m, BugRate = 0.03m,
                    HrComments = "Excellent project delivery and stakeholder management.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // Part-Timer (guest / Nour)
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = guestId, EvaluatorId = managerId,
                    OverallScore = 78m, AvgTurnaroundTime = 2.0m, BugRate = 0.07m,
                    HrComments = "Good contribution given part-time schedule.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // Freelancer (Karim)
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = freelancId, EvaluatorId = managerId,
                    OverallScore = 91m, AvgTurnaroundTime = 1.1m, BugRate = 0.01m,
                    HrComments = "Exceptional freelance delivery — highly recommended for future contracts.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
            };
            await context.PerformanceAppraisals.AddRangeAsync(appraisals);

            // 7. Seed Payroll — one record per employee covering last month
            var periodStart = DateTime.UtcNow.AddDays(-30);
            var periodEnd   = DateTime.UtcNow.AddDays(-1);

            // FT: Manager — BaseSalary $9,000 + 8 OT hrs × $55 × 1.5 + 10% perf bonus (score≥90)
            var ftOtPayManager = 8m * 55m * 1.5m;            // $660
            var ftBaseManager = 9000m + ftOtPayManager;      // $9,660
            var ftPerfManager = Math.Round(ftBaseManager * 0.10m, 2); // 10% bonus (score 92)
            var ftNetManager  = ftBaseManager + ftPerfManager;

            var payrollManager = new Payroll
            {
                Id = Guid.NewGuid(), UserId = managerId,
                PeriodStart = periodStart, PeriodEnd = periodEnd,
                BaseSalary = 9000m, OvertimeHours = 8m, TotalHours = 168m,
                Bonuses = ftPerfManager, Deductions = 0m,
                TotalAmount = ftBaseManager, NetAmount = ftNetManager,
                Notes = $"FT salary + 8 OT hrs. Performance bonus 10% (score: 92).",
                Status = PayrollStatus.Paid
            };

            // FT: Dev — BaseSalary $7,200 + 5 OT hrs × $45 × 1.5 + 5% perf bonus (score 75–89)
            var ftOtPayDev = 5m * 45m * 1.5m;                // $337.50
            var ftBaseDev  = 7200m + ftOtPayDev;              // $7,537.50
            var ftPerfDev  = Math.Round(ftBaseDev * 0.05m, 2); // 5% bonus (score 82)
            var ftNetDev   = ftBaseDev + ftPerfDev;

            var payrollDev = new Payroll
            {
                Id = Guid.NewGuid(), UserId = devId,
                PeriodStart = periodStart, PeriodEnd = periodEnd,
                BaseSalary = 7200m, OvertimeHours = 5m, TotalHours = 165m,
                Bonuses = ftPerfDev, Deductions = 0m,
                TotalAmount = ftBaseDev, NetAmount = ftNetDev,
                Notes = $"FT salary + 5 OT hrs. Performance bonus 5% (score: 82).",
                Status = PayrollStatus.Approved
            };

            // FT: PM — BaseSalary $8,000 + 0 OT + 5% perf bonus (score 88)
            var ftBasePm = 8000m;
            var ftPerfPm = Math.Round(ftBasePm * 0.05m, 2);
            var ftNetPm  = ftBasePm + ftPerfPm;

            var payrollPm = new Payroll
            {
                Id = Guid.NewGuid(), UserId = pmId,
                PeriodStart = periodStart, PeriodEnd = periodEnd,
                BaseSalary = 8000m, OvertimeHours = 0m, TotalHours = 160m,
                Bonuses = ftPerfPm, Deductions = 0m,
                TotalAmount = ftBasePm, NetAmount = ftNetPm,
                Notes = $"FT salary. Performance bonus 5% (score: 88).",
                Status = PayrollStatus.Draft
            };

            // PT: HR (Fatima) — 60 hrs × $35 = $2,100; no perf bonus (score < 75)
            var ptPayHr = 60m * 35m;   // $2,100

            var payrollHr = new Payroll
            {
                Id = Guid.NewGuid(), UserId = hrId,
                PeriodStart = periodStart, PeriodEnd = periodEnd,
                BaseSalary = 0m, OvertimeHours = 0m, TotalHours = 60m,
                Bonuses = 0m, Deductions = 0m,
                TotalAmount = ptPayHr, NetAmount = ptPayHr,
                Notes = "PT hourly: 60 hrs × $35/hr. No performance bonus (score: 74).",
                Status = PayrollStatus.Paid
            };

            // PT: Nour (guest) — 45 hrs × $20 = $900; 5% perf bonus (score 78)
            var ptPayNour = 45m * 20m;  // $900
            var ptPerfNour = Math.Round(ptPayNour * 0.05m, 2);
            var ptNetNour  = ptPayNour + ptPerfNour;

            var payrollNour = new Payroll
            {
                Id = Guid.NewGuid(), UserId = guestId,
                PeriodStart = periodStart, PeriodEnd = periodEnd,
                BaseSalary = 0m, OvertimeHours = 0m, TotalHours = 45m,
                Bonuses = ptPerfNour, Deductions = 0m,
                TotalAmount = ptPayNour, NetAmount = ptNetNour,
                Notes = "PT hourly: 45 hrs × $20/hr. Performance bonus 5% (score: 78).",
                Status = PayrollStatus.Approved
            };

            // FL: Karim Hassan — 80 hrs × $60 = $4,800 + 10% perf bonus (score 91)
            var flPayKarim  = 80m * 60m;  // $4,800
            var flPerfKarim = Math.Round(flPayKarim * 0.10m, 2);
            var flNetKarim  = flPayKarim + flPerfKarim;

            var payrollFreelancer = new Payroll
            {
                Id = Guid.NewGuid(), UserId = freelancId,
                PeriodStart = periodStart, PeriodEnd = periodEnd,
                BaseSalary = 0m, OvertimeHours = 0m, TotalHours = 80m,
                Bonuses = flPerfKarim, Deductions = 0m,
                TotalAmount = flPayKarim, NetAmount = flNetKarim,
                Notes = "FL contract: 80 hrs × $60/hr. Performance bonus 10% (score: 91).",
                Status = PayrollStatus.Draft
            };

            await context.Payrolls.AddRangeAsync(
                payrollManager, payrollDev, payrollPm,
                payrollHr, payrollNour, payrollFreelancer);

            await context.SaveChangesAsync();

            // 7. Seed Sample Invoices
            var now = DateTime.UtcNow;
            var invoiceDate = now.AddDays(-10);

            // INV-001: Payroll invoice for Manager salary (Paid)
            var inv1 = new Invoice
            {
                Id            = Guid.NewGuid(),
                InvoiceNumber = "INV-2025-001",
                UserId        = adminId,
                SpaceId       = null,
                InvoiceType   = InvoiceType.Payroll,
                RecipientName = "Sarah Jenkins",
                Notes         = "Monthly payroll disbursement for May 2025.",
                PayrollRefId  = payrollManager.Id,
                IssueDate     = invoiceDate,
                DueDate       = invoiceDate.AddDays(7),
                SubTotal      = payrollManager.NetAmount,
                TaxAmount     = 0m,
                TotalAmount   = payrollManager.NetAmount,
                Status        = InvoiceStatus.Paid,
                CreatedAt     = invoiceDate,
                UpdatedAt     = invoiceDate.AddDays(5)
            };
            inv1.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv1.Id,
                Description = "Base Salary — May 2025",
                Quantity = 1, Unit = "month", UnitPrice = payrollManager.NetAmount,
                LineTotal = payrollManager.NetAmount
            });

            // INV-002: Tools/Software invoice (Approved / Sent)
            var toolsSub = 2400m;
            var toolsTax  = Math.Round(toolsSub * 0.14m, 2);
            var inv2 = new Invoice
            {
                Id            = Guid.NewGuid(),
                InvoiceNumber = "INV-2025-002",
                UserId        = adminId,
                SpaceId       = pSpace1.Id,
                InvoiceType   = InvoiceType.Tools,
                RecipientName = "CIRA Tech Platform",
                Notes         = "Annual software licenses for the E-Commerce project.",
                IssueDate     = invoiceDate.AddDays(2),
                DueDate       = invoiceDate.AddDays(30),
                SubTotal      = toolsSub,
                TaxAmount     = toolsTax,
                TotalAmount   = toolsSub + toolsTax,
                Status        = InvoiceStatus.Sent,
                CreatedAt     = invoiceDate.AddDays(2),
                UpdatedAt     = invoiceDate.AddDays(2)
            };
            inv2.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv2.Id,
                Description = "GitHub Teams License (annual)",
                Quantity = 5, Unit = "seats", UnitPrice = 168m, LineTotal = 840m
            });
            inv2.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv2.Id,
                Description = "JetBrains All Products Pack",
                Quantity = 3, Unit = "license", UnitPrice = 300m, LineTotal = 900m
            });
            inv2.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv2.Id,
                Description = "Figma Professional (annual)",
                Quantity = 4, Unit = "seats", UnitPrice = 165m, LineTotal = 660m
            });

            // INV-003: Hardware invoice (Draft)
            var hwSub = 7500m;
            var hwTax  = Math.Round(hwSub * 0.14m, 2);
            var inv3 = new Invoice
            {
                Id            = Guid.NewGuid(),
                InvoiceNumber = "INV-2025-003",
                UserId        = adminId,
                SpaceId       = pSpace1.Id,
                InvoiceType   = InvoiceType.Hardware,
                RecipientName = "CIRA Tech Platform",
                Notes         = "Hardware procurement for new developers.",
                IssueDate     = now.AddDays(-3),
                DueDate       = now.AddDays(14),
                SubTotal      = hwSub,
                TaxAmount     = hwTax,
                TotalAmount   = hwSub + hwTax,
                Status        = InvoiceStatus.Draft,
                CreatedAt     = now.AddDays(-3),
                UpdatedAt     = now.AddDays(-3)
            };
            inv3.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv3.Id,
                Description = "MacBook Pro 14\" M3",
                Quantity = 2, Unit = "unit", UnitPrice = 2800m, LineTotal = 5600m
            });
            inv3.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv3.Id,
                Description = "Dell 4K Monitor 27\"",
                Quantity = 3, Unit = "unit", UnitPrice = 450m, LineTotal = 1350m
            });
            inv3.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv3.Id,
                Description = "Mechanical Keyboard + Mouse Set",
                Quantity = 5, Unit = "set", UnitPrice = 110m, LineTotal = 550m
            });

            // INV-004: Services invoice (Paid)
            var svcSub = 4800m;
            var svcTax  = Math.Round(svcSub * 0.14m, 2);
            var inv4 = new Invoice
            {
                Id            = Guid.NewGuid(),
                InvoiceNumber = "INV-2025-004",
                UserId        = adminId,
                SpaceId       = pSpace2.Id,
                InvoiceType   = InvoiceType.Services,
                RecipientName = "CIRA Tech Platform",
                Notes         = "Consulting services for AI Chatbot Integration project.",
                IssueDate     = invoiceDate.AddDays(-5),
                DueDate       = invoiceDate.AddDays(15),
                SubTotal      = svcSub,
                TaxAmount     = svcTax,
                TotalAmount   = svcSub + svcTax,
                Status        = InvoiceStatus.Paid,
                CreatedAt     = invoiceDate.AddDays(-5),
                UpdatedAt     = invoiceDate.AddDays(10)
            };
            inv4.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv4.Id,
                Description = "LLM Architecture Consulting",
                Quantity = 24, Unit = "hrs", UnitPrice = 120m, LineTotal = 2880m
            });
            inv4.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv4.Id,
                Description = "Prompt Engineering Workshop",
                Quantity = 8, Unit = "hrs", UnitPrice = 150m, LineTotal = 1200m
            });
            inv4.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv4.Id,
                Description = "Technical Documentation",
                Quantity = 12, Unit = "hrs", UnitPrice = 60m, LineTotal = 720m
            });

            await context.Invoices.AddRangeAsync(inv1, inv2, inv3, inv4);
            await context.SaveChangesAsync();
        }
    }
}
