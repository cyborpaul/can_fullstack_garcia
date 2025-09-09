namespace Sgcan.Api.Messaging;

// Mensaje que consumirá el Worker Python
public record ExtractDocumentMessage(Guid DocumentId, Guid UploadId, string Url);
