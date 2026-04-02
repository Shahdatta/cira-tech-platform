using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum TimeLogStatus
    {
        Unbilled,
        Billed
    }

    [Table("time_logs")]
    public class TimeLog
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("task_id")]
        public Guid? TaskId { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("start_time")]
        public DateTime StartTime { get; set; }

        [Column("end_time")]
        public DateTime? EndTime { get; set; }

        [Column("duration_hours")]
        public decimal? DurationHours { get; set; }

        [Column("is_billable")]
        public bool IsBillable { get; set; } = true;

        [Column("is_manual_entry")]
        public bool IsManualEntry { get; set; } = false;

        [Column("reason_manual")]
        public string? ReasonManual { get; set; }

        [Column("status")]
        public TimeLogStatus Status { get; set; } = TimeLogStatus.Unbilled;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [ForeignKey("TaskId")]
        public virtual Task? Task { get; set; }

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;
    }
}
