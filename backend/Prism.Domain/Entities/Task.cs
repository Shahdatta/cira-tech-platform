using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum TaskStatus
    {
        ToDo,
        InProgress,
        InReview,
        Done
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

        public virtual ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
    }
}
