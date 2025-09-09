namespace Sgcan.Api.Dtos;

public record DocumentDto(
    Guid id,
    string? nomenclatura,
    string? titulo,
    string? fecha_publicacion,
    string documento,
    string url_documento,
    int? paginas,
    string tipo_documento,
    string status,
    string? text
);
