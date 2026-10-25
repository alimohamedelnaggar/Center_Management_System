using CenterManagement.Application.Contracts.Persistence;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Exams;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Expenses;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Incomes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Notifications;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Notes;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.QuestionBanks;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts.Students;

namespace CenterManagement.Infrustructure.InfrastructureBases.Bases;

public interface IRepositoryManager
{
    IRefreshTokenRepository RefreshTokenRepository { get; }
    IStudentRepository StudentRepository { get; }
    IStudentGroupRepository StudentGroupRepository { get; }
    IGroupRepository GroupRepository { get; }

    #region Exams
    IExamRepository ExamRepository { get; }
    IStudentExamComponentRepository StudentExamComponentRepository { get; }

    #endregion

    IPaymentRepository PaymentRepository { get; }

    ISessionRepository SessionRepository { get; }
    IAttendanceRepository AttendanceRepository { get; }

    IReportRepository ReportRepository { get; }

    IAssistantRepository AssistantRepository { get; }
    IAssistantPaymentRepository AssistantPaymentRepository { get; }

    #region Expenses
    IExpenseRepository ExpenseRepository { get; }
    IExpenseCategoryRepository ExpenseCategoryRepository { get; }
    #endregion

    IIncomeRepository IncomeRepository { get; }
    IIncomeCategoryRepository IncomeCategoryRepository { get; }

    IStudentExamParentContactRepository StudentExamParentContactRepository { get; }

    #region QuestionBanks
    IAcademicYearRepository AcademicYearRepository { get; }
    IQuestionBankRepository QuestionBankRepository { get; }
    IQuestionRepository QuestionRepository { get; }
    IQuestionExamRepository QuestionExamRepository { get; }
    #endregion

    #region StudentExams
    IStudentExamAttemptRepository StudentExamAttemptRepository { get; }
    #endregion

    INotificationRepository NotificationRepository { get; }

    IStudyNoteRepository StudyNoteRepository { get; }

    ICenterRepository CenterRepository { get; }

    // -------------------- Save Changes 
    Task SaveChangesAsync();

    // -------------------- Transaction
    Task<IDbContextTransaction> BeginTransactionAsync();
    Task CommitAsync();
    Task RollBackAsync();


}