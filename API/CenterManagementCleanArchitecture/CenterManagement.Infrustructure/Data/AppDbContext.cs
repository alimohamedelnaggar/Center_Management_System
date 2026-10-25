using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Audit;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Data.Entities.Messaging;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.Notes;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.SoftDelete;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Entities.Teachers;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.Reflection;

namespace CenterManagement.Infrustructure.Data;

public class appdbcontextfactory
    : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                "Connection string 'DefaultConnection' was not found. Configure it in " +
                "appsettings.Development.json (git-ignored) or the " +
                "ConnectionStrings__DefaultConnection environment variable.");

        var optionsbuilder = new DbContextOptionsBuilder<AppDbContext>();

        optionsbuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsbuilder.Options);
    }
}
public class AppDbContext : IdentityDbContext<User, Role, Guid, IdentityUserClaim<Guid>,
    IdentityUserRole<Guid>, IdentityUserLogin<Guid>, IdentityRoleClaim<Guid>,
    IdentityUserToken<Guid>>
{
    private readonly ITenantContext? _tenantContext;

    public AppDbContext()
    {

    }
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// True when the current request isn't bound to a single center
    /// (Admin, SuperAdmin or system/unauthenticated calls).
    /// </summary>
    public bool TenantUnrestricted => _tenantContext?.IsUnrestricted ?? true;

    /// <summary>Center of the current request, if any.</summary>
    public Guid? TenantCenterId => _tenantContext?.CenterId;

    #region DeSets;
    #region Users
    public DbSet<Admin> Admins { get; set; }
    public DbSet<Student> Students { get; set; }
    public DbSet<Assistent> Assistents { get; set; }
    #endregion
    public DbSet<Center> Centers { get; set; }
    public DbSet<TeacherProfile> TeacherProfiles => Set<TeacherProfile>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<UserRefreshToken> UserRefreshToken { get; set; }

    #region Expenses
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<ExpenseCategory> ExpenseCategories { get; set; }

    #endregion


    public DbSet<Income> Incomes { get; set; }
    public DbSet<IncomeCategory> IncomeCategories { get; set; }
    #region Groups
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();
    public DbSet<TeacherGroup> TeacherGroups => Set<TeacherGroup>();
    public DbSet<Session> Sessions => Set<Session>();
    #endregion

    public DbSet<Attendance> Attendances => Set<Attendance>();


    #region Exams
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<ExamComponent> ExamComponents => Set<ExamComponent>();
    public DbSet<StudentExamComponent> StudentExamComponents => Set<StudentExamComponent>();


    public DbSet<StudentExamParentContact> StudentExamParentContacts => Set<StudentExamParentContact>();

    #endregion

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<StudentAmount> StudentAmounts => Set<StudentAmount>();

    public DbSet<CenterReceiptCounter> CenterReceiptCounters => Set<CenterReceiptCounter>();

    public DbSet<AssistantPayment> AssistantPayments => Set<AssistantPayment>();

    #region QuestionBank
    public DbSet<AcademicYear> AcademicYears => Set<AcademicYear>();
    public DbSet<QuestionBank> QuestionBanks => Set<QuestionBank>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionExam> QuestionExams => Set<QuestionExam>();
    public DbSet<QuestionExamQuestion> QuestionExamQuestions => Set<QuestionExamQuestion>();
    public DbSet<QuestionExamQuestionOption> QuestionExamQuestionOptions => Set<QuestionExamQuestionOption>();
    public DbSet<StudentExamAttempt> StudentExamAttempts => Set<StudentExamAttempt>();
    public DbSet<StudentExamAnswer> StudentExamAnswers => Set<StudentExamAnswer>();
    #endregion

    #region Notifications
    public DbSet<Notification> Notifications => Set<Notification>();
    #endregion

    #region StudyNotes
    public DbSet<StudyNote> StudyNotes => Set<StudyNote>();
    public DbSet<StudyNoteGroup> StudyNoteGroups => Set<StudyNoteGroup>();
    #endregion

    #region MessageTemplates
    public DbSet<CenterMessageTemplate> CenterMessageTemplates => Set<CenterMessageTemplate>();
    #endregion

    #region Subscriptions
    public DbSet<CenterModule> CenterModules => Set<CenterModule>();
    public DbSet<CenterSubscription> CenterSubscriptions => Set<CenterSubscription>();
    public DbSet<CenterSubscriptionPayment> CenterSubscriptionPayments => Set<CenterSubscriptionPayment>();
    #endregion

    #region ParentPortal
    public DbSet<ParentStudentLink> ParentStudentLinks => Set<ParentStudentLink>();
    #endregion

    #endregion

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Apply global query filters for soft delete and multi-tenancy (center isolation).
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            // Query filters may only be applied to the root entity type. Derived types
            // (e.g. Assistent : User) inherit the filter declared on their root type.
            if (entityType.BaseType != null)
                continue;

            var clrType = entityType.ClrType;

            if (clrType == typeof(Center))
            {
                // Centers themselves are not tenant filtered, only soft deletable.
                ApplySoftDeleteFilter(modelBuilder, clrType);
                continue;
            }

            var isSoftDelete = typeof(ISoftDelete).IsAssignableFrom(clrType);
            var isTenant = typeof(ITenantEntity).IsAssignableFrom(clrType);

            if (isSoftDelete && isTenant)
            {
                ApplyQueryFilter(modelBuilder, clrType, nameof(SetSoftDeleteTenantFilter));
            }
            else if (isSoftDelete)
            {
                ApplyQueryFilter(modelBuilder, clrType, nameof(SetSoftDeleteFilter));
            }
            else if (isTenant)
            {
                ApplyQueryFilter(modelBuilder, clrType, nameof(SetTenantFilter));
            }
        }

    }

    private void ApplySoftDeleteFilter(ModelBuilder modelBuilder, Type clrType)
        => ApplyQueryFilter(modelBuilder, clrType, nameof(SetSoftDeleteFilter));

    private void ApplyQueryFilter(ModelBuilder modelBuilder, Type clrType, string methodName)
    {
        var method = typeof(AppDbContext).GetMethod(
            methodName,
            BindingFlags.NonPublic | BindingFlags.Instance)!;

        method.MakeGenericMethod(clrType).Invoke(this, [modelBuilder]);
    }

    private void SetSoftDeleteFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ISoftDelete
    {
        modelBuilder.Entity<TEntity>()
            .HasQueryFilter(e => !e.IsDeleted);
    }

    private void SetTenantFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantEntity
    {
        modelBuilder.Entity<TEntity>()
            .HasQueryFilter(e => TenantUnrestricted || e.CenterId == TenantCenterId);
    }

    private void SetSoftDeleteTenantFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ISoftDelete, ITenantEntity
    {
        modelBuilder.Entity<TEntity>()
            .HasQueryFilter(e => !e.IsDeleted && (TenantUnrestricted || e.CenterId == TenantCenterId));
    }
}
