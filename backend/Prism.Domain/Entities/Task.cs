using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum TaskStatus
    {
        ToDo,
        InProgress,
        InReview,
        Done,
        Rejected
    }

    public enum TaskPriority
    {
        Low,
        Medium,
        High,
        Urgent
    }

    [Table("tasks")]
    public class Task
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("list_id")]
        public Guid ListId { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("assignee_id")]
        public Guid? AssigneeId { get; set; }

        [Column("status")]
        public TaskStatus Status { get; set; } = TaskStatus.ToDo;

        [Column("priority")]
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;

        [Column("estimated_hours")]
        public decimal? EstimatedHours { get; set; }

        [Column("reviewer_id")]
        public Guid? ReviewerId { get; set; }

        [Column("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }

        [Column("due_date")]
        public DateTime? DueDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ListId")]
        public virtual List List { get; set; } = null!;

        [ForeignKey("AssigneeId")]
        public virtual Profile? Assignee { get; set; }

        [ForeignKey("ReviewerId")]
        public virtual Profile? Reviewer { get; set; }

        public virtual ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
        public virtual ICollection<TaskAssignee> Assignees { get; set; } = new List<TaskAssignee>();
    }
}
