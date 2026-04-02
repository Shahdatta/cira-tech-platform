using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("attendances")]
    public class Attendance
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("work_date")]
        public DateTime WorkDate { get; set; }

        [Column("check_in")]
        public DateTime? CheckIn { get; set; }

        [Column("check_out")]
        public DateTime? CheckOut { get; set; }

        [Column("total_hours")]
        public decimal TotalHours { get; set; }

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;
    }
}
