# Build and publish stage (minor-float tag: always latest 8.0.x patch)
# Alpine variant keeps the OS package set patched (Debian 12 bookworm ships
# unpatchable HIGH/CRITICAL CVEs that Trivy flags on every build).
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine3.24 AS build
WORKDIR /src
COPY demo.csproj .
RUN dotnet restore demo.csproj
COPY . .
RUN dotnet publish demo.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage (minor-float tag: always latest 8.0.x patch)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine3.24 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
# Install curl for health checks
RUN apk add --no-cache curl \
  && apk upgrade --no-cache
EXPOSE 8080
COPY --from=build /app/publish .
# Run as non-root user (aspnet image provides 'app' user)
USER app
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1
ENTRYPOINT ["dotnet", "demo.dll"]
