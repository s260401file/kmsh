using kmsh_whiteboard.Data;
using kmsh_whiteboard.Repositories;
using kmsh_whiteboard.Services;
using kmsh_whiteboard.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// ── CORS ───────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

// ── SQL Server / Dapper ────────────────────────────────────────
builder.Services.AddSingleton<DbConnectionFactory>();
builder.Services.AddScoped<ITextRepository, TextRepository>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "護理白板 API", Version = "v1" });
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);
});

// ── 高榮 AMDR Service ──────────────────────────────────────────
builder.Services.Configure<VghksApiOptions>(
    builder.Configuration.GetSection(VghksApiOptions.Section));

var vghksOptions = builder.Configuration
    .GetSection(VghksApiOptions.Section)
    .Get<VghksApiOptions>()!;

builder.Services
    .AddHttpClient<IVghksApiService, VghksApiService>(client =>
    {
        client.BaseAddress = new Uri(vghksOptions.BaseUrl.TrimEnd('/') + "/");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = vghksOptions.IgnoreSslErrors
            ? HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            : null
    });

// ── 民生醫院 kmuh Service ──────────────────────────────────────
builder.Services.Configure<KmuhApiOptions>(
    builder.Configuration.GetSection(KmuhApiOptions.Section));

var kmuhOptions = builder.Configuration
    .GetSection(KmuhApiOptions.Section)
    .Get<KmuhApiOptions>()!;

builder.Services
    .AddHttpClient<IKmuhApiService, KmuhApiService>(client =>
    {
        client.BaseAddress = new Uri(kmuhOptions.BaseUrl.TrimEnd('/') + "/");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = kmuhOptions.IgnoreSslErrors
            ? HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
            : null
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
