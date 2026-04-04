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

        [Column("bonuses")]
        public decimal Bonuses { get; set; }

        [Column("deductions")]
        public decimal Deductions { get; set; }

        [Column("net_amount")]
        public decimal NetAmount { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("status")]
        public PayrollStatus Status { get; set; } = PayrollStatus.Draft;

        [Column("reimbursement_amount")]
        public decimal ReimbursementAmount { get; set; }

        [Column("reimbursement_notes")]
        public string? ReimbursementNotes { get; set; }

        [Column("approved_by")]
        public Guid? ApprovedBy { get; set; }

        [Column("approved_at")]
        public DateTime? ApprovedAt { get; set; }

        [Column("paid_at")]
        public DateTime? PaidAt { get; set; }

        [Column("payment_method")]
        public string PaymentMethod { get; set; } = "BankTransfer";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;
    }
}
