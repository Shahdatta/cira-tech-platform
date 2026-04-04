using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("channels")]
    public class Channel
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("is_private")]
        public bool IsPrivate { get; set; } = false;

        [Column("space_id")]
        public Guid? SpaceId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("SpaceId")]
        public virtual ProjectSpace? ProjectSpace { get; set; }

        public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
        public virtual ICollection<ChannelMember> Members { get; set; } = new List<ChannelMember>();
        public virtual ICollection<ChannelInvitation> Invitations { get; set; } = new List<ChannelInvitation>();
    }
}
