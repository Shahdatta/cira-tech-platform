using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    public enum InvoiceStatus
    {
        Draft,
        Sent,
        Paid
    }

    [Table("invoices")]
    public class Invoice
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("invoice_number")]
        public string InvoiceNumber { get; set; } = string.Empty;

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("space_id")]
        public Guid? SpaceId { get; set; }

        [Column("issue_date")]
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        [Column("due_date")]
        public DateTime? DueDate { get; set; }

        [Column("sub_total")]
        public decimal SubTotal { get; set; }

        [Column("tax_amount")]
        public decimal TaxAmount { get; set; }

        [Column("total_amount")]
        public decimal TotalAmount { get; set; }

        [Column("status")]
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual Profile Profile { get; set; } = null!;

        [ForeignKey("SpaceId")]
        public virtual ProjectSpace? ProjectSpace { get; set; }

        public virtual ICollection<InvoiceLineItem> LineItems { get; set; } = new List<InvoiceLineItem>();
    }
}
