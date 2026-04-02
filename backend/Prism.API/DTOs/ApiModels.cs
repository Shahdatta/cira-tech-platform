namespace Prism.API.DTOs
{
    // ── Auth ──
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string Role { get; set; } = "Member";
    }

    public class RegisterDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ChangeRoleDto
    {
        public Guid UserId { get; set; }
        public string Role { get; set; } = "Member";
    }

    // ── Projects ──
    public class ProjectSpaceDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal TotalBudget { get; set; }
        public string Status { get; set; } = "active";
        public DateTime CreatedAt { get; set; }
    }

    // ── Tasks ──
    public class TaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "ToDo";
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
        public Guid ListId { get; set; }
    }

    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "todo";
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
        public Guid ListId { get; set; }
    }

    // ── Profiles ──
    public class ProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
        public string ContractType { get; set; } = "ft";
        public bool IsActive { get; set; } = true;
        public string Role { get; set; } = "Member";
        public DateTime CreatedAt { get; set; }
    }

    public class CreateProfileDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
        public string ContractType { get; set; } = "ft";
        public Guid? UserId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // ── Time Logs ──
    public class TimeLogDto
    {
        public Guid Id { get; set; }
        public Guid? TaskId { get; set; }
        public Guid UserId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public decimal? DurationHours { get; set; }
        public bool IsBillable { get; set; }
        public bool IsManualEntry { get; set; }
        public string? ReasonManual { get; set; }
        public string Status { get; set; } = "Unbilled";
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTimeLogDto
    {
        public Guid? TaskId { get; set; }
        public Guid UserId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public decimal? DurationHours { get; set; }
        public bool IsBillable { get; set; } = true;
        public bool IsManualEntry { get; set; } = false;
        public string? ReasonManual { get; set; }
    }

    // ── Channels ──
    public class ChannelDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public Guid? SpaceId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateChannelDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsPrivate { get; set; } = false;
        public Guid? SpaceId { get; set; }
    }

    // ── Messages ──
    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid ChannelId { get; set; }
        public Guid SenderId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateMessageDto
    {
        public Guid ChannelId { get; set; }
        public Guid SenderId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    // ── Invoices ──
    public class InvoiceDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public Guid? SpaceId { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "draft";
        public DateTime CreatedAt { get; set; }
    }

    public class CreateInvoiceDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public Guid? SpaceId { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "draft";
    }

    // ── Payrolls ──
    public class PayrollDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal OvertimeHours { get; set; }
        public decimal TotalHours { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft";
        public DateTime CreatedAt { get; set; }
    }

    // ── Performance ──
    public class PerformanceDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid? EvaluatorId { get; set; }
        public decimal OverallScore { get; set; }
        public decimal AvgTurnaroundTime { get; set; }
        public decimal BugRate { get; set; }
        public string? HrComments { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Folders ──
    public class FolderDto
    {
        public Guid Id { get; set; }
        public Guid SpaceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateFolderDto
    {
        public Guid SpaceId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    // ── Lists ──
    public class ListDto
    {
        public Guid Id { get; set; }
        public Guid FolderId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateListDto
    {
        public Guid FolderId { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
