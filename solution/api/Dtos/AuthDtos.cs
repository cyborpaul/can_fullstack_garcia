namespace Sgcan.Api.Dtos;

public record RegisterRequest(string email, string password);
public record LoginRequest(string email, string password);
public record LoginResponse(string token, DateTime expires_at, Guid user_id, string email);
