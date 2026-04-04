using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Prism.API.Data;
using Prism.API.Services;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration (SQLite)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Authentication (JWT)
var jwtSettings = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(opt => {
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!))
    };
});

// 3. Controllers & JSON snake_case serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// 3b. Authorization — role-based policies
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    options.AddPolicy("AdminOrPM", p => p.RequireRole("Admin", "PM"));
    options.AddPolicy("AdminOrHR", p => p.RequireRole("Admin", "HR"));
    options.AddPolicy("AdminPMorHR", p => p.RequireRole("Admin", "PM", "HR"));
    options.AddPolicy("NotGuest", p => p.RequireRole("Admin", "PM", "HR", "Member"));
});

// 4. Business Services
builder.Services.AddScoped<IPayrollService, PayrollService>();
builder.Services.AddSingleton<RateLimitService>();

// 5. CORS Setup
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? new[] { "http://localhost:5173", "http://localhost:8080" })
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 6. OpenApi/Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await context.Database.EnsureCreatedAsync();
    await context.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS project_members (
            id TEXT NOT NULL PRIMARY KEY,
            space_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(space_id, user_id)
        );");
    await context.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS channel_members (
            id TEXT NOT NULL PRIMARY KEY,
            channel_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at TEXT NOT NULL DEFAULT (datetime('now'))
        );");
    await context.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS channel_invitations (
            id TEXT NOT NULL PRIMARY KEY,
            channel_id TEXT NOT NULL,
            inviter_id TEXT NOT NULL,
            invitee_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );");
    try
    {
        await context.Database.ExecuteSqlRawAsync(
            "ALTER TABLE notifications ADD COLUMN related_channel_invitation_id TEXT NULL");
    }
    catch { /* column already exists */ }
    await DbSeeder.SeedAsync(context);

    // Backfill invoices with blank/null invoice numbers
    var blankInvoices = await context.Invoices
        .Where(i => i.InvoiceNumber == null || i.InvoiceNumber == "")
        .OrderBy(i => i.CreatedAt).ThenBy(i => i.Id)
        .ToListAsync();

    if (blankInvoices.Any())
    {
        foreach (var grp in blankInvoices.GroupBy(i => i.CreatedAt.Year))
        {
            var year = grp.Key;
            var prefix = $"INV-{year}-";
            var existing = await context.Invoices
                .Where(i => i.InvoiceNumber != null && i.InvoiceNumber.StartsWith(prefix))
                .Select(i => i.InvoiceNumber!)
                .ToListAsync();

            var maxN = existing
                .Select(n => int.TryParse(n.Substring(prefix.Length), out var x) ? x : 0)
                .DefaultIfEmpty(0).Max();

            var counter = maxN + 1;
            foreach (var inv in grp)
            {
                inv.InvoiceNumber = $"{prefix}{counter:D3}";
                counter++;
            }
        }
        await context.SaveChangesAsync();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// Serve uploaded files (optional — download is handled via controller)
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
