//public class GetStudentFinancialReportHandler
//    : ResponseHandler,
//      IRequestHandler<GetStudentFinancialReportQuery, Response<StudentFinancialReportDto>>
//{
//    private readonly IRepositoryManager _repositoryManager;

//    public GetStudentFinancialReportHandler(
//        IRepositoryManager repositoryManager,
//        IStringLocalizer<SharedResources> stringLocalizer)
//        : base(stringLocalizer)
//    {
//        _repositoryManager = repositoryManager;
//    }

//    public async Task<Response<StudentFinancialReportDto>> Handle(
//        GetStudentFinancialReportQuery request,
//        CancellationToken cancellationToken)
//    {
//        var student = await _repositoryManager
//            .StudentRepository
//            .GetDetailsAsync(request.StudentId, cancellationToken);

//        if (student is null)
//            return NotFound<StudentFinancialReportDto>();

//        var payments = await _repositoryManager
//            .PaymentRepository
//            .GetStudentPaymentsAsync(request.StudentId, cancellationToken);

//        var result = new StudentFinancialReportDto
//        {
//            StudentId = student.Id,
//            StudentName = student.FullName,
//            GroupName = student.Group.Name,
//            SubscriptionType = student.SubscriptionType,

//            PaymentsCount = payments.Count,
//            TotalPaid = payments.Sum(x => x.Amount),

//            Payments = payments.Select(x => new PaymentRecordDto
//            {
//                PaymentDate = x.PaymentDate,
//                Amount = x.Amount,
//                BillingPeriod = x.BillingPeriod,
//                DayOfWeek = x.Session?.DayOfWeek,
//                StartTime = x.Session?.StartTime,
//                EndTime = x.Session?.EndTime,
//                Notes = x.Notes
//            }).ToList()
//        };

//        return Success(result);
//    }
//}