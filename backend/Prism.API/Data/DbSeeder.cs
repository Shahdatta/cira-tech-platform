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
            // New users added via website
            var dev2Id     = new Guid("bbbbbbbb-0001-0001-0001-000000000001");
            var designerId = new Guid("bbbbbbbb-0002-0002-0002-000000000002");
            var qaId       = new Guid("bbbbbbbb-0003-0003-0003-000000000003");
            var devOpsId   = new Guid("bbbbbbbb-0004-0004-0004-000000000004");

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
                FullName = "AbdelRahman Hedar",
                Email = "abdelrahman.hedar@ciratech.com",
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

            // New users added via website
            var dev2 = new Profile
            {
                Id = dev2Id,
                UserId = dev2Id,
                FullName = "Omar El-Sayed",
                Email = "omar.elsayed@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 48m,
                BaseSalary = 7800m,
                ContractType = ContractType.FT,
                IsActive = true,
                Phone = "+20-11-2345-6789"
            };

            var designer = new Profile
            {
                Id = designerId,
                UserId = designerId,
                FullName = "Layla Mostafa",
                Email = "layla.mostafa@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 40m,
                BaseSalary = 6500m,
                ContractType = ContractType.FT,
                IsActive = true,
                Phone = "+20-10-9876-5432"
            };

            var qa = new Profile
            {
                Id = qaId,
                UserId = qaId,
                FullName = "Tamer Zaki",
                Email = "tamer.zaki@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 38m,
                BaseSalary = 6000m,
                ContractType = ContractType.FT,
                IsActive = true,
                Phone = "+20-12-3344-5566"
            };

            var devops = new Profile
            {
                Id = devOpsId,
                UserId = devOpsId,
                FullName = "Hana Salah",
                Email = "hana.salah@ciratech.com",
                PasswordHash = defaultPasswordHash,
                HourlyRate = 52m,
                BaseSalary = 8500m,
                ContractType = ContractType.FT,
                IsActive = true,
                Phone = "+20-15-7788-9900"
            };

            await context.Profiles.AddRangeAsync(admin, manager, dev, hr, pm, guest, freelancer,
                dev2, designer, qa, devops);

            // 1b. Seed User Roles
            var roles = new[]
            {
                new UserRole { Id = Guid.NewGuid(), UserId = adminId,    Role = AppRole.Admin },
                new UserRole { Id = Guid.NewGuid(), UserId = managerId,  Role = AppRole.Admin },
                new UserRole { Id = Guid.NewGuid(), UserId = devId,      Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = hrId,       Role = AppRole.HR },
                new UserRole { Id = Guid.NewGuid(), UserId = pmId,       Role = AppRole.PM },
                new UserRole { Id = Guid.NewGuid(), UserId = guestId,    Role = AppRole.Guest },
                new UserRole { Id = Guid.NewGuid(), UserId = freelancId, Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = dev2Id,     Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = designerId, Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = qaId,       Role = AppRole.Member },
                new UserRole { Id = Guid.NewGuid(), UserId = devOpsId,   Role = AppRole.Member }
            };
            await context.UserRoles.AddRangeAsync(roles);

            // 2. Seed Project Spaces
            var pSpace1 = new ProjectSpace
            {
                Id = new Guid("cccccccc-0001-0001-0001-000000000001"),
                Name = "E-Commerce Replatforming",
                Description = "Migrating legacy system to modern .NET + Next.js stack",
                Status = "active",
                TotalBudget = 150000m,
                ManagerId = manager.Id
            };

            var pSpace2 = new ProjectSpace
            {
                Id = new Guid("cccccccc-0002-0002-0002-000000000002"),
                Name = "AI Chatbot Integration",
                Description = "LLM integration for customer support automation",
                Status = "active",
                TotalBudget = 50000m,
                ManagerId = manager.Id
            };

            var pSpace3 = new ProjectSpace
            {
                Id = new Guid("cccccccc-0003-0003-0003-000000000003"),
                Name = "Mobile Banking App",
                Description = "Cross-platform mobile banking application built with React Native and .NET microservices",
                Status = "active",
                TotalBudget = 220000m,
                ManagerId = pm.Id
            };

            var pSpace4 = new ProjectSpace
            {
                Id = new Guid("cccccccc-0004-0004-0004-000000000004"),
                Name = "HR Self-Service Portal",
                Description = "Internal employee portal for leave requests, payslips, and onboarding workflows",
                Status = "active",
                TotalBudget = 45000m,
                ManagerId = pm.Id
            };

            var pSpace5 = new ProjectSpace
            {
                Id = new Guid("cccccccc-0005-0005-0005-000000000005"),
                Name = "Cloud Infrastructure Migration",
                Description = "Migrate on-premise servers to AWS — containerised workloads with ECS and RDS",
                Status = "completed",
                TotalBudget = 80000m,
                ManagerId = manager.Id
            };

            await context.ProjectSpaces.AddRangeAsync(pSpace1, pSpace2, pSpace3, pSpace4, pSpace5);

            // 3. Seed Folders & Lists for pSpace1 (E-Commerce)
            var folder = new Folder
            {
                Id = Guid.NewGuid(),
                SpaceId = pSpace1.Id,
                Name = "Frontend Phase"
            };
            var folder1b = new Folder
            {
                Id = Guid.NewGuid(),
                SpaceId = pSpace1.Id,
                Name = "Backend Phase"
            };
            await context.Folders.AddRangeAsync(folder, folder1b);

            var sprintList = new List
            {
                Id = Guid.NewGuid(),
                FolderId = folder.Id,
                Name = "Sprint 1"
            };
            var sprintList2 = new List
            {
                Id = Guid.NewGuid(),
                FolderId = folder.Id,
                Name = "Sprint 2"
            };
            var backendList = new List
            {
                Id = Guid.NewGuid(),
                FolderId = folder1b.Id,
                Name = "API Development"
            };
            await context.Lists.AddRangeAsync(sprintList, sprintList2, backendList);

            // Folders & Lists for pSpace2 (AI Chatbot)
            var folderAI = new Folder
            {
                Id = Guid.NewGuid(),
                SpaceId = pSpace2.Id,
                Name = "Model Integration"
            };
            var folderAI2 = new Folder
            {
                Id = Guid.NewGuid(),
                SpaceId = pSpace2.Id,
                Name = "UI & Testing"
            };
            await context.Folders.AddRangeAsync(folderAI, folderAI2);

            var listLLM = new List { Id = Guid.NewGuid(), FolderId = folderAI.Id, Name = "LLM Research" };
            var listPipeline = new List { Id = Guid.NewGuid(), FolderId = folderAI.Id, Name = "Pipeline" };
            var listChatUI = new List { Id = Guid.NewGuid(), FolderId = folderAI2.Id, Name = "Chat UI" };
            await context.Lists.AddRangeAsync(listLLM, listPipeline, listChatUI);

            // Folders & Lists for pSpace3 (Mobile Banking)
            var folderMobile = new Folder { Id = Guid.NewGuid(), SpaceId = pSpace3.Id, Name = "Mobile App" };
            var folderMobileAPI = new Folder { Id = Guid.NewGuid(), SpaceId = pSpace3.Id, Name = "Microservices" };
            await context.Folders.AddRangeAsync(folderMobile, folderMobileAPI);

            var listAuth = new List { Id = Guid.NewGuid(), FolderId = folderMobile.Id, Name = "Auth Module" };
            var listPayments = new List { Id = Guid.NewGuid(), FolderId = folderMobile.Id, Name = "Payments Module" };
            var listGateway = new List { Id = Guid.NewGuid(), FolderId = folderMobileAPI.Id, Name = "API Gateway" };
            await context.Lists.AddRangeAsync(listAuth, listPayments, listGateway);

            // Folders & Lists for pSpace4 (HR Portal)
            var folderHR = new Folder { Id = Guid.NewGuid(), SpaceId = pSpace4.Id, Name = "Portal Features" };
            await context.Folders.AddAsync(folderHR);

            var listLeave = new List { Id = Guid.NewGuid(), FolderId = folderHR.Id, Name = "Leave Management" };
            var listPayslips = new List { Id = Guid.NewGuid(), FolderId = folderHR.Id, Name = "Payslips & Reports" };
            await context.Lists.AddRangeAsync(listLeave, listPayslips);

            // Folders & Lists for pSpace5 (Cloud Migration)
            var folderCloud = new Folder { Id = Guid.NewGuid(), SpaceId = pSpace5.Id, Name = "Infrastructure" };
            await context.Folders.AddAsync(folderCloud);

            var listECS = new List { Id = Guid.NewGuid(), FolderId = folderCloud.Id, Name = "ECS Deployment" };
            var listRDS = new List { Id = Guid.NewGuid(), FolderId = folderCloud.Id, Name = "Database Migration" };
            await context.Lists.AddRangeAsync(listECS, listRDS);

            // 4. Seed Tasks
            // pSpace1 — E-Commerce
            var task1 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = sprintList.Id, AssigneeId = dev.Id,
                Title = "Implement Product Grid",
                Description = "Create a responsive product grid using CSS Grid and standard components.",
                Status = TaskStatus.InProgress, DueDate = DateTime.UtcNow.AddDays(2),
                EstimatedHours = 8m, Priority = TaskPriority.Medium
            };
            var task2 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = sprintList.Id, AssigneeId = dev.Id,
                Title = "Design System Refactor",
                Description = "Align existing components with new Figma design tokens.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-1),
                EstimatedHours = 6m, Priority = TaskPriority.High
            };
            var task3 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = sprintList.Id, AssigneeId = manager.Id,
                Title = "Review Security Policies",
                Description = "Ensure CORS and Auth match security standards.",
                Status = TaskStatus.ToDo, DueDate = DateTime.UtcNow.AddDays(5),
                EstimatedHours = 4m, Priority = TaskPriority.High
            };
            var task4 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = sprintList2.Id, AssigneeId = designer.Id,
                Title = "Checkout Flow UX Redesign",
                Description = "Redesign checkout steps to reduce cart abandonment.",
                Status = TaskStatus.InProgress, DueDate = DateTime.UtcNow.AddDays(4),
                EstimatedHours = 12m, Priority = TaskPriority.High
            };
            var task5 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = backendList.Id, AssigneeId = dev2.Id,
                Title = "Product Catalog API",
                Description = "Build CRUD endpoints for product catalog with filtering and pagination.",
                Status = TaskStatus.InProgress, DueDate = DateTime.UtcNow.AddDays(3),
                EstimatedHours = 16m, Priority = TaskPriority.High
            };
            var task6 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = backendList.Id, AssigneeId = qa.Id,
                Title = "Payment Gateway Integration Tests",
                Description = "Write integration tests for Stripe webhook handlers.",
                Status = TaskStatus.ToDo, DueDate = DateTime.UtcNow.AddDays(7),
                EstimatedHours = 8m, Priority = TaskPriority.Medium
            };

            // pSpace2 — AI Chatbot
            var task7 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listLLM.Id, AssigneeId = dev.Id,
                Title = "GPT-4o API Integration",
                Description = "Integrate OpenAI GPT-4o API with streaming support.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-5),
                EstimatedHours = 10m, Priority = TaskPriority.High
            };
            var task8 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listPipeline.Id, AssigneeId = dev2.Id,
                Title = "RAG Pipeline with Vector DB",
                Description = "Implement Retrieval-Augmented Generation with Qdrant.",
                Status = TaskStatus.InProgress, DueDate = DateTime.UtcNow.AddDays(6),
                EstimatedHours = 20m, Priority = TaskPriority.High
            };
            var task9 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listChatUI.Id, AssigneeId = designer.Id,
                Title = "Chat Widget UI",
                Description = "Build embeddable chat widget with React and Tailwind.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-2),
                EstimatedHours = 14m, Priority = TaskPriority.Medium
            };

            // pSpace3 — Mobile Banking
            var task10 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listAuth.Id, AssigneeId = dev.Id,
                Title = "Biometric Authentication",
                Description = "Implement Face ID / fingerprint login using React Native Biometrics.",
                Status = TaskStatus.InProgress, DueDate = DateTime.UtcNow.AddDays(8),
                EstimatedHours = 18m, Priority = TaskPriority.High
            };
            var task11 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listPayments.Id, AssigneeId = dev2.Id,
                Title = "Fund Transfer Module",
                Description = "Build domestic and international fund transfer screens and APIs.",
                Status = TaskStatus.ToDo, DueDate = DateTime.UtcNow.AddDays(12),
                EstimatedHours = 24m, Priority = TaskPriority.High
            };
            var task12 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listGateway.Id, AssigneeId = devops.Id,
                Title = "API Gateway Rate Limiting",
                Description = "Configure Kong gateway with per-user rate limiting and JWT validation.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-3),
                EstimatedHours = 6m, Priority = TaskPriority.Medium
            };

            // pSpace4 — HR Portal
            var task13 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listLeave.Id, AssigneeId = dev2.Id,
                Title = "Leave Request Workflow",
                Description = "Employee submits leave → manager approves → HR notified.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-8),
                EstimatedHours = 10m, Priority = TaskPriority.Medium
            };
            var task14 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listPayslips.Id, AssigneeId = dev.Id,
                Title = "Payslip PDF Generation",
                Description = "Auto-generate monthly payslip PDFs using a .NET PDF library.",
                Status = TaskStatus.InProgress, DueDate = DateTime.UtcNow.AddDays(5),
                EstimatedHours = 8m, Priority = TaskPriority.Medium
            };

            // pSpace5 — Cloud Migration
            var task15 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listECS.Id, AssigneeId = devops.Id,
                Title = "Containerise All Services",
                Description = "Write Dockerfiles and compose files for all 8 backend services.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-20),
                EstimatedHours = 20m, Priority = TaskPriority.High
            };
            var task16 = new Prism.Domain.Entities.Task
            {
                Id = Guid.NewGuid(), ListId = listRDS.Id, AssigneeId = devops.Id,
                Title = "PostgreSQL RDS Migration",
                Description = "Migrate 3 on-prem PostgreSQL databases to AWS RDS with zero downtime.",
                Status = TaskStatus.Done, DueDate = DateTime.UtcNow.AddDays(-10),
                EstimatedHours = 16m, Priority = TaskPriority.High
            };

            await context.Tasks.AddRangeAsync(
                task1, task2, task3, task4, task5, task6, task7, task8,
                task9, task10, task11, task12, task13, task14, task15, task16);

            // 4b. Seed TaskAssignees
            await context.TaskAssignees.AddRangeAsync(
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task1.Id,  AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task2.Id,  AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task3.Id,  AssigneeId = manager.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task4.Id,  AssigneeId = designer.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task5.Id,  AssigneeId = dev2.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task6.Id,  AssigneeId = qa.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task7.Id,  AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task8.Id,  AssigneeId = dev2.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task9.Id,  AssigneeId = designer.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task10.Id, AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task11.Id, AssigneeId = dev2.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task12.Id, AssigneeId = devops.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task13.Id, AssigneeId = dev2.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task14.Id, AssigneeId = dev.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task15.Id, AssigneeId = devops.Id },
                new Prism.Domain.Entities.TaskAssignee { Id = Guid.NewGuid(), TaskId = task16.Id, AssigneeId = devops.Id }
            );

            // 5. Seed Time Logs
            var tLog1 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task2.Id, UserId = dev.UserId,
                StartTime = DateTime.UtcNow.AddDays(-2), EndTime = DateTime.UtcNow.AddDays(-2).AddHours(6),
                DurationHours = 6, IsBillable = true, IsManualEntry = true,
                ReasonManual = "Finished design system refactor", Status = TimeLogStatus.Billed
            };
            var tLog2 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task1.Id, UserId = dev.UserId,
                StartTime = DateTime.UtcNow.AddHours(-3), EndTime = DateTime.UtcNow.AddHours(-1),
                DurationHours = 2, IsBillable = true, IsManualEntry = false, Status = TimeLogStatus.Billed
            };
            var tLog3 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task5.Id, UserId = dev2.UserId,
                StartTime = DateTime.UtcNow.AddDays(-1), EndTime = DateTime.UtcNow.AddDays(-1).AddHours(8),
                DurationHours = 8, IsBillable = true, IsManualEntry = false, Status = TimeLogStatus.Billed
            };
            var tLog4 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task7.Id, UserId = dev.UserId,
                StartTime = DateTime.UtcNow.AddDays(-6), EndTime = DateTime.UtcNow.AddDays(-6).AddHours(10),
                DurationHours = 10, IsBillable = true, IsManualEntry = true,
                ReasonManual = "GPT-4o integration completed", Status = TimeLogStatus.Billed
            };
            var tLog5 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task9.Id, UserId = designer.UserId,
                StartTime = DateTime.UtcNow.AddDays(-3), EndTime = DateTime.UtcNow.AddDays(-3).AddHours(7),
                DurationHours = 7, IsBillable = true, IsManualEntry = false, Status = TimeLogStatus.Billed
            };
            var tLog6 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task12.Id, UserId = devops.UserId,
                StartTime = DateTime.UtcNow.AddDays(-4), EndTime = DateTime.UtcNow.AddDays(-4).AddHours(6),
                DurationHours = 6, IsBillable = true, IsManualEntry = false, Status = TimeLogStatus.Billed
            };
            var tLog7 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task15.Id, UserId = devops.UserId,
                StartTime = DateTime.UtcNow.AddDays(-22), EndTime = DateTime.UtcNow.AddDays(-22).AddHours(10),
                DurationHours = 10, IsBillable = true, IsManualEntry = false, Status = TimeLogStatus.Billed
            };
            var tLog8 = new TimeLog
            {
                Id = Guid.NewGuid(), TaskId = task16.Id, UserId = devops.UserId,
                StartTime = DateTime.UtcNow.AddDays(-11), EndTime = DateTime.UtcNow.AddDays(-11).AddHours(8),
                DurationHours = 8, IsBillable = true, IsManualEntry = true,
                ReasonManual = "RDS migration completed successfully", Status = TimeLogStatus.Billed
            };

            await context.TimeLogs.AddRangeAsync(tLog1, tLog2, tLog3, tLog4, tLog5, tLog6, tLog7, tLog8);

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
                // Dev2 (Omar)
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = dev2Id, EvaluatorId = managerId,
                    OverallScore = 85m, AvgTurnaroundTime = 1.6m, BugRate = 0.04m,
                    HrComments = "Strong backend delivery. Excellent API design skills.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // Designer (Layla)
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = designerId, EvaluatorId = managerId,
                    OverallScore = 89m, AvgTurnaroundTime = 1.4m, BugRate = 0.02m,
                    HrComments = "Creative and detail-oriented. Designs are consistently pixel-perfect.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // QA (Tamer)
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = qaId, EvaluatorId = managerId,
                    OverallScore = 80m, AvgTurnaroundTime = 2.0m, BugRate = 0.06m,
                    HrComments = "Good test coverage. Should explore automation frameworks further.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
                // DevOps (Hana)
                new PerformanceAppraisal
                {
                    Id = Guid.NewGuid(), UserId = devOpsId, EvaluatorId = adminId,
                    OverallScore = 93m, AvgTurnaroundTime = 0.9m, BugRate = 0.01m,
                    HrComments = "Outstanding infrastructure work. Led cloud migration with zero downtime.",
                    CreatedAt = DateTime.UtcNow.AddDays(-30)
                },
            };
            await context.PerformanceAppraisals.AddRangeAsync(appraisals);

            // 7. Seed Payroll — one record per employee covering last month
            var periodStart = DateTime.UtcNow.AddDays(-30);
            var PeriodEnd   = DateTime.UtcNow.AddDays(-1);

            // FT: Manager — BaseSalary EGP 9,000 + 8 OT hrs × EGP 55 × 1.5 + 10% perf bonus (score≥90)
            var ftOtPayManager = 8m * 55m * 1.5m;            // EGP £660
            var ftBaseManager = 9000m + ftOtPayManager;      // EGP £9,660
            var ftPerfManager = Math.Round(ftBaseManager * 0.10m, 2); // 10% bonus (score 92)
            var ftNetManager  = ftBaseManager + ftPerfManager;

            var payrollManager = new Payroll
            {
                Id = Guid.NewGuid(), UserId = managerId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 9000m, OvertimeHours = 8m, TotalHours = 168m,
                Bonuses = ftPerfManager, Deductions = 0m,
                TotalAmount = ftBaseManager, NetAmount = ftNetManager,
                Notes = $"FT salary + 8 OT hrs. Performance bonus 10% (score: 92).",
                Status = PayrollStatus.Paid
            };

            // FT: Dev — BaseSalary EGP £7,200 + 5 OT hrs × EGP £45 × 1.5 + 5% perf bonus (score 75–89)
            var ftOtPayDev = 5m * 45m * 1.5m;                // EGP £337.50
            var ftBaseDev  = 7200m + ftOtPayDev;              // EGP £7,537.50
            var ftPerfDev  = Math.Round(ftBaseDev * 0.05m, 2); // 5% bonus (score 82)
            var ftNetDev   = ftBaseDev + ftPerfDev;

            var payrollDev = new Payroll
            {
                Id = Guid.NewGuid(), UserId = devId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 7200m, OvertimeHours = 5m, TotalHours = 165m,
                Bonuses = ftPerfDev, Deductions = 0m,
                TotalAmount = ftBaseDev, NetAmount = ftNetDev,
                Notes = $"FT salary + 5 OT hrs. Performance bonus 5% (score: 82).",
                Status = PayrollStatus.Approved
            };

            // FT: PM — BaseSalary EGP £8,000 + 0 OT + 5% perf bonus (score 88)
            var ftBasePm = 8000m;
            var ftPerfPm = Math.Round(ftBasePm * 0.05m, 2);
            var ftNetPm  = ftBasePm + ftPerfPm;

            var payrollPm = new Payroll
            {
                Id = Guid.NewGuid(), UserId = pmId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 8000m, OvertimeHours = 0m, TotalHours = 160m,
                Bonuses = ftPerfPm, Deductions = 0m,
                TotalAmount = ftBasePm, NetAmount = ftNetPm,
                Notes = $"FT salary. Performance bonus 5% (score: 88).",
                Status = PayrollStatus.Draft
            };

            // PT: HR (Fatima) — 60 hrs × EGP £35 = EGP £2,100; no perf bonus (score < 75)
            var ptPayHr = 60m * 35m;   // EGP £2,100

            var payrollHr = new Payroll
            {
                Id = Guid.NewGuid(), UserId = hrId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 0m, OvertimeHours = 0m, TotalHours = 60m,
                Bonuses = 0m, Deductions = 0m,
                TotalAmount = ptPayHr, NetAmount = ptPayHr,
                Notes = "PT hourly: 60 hrs × EGP £35/hr. No performance bonus (score: 74).",
                Status = PayrollStatus.Paid
            };

            // PT: Nour (guest) — 45 hrs × EGP £20 = EGP £900; 5% perf bonus (score 78)
            var ptPayNour = 45m * 20m;  // EGP £900
            var ptPerfNour = Math.Round(ptPayNour * 0.05m, 2);
            var ptNetNour  = ptPayNour + ptPerfNour;

            var payrollNour = new Payroll
            {
                Id = Guid.NewGuid(), UserId = guestId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 0m, OvertimeHours = 0m, TotalHours = 45m,
                Bonuses = ptPerfNour, Deductions = 0m,
                TotalAmount = ptPayNour, NetAmount = ptNetNour,
                Notes = "PT hourly: 45 hrs × EGP £20/hr. Performance bonus 5% (score: 78).",
                Status = PayrollStatus.Approved
            };

            // FL: Karim Hassan — 80 hrs × EGP £60 = EGP £4,800 + 10% perf bonus (score 91)
            var flPayKarim  = 80m * 60m;  // EGP £4,800
            var flPerfKarim = Math.Round(flPayKarim * 0.10m, 2);
            var flNetKarim  = flPayKarim + flPerfKarim;

            var payrollFreelancer = new Payroll
            {
                Id = Guid.NewGuid(), UserId = freelancId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 0m, OvertimeHours = 0m, TotalHours = 80m,
                Bonuses = flPerfKarim, Deductions = 0m,
                TotalAmount = flPayKarim, NetAmount = flNetKarim,
                Notes = "FL contract: 80 hrs × EGP £60/hr. Performance bonus 10% (score: 91).",
                Status = PayrollStatus.Draft
            };

            await context.Payrolls.AddRangeAsync(
                payrollManager, payrollDev, payrollPm,
                payrollHr, payrollNour, payrollFreelancer);

            // Payrolls for new staff
            // Dev2 (Omar) — FT EGP 7,800 + 6 OT × 48 × 1.5 + 5% bonus (score 85)
            var ftOtDev2 = 6m * 48m * 1.5m;
            var ftBaseDev2 = 7800m + ftOtDev2;
            var ftPerfDev2 = Math.Round(ftBaseDev2 * 0.05m, 2);
            var payrollDev2 = new Payroll
            {
                Id = Guid.NewGuid(), UserId = dev2Id,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 7800m, OvertimeHours = 6m, TotalHours = 166m,
                Bonuses = ftPerfDev2, Deductions = 0m,
                TotalAmount = ftBaseDev2, NetAmount = ftBaseDev2 + ftPerfDev2,
                Notes = "FT salary + 6 OT hrs. Performance bonus 5% (score: 85).",
                Status = PayrollStatus.Approved
            };

            // Designer (Layla) — FT EGP 6,500 + 0 OT + 5% bonus (score 89)
            var ftBaseDesigner = 6500m;
            var ftPerfDesigner = Math.Round(ftBaseDesigner * 0.05m, 2);
            var payrollDesigner = new Payroll
            {
                Id = Guid.NewGuid(), UserId = designerId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 6500m, OvertimeHours = 0m, TotalHours = 160m,
                Bonuses = ftPerfDesigner, Deductions = 0m,
                TotalAmount = ftBaseDesigner, NetAmount = ftBaseDesigner + ftPerfDesigner,
                Notes = "FT salary. Performance bonus 5% (score: 89).",
                Status = PayrollStatus.Paid
            };

            // QA (Tamer) — FT EGP 6,000 + 0 OT + no bonus (score 80 - boundary, no bonus)
            var ftBaseQa = 6000m;
            var payrollQa = new Payroll
            {
                Id = Guid.NewGuid(), UserId = qaId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 6000m, OvertimeHours = 0m, TotalHours = 160m,
                Bonuses = 0m, Deductions = 0m,
                TotalAmount = ftBaseQa, NetAmount = ftBaseQa,
                Notes = "FT salary. No performance bonus (score: 80).",
                Status = PayrollStatus.Draft
            };

            // DevOps (Hana) — FT EGP 8,500 + 10 OT × 52 × 1.5 + 10% bonus (score 93)
            var ftOtDevOps = 10m * 52m * 1.5m;
            var ftBaseDevOps = 8500m + ftOtDevOps;
            var ftPerfDevOps = Math.Round(ftBaseDevOps * 0.10m, 2);
            var payrollDevOps = new Payroll
            {
                Id = Guid.NewGuid(), UserId = devOpsId,
                PeriodStart = periodStart, PeriodEnd = PeriodEnd,
                BaseSalary = 8500m, OvertimeHours = 10m, TotalHours = 170m,
                Bonuses = ftPerfDevOps, Deductions = 0m,
                TotalAmount = ftBaseDevOps, NetAmount = ftBaseDevOps + ftPerfDevOps,
                Notes = "FT salary + 10 OT hrs. Performance bonus 10% (score: 93).",
                Status = PayrollStatus.Paid
            };

            await context.Payrolls.AddRangeAsync(payrollDev2, payrollDesigner, payrollQa, payrollDevOps);

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
                Notes         = "Annual software licenses for the EGP -Commerce project.",
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

            // ─── Additional invoices from website activity ───────────────────────

            // INV-005: Payroll invoice for DevOps (Hana) — Paid
            var inv5 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-005",
                UserId = adminId, SpaceId = pSpace5.Id,
                InvoiceType = InvoiceType.Payroll, RecipientName = "Hana Salah",
                Notes = "Monthly payroll — Cloud Infrastructure team lead.",
                PayrollRefId = payrollDevOps.Id,
                IssueDate = invoiceDate, DueDate = invoiceDate.AddDays(7),
                SubTotal = payrollDevOps.NetAmount, TaxAmount = 0m,
                TotalAmount = payrollDevOps.NetAmount, Status = InvoiceStatus.Paid,
                CreatedAt = invoiceDate, UpdatedAt = invoiceDate.AddDays(5)
            };
            inv5.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv5.Id,
                Description = "Base Salary + OT + Performance Bonus — Cloud Migration",
                Quantity = 1, Unit = "month", UnitPrice = payrollDevOps.NetAmount,
                LineTotal = payrollDevOps.NetAmount
            });

            // INV-006: Services invoice for Mobile Banking (Sent)
            var mbSvc = 12000m;
            var mbTax = Math.Round(mbSvc * 0.14m, 2);
            var inv6 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-006",
                UserId = adminId, SpaceId = pSpace3.Id,
                InvoiceType = InvoiceType.Services, RecipientName = "National Digital Bank",
                Notes = "Development services for Mobile Banking App — Phase 1.",
                IssueDate = now.AddDays(-15), DueDate = now.AddDays(15),
                SubTotal = mbSvc, TaxAmount = mbTax, TotalAmount = mbSvc + mbTax,
                Status = InvoiceStatus.Sent, CreatedAt = now.AddDays(-15), UpdatedAt = now.AddDays(-15)
            };
            inv6.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv6.Id,
                Description = "React Native Development (Auth & Payments modules)",
                Quantity = 120, Unit = "hrs", UnitPrice = 65m, LineTotal = 7800m
            });
            inv6.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv6.Id,
                Description = "API Gateway & Microservices Setup",
                Quantity = 64, Unit = "hrs", UnitPrice = 65m, LineTotal = 4160m
            });

            // INV-007: Tools invoice for AI Chatbot project (Paid)
            var aiTools = 3200m;
            var aiTax = Math.Round(aiTools * 0.14m, 2);
            var inv7 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-007",
                UserId = adminId, SpaceId = pSpace2.Id,
                InvoiceType = InvoiceType.Tools, RecipientName = "CIRA Tech Platform",
                Notes = "AI and vector database tooling subscriptions.",
                IssueDate = invoiceDate.AddDays(-20), DueDate = invoiceDate.AddDays(10),
                SubTotal = aiTools, TaxAmount = aiTax, TotalAmount = aiTools + aiTax,
                Status = InvoiceStatus.Paid, CreatedAt = invoiceDate.AddDays(-20), UpdatedAt = invoiceDate.AddDays(-5)
            };
            inv7.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv7.Id,
                Description = "OpenAI API Credits (monthly)",
                Quantity = 1, Unit = "month", UnitPrice = 1500m, LineTotal = 1500m
            });
            inv7.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv7.Id,
                Description = "Qdrant Cloud — Vector DB (monthly)",
                Quantity = 1, Unit = "month", UnitPrice = 700m, LineTotal = 700m
            });
            inv7.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv7.Id,
                Description = "LangChain Enterprise License",
                Quantity = 1, Unit = "month", UnitPrice = 1000m, LineTotal = 1000m
            });

            // INV-008: Hardware invoice for Mobile Banking project (Draft)
            var mobHw = 5600m;
            var mobHwTax = Math.Round(mobHw * 0.14m, 2);
            var inv8 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-008",
                UserId = adminId, SpaceId = pSpace3.Id,
                InvoiceType = InvoiceType.Hardware, RecipientName = "CIRA Tech Platform",
                Notes = "Test devices for mobile banking app QA.",
                IssueDate = now.AddDays(-2), DueDate = now.AddDays(20),
                SubTotal = mobHw, TaxAmount = mobHwTax, TotalAmount = mobHw + mobHwTax,
                Status = InvoiceStatus.Draft, CreatedAt = now.AddDays(-2), UpdatedAt = now.AddDays(-2)
            };
            inv8.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv8.Id,
                Description = "iPhone 15 Pro (test device)",
                Quantity = 2, Unit = "unit", UnitPrice = 1200m, LineTotal = 2400m
            });
            inv8.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv8.Id,
                Description = "Samsung Galaxy S24 (test device)",
                Quantity = 2, Unit = "unit", UnitPrice = 950m, LineTotal = 1900m
            });
            inv8.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv8.Id,
                Description = "USB-C Hub & Accessories",
                Quantity = 4, Unit = "set", UnitPrice = 75m, LineTotal = 300m
            });

            // INV-009: Payroll invoice for Designer (Layla) — Paid
            var inv9 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-009",
                UserId = adminId, SpaceId = null,
                InvoiceType = InvoiceType.Payroll, RecipientName = "Layla Mostafa",
                Notes = "Monthly payroll — UX/UI Designer.",
                PayrollRefId = payrollDesigner.Id,
                IssueDate = invoiceDate, DueDate = invoiceDate.AddDays(7),
                SubTotal = payrollDesigner.NetAmount, TaxAmount = 0m,
                TotalAmount = payrollDesigner.NetAmount, Status = InvoiceStatus.Paid,
                CreatedAt = invoiceDate, UpdatedAt = invoiceDate.AddDays(4)
            };
            inv9.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv9.Id,
                Description = "Base Salary + Performance Bonus — Design Team",
                Quantity = 1, Unit = "month", UnitPrice = payrollDesigner.NetAmount,
                LineTotal = payrollDesigner.NetAmount
            });

            // INV-010: Services invoice for HR Portal (Sent)
            var hrSvc = 6500m;
            var hrTax = Math.Round(hrSvc * 0.14m, 2);
            var inv10 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-010",
                UserId = adminId, SpaceId = pSpace4.Id,
                InvoiceType = InvoiceType.Services, RecipientName = "CIRA HR Division",
                Notes = "Development of HR Self-Service Portal features — leave workflow + payslips.",
                IssueDate = now.AddDays(-8), DueDate = now.AddDays(22),
                SubTotal = hrSvc, TaxAmount = hrTax, TotalAmount = hrSvc + hrTax,
                Status = InvoiceStatus.Sent, CreatedAt = now.AddDays(-8), UpdatedAt = now.AddDays(-8)
            };
            inv10.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv10.Id,
                Description = "Leave Request Workflow Development",
                Quantity = 40, Unit = "hrs", UnitPrice = 85m, LineTotal = 3400m
            });
            inv10.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv10.Id,
                Description = "Payslip PDF Generation Module",
                Quantity = 36, Unit = "hrs", UnitPrice = 85m, LineTotal = 3060m
            });

            // INV-011: Cloud/Tools invoice for Cloud Migration (Paid)
            var cloudTools = 9800m;
            var cloudTax = Math.Round(cloudTools * 0.14m, 2);
            var inv11 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-011",
                UserId = adminId, SpaceId = pSpace5.Id,
                InvoiceType = InvoiceType.Tools, RecipientName = "CIRA Tech Platform",
                Notes = "AWS infrastructure costs for cloud migration project.",
                IssueDate = invoiceDate.AddDays(-25), DueDate = invoiceDate.AddDays(-5),
                SubTotal = cloudTools, TaxAmount = cloudTax, TotalAmount = cloudTools + cloudTax,
                Status = InvoiceStatus.Paid, CreatedAt = invoiceDate.AddDays(-25), UpdatedAt = invoiceDate.AddDays(-8)
            };
            inv11.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv11.Id,
                Description = "AWS ECS Fargate (monthly)",
                Quantity = 1, Unit = "month", UnitPrice = 3500m, LineTotal = 3500m
            });
            inv11.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv11.Id,
                Description = "AWS RDS Multi-AZ (monthly)",
                Quantity = 1, Unit = "month", UnitPrice = 4200m, LineTotal = 4200m
            });
            inv11.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv11.Id,
                Description = "AWS CloudFront + S3 (monthly)",
                Quantity = 1, Unit = "month", UnitPrice = 2100m, LineTotal = 2100m
            });

            // INV-012: Payroll invoice for Dev2 (Omar) — Approved
            var inv12 = new Invoice
            {
                Id = Guid.NewGuid(), InvoiceNumber = "INV-2025-012",
                UserId = adminId, SpaceId = null,
                InvoiceType = InvoiceType.Payroll, RecipientName = "Omar El-Sayed",
                Notes = "Monthly payroll — Backend Developer.",
                PayrollRefId = payrollDev2.Id,
                IssueDate = invoiceDate, DueDate = invoiceDate.AddDays(7),
                SubTotal = payrollDev2.NetAmount, TaxAmount = 0m,
                TotalAmount = payrollDev2.NetAmount, Status = InvoiceStatus.Sent,
                CreatedAt = invoiceDate, UpdatedAt = invoiceDate
            };
            inv12.LineItems.Add(new InvoiceLineItem
            {
                Id = Guid.NewGuid(), InvoiceId = inv12.Id,
                Description = "Base Salary + Overtime + Performance Bonus",
                Quantity = 1, Unit = "month", UnitPrice = payrollDev2.NetAmount,
                LineTotal = payrollDev2.NetAmount
            });

            await context.Invoices.AddRangeAsync(inv5, inv6, inv7, inv8, inv9, inv10, inv11, inv12);
            await context.SaveChangesAsync();
        }
    }
}
