using CenterManagement.Core.Features.MessageTemplatesFeature.Commands.Models;
using CenterManagement.Core.Features.MessageTemplatesFeature.Dtos;
using CenterManagement.Data.Entities.Messaging;
using CenterManagement.Core.Features.MessageTemplatesFeature.Validators;

namespace CenterManagement.Core.Features.MessageTemplatesFeature.Commands.Handlers;

public class MessageTemplateCommandHandler : ResponseHandler,
    IRequestHandler<UpdateMessageTemplateCommand, Response<MessageTemplateDto>>,
    IRequestHandler<ResetMessageTemplateCommand, Response<MessageTemplateDto>>
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public MessageTemplateCommandHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        ITenantContext tenantContext) : base(localizer)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    public async Task<Response<MessageTemplateDto>> Handle(
        UpdateMessageTemplateCommand request,
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        if (centerId is null)
            return BadRequest<MessageTemplateDto>("لا يوجد مركز مرتبط بهذا الحساب");

        var definition = MessageTemplateCatalog.FindByKey(request.Key);

        if (definition is null)
            return NotFound<MessageTemplateDto>("نوع القالب غير معروف");

        var validationError = MessageTemplateBodyValidator.Validate(definition, request.Body);

        if (validationError is not null)
            return BadRequest<MessageTemplateDto>(validationError);

        var body = request.Body.Trim();

        // IgnoreQueryFilters finds a row that may have been soft deleted earlier,
        // so we revive it instead of inserting a duplicate that would violate the
        // unique (CenterId, Type) index.
        var entity = await _context.CenterMessageTemplates
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                template => template.CenterId == centerId.Value && template.Type == definition.Type,
                cancellationToken);

        if (entity is null)
        {
            entity = new CenterMessageTemplate
            {
                CenterId = centerId.Value,
                Type = definition.Type,
                Body = body
            };

            await _context.CenterMessageTemplates.AddAsync(entity, cancellationToken);
        }
        else
        {
            entity.Body = body;
            entity.IsDeleted = false;
            entity.DeletedAt = null;
            entity.DeletedBy = null;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = _tenantContext.UserId;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Success(
            MessageTemplateCatalog.BuildDto(definition, entity.Body),
            "تم حفظ قالب الرسالة بنجاح");
    }

    public async Task<Response<MessageTemplateDto>> Handle(
        ResetMessageTemplateCommand request,
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        if (centerId is null)
            return BadRequest<MessageTemplateDto>("لا يوجد مركز مرتبط بهذا الحساب");

        var definition = MessageTemplateCatalog.FindByKey(request.Key);

        if (definition is null)
            return NotFound<MessageTemplateDto>("نوع القالب غير معروف");

        var entity = await _context.CenterMessageTemplates
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                template => template.CenterId == centerId.Value && template.Type == definition.Type,
                cancellationToken);

        if (entity is not null)
        {
            // Keep the row (the unique index would reject a fresh insert after a
            // soft delete) and simply point it back at the built-in default.
            entity.Body = definition.DefaultBody;
            entity.IsDeleted = false;
            entity.DeletedAt = null;
            entity.DeletedBy = null;
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = _tenantContext.UserId;

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Success(
            MessageTemplateCatalog.BuildDto(definition, definition.DefaultBody),
            "تمت استعادة القالب الافتراضي");
    }
}
