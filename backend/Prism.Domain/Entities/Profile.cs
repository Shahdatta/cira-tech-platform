using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum ContractType
    {
        FT,
        PT,
        FL
    }

    public enum PaymentMethod
    {
        BankTransfer,
        Cash
    }

    [Table("profiles")]
    public class Profile
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("full_name")]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Column("hourly_rate")]
        public decimal HourlyRate { get; set; }

        [Column("base_salary")]
        public decimal BaseSalary { get; set; }

        [Column("hours_per_week")]
        public int HoursPerWeek { get; set; } = 40;

        [Column("contract_type")]
        public ContractType ContractType { get; set; } = ContractType.FT;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("phone")]
        public string? Phone { get; set; }

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Bank Information
        [Column("bank_name")]
        public string? BankName { get; set; }

        [Column("account_number")]
        public string? AccountNumber { get; set; }

        [Column("iban")]
        public string? Iban { get; set; }

        [Column("payment_method")]
        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.BankTransfer;

        // Navigation properties
        public virtual ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
        public virtual ICollection<ProjectSpace> ManagedSpaces { get; set; } = new List<ProjectSpace>();
        public virtual ICollection<Task> AssignedTasks { get; set; } = new List<Task>();
        public virtual ICollection<TimeLog> TimeLogs { get; set; } = new List<TimeLog>();
        public virtual ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
        public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
        public virtual ICollection<PerformanceAppraisal> Appraisals { get; set; } = new List<PerformanceAppraisal>();
        public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
