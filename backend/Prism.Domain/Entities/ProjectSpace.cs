using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("project_spaces")]
    public class ProjectSpace
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("manager_id")]
        public Guid? ManagerId { get; set; }

        [Column("total_budget")]
        public decimal TotalBudget { get; set; }

        [Column("status")]
        public string Status { get; set; } = "active";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_deleted")]
        public bool IsDeleted { get; set; } = false;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("ManagerId")]
        public virtual Profile? Manager { get; set; }

        public virtual ICollection<Folder> Folders { get; set; } = new List<Folder>();
        public virtual ICollection<Channel> Channels { get; set; } = new List<Channel>();
        public virtual ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    }
}
