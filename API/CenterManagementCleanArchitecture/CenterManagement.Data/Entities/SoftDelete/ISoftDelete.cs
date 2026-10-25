namespace CenterManagement.Data.Entities.SoftDelete;

public interface ISoftDelete
{
    bool IsDeleted { get; set; }
    Guid? DeletedBy { get; set; }

    DateTime? DeletedAt { get; set; }
}