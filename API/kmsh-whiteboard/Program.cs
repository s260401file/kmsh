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
builder.Services.AddScoped<IContactRepository, ContactRepository>();
builder.Services.AddScoped<IEvacRepository, EvacRepository>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title       = "護理白板 API",
        Version     = "v1",
        Description =
            "高雄市立民生醫院 護理白板系統後端 API。\n\n" +
            "本服務作為代理層，封裝高榮（VGHKS AMDRService / UDSPService / LABService / MAASService）" +
            "及高醫（KMUH HRS / UAS / ERS / TMS / CNC）院方 HIS API，" +
            "並提供本地資料庫（Text 表）的佈告欄、跑馬燈等自建內容管理端點。\n\n" +
            "所有院方 API 的認證參數（KeyId / hid / apid）由服務層自動帶入，呼叫端無需傳入。",
    });
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
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

// Swagger 在所有環境開放（院內測試網路不對外）
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "護理白板 API v1");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "護理白板 API — Swagger";
});

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
