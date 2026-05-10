using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.Domain.Entities;
using TaskEntity = Prism.Domain.Entities.Task;

namespace Prism.API.Services
{
    /// <summary>
    /// Background service that runs every hour, finds tasks whose deadline
    /// falls within the next 24 hours, and notifies all assignees.
    /// Duplicate notifications are suppressed — each user receives at most
    /// one "DeadlineApproaching" notification per task.
    /// </summary>
    public class DeadlineNotificationService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DeadlineNotificationService> _logger;

        // How often to run the check (every 1 hour)
        private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);

        // Notify when deadline is between 23 and 25 hours away (centered on 24h mark)
        private static readonly TimeSpan WindowStart = TimeSpan.FromHours(23);
        private static readonly TimeSpan WindowEnd   = TimeSpan.FromHours(25);

        public DeadlineNotificationService(
            IServiceScopeFactory scopeFactory,
            ILogger<DeadlineNotificationService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async System.Threading.Tasks.Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DeadlineNotificationService started.");

            // Run once immediately after startup, then on interval
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndNotifyAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in DeadlineNotificationService.");
                }

                await System.Threading.Tasks.Task.Delay(CheckInterval, stoppingToken);
            }
        }

        private async System.Threading.Tasks.Task CheckAndNotifyAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now         = DateTime.UtcNow;
            var windowStart = now.Add(WindowStart); // 23 h from now
            var windowEnd   = now.Add(WindowEnd);   // 25 h from now

            // Find active tasks whose deadline falls in the 23-25 hour window
            // (i.e. approximately 24 hours before the deadline)
            var upcomingTasks = await db.Tasks
                .Where(t =>
                    !t.IsDeleted &&
                    t.DueDate.HasValue &&
                    t.DueDate.Value >= windowStart &&
                    t.DueDate.Value <= windowEnd &&
                    t.Status != Domain.Entities.TaskStatus.Done &&
                    t.Status != Domain.Entities.TaskStatus.Rejected)
                .ToListAsync(ct);

            if (upcomingTasks.Count == 0)
            {
                _logger.LogDebug("DeadlineNotificationService: no upcoming deadlines found.");
                return;
            }

            _logger.LogInformation(
                "DeadlineNotificationService: {Count} task(s) with approaching deadlines.", upcomingTasks.Count);

            var taskIds = upcomingTasks.Select(t => t.Id).ToList();

            // Get all assignees for those tasks (multi-assignee table)
            var taskAssignees = await db.TaskAssignees
                .Where(ta => taskIds.Contains(ta.TaskId))
                .ToListAsync(ct);

            // Build a lookup: taskId -> list of assignee user IDs
            var assigneeMap = taskAssignees
                .GroupBy(ta => ta.TaskId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.AssigneeId).ToList());

            // Also include tasks that use the legacy single AssigneeId field
            foreach (var task in upcomingTasks)
            {
                if (task.AssigneeId.HasValue && !assigneeMap.ContainsKey(task.Id))
                    assigneeMap[task.Id] = new List<Guid> { task.AssigneeId.Value };
                else if (task.AssigneeId.HasValue && !assigneeMap[task.Id].Contains(task.AssigneeId.Value))
                    assigneeMap[task.Id].Add(task.AssigneeId.Value);
            }

            // Find already-sent deadline notifications to avoid duplicates
            var alreadySent = await db.Notifications
                .Where(n =>
                    n.Type == "DeadlineApproaching" &&
                    n.RelatedTaskId.HasValue &&
                    taskIds.Contains(n.RelatedTaskId.Value))
                .Select(n => new { n.UserId, TaskId = n.RelatedTaskId!.Value })
                .ToListAsync(ct);

            var alreadySentSet = alreadySent
                .Select(x => (x.UserId, x.TaskId))
                .ToHashSet();

            var newNotifications = new List<Notification>();

            foreach (var task in upcomingTasks)
            {
                if (!assigneeMap.TryGetValue(task.Id, out var assignees) || assignees.Count == 0)
                    continue;

                var hoursLeft = (task.DueDate!.Value - now).TotalHours;

                foreach (var userId in assignees.Distinct())
                {
                    if (userId == Guid.Empty) continue;

                    // Skip if already notified for this task+user
                    if (alreadySentSet.Contains((userId, task.Id))) continue;

                    newNotifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Title = "⏰ Deadline in 24 Hours",
                        Message = $"Task \"{task.Title}\" is due in ~24h (on {task.DueDate!.Value:MMM d 'at' HH:mm} UTC). Please complete it on time.",
                        Type = "DeadlineApproaching",
                        IsRead = false,
                        RelatedTaskId = task.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (newNotifications.Count > 0)
            {
                db.Notifications.AddRange(newNotifications);
                await db.SaveChangesAsync(ct);
                _logger.LogInformation(
                    "DeadlineNotificationService: sent {Count} deadline notification(s).", newNotifications.Count);
            }
            else
            {
                _logger.LogDebug("DeadlineNotificationService: all assignees already notified.");
            }
        }
    }
}
