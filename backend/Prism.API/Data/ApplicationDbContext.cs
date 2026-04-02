using Microsoft.EntityFrameworkCore;
using Prism.Domain.Entities;

namespace Prism.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Profile> Profiles { get; set; } = null!;
        public DbSet<UserRole> UserRoles { get; set; } = null!;
        public DbSet<ProjectSpace> ProjectSpaces { get; set; } = null!;
        public DbSet<Folder> Folders { get; set; } = null!;
        public DbSet<List> Lists { get; set; } = null!;
        public DbSet<Prism.Domain.Entities.Task> Tasks { get; set; } = null!;
        public DbSet<TimeLog> TimeLogs { get; set; } = null!;
        public DbSet<Channel> Channels { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;
        public DbSet<Invoice> Invoices { get; set; } = null!;
        public DbSet<InvoiceLineItem> InvoiceLineItems { get; set; } = null!;
        public DbSet<Payroll> Payrolls { get; set; } = null!;
        public DbSet<Attendance> Attendances { get; set; } = null!;
        public DbSet<PerformanceAppraisal> PerformanceAppraisals { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Enum mappings stored as strings for compatibility
            modelBuilder.Entity<Profile>()
                .Property(p => p.ContractType)
                .HasConversion<string>();

            modelBuilder.Entity<Prism.Domain.Entities.Task>()
                .Property(t => t.Status)
                .HasConversion<string>();

            modelBuilder.Entity<TimeLog>()
                .Property(t => t.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Invoice>()
                .Property(i => i.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Payroll>()
                .Property(p => p.Status)
                .HasConversion<string>();

            // Configure Relationships
            modelBuilder.Entity<Profile>()
                .HasMany(p => p.Roles)
                .WithOne(r => r.Profile)
                .HasForeignKey(r => r.UserId);

            modelBuilder.Entity<ProjectSpace>()
                .HasOne(s => s.Manager)
                .WithMany(p => p.ManagedSpaces)
                .HasForeignKey(s => s.ManagerId);

            modelBuilder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(p => p.Messages)
                .HasForeignKey(m => m.SenderId);

            modelBuilder.Entity<PerformanceAppraisal>()
                .HasOne(pa => pa.Profile)
                .WithMany(p => p.Appraisals)
                .HasForeignKey(pa => pa.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PerformanceAppraisal>()
                .HasOne(pa => pa.Evaluator)
                .WithMany()
                .HasForeignKey(pa => pa.EvaluatorId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
