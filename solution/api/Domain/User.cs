using System.ComponentModel.DataAnnotations;

namespace Sgcan.Api.Domain;

public class User
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(200)] public string Email { get; set; } = default!;
    [MaxLength(300)] public string PasswordHash { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
