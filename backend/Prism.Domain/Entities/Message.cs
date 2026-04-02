using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("messages")]
    public class Message
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("channel_id")]
        public Guid ChannelId { get; set; }

        [Required]
        [Column("sender_id")]
        public Guid SenderId { get; set; }

        [Required]
        [Column("content")]
        public string Content { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ChannelId")]
        public virtual Channel Channel { get; set; } = null!;

        [ForeignKey("SenderId")]
        public virtual Profile Sender { get; set; } = null!;
    }
}
