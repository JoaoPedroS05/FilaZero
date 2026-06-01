using System.Text;
using backend.Data;
using backend.Hubs;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Configuração do MySQL
builder.Services.AddDbContext<DataContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    )
);

// --- 1. REGISTRO DO SERVIÇO DE CORS (Rebatizado para SemFila) ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("SemFilaPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// --- 2. REGISTRO DO SIGNALR ---
builder.Services.AddSignalR();

var secretKey = builder.Configuration["JwtSettings:Secret"];
if (string.IsNullOrEmpty(secretKey))
{
    throw new InvalidOperationException("A chave JWT (JwtSettings:Secret) não foi configurada.");
}

var chave = Encoding.ASCII.GetBytes(secretKey);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(chave),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient<GoogleMapsService>();
builder.Services.AddScoped<GoogleMapsService>();

var app = builder.Build();

// Execução automática de Migrations ao subir o Container Docker
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<DataContext>();
        // Verifica se o banco existe e aplica as tabelas automaticamente
        if (context.Database.GetPendingMigrations().Any())
        {
            context.Database.Migrate();
            Console.WriteLine("SemFila: Migrations aplicadas com sucesso no banco de dados!");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Erro ao aplicar migrations automaticamente: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// --- 3. ATIVAÇÃO DO MIDDLEWARE DE CORS ---
app.UseCors("SemFilaPolicy");

app.UseAuthentication(); 
app.UseAuthorization();

app.MapControllers();

// --- 4. MAPEAMENTO DA ROTA DO HUB ---
app.MapHub<FilaHub>("/hub/fila");

app.Run();