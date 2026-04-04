using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("project_files")]
    public class ProjectFile
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("space_id")]
        public Guid SpaceId { get; set; }

        [Required]
        [Column("original_name")]
        public string OriginalName { get; set; } = string.Empty;

        [Column("content_type")]
        public string ContentType { get; set; } = "application/octet-stream";

        [Column("file_size")]
        public long FileSize { get; set; }

        [Column("stored_path")]
        public string StoredPath { get; set; } = string.Empty;

        [Column("uploaded_by")]
        public Guid? UploadedBy { get; set; }

        [Column("uploaded_at")]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("SpaceId")]
        public virtual ProjectSpace Space { get; set; } = null!;
    }
}
