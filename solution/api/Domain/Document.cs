using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Sgcan.Api.Domain;

public class Document
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();

    [ForeignKey(nameof(Upload))] public Guid UploadId { get; set; }
    public Upload Upload { get; set; } = default!;

    [MaxLength(200)] public string Nomenclatura { get; set; } = default!;
    [MaxLength(800)] public string Titulo { get; set; } = default!;
    [MaxLength(100)] public string? FechaPublicacion { get; set; } 
    [MaxLength(200)] public string DocumentoNombre { get; set; } = default!;
    [MaxLength(1000)] public string UrlDocumento { get; set; } = default!;
    public int? Paginas { get; set; }
    [MaxLength(100)] public string TipoDocumento { get; set; } = default!;

    public DocumentStatus Status { get; set; } = DocumentStatus.QUEUED;
    public string? ExtractedText { get; set; }  
    public string? ContentHash { get; set; }   
    public string? ErrorMessage { get; set; }   
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

}
