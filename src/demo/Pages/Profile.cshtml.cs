using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

[Authorize]
public class ProfileModel : PageModel
{
  public string? DisplayName { get; private set; }
  public string? Email { get; private set; }
  public List<Claim> Claims { get; private set; } = new();

  public void OnGet()
  {
    var identity = User.Identity;
    if (identity?.IsAuthenticated == true)
    {
      DisplayName = identity.Name
        ?? User.FindFirstValue("name")
        ?? User.FindFirstValue(ClaimTypes.Name);
      Email = User.FindFirstValue("email")
        ?? User.FindFirstValue(ClaimTypes.Email);
      Claims = User.Claims.OrderBy(c => c.Type).ToList();
    }
  }
}
