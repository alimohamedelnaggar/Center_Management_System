namespace CenterManagement.Data.Results;

public class ManageUserClaimsResult
{
    public Guid UserId { get; set; }
    public List<UserClaims> userClaims { get; set; }
}
public class UserClaims
{
    public string Type { get; set; }
    public bool Value { get; set; }
}
