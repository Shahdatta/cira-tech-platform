using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("notifications")]
    public class Notification
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("message")]
        public string Message { get; set; } = string.Empty;

        // TaskAssigned | TaskCompleted | TaskInReview | TaskApproved | TaskRejected | Info
        [Column("type")]
        public string Type { get; set; } = "Info";

        [Column("is_read")]
        public bool IsRead { get; set; } = false;

        [Column("related_task_id")]
        public Guid? RelatedTaskId { get; set; }

        [Column("related_channel_invitation_id")]
        public Guid? RelatedChannelInvitationId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual Profile User { get; set; } = null!;
    }
}
