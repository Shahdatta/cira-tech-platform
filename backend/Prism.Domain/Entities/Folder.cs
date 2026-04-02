using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("folders")]
    public class Folder
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("space_id")]
        public Guid SpaceId { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("SpaceId")]
        public virtual ProjectSpace ProjectSpace { get; set; } = null!;

        public virtual ICollection<List> Lists { get; set; } = new List<List>();
    }
}
