using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var section = builder.Configuration.GetSection("OpenId");
var settings = section.Get<OpenIdSettings>()!;
var isDevelopment = builder.Environment.IsDevelopment();
var securePolicy = isDevelopment ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;

// Add IOptions<TSettings> to the DI container
// https://learn.microsoft.com/en-us/dotnet/core/extensions/options
builder.Services.Configure<OpenIdSettings>(section);

// Razor Pages and authorization
builder.Services.AddRazorPages();
builder.Services.AddAuthorization();

// Add authentication services
builder.Services.AddAuthentication(options =>
{
  // Set Cookie as default for browser-based auth (sign-in, sign-out)
  options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;

  // Set OpenID Connect as the default challenge for API and Page requests
  // This ensures API requests without auth get 401 instead of redirects
  // Note: Individual endpoints should specify [Authorize(AuthenticationSchemes = "OpenIdConnect,Cookies")]
  // to support both authentication methods
  options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
  options.Cookie.SameSite = SameSiteMode.Unspecified;
  options.Cookie.SecurePolicy = securePolicy;
})
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
{
  // 1. Authority: This tells the app where to find the B2C metadata
  options.Authority = settings.Authority;
  options.ClientId = settings.ClientId;
  options.ClientSecret = settings.ClientSecret;
  options.RequireHttpsMetadata = settings.RequireHttpsMetadata;
  if (!string.IsNullOrWhiteSpace(settings.MetadataAddress))
  {
    options.MetadataAddress = settings.MetadataAddress;
  }

  // In Development, relax backchannel certificate validation to allow local dev certs
  if (isDevelopment)
  {
    options.BackchannelHttpHandler = new HttpClientHandler
    {
      ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    };
  }

  options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
  options.ResponseType = OpenIdConnectResponseType.Code;
  options.ResponseMode = OpenIdConnectResponseMode.FormPost;

  options.SaveTokens = true;     // Saves the tokens in the cookie so you can read them later

  // 3. Scopes: Define the scopes you want to request
  foreach (var scope in settings.Scopes.Where(s => !string.IsNullOrWhiteSpace(s) && options.Scope.All(existing => existing != s)))
  {
    options.Scope.Add(scope);
  }

  // Always call the UserInfo endpoint to hydrate profile/email claims when the IdToken omits them
  options.GetClaimsFromUserInfoEndpoint = true;

  // 4. Token Validation
  options.TokenValidationParameters = new TokenValidationParameters
  {
    NameClaimType = "name" // Maps the "name" claim to User.Identity.Name
  };

  // 5. Address Correlation Failed issue
  options.CorrelationCookie.SameSite = SameSiteMode.Unspecified;
  options.CorrelationCookie.SecurePolicy = securePolicy;
  options.NonceCookie.SameSite = SameSiteMode.Unspecified;
  options.NonceCookie.SecurePolicy = securePolicy;

  // This alone fixes the problem for most people in 2025
  options.UsePkce = true;

  // Handle claim mapping when tokens are received
  options.Events = new OpenIdConnectEvents
  {
    OnRedirectToIdentityProvider = context =>
    {
      // If PublicOrigin is provided, rewrite the redirect to a browser-friendly host (e.g., localhost)
      if (!string.IsNullOrWhiteSpace(settings.PublicOrigin))
      {
        var uri = new Uri(context.ProtocolMessage.IssuerAddress);
        var target = new Uri(settings.PublicOrigin);
        var uriBuilder = new UriBuilder(uri) { Host = target.Host, Port = target.Port }; // keep path/query
        context.ProtocolMessage.IssuerAddress = uriBuilder.Uri.ToString();
      }
      return Task.CompletedTask;
    },
    OnRedirectToIdentityProviderForSignOut = context =>
    {
      if (!string.IsNullOrWhiteSpace(settings.PublicOrigin))
      {
        var uri = new Uri(context.ProtocolMessage.IssuerAddress);
        var target = new Uri(settings.PublicOrigin);
        var uriBuilder = new UriBuilder(uri) { Host = target.Host, Port = target.Port };
        context.ProtocolMessage.IssuerAddress = uriBuilder.Uri.ToString();
      }
      return Task.CompletedTask;
    },
    OnRemoteFailure = context =>
    {
      var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<OpenIdConnectEvents>>();
      var error = context.Failure?.Message ?? "Unknown remote failure";
      logger.LogWarning("OIDC remote failure: {Error}", error);

      // If user denied consent, redirect to a friendly page
      if (context.Failure is OpenIdConnectProtocolException protoEx &&
              (protoEx.Message?.Contains("access_denied", StringComparison.OrdinalIgnoreCase) == true ||
                protoEx.Message?.Contains("AADB2C90273", StringComparison.OrdinalIgnoreCase) == true))
      {
        // Prevent the exception from bubbling
        context.HandleResponse();
        context.Response.Redirect("/auth/access-denied");
        return Task.CompletedTask;
      }

      // Default: let it bubble up (developer exception page will show details)
      return Task.CompletedTask;
    },
    OnTokenValidated = async context =>
    {
      if (context.Principal?.Identity is ClaimsIdentity identity)
      {
        // Log all claims for debugging
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<OpenIdConnectEvents>>();
        logger.LogInformation("OIDC Claims received: {Claims}",
                string.Join(", ", identity.Claims.Select(c => $"{c.Type}={c.Value}")));

        // Map 'sub' claim to both NameIdentifier and 'sid' for compatibility
        var subClaim = identity.FindFirst("sub");
        if (subClaim != null && !identity.HasClaim(c => c.Type == ClaimTypes.NameIdentifier))
        {
          identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, subClaim.Value));
          identity.AddClaim(new Claim("sid", subClaim.Value));
        }

        // Ensure standard claim types are mapped
        var emailClaim = identity.FindFirst("email")
                ?? identity.FindFirst(ClaimTypes.Email)
                ?? identity.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");

        if (emailClaim != null && !identity.HasClaim(c => c.Type == ClaimTypes.Email))
        {
          identity.AddClaim(new Claim(ClaimTypes.Email, emailClaim.Value));
          // Also add simplified "email" claim for compatibility
          if (!identity.HasClaim(c => c.Type == "email"))
          {
            identity.AddClaim(new Claim("email", emailClaim.Value));
          }
        }

        var nameClaim = identity.FindFirst("name");
        if (nameClaim != null && !identity.HasClaim(c => c.Type == ClaimTypes.Name))
        {
          identity.AddClaim(new Claim(ClaimTypes.Name, nameClaim.Value));
        }

        var givenNameClaim = identity.FindFirst("given_name");
        if (givenNameClaim != null && !identity.HasClaim(c => c.Type == ClaimTypes.GivenName))
        {
          identity.AddClaim(new Claim(ClaimTypes.GivenName, givenNameClaim.Value));
        }

        var familyNameClaim = identity.FindFirst("family_name");
        if (familyNameClaim != null && !identity.HasClaim(c => c.Type == ClaimTypes.Surname))
        {
          identity.AddClaim(new Claim(ClaimTypes.Surname, familyNameClaim.Value));
        }
      }
    }
  };
});

var app = builder.Build();
app.UseStaticFiles();

app.UseRouting();

// Note: UseAuthentication must come before UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

// Minimal endpoints for auth flows
app.MapGet("/auth/signin", () => Results.Challenge(new AuthenticationProperties { RedirectUri = "/" }, new[] { OpenIdConnectDefaults.AuthenticationScheme }))
  .AllowAnonymous();
app.MapPost("/auth/signout", () => Results.SignOut(new AuthenticationProperties { RedirectUri = "/Auth/SignedOut" }, new[] { CookieAuthenticationDefaults.AuthenticationScheme, OpenIdConnectDefaults.AuthenticationScheme }))
  .AllowAnonymous();

app.MapRazorPages();

app.Run();
