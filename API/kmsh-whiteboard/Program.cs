using System.Text;
using kmsh_whiteboard.Data;
using kmsh_whiteboard.Repositories;
using kmsh_whiteboard.Security;
using kmsh_whiteboard.Services;
using kmsh_whiteboard.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

// ── 建立 WebApplication Builder 與註冊 MVC Controllers ──────────
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(o =>
{
    // 全域防護：非 GET 一律要求已登入（[AllowAnonymous] 例外）；詳 MutationAuthorizationFilter
    o.Filters.Add<MutationAuthorizationFilter>();
    // 全域操作稽核：修改類請求自動記錄操作者/內容/結果；詳 OperationAuditFilter
    o.Filters.Add<OperationAuditFilter>();
});

// ── JWT 認證（後台登入 token；登入端點簽發，白板 GET 不需要）────
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt 設定未提供");
if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) || jwtOptions.SigningKey.Length < 32)
    throw new InvalidOperationException("Jwt:SigningKey 未設定或長度不足（至少 32 字元）");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // 保留原始 claim 名稱（sub/name/role/unit）
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            NameClaimType = "sub",    // User.Identity.Name = 員編
            RoleClaimType = "role",   // [Authorize(Roles="Admin")]
        };
    });
builder.Services.AddAuthorization();

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
builder.Services.AddScoped<IWardRepository, WardRepository>();
builder.Services.AddScoped<IPersonnelRepository, PersonnelRepository>();
builder.Services.AddScoped<IAuditRepository, AuditRepository>();
builder.Services.AddScoped<IOrReportRepository, OrReportRepository>();   // OR 月報：直接讀 DB2_DUMP OPORDER
builder.Services.AddScoped<IMasterDataRepository, MasterDataRepository>();   // 全院共用主檔：科別／醫師
builder.Services.AddScoped<IOnCallRepository, OnCallRepository>();   // 各科值班醫師每日輪值排程
// LDAP／AD 認證（LLDAP@101；設定檔驅動，Enabled=false 時為過渡期員編登入）
builder.Services.Configure<kmsh_whiteboard.Settings.LdapOptions>(
    builder.Configuration.GetSection(kmsh_whiteboard.Settings.LdapOptions.Section));
builder.Services.AddSingleton<kmsh_whiteboard.Services.ILdapAuthenticator, kmsh_whiteboard.Services.LdapAuthenticator>();
builder.Services.AddEndpointsApiExplorer();
// ── Swagger / OpenAPI 文件（含 XML 註解）───────────────────────
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

    // Bearer 認證：Swagger 測試修改類端點時，右上 Authorize 貼上登入回傳的 token
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "登入（POST /api/Board/personnel/login）回傳的 token。",
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
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

// ── 院方 Board API（住院在床 Board_bed / 急診 Board_ER；主機 10.20.111.84:8088）──
builder.Services.Configure<BoardApiOptions>(
    builder.Configuration.GetSection(BoardApiOptions.Section));

var boardOptions = builder.Configuration
    .GetSection(BoardApiOptions.Section)
    .Get<BoardApiOptions>() ?? new BoardApiOptions();

builder.Services
    .AddHttpClient<IBoardApiService, BoardApiService>(client =>
    {
        if (!string.IsNullOrWhiteSpace(boardOptions.BaseUrl))
            client.BaseAddress = new Uri(boardOptions.BaseUrl.TrimEnd('/') + "/");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = boardOptions.IgnoreSslErrors
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

// ── Middleware Pipeline（順序：HTTPS 轉址 → CORS → 認證 → 授權 → 路由至 Controller）──
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
