using System.ComponentModel.DataAnnotations;

namespace Sgcan.Api.Domain;

public class Upload
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(255)] public string FileName { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    
    public Guid UserId { get; set; }
    [MaxLength(64), Required]
    public string ContentHash { get; set; } = default!;

    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
