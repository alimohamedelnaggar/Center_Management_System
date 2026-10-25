namespace CenterManagement.Data.Entities.Messaging;

public class CenterMessageTemplate : BaseEntity, ITenantEntity
{
    public Guid? CenterId { get; set; }

    public MessageTemplateType Type { get; set; }

    public string Body { get; set; } = default!;
}
