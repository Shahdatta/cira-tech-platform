using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("channel_invitations")]
    public class ChannelInvitation
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("channel_id")]
        public Guid ChannelId { get; set; }

        [Column("inviter_id")]
        public Guid InviterId { get; set; }

        [Column("invitee_id")]
        public Guid InviteeId { get; set; }

        // Pending | Accepted | Declined
        [Column("status")]
        public string Status { get; set; } = "Pending";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ChannelId")]
        public virtual Channel Channel { get; set; } = null!;

        [ForeignKey("InviterId")]
        public virtual Profile Inviter { get; set; } = null!;

        [ForeignKey("InviteeId")]
        public virtual Profile Invitee { get; set; } = null!;
    }
}
