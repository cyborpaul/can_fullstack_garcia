using System.Globalization;
using System.Security.Claims;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Sgcan.Api.Csv;
using Sgcan.Api.Data;
using Sgcan.Api.Domain;
using Sgcan.Api.Dtos;
using Sgcan.Api.Messaging;
using Sgcan.Api.Services;
using System.Security.Cryptography;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

/* BASE DE DATOS */
var conn = Environment.GetEnvironmentVariable("DB_CONN")
           ?? cfg.GetConnectionString("Default")
           ?? "Host=localhost;Database=sgcan;Username=sgcan;Password=sgcan";
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(conn));

/* SWAGER PAR REFERENCIA  */
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

/* RABBIT */
builder.Services.AddSingleton<RabbitPublisher>();

/*  JWT Auth SIMPLE */
var secret = builder.Configuration["JWT_SECRET"] ?? Environment.GetEnvironmentVariable("JWT_SECRET") ?? "dev-secret";
var issuer = builder.Configuration["JWT_ISSUER"] ?? "sgcan-api";
var aud    = builder.Configuration["JWT_AUDIENCE"] ?? "sgcan-client";

builder.Services
  .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(o =>
  {
      o.TokenValidationParameters = new TokenValidationParameters
      {
          ValidateIssuer = true,
          ValidateAudience = true,
          ValidateIssuerSigningKey = true,
          ValidIssuer = issuer,
          ValidAudience = aud,
          IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
          ClockSkew = TimeSpan.FromSeconds(10)
      };
  });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<JwtTokenService>();

/* CORS */
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin()));

var app = builder.Build();

// Crear DB si no existe (dev)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Si no hay usuarios, crear uno de prueba (dev)
    if (!db.Users.Any())
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("admin123");
        db.Users.Add(new User { Email = "admin@sgcan.test", PasswordHash = hash });
        db.SaveChanges();
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

/* REGISTRO DE USUARIOS PARA PRUEBA */
app.MapPost("/register", async (RegisterRequest r, AppDbContext db) =>
{
    var email = r.email.Trim().ToLowerInvariant();
    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(r.password))
        return Results.BadRequest("Email y password requeridos");

    if (await db.Users.AnyAsync(u => u.Email == email))
        return Results.Conflict("Email ya registrado");

    var hash = BCrypt.Net.BCrypt.HashPassword(r.password);
    var user = new User { Email = email, PasswordHash = hash };
    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created($"/users/{user.Id}", new { user.Id, user.Email });
})
.WithTags("Auth");

app.MapPost("/login", async (LoginRequest r, AppDbContext db, JwtTokenService jwt) =>
{
    var email = r.email.Trim().ToLowerInvariant();
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user is null) return Results.Unauthorized();

    if (!BCrypt.Net.BCrypt.Verify(r.password, user.PasswordHash))
        return Results.Unauthorized();

    var (token, exp) = jwt.Generate(user);
    return Results.Ok(new LoginResponse(token, exp, user.Id, user.Email));
})
.WithTags("Auth");


/* SUBIDA DE ARCHIVOS */
app.MapPost("/upload", async (HttpRequest request, AppDbContext db, RabbitPublisher mq, ClaimsPrincipal me) =>
{
    if (!me.Identity?.IsAuthenticated ?? true) return Results.Unauthorized();

    var sub = me.FindFirstValue(ClaimTypes.NameIdentifier) ?? me.FindFirstValue("sub");
    if (!Guid.TryParse(sub, out var userId)) return Results.Unauthorized();

    if (!request.HasFormContentType) return Results.BadRequest("multipart/form-data requerido");
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0) return Results.BadRequest("file vacío");

    // 1) Calcular SHA-256 del archivo
    string contentHash;
    await using (var s = file.OpenReadStream())
    using (var sha = SHA256.Create())
    {
        var hashBytes = await sha.ComputeHashAsync(s);
        contentHash = Convert.ToHexString(hashBytes).ToLowerInvariant(); // 64 hex chars
    }

    // 2) Si ya existe ese hash, reutilizar y no reprocesar
    var yaExiste = await db.Uploads
        .AsNoTracking()
        .Include(u => u.Documents)
        .FirstOrDefaultAsync(u => u.ContentHash == contentHash);

    if (yaExiste is not null)
    {
        var total = yaExiste.Documents.Count;
        var processed = yaExiste.Documents.Count(d => d.Status == DocumentStatus.PROCESSED);
        var errors = yaExiste.Documents.Count(d => d.Status == DocumentStatus.ERROR);

        return Results.Ok(new
        {
            reused = true,
            uploadId = yaExiste.Id,
            fileName = yaExiste.FileName,
            total,
            processed,
            errors,
            status = (processed + errors) >= total && total > 0 ? "DONE" : "IN_PROGRESS"
        });
    }

    // 3) Crear Upload NUEVO con el hash
    var upload = new Upload
    {
        FileName = file.FileName,
        UserId = userId,
        ContentHash = contentHash // <-- NUEVO
    };
    db.Uploads.Add(upload);
    await db.SaveChangesAsync();

    // 4) Parseo CSV (robusto con variantes de cabeceras)
    var csvConf = new CsvConfiguration(CultureInfo.InvariantCulture)
    {
        HasHeaderRecord = true,
        Delimiter = ",",
        Encoding = System.Text.Encoding.UTF8,
        TrimOptions = TrimOptions.Trim,
        MissingFieldFound = null,
        BadDataFound = null,
        // HeaderValidated = null // <- si prefieres ignorar validación estricta
    };

    using var reader = new StreamReader(file.OpenReadStream(), System.Text.Encoding.UTF8); // reabrimos stream
    using var csv = new CsvReader(reader, csvConf);

    csv.Context.RegisterClassMap<Sgcan.Api.Csv.CsvRecordMap>();

    IEnumerable<Sgcan.Api.Csv.CsvRecord> rawRows;
    try
    {
        rawRows = csv.GetRecords<Sgcan.Api.Csv.CsvRecord>().ToList();
    }
    catch (HeaderValidationException hve)
    {
        return Results.BadRequest(new
        {
            error = "CSV inválido: encabeceras no coinciden.",
            detalle = hve.Message
        });
    }

    int count = 0;

    foreach (var r in rawRows)
    {
        string? titulo = r.Titulo?.Trim();
        string? fecha = r.FechaPublicacion?.Trim();
        string? url = r.UrlDocumento?.Trim();
        string? paginasStr = r.Paginas?.Trim();

        int? paginas = null;
        if (!string.IsNullOrWhiteSpace(paginasStr) && int.TryParse(paginasStr, out var p))
            paginas = p;

        string? fechaIso = fecha;
        if (!string.IsNullOrWhiteSpace(fecha) &&
            DateTime.TryParseExact(fecha, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var f))
            fechaIso = f.ToString("yyyy-MM-dd");

        var doc = new Document
        {
            UploadId = upload.Id,
            Nomenclatura = r.Nomenclatura?.Trim() ?? "",
            Titulo = titulo ?? "",
            FechaPublicacion = fechaIso,
            DocumentoNombre = r.Documento?.Trim() ?? "",
            UrlDocumento = url ?? "",
            Paginas = paginas,
            TipoDocumento = r.TipoDocumento?.Trim() ?? "",
            Status = DocumentStatus.QUEUED
        };

        db.Documents.Add(doc);
        count++;
    }

    await db.SaveChangesAsync();

    // 5) Publicar a la cola (una sola vez)
    var docsToPublish = await db.Documents
        .Where(d => d.UploadId == upload.Id)
        .Select(d => new { d.Id, d.UploadId, d.UrlDocumento })
        .ToListAsync();

    foreach (var d in docsToPublish)
        mq.Publish(new Sgcan.Api.Messaging.ExtractDocumentMessage(d.Id, d.UploadId, d.UrlDocumento));

    // 6) Respuesta
    return Results.Ok(new Sgcan.Api.Dtos.UploadResponseDto(upload.Id, count));
})
.WithTags("Uploads")
.RequireAuthorization();

/* GET /files?mine=true|false → si mine=true, requiere auth y filtra por UserId */
app.MapGet("/files", async (bool? mine, ClaimsPrincipal me, AppDbContext db) =>
{
    IQueryable<Upload> q = db.Uploads;

    if (mine == true)
    {
        if (!me.Identity?.IsAuthenticated ?? true) return Results.Unauthorized();
        var sub = me.FindFirstValue(ClaimTypes.NameIdentifier) ?? me.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return Results.Unauthorized();
        q = q.Where(u => u.UserId == userId);
    }

    var data = await q
        .Select(u => new
        {
            u.Id, u.FileName, u.CreatedAt,
            Total = u.Documents.Count,
            Processed = u.Documents.Count(d => d.Status == DocumentStatus.PROCESSED),
            Errors = u.Documents.Count(d => d.Status == DocumentStatus.ERROR)
        })
        .OrderByDescending(x => x.CreatedAt)
        .ToListAsync();

    var dto = data.Select(x => new Sgcan.Api.Dtos.FileListDto(
        x.Id, x.FileName, x.CreatedAt, x.Total, x.Processed, x.Errors,
        status: (x.Processed + x.Errors) >= x.Total && x.Total > 0 ? "DONE" : "IN_PROGRESS"
    ));

    return Results.Ok(dto);
})
.WithTags("Files");

/* GET /files/{id}/links */
app.MapGet("/files/{id:guid}/links", async (Guid id, AppDbContext db) =>
{
    var exists = await db.Uploads.AnyAsync(u => u.Id == id);
    if (!exists) return Results.NotFound();

    var docs = await db.Documents
        .Where(d => d.UploadId == id)
        .OrderBy(d => d.Nomenclatura)
        .Select(d => new Sgcan.Api.Dtos.DocumentDto(
            d.Id, d.Nomenclatura, d.Titulo, d.FechaPublicacion,
            d.DocumentoNombre, d.UrlDocumento, d.Paginas, d.TipoDocumento,
            d.Status.ToString(), d.ExtractedText
        ))
        .ToListAsync();

    return Results.Ok(docs);
})
.WithTags("Files");

app.MapGet("/", () => Results.Ok(new { ok = true, service = "sgcan-api", time = DateTime.UtcNow }));

app.Run();
