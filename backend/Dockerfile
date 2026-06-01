# Estágio 1: Compilação
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copia os arquivos de projeto e restaura as dependências NuGet
COPY *.csproj ./
RUN dotnet restore

# Copia o restante dos arquivos e gera o build de produção
COPY . ./
RUN dotnet publish -c Release -o out

# Estágio 2: Ambiente de Execução (Runtime leve)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-env /app/out .

# Expõe a porta interna da API
EXPOSE 5033
ENV ASPNETCORE_URLS=http://+:5033

ENTRYPOINT ["dotnet", "backend.dll"]