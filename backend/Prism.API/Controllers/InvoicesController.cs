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
    // [Authorize] // Disabled for testing
    public class InvoicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public InvoicesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetInvoices()
        {
            var invoices = await _context.Invoices
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new InvoiceDto
                {
                    Id = i.Id,
                    InvoiceNumber = i.InvoiceNumber,
                    UserId = i.UserId,
                    SpaceId = i.SpaceId,
                    IssueDate = i.IssueDate,
                    DueDate = i.DueDate,
                    SubTotal = i.SubTotal,
                    TaxAmount = i.TaxAmount,
                    TotalAmount = i.TotalAmount,
                    Status = i.Status.ToString().ToLower(),
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();

            return Ok(invoices);
        }

        [HttpPost]
        public async Task<ActionResult<InvoiceDto>> CreateInvoice(CreateInvoiceDto dto)
        {
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                InvoiceNumber = dto.InvoiceNumber,
                UserId = dto.UserId,
                SpaceId = dto.SpaceId,
                IssueDate = dto.IssueDate,
                DueDate = dto.DueDate,
                SubTotal = dto.SubTotal,
                TaxAmount = dto.TaxAmount,
                TotalAmount = dto.TotalAmount,
                Status = Enum.TryParse<InvoiceStatus>(dto.Status, true, out var st) ? st : InvoiceStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetInvoices), new { id = invoice.Id }, new InvoiceDto
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                UserId = invoice.UserId,
                SpaceId = invoice.SpaceId,
                IssueDate = invoice.IssueDate,
                DueDate = invoice.DueDate,
                SubTotal = invoice.SubTotal,
                TaxAmount = invoice.TaxAmount,
                TotalAmount = invoice.TotalAmount,
                Status = invoice.Status.ToString().ToLower(),
                CreatedAt = invoice.CreatedAt
            });
        }
    }
}
