# Build and publish stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY demo.csproj .
RUN dotnet restore demo.csproj
COPY . .
RUN dotnet publish demo.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
# Install curl for health checks
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "demo.dll"]
