using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("performance_appraisals")]
    public class PerformanceAppraisal
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("evaluator_id")]
        public Guid? EvaluatorId { get; set; }

        [Column("overall_score")]
        public decimal OverallScore { get; set; }

        [Column("avg_turnaround_time")]
        public decimal AvgTurnaroundTime { get; set; }

        [Column("bug_rate")]
        public decimal BugRate { get; set; }

        [Column("hr_comments")]
        public string? HrComments { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;

        [ForeignKey("EvaluatorId")]
        public virtual Profile? Evaluator { get; set; }
    }
}
