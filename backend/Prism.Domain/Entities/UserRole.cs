using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum AppRole
    {
        Admin,
        PM,
        HR,
        Member,
        Guest
    }

    [Table("user_roles")]
    public class UserRole
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("role")]
        public AppRole Role { get; set; }

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;
    }
}
