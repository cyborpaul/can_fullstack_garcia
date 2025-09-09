using Microsoft.EntityFrameworkCore;
using Sgcan.Api.Domain;

namespace Sgcan.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> opts) : DbContext(opts)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Upload> Uploads => Set<Upload>();
    public DbSet<Document> Documents => Set<Document>();

protected override void OnModelCreating(ModelBuilder mb)
{
    base.OnModelCreating(mb);

    // Users
    mb.Entity<User>(e =>
    {
        e.HasIndex(u => u.Email).IsUnique();
        e.Property(u => u.Email).HasMaxLength(200).IsRequired();
        e.Property(u => u.PasswordHash).HasMaxLength(300).IsRequired();
    });

    // Uploads
    mb.Entity<Upload>(e =>
    {
        e.Property(u => u.FileName).HasMaxLength(255).IsRequired();

        // NUEVO: hash de contenido (SHA-256, 64 chars) + índice único
        e.Property(u => u.ContentHash).HasMaxLength(64).IsRequired();
        e.HasIndex(u => u.ContentHash).IsUnique();
        e.HasIndex(u => u.UserId);
        e.HasMany(u => u.Documents)
         .WithOne(d => d.Upload)
         .HasForeignKey(d => d.UploadId)
         .OnDelete(DeleteBehavior.Cascade);
    });

    mb.Entity<Document>(e =>
    {
        e.HasIndex(d => d.UploadId);

        e.Property(d => d.Status)
         .HasConversion<string>()
         .HasMaxLength(20);

        e.Property(d => d.Nomenclatura).HasMaxLength(200).IsRequired();
        e.Property(d => d.Titulo).HasMaxLength(800).IsRequired();
        e.Property(d => d.FechaPublicacion).HasMaxLength(100);
        e.Property(d => d.DocumentoNombre).HasMaxLength(200).IsRequired();
        e.Property(d => d.UrlDocumento).HasMaxLength(1000).IsRequired();
        e.Property(d => d.TipoDocumento).HasMaxLength(100).IsRequired();
    });
}





}
