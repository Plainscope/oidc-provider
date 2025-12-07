using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.RazorPages;

public class IndexModel : PageModel
{
  public string? DisplayName { get; private set; }
  public string? Email { get; private set; }

  public void OnGet()
  {
    if (User?.Identity?.IsAuthenticated == true)
    {
      DisplayName = User.Identity?.Name
        ?? User.FindFirstValue("name")
        ?? User.FindFirstValue(ClaimTypes.Name);
      Email = User.FindFirstValue("email")
        ?? User.FindFirstValue(ClaimTypes.Email);
    }
  }
}
