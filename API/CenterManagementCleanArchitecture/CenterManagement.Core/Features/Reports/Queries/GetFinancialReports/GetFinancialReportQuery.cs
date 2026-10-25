public sealed record GetFinancialReportQuery(Guid StudentId, Guid? GroupId = null)
    : IRequest<Response<List<FinancialReportDto>>>;


//public record FinancialReportResponse
//{
//    public decimal TotalAmount { get; set; }
//    public decimal TotalRemaining { get; set; }
//    public FinancialReportDto FinancialReportDto { get; set; }
//}