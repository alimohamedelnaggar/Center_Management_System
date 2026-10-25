namespace CenterManagement.Data.Results;

public class ManageUserRolesResult
{
    public Guid UserId { get; set; }
    public List<UserRoles> userRoles { get; set; }
}
public class UserRoles
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public bool HasRole { get; set; }
}
