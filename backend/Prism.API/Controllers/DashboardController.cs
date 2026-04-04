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
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// GET /api/dashboard/summary — role-aware BI dashboard data
        /// </summary>
        [HttpGet("summary")]
        public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
        {
            var roleString = User.FindFirst(ClaimTypes.Role)?.Value ?? "Member";
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var now = DateTime.UtcNow;
            var weekEnd = now.AddDays(7);

            // --- Scoped queries based on role ---
            var projectsQuery = _context.ProjectSpaces.Where(s => !s.IsDeleted);
            var tasksQuery = _context.Tasks.Where(t => !t.IsDeleted);
            var scopeLabel = "Company Overview";

            if (roleString == "PM" && userId != Guid.Empty)
            {
                // PM sees only projects they manage or are a member of
                scopeLabel = "My Projects Overview";
                var pmSpaceIds = await _context.ProjectSpaces
                    .Where(s => !s.IsDeleted && s.ManagerId == userId)
                    .Select(s => s.Id).ToListAsync();
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId).ToListAsync();
                var allSpaceIds = pmSpaceIds.Union(memberSpaceIds).Distinct().ToList();
                projectsQuery = projectsQuery.Where(s => allSpaceIds.Contains(s.Id));

                var folderIds = await _context.Folders
                    .Where(f => allSpaceIds.Contains(f.SpaceId))
                    .Select(f => f.Id).ToListAsync();
                var listIds = await _context.Lists
                    .Where(l => folderIds.Contains(l.FolderId))
                    .Select(l => l.Id).ToListAsync();
                tasksQuery = tasksQuery.Where(t => listIds.Contains(t.ListId));
            }
            else if (roleString != "Admin" && roleString != "HR" && userId != Guid.Empty)
            {
                // Member/Guest: see only assigned tasks and related projects
                scopeLabel = "My Work Overview";
                var assignedTaskIds = await _context.TaskAssignees
                    .Where(ta => ta.AssigneeId == userId)
                    .Select(ta => ta.TaskId).ToListAsync();

                tasksQuery = tasksQuery.Where(t =>
                    assignedTaskIds.Contains(t.Id) || t.AssigneeId == userId);

                var relatedSpaceIds = await _context.Tasks
                    .Where(t => !t.IsDeleted && (assignedTaskIds.Contains(t.Id) || t.AssigneeId == userId))
                    .Join(_context.Lists, t => t.ListId, l => l.Id, (t, l) => l.FolderId)
                    .Join(_context.Folders, folderId => folderId, f => f.Id, (folderId, f) => f.SpaceId)
                    .Distinct().ToListAsync();

                var mbrSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId)
                    .ToListAsync();

                projectsQuery = projectsQuery.Where(s =>
                    relatedSpaceIds.Contains(s.Id) ||
                    s.ManagerId == userId ||
                    mbrSpaceIds.Contains(s.Id));
            }

            var projects = await projectsQuery.ToListAsync();
            var tasks = await tasksQuery.ToListAsync();

            var activeProjects = projects.Count(p => p.Status.Equals("active", StringComparison.OrdinalIgnoreCase));
            var openTasks = tasks.Count(t => t.Status != Prism.Domain.Entities.TaskStatus.Done);
            var overdueTasks = tasks.Count(t =>
                t.Status != Prism.Domain.Entities.TaskStatus.Done &&
                t.DueDate.HasValue && t.DueDate.Value < now);
            var tasksInReview = tasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.InReview);
            var tasksDueThisWeek = tasks.Count(t =>
                t.Status != Prism.Domain.Entities.TaskStatus.Done &&
                t.DueDate.HasValue && t.DueDate.Value >= now && t.DueDate.Value <= weekEnd);

            // Time logs
            var timeLogsQuery = _context.TimeLogs.Where(l => !l.IsDeleted);
            if (roleString != "Admin" && roleString != "PM" && roleString != "HR" && userId != Guid.Empty)
                timeLogsQuery = timeLogsQuery.Where(l => l.UserId == userId);
            var totalHours = await timeLogsQuery.SumAsync(l => l.DurationHours ?? 0);

            // Members
            var activeMembers = await _context.Profiles.CountAsync(p => !p.IsDeleted && p.IsActive);

            // Revenue (invoices)
            var totalRevenue = await _context.Invoices
                .Where(i => i.Status == InvoiceStatus.Paid)
                .SumAsync(i => i.TotalAmount);

            // Budget
            var totalBudget = projects.Sum(p => p.TotalBudget);
            var spentBudget = projects.Sum(p => p.SpentBudget);

            // Efficiency
            var doneTasks = tasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.Done);
            var efficiency = tasks.Count > 0 ? (int)Math.Round((double)doneTasks / tasks.Count * 100) : 0;

            // Project budget health
            var budgetHealth = projects.Where(p => p.Status.Equals("active", StringComparison.OrdinalIgnoreCase)).Select(p => new ProjectBudgetHealthDto
            {
                ProjectId = p.Id,
                ProjectName = p.Name,
                TotalBudget = p.TotalBudget,
                SpentBudget = p.SpentBudget,
                PercentUsed = p.TotalBudget > 0 ? Math.Round(p.SpentBudget / p.TotalBudget * 100, 1) : 0,
                Status = p.Status
            }).ToList();

            // Task status distribution
            var statusDist = tasks
                .GroupBy(t => t.Status.ToString())
                .Select(g => new TaskStatusDistributionDto { Status = g.Key, Count = g.Count() })
                .ToList();

            // Per-project task breakdown
            var projectIds = projects.Select(p => p.Id).ToList();
            var tasksByProject = await (
                from t in _context.Tasks
                where !t.IsDeleted
                join l in _context.Lists on t.ListId equals l.Id
                join f in _context.Folders on l.FolderId equals f.Id
                where projectIds.Contains(f.SpaceId)
                select new { SpaceId = f.SpaceId, Status = t.Status, DueDate = t.DueDate }
            ).ToListAsync();

            var memberCountByProject = await _context.ProjectMembers
                .Where(pm => projectIds.Contains(pm.SpaceId))
                .GroupBy(pm => pm.SpaceId)
                .Select(g => new { SpaceId = g.Key, Count = g.Count() })
                .ToListAsync();
            var memberMap = memberCountByProject.ToDictionary(x => x.SpaceId, x => x.Count);

            var projectTaskBreakdown = projects.Select(p =>
            {
                var ptasks = tasksByProject.Where(t => t.SpaceId == p.Id).ToList();
                var doneCount = ptasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.Done);
                var overdueCount = ptasks.Count(t => t.Status != Prism.Domain.Entities.TaskStatus.Done && t.DueDate.HasValue && t.DueDate.Value < now);
                return new ProjectTaskBreakdownDto
                {
                    ProjectId = p.Id,
                    ProjectName = p.Name,
                    TotalTasks = ptasks.Count,
                    DoneTasks = doneCount,
                    OpenTasks = ptasks.Count - doneCount,
                    OverdueTasks = overdueCount,
                    MembersCount = memberMap.TryGetValue(p.Id, out var mc) ? mc : 0,
                    ProgressPercent = ptasks.Count > 0 ? (int)Math.Round((double)doneCount / ptasks.Count * 100) : 0,
                    Status = p.Status
                };
            }).ToList();

            return Ok(new DashboardSummaryDto
            {
                ActiveProjects = activeProjects,
                OpenTasks = openTasks,
                OverdueTasks = overdueTasks,
                TasksInReview = tasksInReview,
                TasksDueThisWeek = tasksDueThisWeek,
                TotalHoursLogged = totalHours,
                ActiveMembers = activeMembers,
                TotalRevenue = totalRevenue,
                TotalBudget = totalBudget,
                SpentBudget = spentBudget,
                Efficiency = efficiency,
                ScopeLabel = scopeLabel,
                ProjectBudgetHealth = budgetHealth,
                TaskStatusDistribution = statusDist,
                ProjectTaskBreakdown = projectTaskBreakdown
            });
        }
    }
}
