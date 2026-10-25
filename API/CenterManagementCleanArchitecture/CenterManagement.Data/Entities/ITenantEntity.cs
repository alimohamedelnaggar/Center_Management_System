namespace CenterManagement.Data.Entities;

/// <summary>
/// Marker interface for entities that belong to a single center (tenant).
/// The <see cref="CenterId"/> is used by the global query filter to isolate
/// data between centers.
/// </summary>
public interface ITenantEntity
{
    Guid? CenterId { get; set; }
}
