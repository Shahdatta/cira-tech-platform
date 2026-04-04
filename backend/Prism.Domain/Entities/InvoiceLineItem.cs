using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Prism.Domain.Entities
{
    [Table("invoice_line_items")]
    public class InvoiceLineItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("invoice_id")]
        public Guid InvoiceId { get; set; }

        [Column("time_log_id")]
        public Guid? TimeLogId { get; set; }

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("quantity")]
        public decimal Quantity { get; set; } = 1;

        [Column("unit")]
        public string Unit { get; set; } = "item";

        [Column("unit_price")]
        public decimal UnitPrice { get; set; }

        [Column("line_total")]
        public decimal LineTotal { get; set; }

        [ForeignKey("InvoiceId")]
        public virtual Invoice Invoice { get; set; } = null!;

        [ForeignKey("TimeLogId")]
        public virtual TimeLog? TimeLog { get; set; }
    }
}
