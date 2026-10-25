using CenterManagement.Application.Contracts.Persistence;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Expenses;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Incomes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Notifications;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Notes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Students;
using CenterManagement.Infrustructure.InfrastructureBases.Bases;
using CenterManagement.Infrustructure.InfrastructureBases.Repositories;
using CenterManagement.Infrustructure.Repositories.Exams;
using CenterManagement.Infrustructure.Repositories.Expenses;
using CenterManagement.Infrustructure.Repositories.Incomes;
using CenterManagement.Infrustructure.Repositories.Notifications;
using CenterManagement.Infrustructure.Repositories.Notes;
using CenterManagement.Infrustructure.Repositories.QuestionBanks;
using CenterManagement.Infrustructure.Repositories.Students;
using CenterManagement.Infrustructure.Repositories.Users;
using CenterManagement.Infrustructure.Repositories;

namespace CenterManagement.Infrustructure.Repositories.Base;

public class RepositoryManager : IRepositoryManager
{
    private readonly AppDbContext _dbContext;

    private readonly Lazy<IRefreshTokenRepository> _refreshTokenRepository;
    private readonly Lazy<IStudentRepository> _studentRepository;
    private readonly Lazy<IStudentGroupRepository> _studentgroupRepository;
    private readonly Lazy<IGroupRepository> _groupRepository;

    #region Exams
    private readonly Lazy<IExamRepository> _examRepository;
    private readonly Lazy<IStudentExamComponentRepository> _studentExamComponentRepository;
    #endregion
    private readonly Lazy<IPaymentRepository> _paymentRepository;
    private readonly Lazy<ISessionRepository> _sessionRepository;
    private readonly Lazy<IAttendanceRepository> _attendanceRepository;

    private readonly Lazy<IReportRepository> _reportRepository;
    private readonly Lazy<IAssistantRepository> _assistantRepository;
    private readonly Lazy<IAssistantPaymentRepository> _assistantPaymentRepository;



    #region Expenses
    private readonly Lazy<IExpenseRepository> _expenseRepository;
    private readonly Lazy<IExpenseCategoryRepository> _expenseCategoryRepository;
    #endregion


    private readonly Lazy<IIncomeRepository> _incomeRepository;
    private readonly Lazy<IIncomeCategoryRepository> _incomeCategoryRepository;

    private readonly Lazy<IStudentExamParentContactRepository> _studentExamParentContactRepository;

    #region QuestionBanks
    private readonly Lazy<IAcademicYearRepository> _academicYearRepository;
    private readonly Lazy<IQuestionBankRepository> _questionBankRepository;
    private readonly Lazy<IQuestionRepository> _questionRepository;
    private readonly Lazy<IQuestionExamRepository> _questionExamRepository;
    #endregion

    private readonly Lazy<IStudentExamAttemptRepository> _studentExamAttemptRepository;
    private readonly Lazy<INotificationRepository> _notificationRepository;
    private readonly Lazy<IStudyNoteRepository> _studyNoteRepository;
    private readonly Lazy<ICenterRepository> _centerRepository;

    public RepositoryManager(AppDbContext context, ITenantContext tenantContext)
    {
        _dbContext = context;
        _refreshTokenRepository = new Lazy<IRefreshTokenRepository>(() => new RefreshTokenRepository(context));
        _studentRepository = new Lazy<IStudentRepository>(() => new StudentRepository(context));
        _studentgroupRepository = new Lazy<IStudentGroupRepository>(() => new StudentGrouptRepository(context));
        _groupRepository = new Lazy<IGroupRepository>(() => new GroupRepository(context));

        #region Exams
        _examRepository = new Lazy<IExamRepository>(() => new ExamRepository(context));
        _studentExamComponentRepository = new Lazy<IStudentExamComponentRepository>(() => new StudentExamComponentRepository(context));

        #endregion

        _paymentRepository = new Lazy<IPaymentRepository>(() => new PaymentRepository(context));
        _sessionRepository = new Lazy<ISessionRepository>(() => new SessionRepository(context));
        _attendanceRepository = new Lazy<IAttendanceRepository>(() => new AttendanceRepository(context));

        _reportRepository = new Lazy<IReportRepository>(() => new ReportRepository(context));
        _assistantRepository = new Lazy<IAssistantRepository>(() => new AssistantRepository(context, tenantContext));
        _assistantPaymentRepository = new Lazy<IAssistantPaymentRepository>(() => new AssistantPaymentRepository(context));

        #region Expenses
        _expenseRepository = new Lazy<IExpenseRepository>(() => new ExpenseRepository(context));
        _expenseCategoryRepository = new Lazy<IExpenseCategoryRepository>(() => new ExpenseCategoryRepository(context));
        #endregion

        _incomeRepository = new Lazy<IIncomeRepository>(() => new IncomeRepository(context));

        _incomeCategoryRepository = new Lazy<IIncomeCategoryRepository>(() => new IncomeCategoryRepository(context));
        _studentExamParentContactRepository = new Lazy<IStudentExamParentContactRepository>(() => new StudentExamParentContactRepository(context));

        #region QuestionBanks
        _academicYearRepository = new Lazy<IAcademicYearRepository>(() => new AcademicYearRepository(context));
        _questionBankRepository = new Lazy<IQuestionBankRepository>(() => new QuestionBankRepository(context));
        _questionRepository = new Lazy<IQuestionRepository>(() => new QuestionRepository(context));
        _questionExamRepository = new Lazy<IQuestionExamRepository>(() => new QuestionExamRepository(context));
        #endregion

        _studentExamAttemptRepository = new Lazy<IStudentExamAttemptRepository>(() => new StudentExamAttemptRepository(context));
        _notificationRepository = new Lazy<INotificationRepository>(() => new NotificationRepository(context));
        _studyNoteRepository = new Lazy<IStudyNoteRepository>(() => new StudyNoteRepository(context));
        _centerRepository = new Lazy<ICenterRepository>(() => new CenterRepository(context));
    }

    public IRefreshTokenRepository RefreshTokenRepository => _refreshTokenRepository.Value;
    public IStudentRepository StudentRepository => _studentRepository.Value;
    public IStudentGroupRepository StudentGroupRepository => _studentgroupRepository.Value;
    public IGroupRepository GroupRepository => _groupRepository.Value;

    #region Exams
    public IExamRepository ExamRepository => _examRepository.Value;
    public IStudentExamComponentRepository StudentExamComponentRepository => _studentExamComponentRepository.Value;
    #endregion

    public IPaymentRepository PaymentRepository => _paymentRepository.Value;

    public ISessionRepository SessionRepository => _sessionRepository.Value;
    public IAttendanceRepository AttendanceRepository => _attendanceRepository.Value;

    public IReportRepository ReportRepository => _reportRepository.Value;
    public IAssistantRepository AssistantRepository => _assistantRepository.Value;
    public IAssistantPaymentRepository AssistantPaymentRepository => _assistantPaymentRepository.Value;

    #region Expenses
    public IExpenseRepository ExpenseRepository => _expenseRepository.Value;
    public IExpenseCategoryRepository ExpenseCategoryRepository => _expenseCategoryRepository.Value;

    #endregion

    public IIncomeRepository IncomeRepository => _incomeRepository.Value;
    public IIncomeCategoryRepository IncomeCategoryRepository => _incomeCategoryRepository.Value;
    public IStudentExamParentContactRepository StudentExamParentContactRepository => _studentExamParentContactRepository.Value;

    #region QuestionBanks
    public IAcademicYearRepository AcademicYearRepository => _academicYearRepository.Value;
    public IQuestionBankRepository QuestionBankRepository => _questionBankRepository.Value;
    public IQuestionRepository QuestionRepository => _questionRepository.Value;
    public IQuestionExamRepository QuestionExamRepository => _questionExamRepository.Value;
    #endregion

    #region StudentExams
    public IStudentExamAttemptRepository StudentExamAttemptRepository => _studentExamAttemptRepository.Value;
    #endregion

    public INotificationRepository NotificationRepository => _notificationRepository.Value;

    public IStudyNoteRepository StudyNoteRepository => _studyNoteRepository.Value;

    public ICenterRepository CenterRepository => _centerRepository.Value;

    // -------------------- Save Changes
    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }

    // -------------------- Transaction
    public async Task<IDbContextTransaction> BeginTransactionAsync()
    {
        return await _dbContext.Database.BeginTransactionAsync();
    }

    public async Task CommitAsync()
    {
        await _dbContext.Database.CommitTransactionAsync();
    }

    public async Task RollBackAsync()
    {
        await _dbContext.Database.RollbackTransactionAsync();
    }


}
