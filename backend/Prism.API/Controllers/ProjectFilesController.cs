using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Prism.API.Data;
using Prism.API.DTOs;
using Prism.Domain.Entities;

namespace Prism.API.Controllers
{
    [ApiController]
    [Route("api/projects/{spaceId}/files")]
    [Authorize]
    public class ProjectFilesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public ProjectFilesController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private string UploadsFolder =>
            Path.Combine(_env.ContentRootPath, "uploads");

        // GET /api/projects/{spaceId}/files
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectFileDto>>> GetFiles(Guid spaceId)
        {
            var space = await _context.ProjectSpaces.FindAsync(spaceId);
            if (space == null || space.IsDeleted) return NotFound();

            var files = await _context.ProjectFiles
                .Where(f => f.SpaceId == spaceId)
                .OrderByDescending(f => f.UploadedAt)
                .ToListAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            return Ok(files.Select(f => new ProjectFileDto
            {
                Id = f.Id,
                SpaceId = f.SpaceId,
                OriginalName = f.OriginalName,
                ContentType = f.ContentType,
                FileSize = f.FileSize,
                DownloadUrl = $"{baseUrl}/api/projects/{spaceId}/files/{f.Id}/download",
                UploadedAt = f.UploadedAt
            }));
        }

        // POST /api/projects/{spaceId}/files
        [HttpPost]
        [RequestSizeLimit(52_428_800)] // 50 MB
        public async Task<ActionResult<IEnumerable<ProjectFileDto>>> UploadFiles(
            Guid spaceId,
            [FromForm] IFormFileCollection files)
        {
            var space = await _context.ProjectSpaces.FindAsync(spaceId);
            if (space == null || space.IsDeleted) return NotFound();

            if (files == null || files.Count == 0)
                return BadRequest(new { message = "No files provided." });

            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdString, out var uploaderId);

            var uploadsDir = Path.Combine(UploadsFolder, spaceId.ToString());
            Directory.CreateDirectory(uploadsDir);

            var saved = new List<ProjectFileDto>();
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                var fileId = Guid.NewGuid();
                var extension = Path.GetExtension(file.FileName);
                var storedName = $"{fileId}{extension}";
                var storedPath = Path.Combine(uploadsDir, storedName);

                using (var stream = System.IO.File.Create(storedPath))
                {
                    await file.CopyToAsync(stream);
                }

                var pf = new ProjectFile
                {
                    Id = fileId,
                    SpaceId = spaceId,
                    OriginalName = file.FileName,
                    ContentType = file.ContentType ?? "application/octet-stream",
                    FileSize = file.Length,
                    StoredPath = storedPath,
                    UploadedBy = uploaderId != Guid.Empty ? uploaderId : null,
                    UploadedAt = DateTime.UtcNow
                };

                _context.ProjectFiles.Add(pf);
                saved.Add(new ProjectFileDto
                {
                    Id = pf.Id,
                    SpaceId = pf.SpaceId,
                    OriginalName = pf.OriginalName,
                    ContentType = pf.ContentType,
                    FileSize = pf.FileSize,
                    DownloadUrl = $"{baseUrl}/api/projects/{spaceId}/files/{pf.Id}/download",
                    UploadedAt = pf.UploadedAt
                });
            }

            await _context.SaveChangesAsync();
            return Ok(saved);
        }

        // GET /api/projects/{spaceId}/files/{fileId}/download?inline=true
        [HttpGet("{fileId}/download")]
        public async Task<IActionResult> DownloadFile(Guid spaceId, Guid fileId, [FromQuery] bool inline = false)
        {
            var pf = await _context.ProjectFiles
                .FirstOrDefaultAsync(f => f.Id == fileId && f.SpaceId == spaceId);

            if (pf == null) return NotFound();
            if (!System.IO.File.Exists(pf.StoredPath)) return NotFound(new { message = "File not found on disk." });

            var bytes = await System.IO.File.ReadAllBytesAsync(pf.StoredPath);

            if (inline)
            {
                // Serve with Content-Disposition: inline so the browser opens the file
                Response.Headers["Content-Disposition"] = $"inline; filename=\"{pf.OriginalName}\"";
                return File(bytes, pf.ContentType);
            }

            return File(bytes, pf.ContentType, pf.OriginalName);
        }

        // DELETE /api/projects/{spaceId}/files/{fileId}
        [HttpDelete("{fileId}")]
        public async Task<IActionResult> DeleteFile(Guid spaceId, Guid fileId)
        {
            var pf = await _context.ProjectFiles
                .FirstOrDefaultAsync(f => f.Id == fileId && f.SpaceId == spaceId);

            if (pf == null) return NotFound();

            if (System.IO.File.Exists(pf.StoredPath))
                System.IO.File.Delete(pf.StoredPath);

            _context.ProjectFiles.Remove(pf);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
