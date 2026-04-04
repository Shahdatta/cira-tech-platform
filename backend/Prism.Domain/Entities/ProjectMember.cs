using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("project_members")]
    public class ProjectMember
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("space_id")]
        public Guid SpaceId { get; set; }

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("joined_at")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("SpaceId")]
        public virtual ProjectSpace? ProjectSpace { get; set; }

        [ForeignKey("UserId")]
        public virtual Profile? Profile { get; set; }
    }
}
