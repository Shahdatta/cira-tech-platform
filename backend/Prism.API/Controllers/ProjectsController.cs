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
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProjectsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectSpaceDto>>> GetProjectSpaces()
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var query = _context.ProjectSpaces.Where(s => !s.IsDeleted);

            if (roleString != "Admin" && userId != Guid.Empty)
            {
                var memberSpaceIds = await _context.ProjectMembers
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.SpaceId)
                    .ToListAsync();

                query = query.Where(s =>
                    s.ManagerId == userId ||
                    memberSpaceIds.Contains(s.Id) ||
                    s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => t.AssigneeId == userId && !t.IsDeleted))));
            }

            var spaces = await query
                .Select(s => new ProjectSpaceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    TotalBudget = s.TotalBudget,
                    SpentBudget = s.SpentBudget,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt,
                    TaskCount = s.Folders
                        .SelectMany(f => f.Lists)
                        .SelectMany(l => l.Tasks)
                        .Count(t => !t.IsDeleted),
                    CompletionPercent = s.Folders
                        .SelectMany(f => f.Lists)
                        .SelectMany(l => l.Tasks)
                        .Count(t => !t.IsDeleted) == 0
                        ? 0
                        : (int)Math.Round(
                            s.Folders
                                .SelectMany(f => f.Lists)
                                .SelectMany(l => l.Tasks)
                                .Count(t => !t.IsDeleted && t.Status == Prism.Domain.Entities.TaskStatus.Done)
                            * 100.0 /
                            s.Folders
                                .SelectMany(f => f.Lists)
                                .SelectMany(l => l.Tasks)
                                .Count(t => !t.IsDeleted))
                })
                .ToListAsync();

            return Ok(spaces);
        }

        [HttpPost]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<ActionResult<ProjectSpaceDto>> CreateProjectSpace(ProjectSpaceDto spaceDto)
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var requesterId);

            var space = new ProjectSpace
            {
                Id = Guid.NewGuid(),
                Name = spaceDto.Name,
                Description = spaceDto.Description,
                TotalBudget = spaceDto.TotalBudget,
                Status = spaceDto.Status,
                ManagerId = requesterId != Guid.Empty ? requesterId : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ProjectSpaces.Add(space);
            
            // Auto-create a primary channel for this project
            var channel = new Prism.Domain.Entities.Channel
            {
                Id = Guid.NewGuid(),
                Name = space.Name.ToLower().Replace(" ", "-"),
                SpaceId = space.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.Channels.Add(channel);
            
            await _context.SaveChangesAsync();
            spaceDto.Id = space.Id;
            return CreatedAtAction(nameof(GetProjectSpaces), new { id = space.Id }, spaceDto);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> UpdateProjectSpace(Guid id, ProjectSpaceDto spaceDto)
        {
            if (id != spaceDto.Id) return BadRequest("ID mismatch");

            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            space.Name = spaceDto.Name;
            space.Description = spaceDto.Description;
            space.TotalBudget = spaceDto.TotalBudget;
            space.Status = spaceDto.Status;
            space.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> DeleteProjectSpace(Guid id)
        {
            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            space.IsDeleted = true;
            space.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET /api/projects/{id}/members
        [HttpGet("{id}/members")]
        public async Task<ActionResult<IEnumerable<object>>> GetProjectMembers(Guid id)
        {
            var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var userId);

            var space = await _context.ProjectSpaces
                .Where(s => s.Id == id && !s.IsDeleted)
                .FirstOrDefaultAsync();
            if (space == null) return NotFound();

            if (roleString != "Admin" && roleString != "PM" && userId != Guid.Empty)
            {
                var hasAccess = await _context.ProjectSpaces
                    .Where(s => s.Id == id && !s.IsDeleted)
                    .AnyAsync(s => s.ManagerId == userId ||
                        s.Folders.Any(f => f.Lists.Any(l => l.Tasks.Any(t => !t.IsDeleted &&
                            (t.AssigneeId == userId ||
                             _context.TaskAssignees.Any(ta => ta.TaskId == t.Id && ta.AssigneeId == userId)))))
                        || _context.ProjectMembers.Any(pm => pm.SpaceId == id && pm.UserId == userId));
                if (!hasAccess) return Forbid();
            }

            // Collect ids from: manager, explicit project members, task assignees
            var managerIds = space.ManagerId.HasValue
                ? new List<Guid> { space.ManagerId.Value } : new List<Guid>();

            var explicitMemberIds = await _context.ProjectMembers
                .Where(pm => pm.SpaceId == id)
                .Select(pm => pm.UserId)
                .ToListAsync();

            var assigneeIds = await _context.ProjectSpaces
                .Where(s => s.Id == id)
                .SelectMany(s => s.Folders)
                .SelectMany(f => f.Lists)
                .SelectMany(l => l.Tasks)
                .Where(t => !t.IsDeleted && t.AssigneeId.HasValue)
                .Select(t => t.AssigneeId!.Value)
                .Distinct()
                .ToListAsync();

            var multiAssigneeIds = await _context.TaskAssignees
                .Where(ta => _context.ProjectSpaces
                    .Where(s => s.Id == id)
                    .SelectMany(s => s.Folders)
                    .SelectMany(f => f.Lists)
                    .SelectMany(l => l.Tasks)
                    .Any(t => t.Id == ta.TaskId))
                .Select(ta => ta.AssigneeId)
                .Distinct()
                .ToListAsync();

            var allIds = managerIds
                .Concat(explicitMemberIds)
                .Concat(assigneeIds)
                .Concat(multiAssigneeIds)
                .Distinct()
                .ToList();

            var members = await _context.Profiles
                .Include(p => p.Roles)
                .Where(p => allIds.Contains(p.UserId) && !p.IsDeleted)
                .Select(p => new
                {
                    id = p.Id,
                    user_id = p.UserId,
                    full_name = p.FullName,
                    email = p.Email,
                    role = p.Roles.Any() ? p.Roles.First().Role.ToString() : "Member",
                    is_manager = p.UserId == space.ManagerId,
                    contract_type = p.ContractType.ToString().ToLower()
                })
                .ToListAsync();

            return Ok(members);
        }

        // POST /api/projects/{id}/members  — body: { user_ids: ["guid1","guid2"] }
        [HttpPost("{id}/members")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> AddProjectMembers(Guid id, [FromBody] AddProjectMembersDto dto)
        {
            var space = await _context.ProjectSpaces.FindAsync(id);
            if (space == null || space.IsDeleted) return NotFound();

            foreach (var uid in dto.UserIds.Distinct())
            {
                if (!Guid.TryParse(uid, out var userGuid)) continue;
                var already = await _context.ProjectMembers
                    .AnyAsync(pm => pm.SpaceId == id && pm.UserId == userGuid);
                if (already) continue;
                _context.ProjectMembers.Add(new ProjectMember
                {
                    Id = Guid.NewGuid(),
                    SpaceId = id,
                    UserId = userGuid,
                    JoinedAt = DateTime.UtcNow,
                });
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/projects/{id}/members/{userId}
        [HttpDelete("{id}/members/{userId}")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<IActionResult> RemoveProjectMember(Guid id, Guid userId)
        {
            var pm = await _context.ProjectMembers
                .FirstOrDefaultAsync(m => m.SpaceId == id && m.UserId == userId);
            if (pm == null) return NotFound();
            _context.ProjectMembers.Remove(pm);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/projects/{id}/report
        [HttpGet("{id}/report")]
        [Authorize(Policy = "AdminOrPM")]
        public async Task<ActionResult<ProjectReportDto>> GetProjectReport(Guid id)
        {
            var space = await _context.ProjectSpaces
                .Include(s => s.Manager)
                .Include(s => s.Invoices)
                .Include(s => s.Folders)
                    .ThenInclude(f => f.Lists)
                        .ThenInclude(l => l.Tasks.Where(t => !t.IsDeleted))
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

            if (space == null) return NotFound();

            var allTasks = space.Folders
                .SelectMany(f => f.Lists)
                .SelectMany(l => l.Tasks)
                .ToList();

            var taskIds = allTasks.Select(t => t.Id).ToList();

            // Time logs for all tasks in this project
            var timeLogs = await _context.TimeLogs
                .Where(tl => !tl.IsDeleted && tl.TaskId.HasValue && taskIds.Contains(tl.TaskId.Value))
                .ToListAsync();

            // Multi-assignee map
            var assigneeRows = await _context.TaskAssignees
                .Where(ta => taskIds.Contains(ta.TaskId))
                .ToListAsync();
            var taskAssigneeMap = assigneeRows
                .GroupBy(ta => ta.TaskId)
                .ToDictionary(g => g.Key, g => g.Select(ta => ta.AssigneeId).ToList());

            // Collect all member IDs
            var managerIdList = space.ManagerId.HasValue
                ? new List<Guid> { space.ManagerId.Value } : new List<Guid>();
            var explicitMemberIds = await _context.ProjectMembers
                .Where(pm => pm.SpaceId == id)
                .Select(pm => pm.UserId)
                .ToListAsync();
            var primaryAssigneeIds = allTasks
                .Where(t => t.AssigneeId.HasValue)
                .Select(t => t.AssigneeId!.Value)
                .Distinct()
                .ToList();
            var multiAssigneeIds = assigneeRows.Select(ta => ta.AssigneeId).Distinct().ToList();

            var allMemberIds = managerIdList
                .Concat(explicitMemberIds)
                .Concat(primaryAssigneeIds)
                .Concat(multiAssigneeIds)
                .Distinct()
                .ToList();

            var members = await _context.Profiles
                .Include(p => p.Roles)
                .Where(p => allMemberIds.Contains(p.UserId) && !p.IsDeleted)
                .ToListAsync();

            var now = DateTime.UtcNow;

            // Per-member stats
            var memberDtos = members.Select(m =>
            {
                var myTaskIds = allTasks
                    .Where(t =>
                        t.AssigneeId == m.UserId ||
                        (taskAssigneeMap.TryGetValue(t.Id, out var ids) && ids.Contains(m.UserId)))
                    .Select(t => t.Id)
                    .ToHashSet();

                return new ReportMemberDto
                {
                    UserId = m.UserId,
                    FullName = m.FullName,
                    Email = m.Email,
                    Role = m.Roles.FirstOrDefault()?.Role.ToString().ToLower() ?? "member",
                    TasksAssigned = myTaskIds.Count,
                    TasksDone = allTasks.Count(t => myTaskIds.Contains(t.Id) && t.Status == Prism.Domain.Entities.TaskStatus.Done),
                    HoursLogged = timeLogs
                        .Where(tl => tl.UserId == m.UserId)
                        .Sum(tl => tl.DurationHours ?? 0)
                };
            }).ToList();

            // Task DTOs with Gantt data
            var taskDtos = space.Folders
                .SelectMany(f => f.Lists.Select(l => new { Folder = f, List = l }))
                .SelectMany(fl => fl.List.Tasks
                    .Where(t => !t.IsDeleted)
                    .Select(t =>
                    {
                        var ids2 = taskAssigneeMap.TryGetValue(t.Id, out var list2)
                            ? list2
                            : (t.AssigneeId.HasValue ? new List<Guid> { t.AssigneeId.Value } : new List<Guid>());
                        var assigneeName = ids2.Count > 0
                            ? members.FirstOrDefault(m => m.UserId == ids2[0])?.FullName
                            : null;

                        return new ReportTaskDto
                        {
                            Id = t.Id,
                            Title = t.Title,
                            Description = t.Description,
                            Status = t.Status.ToString(),
                            Priority = t.Priority.ToString(),
                            AssigneeName = assigneeName,
                            FolderName = fl.Folder.Name,
                            ListName = fl.List.Name,
                            DueDate = t.DueDate,
                            CreatedAt = t.CreatedAt,
                            EstimatedHours = t.EstimatedHours,
                            ActualHours = timeLogs
                                .Where(tl => tl.TaskId == t.Id)
                                .Sum(tl => tl.DurationHours ?? 0),
                            IsOverdue = t.DueDate.HasValue
                                && t.DueDate.Value < now
                                && t.Status != Prism.Domain.Entities.TaskStatus.Done
                        };
                    }))
                .ToList();

            // Phase (folder) breakdown
            var phases = space.Folders.Select(f =>
            {
                var folderTasks = f.Lists.SelectMany(l => l.Tasks.Where(t => !t.IsDeleted)).ToList();
                var total = folderTasks.Count;
                var done = folderTasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.Done);
                return new ReportPhaseDto
                {
                    FolderName = f.Name,
                    TotalTasks = total,
                    DoneTasks = done,
                    ProgressPercent = total == 0 ? 0 : (int)Math.Round(done * 100.0 / total),
                    Lists = f.Lists.Select(l => new ReportListDto
                    {
                        Name = l.Name,
                        TotalTasks = l.Tasks.Count(t => !t.IsDeleted),
                        DoneTasks = l.Tasks.Count(t => !t.IsDeleted && t.Status == Prism.Domain.Entities.TaskStatus.Done)
                    }).ToList()
                };
            }).ToList();

            var invoiceDtos = space.Invoices.Select(i => new ReportInvoiceDto
            {
                InvoiceNumber = i.InvoiceNumber,
                Type = i.InvoiceType.ToString(),
                Status = i.Status.ToString(),
                TotalAmount = i.TotalAmount,
                IssueDate = i.IssueDate,
                Notes = i.Notes
            }).ToList();

            return Ok(new ProjectReportDto
            {
                Id = space.Id,
                Name = space.Name,
                Description = space.Description,
                Status = space.Status,
                StartDate = space.StartDate,
                EndDate = space.EndDate,
                TotalBudget = space.TotalBudget,
                SpentBudget = space.SpentBudget,
                ManagerName = space.Manager?.FullName,
                GeneratedAt = now,
                TotalTasks = allTasks.Count,
                DoneTasks = allTasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.Done),
                InProgressTasks = allTasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.InProgress),
                InReviewTasks = allTasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.InReview),
                ToDoTasks = allTasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.ToDo),
                OverdueTasks = allTasks.Count(t =>
                    t.DueDate.HasValue && t.DueDate.Value < now &&
                    t.Status != Prism.Domain.Entities.TaskStatus.Done),
                CompletionPercent = allTasks.Count == 0 ? 0
                    : (int)Math.Round(allTasks.Count(t => t.Status == Prism.Domain.Entities.TaskStatus.Done) * 100.0 / allTasks.Count),
                TotalHoursLogged = timeLogs.Sum(tl => tl.DurationHours ?? 0),
                TotalHoursEstimated = allTasks.Sum(t => t.EstimatedHours ?? 0),
                MembersCount = allMemberIds.Count,
                TotalInvoiced = space.Invoices.Sum(i => i.TotalAmount),
                PaidInvoiced = space.Invoices
                    .Where(i => i.Status == Prism.Domain.Entities.InvoiceStatus.Paid)
                    .Sum(i => i.TotalAmount),
                Members = memberDtos,
                Phases = phases,
                Tasks = taskDtos,
                Invoices = invoiceDtos
            });
        }
    }
}
