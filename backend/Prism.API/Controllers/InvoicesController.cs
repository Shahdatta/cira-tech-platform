using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.Domain.Entities;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Authorize(Policy = "AdminOrPM")]
    public class InvoicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InvoicesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetInvoices(
            [FromQuery] string? type,
            [FromQuery] string? status)
        {
            var query = _context.Invoices
                .Include(i => i.Profile)
                .Include(i => i.ProjectSpace)
                .Include(i => i.LineItems)
                .AsQueryable();

            if (!string.IsNullOrEmpty(type) && Enum.TryParse<InvoiceType>(type, true, out var invoiceType))
                query = query.Where(i => i.InvoiceType == invoiceType);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<InvoiceStatus>(status, true, out var invoiceStatus))
                query = query.Where(i => i.Status == invoiceStatus);

            var invoices = await query
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            return Ok(invoices.Select(MapToDto).ToList());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<InvoiceDto>> GetInvoice(Guid id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Profile)
                .Include(i => i.ProjectSpace)
                .Include(i => i.LineItems)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound();
            return Ok(MapToDto(invoice));
        }

        [HttpPost]
        public async Task<ActionResult<InvoiceDto>> CreateInvoice([FromBody] CreateInvoiceDto dto)
        {
            if (!Enum.TryParse<InvoiceType>(dto.InvoiceType, true, out var invoiceType))
                invoiceType = InvoiceType.Services;

            // Auto-generate invoice number: INV-YYYY-NNN
            var year = DateTime.UtcNow.Year;
            var countThisYear = await _context.Invoices
                .CountAsync(i => i.CreatedAt.Year == year);
            var autoNumber = $"INV-{year}-{(countThisYear + 1):D3}";

            var lineItems = dto.LineItems.Select(li => new InvoiceLineItem
            {
                Id          = Guid.NewGuid(),
                Description = li.Description,
                Quantity    = li.Quantity,
                Unit        = li.Unit,
                UnitPrice   = li.UnitPrice,
                LineTotal   = Math.Round(li.Quantity * li.UnitPrice, 2)
            }).ToList();

            var subTotal    = lineItems.Sum(li => li.LineTotal);
            var taxAmount   = Math.Round(subTotal * dto.TaxRate, 2);
            var totalAmount = subTotal + taxAmount;

            var invoice = new Invoice
            {
                Id            = Guid.NewGuid(),
                InvoiceNumber = autoNumber,
                UserId        = dto.UserId,
                SpaceId       = dto.SpaceId,
                InvoiceType   = invoiceType,
                RecipientName = dto.RecipientName,
                Notes         = dto.Notes,
                PayrollRefId  = dto.PayrollRefId,
                IssueDate     = dto.IssueDate,
                DueDate       = dto.DueDate,
                SubTotal      = subTotal,
                TaxAmount     = taxAmount,
                TotalAmount   = totalAmount,
                Status        = InvoiceStatus.Draft,
                CreatedAt     = DateTime.UtcNow,
                UpdatedAt     = DateTime.UtcNow
            };

            foreach (var li in lineItems)
            {
                li.InvoiceId = invoice.Id;
                invoice.LineItems.Add(li);
            }

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            // Notify all Admins about the newly created invoice
            var creatorName = await _context.Profiles
                .Where(p => p.Id == dto.UserId)
                .Select(p => p.FullName)
                .FirstOrDefaultAsync() ?? "Someone";

            var adminIds = await _context.UserRoles
                .Where(r => r.Role == AppRole.Admin)
                .Select(r => r.UserId)
                .ToListAsync();

            if (adminIds.Any())
            {
                var notifs = adminIds.Select(adminId => new Notification
                {
                    Id        = Guid.NewGuid(),
                    UserId    = adminId,
                    Title     = "New Invoice Created",
                    Message   = $"{creatorName} created {autoNumber} ({dto.InvoiceType}) — {dto.RecipientName ?? "N/A"} · Total: ${totalAmount:F2}",
                    Type      = "Info",
                    IsRead    = false,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                await _context.Notifications.AddRangeAsync(notifs);
                await _context.SaveChangesAsync();
            }

            var created = await _context.Invoices
                .Include(i => i.Profile)
                .Include(i => i.ProjectSpace)
                .Include(i => i.LineItems)
                .FirstAsync(i => i.Id == invoice.Id);

            return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, MapToDto(created));
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateInvoiceStatusDto dto)
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null) return NotFound();

            if (!Enum.TryParse<InvoiceStatus>(dto.Status, true, out var invoiceStatus))
                return BadRequest("Invalid status. Use: Draft, Sent, or Paid.");

            // Only Admins may mark an invoice as Paid
            if (invoiceStatus == InvoiceStatus.Paid)
            {
                var roleString = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (roleString != "Admin")
                    return Forbid();
            }

            invoice.Status    = invoiceStatus;
            invoice.UpdatedAt = DateTime.UtcNow;

            // When a payroll invoice is paid, sync the linked payroll to Paid
            if (invoiceStatus == InvoiceStatus.Paid && invoice.PayrollRefId.HasValue)
            {
                var payroll = await _context.Payrolls.FindAsync(invoice.PayrollRefId.Value);
                if (payroll != null && payroll.Status != PayrollStatus.Paid)
                {
                    payroll.Status = PayrollStatus.Paid;
                    payroll.PaidAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            // Notify all Admins when an invoice is marked as Sent
            if (invoiceStatus == InvoiceStatus.Sent)
            {
                var senderName = User.FindFirst("email")?.Value
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? "Someone";

                var adminIds = await _context.UserRoles
                    .Where(r => r.Role == AppRole.Admin)
                    .Select(r => r.UserId)
                    .ToListAsync();

                if (adminIds.Any())
                {
                    var notifs = adminIds.Select(adminId => new Notification
                    {
                        Id        = Guid.NewGuid(),
                        UserId    = adminId,
                        Title     = "Invoice Sent",
                        Message   = $"Invoice {invoice.InvoiceNumber} ({invoice.InvoiceType}) for {invoice.RecipientName ?? "N/A"} · Total: ${invoice.TotalAmount:F2} has been sent and is awaiting payment approval.",
                        Type      = "Info",
                        IsRead    = false,
                        CreatedAt = DateTime.UtcNow
                    }).ToList();

                    await _context.Notifications.AddRangeAsync(notifs);
                    await _context.SaveChangesAsync();
                }
            }

            return NoContent();
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] CreateInvoiceDto dto)
        {
            var invoice = await _context.Invoices
                .Include(i => i.LineItems)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound();
            if (invoice.Status != InvoiceStatus.Draft)
                return BadRequest(new { message = "Only Draft invoices can be edited." });

            if (!Enum.TryParse<InvoiceType>(dto.InvoiceType, true, out var invoiceType))
                invoiceType = InvoiceType.Services;

            var newLineItems = dto.LineItems.Select(li => new InvoiceLineItem
            {
                Id          = Guid.NewGuid(),
                InvoiceId   = id,
                Description = li.Description,
                Quantity    = li.Quantity,
                Unit        = li.Unit,
                UnitPrice   = li.UnitPrice,
                LineTotal   = Math.Round(li.Quantity * li.UnitPrice, 2)
            }).ToList();

            var subTotal    = newLineItems.Sum(li => li.LineTotal);
            var taxAmount   = Math.Round(subTotal * dto.TaxRate, 2);
            var totalAmount = subTotal + taxAmount;

            _context.InvoiceLineItems.RemoveRange(invoice.LineItems);

            invoice.SpaceId       = dto.SpaceId;
            invoice.InvoiceType   = invoiceType;
            invoice.RecipientName = dto.RecipientName;
            invoice.Notes         = dto.Notes;
            invoice.DueDate       = dto.DueDate;
            invoice.SubTotal      = subTotal;
            invoice.TaxAmount     = taxAmount;
            invoice.TotalAmount   = totalAmount;
            invoice.UpdatedAt     = DateTime.UtcNow;
            invoice.LineItems     = newLineItems;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteInvoice(Guid id)
        {
            var invoice = await _context.Invoices
                .Include(i => i.LineItems)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound();
            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static InvoiceDto MapToDto(Invoice i) => new()
        {
            Id            = i.Id,
            InvoiceNumber = i.InvoiceNumber,
            UserId        = i.UserId,
            IssuedByName  = i.Profile?.FullName ?? "Unknown",
            SpaceId       = i.SpaceId,
            SpaceName     = i.ProjectSpace?.Name,
            InvoiceType   = i.InvoiceType.ToString(),
            RecipientName = i.RecipientName,
            Notes         = i.Notes,
            PayrollRefId  = i.PayrollRefId,
            IssueDate     = i.IssueDate,
            DueDate       = i.DueDate,
            SubTotal      = i.SubTotal,
            TaxAmount     = i.TaxAmount,
            TotalAmount   = i.TotalAmount,
            Status        = i.Status.ToString(),
            LineItems     = i.LineItems.Select(li => new InvoiceLineItemDto
            {
                Id          = li.Id,
                Description = li.Description,
                Quantity    = li.Quantity,
                Unit        = li.Unit,
                UnitPrice   = li.UnitPrice,
                LineTotal   = li.LineTotal
            }).OrderBy(li => li.Id).ToList(),
            CreatedAt = i.CreatedAt
        };
    }
}
