using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    /// <summary>
    /// A report / comment attached to a task or project.
    /// - ReportType "submit"  → member submitting for review
    /// - ReportType "approve" → PM/Admin approving
    /// - ReportType "reject"  → PM/Admin rejecting with reason
    /// - ReportType "project" → Admin project-level comment (TaskId null, SpaceId set)
    /// </summary>
    [Table("task_reports")]
    public class TaskReport
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("task_id")]
        public Guid? TaskId { get; set; }

        [Column("space_id")]
        public Guid? SpaceId { get; set; }

        [Required]
        [Column("author_id")]
        public Guid AuthorId { get; set; }

        [Required]
        [Column("report_type")]
        public string ReportType { get; set; } = "submit"; // submit | approve | reject | project

        [Required]
        [Column("content")]
        public string Content { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("AuthorId")]
        public virtual Profile? Author { get; set; }

        [ForeignKey("TaskId")]
        public virtual Prism.Domain.Entities.Task? Task { get; set; }

        [ForeignKey("SpaceId")]
        public virtual ProjectSpace? Space { get; set; }
    }
}
