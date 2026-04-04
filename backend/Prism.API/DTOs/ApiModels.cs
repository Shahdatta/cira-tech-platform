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

    public class UpdateProfileDto
    {
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? Iban { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    // ── Task Reports ──
    public class TaskReportDto
    {
        public Guid Id { get; set; }
        public Guid? TaskId { get; set; }
        public Guid? SpaceId { get; set; }
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorRole { get; set; } = string.Empty;
        public string ReportType { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTaskReportDto
    {
        public Guid? TaskId { get; set; }
        public Guid? SpaceId { get; set; }
        public string ReportType { get; set; } = "submit"; // submit | approve | reject | project
        public string Content { get; set; } = string.Empty;
    }

    public class SubmitReviewDto
    {
        public string? Content { get; set; }
    }

    public class ReviewActionDto
    {
        public string? Content { get; set; }
    }

    // ── Projects ──
    public class ProjectSpaceDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal TotalBudget { get; set; }
        public decimal SpentBudget { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = "active";
        public DateTime CreatedAt { get; set; }
        public int TaskCount { get; set; }
        public int CompletionPercent { get; set; }
    }

    public class AddProjectMembersDto
    {
        public List<string> UserIds { get; set; } = new();
    }

    // ── Tasks ──
    public class TaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "ToDo";
        public string Priority { get; set; } = "Medium";
        public decimal? EstimatedHours { get; set; }
        public Guid? ReviewerId { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
        public List<Guid> AssigneeIds { get; set; } = new();
        public Guid ListId { get; set; }
    }

    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "todo";
        public string Priority { get; set; } = "Medium";
        public decimal? EstimatedHours { get; set; }
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
        public List<Guid> AssigneeIds { get; set; } = new();
        public Guid ListId { get; set; }
    }

    // ── Profiles ──
    public class ProfileDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public decimal HourlyRate { get; set; }
        public decimal BaseSalary { get; set; }
        public int HoursPerWeek { get; set; } = 40;
        public string ContractType { get; set; } = "ft";
        public bool IsActive { get; set; } = true;
        public string Role { get; set; } = "Member";
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? Iban { get; set; }
        public string PaymentMethod { get; set; } = "BankTransfer";
        public DateTime CreatedAt { get; set; }
    }

    public class CreateProfileDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
        public string? Phone { get; set; }
        public decimal HourlyRate { get; set; }
        public decimal BaseSalary { get; set; }
        public int HoursPerWeek { get; set; } = 40;
        public string ContractType { get; set; } = "ft";
        public string Role { get; set; } = "Member";
        public Guid? UserId { get; set; }
        public bool IsActive { get; set; } = true;
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? Iban { get; set; }
        public string PaymentMethod { get; set; } = "BankTransfer";
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

    public class InviteToChannelDto
    {
        public List<Guid> UserIds { get; set; } = new();
    }

    public class ChannelInvitationDto
    {
        public Guid Id { get; set; }
        public Guid ChannelId { get; set; }
        public string ChannelName { get; set; } = string.Empty;
        public string InviterName { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public DateTime CreatedAt { get; set; }
    }

    public class ChannelMemberDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
    }

    // ── Messages ──
    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid ChannelId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateMessageDto
    {
        public Guid ChannelId { get; set; }
        public Guid SenderId { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    // ── Project Files ──
    public class ProjectFileDto
    {
        public Guid Id { get; set; }
        public Guid SpaceId { get; set; }
        public string OriginalName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string DownloadUrl { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }

    // ── Invoices ──
    // ── Invoice Line Items ──
    public class InvoiceLineItemDto
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = "item";
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class CreateInvoiceLineItemDto
    {
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; } = 1;
        public string Unit { get; set; } = "item";
        public decimal UnitPrice { get; set; }
    }

    // ── Invoices ──
    public class InvoiceDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string IssuedByName { get; set; } = string.Empty;
        public Guid? SpaceId { get; set; }
        public string? SpaceName { get; set; }
        public string InvoiceType { get; set; } = "Services";
        public string? RecipientName { get; set; }
        public string? Notes { get; set; }
        public Guid? PayrollRefId { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Draft";
        public List<InvoiceLineItemDto> LineItems { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    public class CreateInvoiceDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public Guid? SpaceId { get; set; }
        public string InvoiceType { get; set; } = "Services";
        public string? RecipientName { get; set; }
        public string? Notes { get; set; }
        public Guid? PayrollRefId { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal TaxRate { get; set; } = 0;
        public List<CreateInvoiceLineItemDto> LineItems { get; set; } = new();
    }

    public class UpdateInvoiceStatusDto
    {
        public string Status { get; set; } = "Draft";
    }

    public class UpdateTaskStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    // ── Payrolls ──
    public class PayrollDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string ContractType { get; set; } = "ft";
        public decimal HourlyRate { get; set; }
        public decimal BaseSalary { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public decimal TotalHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public decimal OvertimePay { get; set; }
        public decimal Bonuses { get; set; }
        public decimal PerformanceBonus { get; set; }
        public decimal Deductions { get; set; }
        public decimal ReimbursementAmount { get; set; }
        public string? ReimbursementNotes { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal PerformanceScore { get; set; }
        public string Status { get; set; } = "Draft";
        public string PaymentMethod { get; set; } = "BankTransfer";
        public string? BankName { get; set; }
        public string? AccountNumber { get; set; }
        public string? Iban { get; set; }
        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePayrollDto
    {
        public Guid UserId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public decimal TotalHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public decimal Deductions { get; set; }
        public string? Notes { get; set; }
        public string PaymentMethod { get; set; } = "BankTransfer";
    }

    public class UpdatePayrollStatusDto
    {
        public string Status { get; set; } = "Draft";
    }

    public class PayrollPreviewDto
    {
        public Guid UserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string ContractType { get; set; } = string.Empty;
        public decimal TotalHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public int LogsCount { get; set; }
        public decimal HourlyRate { get; set; }
        public decimal BaseSalary { get; set; }
        public decimal EstimatedPay { get; set; }
    }

    public class PayrollSummaryDto
    {
        public int FtCount { get; set; }
        public decimal FtTotal { get; set; }
        public int PtCount { get; set; }
        public decimal PtTotal { get; set; }
        public int FlCount { get; set; }
        public decimal FlTotal { get; set; }
        public decimal GrandTotal { get; set; }
        public int DraftCount { get; set; }
        public int ApprovedCount { get; set; }
        public int PaidCount { get; set; }
    }

    // ── Performance ──
    public class PerformanceDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public Guid? EvaluatorId { get; set; }
        public string? EvaluatorName { get; set; }
        public decimal OverallScore { get; set; }
        public decimal AvgTurnaroundTime { get; set; }
        public decimal BugRate { get; set; }
        public string? HrComments { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePerformanceDto
    {
        public Guid UserId { get; set; }
        public decimal OverallScore { get; set; }
        public decimal AvgTurnaroundTime { get; set; }
        public decimal BugRate { get; set; }
        public string? HrComments { get; set; }
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
        public Guid SpaceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateListDto
    {
        public Guid FolderId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    // ── Notifications ──
    public class NotificationDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "Info";
        public bool IsRead { get; set; }
        public Guid? RelatedTaskId { get; set; }
        public Guid? RelatedChannelInvitationId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── BI Dashboard ──
    public class DashboardSummaryDto
    {
        public int ActiveProjects { get; set; }
        public int OpenTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int TasksInReview { get; set; }
        public int TasksDueThisWeek { get; set; }
        public decimal TotalHoursLogged { get; set; }
        public int ActiveMembers { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalBudget { get; set; }
        public decimal SpentBudget { get; set; }
        public int Efficiency { get; set; }
        public string ScopeLabel { get; set; } = "Company Overview";
        public List<ProjectBudgetHealthDto> ProjectBudgetHealth { get; set; } = new();
        public List<TaskStatusDistributionDto> TaskStatusDistribution { get; set; } = new();
        public List<ProjectTaskBreakdownDto> ProjectTaskBreakdown { get; set; } = new();
    }

    public class ProjectTaskBreakdownDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public int TotalTasks { get; set; }
        public int DoneTasks { get; set; }
        public int OpenTasks { get; set; }
        public int OverdueTasks { get; set; }
        public int MembersCount { get; set; }
        public int ProgressPercent { get; set; }
        public string Status { get; set; } = "active";
    }

    public class ProjectBudgetHealthDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public decimal TotalBudget { get; set; }
        public decimal SpentBudget { get; set; }
        public decimal PercentUsed { get; set; }
        public string Status { get; set; } = "active";
    }

    public class TaskStatusDistributionDto
    {
        public string Status { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    // ── Employee Self-View ──
    public class MyPayrollSummaryDto
    {
        public List<PayrollDto> Payrolls { get; set; } = new();
        public decimal TotalEarned { get; set; }
        public decimal PendingAmount { get; set; }
        public decimal ApprovedAmount { get; set; }
        public decimal PaidAmount { get; set; }
    }
}
