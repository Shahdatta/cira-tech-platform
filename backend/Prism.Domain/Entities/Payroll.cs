using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum PayrollStatus
    {
        Draft,
        Approved,
        Paid
    }

    [Table("payrolls")]
    public class Payroll
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("period_start")]
        public DateTime PeriodStart { get; set; }

        [Required]
        [Column("period_end")]
        public DateTime PeriodEnd { get; set; }

        [Column("base_salary")]
        public decimal BaseSalary { get; set; }

        [Column("overtime_hours")]
        public decimal OvertimeHours { get; set; }

        [Column("total_hours")]
        public decimal TotalHours { get; set; }

        [Column("total_amount")]
        public decimal TotalAmount { get; set; }

        [Column("status")]
        public PayrollStatus Status { get; set; } = PayrollStatus.Draft;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;
    }
}
