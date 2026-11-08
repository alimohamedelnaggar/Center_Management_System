using CenterManagement.Core.Features.MessageTemplatesFeature.Dtos;
using CenterManagement.Core.Features.MessageTemplatesFeature.Queries.Models;
using CenterManagement.Core.Features.MessageTemplatesFeature.Services;
using CenterManagement.Core.Features.MessageTemplatesFeature.Validators;

namespace CenterManagement.Core.Features.MessageTemplatesFeature.Queries.Handlers;

public class MessageTemplateQueryHandler : ResponseHandler,
    IRequestHandler<GetMessageTemplatesQuery, Response<List<MessageTemplateDto>>>,
    IRequestHandler<PreviewMessageTemplateQuery, Response<MessageTemplatePreviewDto>>
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public MessageTemplateQueryHandler(
        IStringLocalizer<SharedResources> localizer,
        AppDbContext context,
        ITenantContext tenantContext) : base(localizer)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    public async Task<Response<List<MessageTemplateDto>>> Handle(
        GetMessageTemplatesQuery request,
        CancellationToken cancellationToken)
    {
        var centerId = _tenantContext.CenterId;

        if (centerId is null)
            return BadRequest<List<MessageTemplateDto>>("لا يوجد مركز مرتبط بهذا الحساب");

        // The tenant filter already limits this, but the explicit predicate keeps
        // the query scoped even for unrestricted (platform) callers.
        var stored = await _context.CenterMessageTemplates
            .AsNoTracking()
            .Where(template => template.CenterId == centerId.Value)
            .ToListAsync(cancellationToken);

        var data = MessageTemplateCatalog.All
            .Select(definition => MessageTemplateCatalog.BuildDto(
                definition,
                stored.FirstOrDefault(template => template.Type == definition.Type)?.Body))
            .ToList();

        return Success(data);
    }

    public async Task<Response<MessageTemplatePreviewDto>> Handle(
        PreviewMessageTemplateQuery request,
        CancellationToken cancellationToken)
    {
        var definition = MessageTemplateCatalog.FindByKey(request.Key);

        if (definition is null)
            return NotFound<MessageTemplatePreviewDto>("نوع القالب غير معروف");

        string body;

        if (request.Body is not null)
        {
            body = request.Body.Trim();
        }
        else
        {
            var centerId = _tenantContext.CenterId;

            if (centerId is null)
                return BadRequest<MessageTemplatePreviewDto>("لا يوجد مركز مرتبط بهذا الحساب");

            var stored = await _context.CenterMessageTemplates
                .AsNoTracking()
                .Where(template => template.CenterId == centerId.Value && template.Type == definition.Type)
                .Select(template => template.Body)
                .FirstOrDefaultAsync(cancellationToken);

            body = stored ?? definition.DefaultBody;
        }

        var validationError = MessageTemplateBodyValidator.Validate(definition, body);

        if (validationError is not null)
            return BadRequest<MessageTemplatePreviewDto>(validationError);

        var sampleValues = MessageTemplateCatalog.SampleValues(definition);
        var text = MessageTemplateRenderer.Render(body, sampleValues);

        return Success(new MessageTemplatePreviewDto
        {
            Key = definition.Key,
            Text = text,
            EncodedText = Uri.EscapeDataString(text),
            WhatsAppUrl = MessageTemplateRenderer.BuildWhatsAppUrl(
                MessageTemplateRenderer.PreviewPhoneNumber,
                text),
            SampleValues = new Dictionary<string, string>(sampleValues, StringComparer.Ordinal)
        });
    }
}
