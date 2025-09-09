namespace Sgcan.Api.Dtos;

public record FileListDto(
    Guid id,
    string filename,
    DateTime created_at,
    int total_links,
    int processed_count,
    int error_count,
    string status
);
