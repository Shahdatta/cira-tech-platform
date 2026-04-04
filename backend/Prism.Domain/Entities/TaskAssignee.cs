using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("task_assignees")]
    public class TaskAssignee
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("task_id")]
        public Guid TaskId { get; set; }

        [Column("assignee_id")]
        public Guid AssigneeId { get; set; }

        [ForeignKey("TaskId")]
        public virtual Task Task { get; set; } = null!;

        [ForeignKey("AssigneeId")]
        public virtual Profile Profile { get; set; } = null!;
    }
}
