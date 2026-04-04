using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("channel_members")]
    public class ChannelMember
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("channel_id")]
        public Guid ChannelId { get; set; }

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("joined_at")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ChannelId")]
        public virtual Channel Channel { get; set; } = null!;

        [ForeignKey("UserId")]
        public virtual Profile User { get; set; } = null!;
    }
}
