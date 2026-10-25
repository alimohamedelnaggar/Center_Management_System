using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data.Models;
using CenterManagement.Infrustructure.InfrastructureBases.Abstracts;

namespace CenterManagement.Infrustructure.InfrastructureBases.Repositories;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;

    public ReportRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatistics> GetDashboardStatisticsAsync(
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        var statistics = new DashboardStatistics();

        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1);

        var prevStartDate = startDate.AddMonths(-1);

        var startDateOnly = DateOnly.FromDateTime(startDate);
        var endDateOnly = DateOnly.FromDateTime(endDate);
        var prevStartDateOnly = DateOnly.FromDateTime(prevStartDate);

        #region Students

        statistics.TotalStudents = await _context.Students
            .CountAsync(cancellationToken);

        statistics.ActiveStudents = await _context.Students
            .CountAsync(x => x.IsActive, cancellationToken);

        statistics.InactiveStudents = await _context.Students
            .CountAsync(x => !x.IsActive, cancellationToken);

        // عدد الطلبة المحذوفين
        statistics.DeletedStudents = await _context.Students
            .IgnoreQueryFilters()
            .CountAsync(x => x.IsDeleted, cancellationToken);

        // عدد الطلبة المسجلين خلال الشهر المحدد
        statistics.MonthlyStudents = await _context.Students
            .CountAsync(x =>
                x.CreatedAt >= startDate &&
                x.CreatedAt < endDate,
                cancellationToken);

        // عدد الطلبة المحذوفين خلال الشهر المحدد
        statistics.MonthlyDeletedStudents = await _context.Students
            .IgnoreQueryFilters()
            .CountAsync(x =>
                x.IsDeleted &&
                x.DeletedAt.HasValue &&
                x.DeletedAt.Value >= startDate &&
                x.DeletedAt.Value < endDate,
                cancellationToken);

        statistics.NetStudentGrowth =
            statistics.MonthlyStudents
            - statistics.MonthlyDeletedStudents;

        #endregion

        #region Groups

        statistics.TotalGroups = await _context.Groups
            .CountAsync(cancellationToken);

        #endregion

        #region Monthly Revenue (Student Payments + Other Incomes)

        var studentPayments = await _context.StudentAmounts
            .Where(x =>
                x.Payment.PaymentDate >= startDate &&
                x.Payment.PaymentDate < endDate)
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken) ?? 0;

        var otherIncomes = await _context.Incomes
            .Where(x =>
                x.IncomeDate >= startDateOnly &&
                x.IncomeDate < endDateOnly)
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken) ?? 0;

        statistics.MonthlyRevenue =
            studentPayments + otherIncomes;

        #endregion

        #region Previous Month Revenue

        var prevStudentPayments = await _context.StudentAmounts
            .Where(x =>
                x.Payment.PaymentDate >= prevStartDate &&
                x.Payment.PaymentDate < startDate)
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken) ?? 0;

        var prevOtherIncomes = await _context.Incomes
            .Where(x =>
                x.IncomeDate >= prevStartDateOnly &&
                x.IncomeDate < startDateOnly)
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken) ?? 0;

        statistics.PreviousMonthRevenue =
            prevStudentPayments + prevOtherIncomes;

        #endregion

        #region Monthly Expenses

        statistics.MonthlyExpenses = await _context.Expenses
            .Where(x =>
                x.ExpenseDate >= startDateOnly &&
                x.ExpenseDate < endDateOnly)
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken) ?? 0;

        statistics.PreviousMonthExpenses = await _context.Expenses
            .Where(x =>
                x.ExpenseDate >= prevStartDateOnly &&
                x.ExpenseDate < startDateOnly)
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken) ?? 0;

        #endregion

        #region Monthly Assistant Salaries

        statistics.MonthlyAssistantSalaries = await _context.AssistantPayments
            .Where(x =>
                x.Month == month &&
                x.Year == year)
            .SumAsync(
                x => (decimal?)x.NetSalary,
                cancellationToken) ?? 0;

        statistics.PreviousMonthAssistantSalaries = await _context.AssistantPayments
            .Where(x =>
                x.Month == prevStartDate.Month &&
                x.Year == prevStartDate.Year)
            .SumAsync(
                x => (decimal?)x.NetSalary,
                cancellationToken) ?? 0;

        #endregion

        #region Net Profit

        statistics.NetProfit =
            statistics.MonthlyRevenue
            - statistics.MonthlyExpenses
            - statistics.MonthlyAssistantSalaries;

        #endregion

        #region Attendance

        var attendanceStats = await _context.Attendances
            .Where(x =>
                x.AttendanceDate >= startDateOnly &&
                x.AttendanceDate < endDateOnly)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Present = g.Count(
                    x => x.Status == AttendanceStatus.Present),
                Absent = g.Count(
                    x => x.Status != AttendanceStatus.Present)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var totalAttendance = attendanceStats?.Total ?? 0;
        var presentAttendance = attendanceStats?.Present ?? 0;

        statistics.MonthlyPresentCount = presentAttendance;
        statistics.MonthlyAbsentCount = attendanceStats?.Absent ?? 0;

        statistics.AttendancePercentage = totalAttendance == 0
            ? 0
            : Math.Round(
                (double)presentAttendance / totalAttendance * 100,
                2);

        #endregion

        return statistics;
    }
    //public async Task<List<StudentDistributionModel>> GetStudentDistributionAsync(
    //         CancellationToken cancellationToken = default)
    //{
    //    return await _context.Students
    //        .Where(x => x.IsActive)
    //        .GroupBy(x => new
    //        {
    //            x.GroupId,
    //            x.Group.Name
    //        })
    //        .Select(g => new StudentDistributionModel
    //        {
    //            GroupName = g.Key.Name,
    //            StudentsCount = g.Count()
    //        })
    //        .OrderByDescending(x => x.StudentsCount)
    //        .ToListAsync(cancellationToken);
    //}
    public async Task<List<StudentDistributionModel>> GetStudentDistributionAsync(
    CancellationToken cancellationToken = default)
    {
        return await _context.StudentGroups
            .Where(sg => sg.IsActive && sg.LeftAt == null && sg.Student.IsActive)
            .GroupBy(sg => new
            {
                sg.GroupId,
                sg.Group.Name
            })
            .Select(g => new StudentDistributionModel
            {
                GroupName = g.Key.Name,
                StudentsCount = g.Count()
            })
            .OrderByDescending(x => x.StudentsCount)
            .ToListAsync(cancellationToken);
    }
    public async Task<List<RevenueChartModel>> GetRevenueChartAsync(int year, CancellationToken cancellationToken = default)
    {
        var studentPayments = await _context.StudentAmounts
            .Include(s => s.Payment)
            .Where(x => x.Payment.PaymentDate.Year == year)
            .GroupBy(x => x.Payment.PaymentDate.Month)
            .Select(g => new
            {
                Month = g.Key,
                Amount = g.Sum(x => x.Amount)
            })
            .ToDictionaryAsync(
                x => x.Month,
                x => x.Amount,
                cancellationToken);

        // Manually recorded incomes belong to the same revenue line as student
        // payments, matching the dashboard summary and the center report trend.
        var otherIncomes = await _context.Incomes
            .Where(x => x.IncomeDate.Year == year)
            .GroupBy(x => x.IncomeDate.Month)
            .Select(g => new
            {
                Month = g.Key,
                Amount = g.Sum(x => x.Amount)
            })
            .ToDictionaryAsync(
                x => x.Month,
                x => x.Amount,
                cancellationToken);

        var expenses = await _context.Expenses
            .Where(x => x.ExpenseDate.Year == year)
            .GroupBy(x => x.ExpenseDate.Month)
            .Select(g => new
            {
                Month = g.Key,
                Expenses = g.Sum(x => x.Amount)
            })
            .ToDictionaryAsync(
                x => x.Month,
                x => x.Expenses,
                cancellationToken);

        var result = Enumerable.Range(1, 12)
            .Select(month => new RevenueChartModel
            {
                Month = month,
                Revenue = studentPayments.GetValueOrDefault(month)
                    + otherIncomes.GetValueOrDefault(month),
                Expenses = expenses.GetValueOrDefault(month)
            })
            .ToList();

        return result;
    }


    public async Task<List<AttendanceChartModel>> GetAttendanceChartAsync(
    CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var startOfWeek = today.AddDays(-((int)today.DayOfWeek + 1) % 7);

        var endOfWeek = startOfWeek.AddDays(6);

        var attendances = await _context.Attendances
            .Where(x => x.AttendanceDate >= startOfWeek &&
                        x.AttendanceDate <= endOfWeek)
            .ToListAsync(cancellationToken);

        var attendanceData = attendances
            .GroupBy(x => x.AttendanceDate.DayOfWeek)
            .ToDictionary(
                g => g.Key,
                g => g.Count(x => x.Status == AttendanceStatus.Present) * 100.0 / g.Count());

        var weekDays = new[]
        {
        DayOfWeek.Saturday,
        DayOfWeek.Sunday,
        DayOfWeek.Monday,
        DayOfWeek.Tuesday,
        DayOfWeek.Wednesday,
        DayOfWeek.Thursday,
        DayOfWeek.Friday
    };

        return weekDays.Select(day => new AttendanceChartModel
        {
            DayOfWeek = day,
            AttendanceRate = Math.Round(attendanceData.GetValueOrDefault(day, 0), 2)
        }).ToList();
    }
    //public async Task<List<TopGroupModel>> GetTopGroupsAsync(
    //    int take = 5,
    //    CancellationToken cancellationToken = default)
    //{
    //    var result = await _context.Attendances
    //        .GroupBy(a => new
    //        {
    //            a.Student.GroupId,
    //            a.Student.Group.Name
    //        })
    //        .Select(g => new TopGroupModel
    //        {
    //            GroupName = g.Key.Name,

    //            StudentsCount = _context.Students
    //                .Count(s => s.GroupId == g.Key.GroupId && s.IsActive),

    //            AttendanceRate =
    //                g.Count(x => x.Status == AttendanceStatus.Present) * 100.0 /
    //                g.Count()
    //        })
    //        .OrderByDescending(x => x.AttendanceRate)
    //        .ThenByDescending(x => x.StudentsCount)
    //        .Take(take)
    //        .ToListAsync(cancellationToken);

    //    return result;
    //}

    public async Task<List<TopGroupModel>> GetTopGroupsAsync(
    int take = 5,
    CancellationToken cancellationToken = default)
    {
        var result = await _context.Attendances
            .GroupBy(a => new
            {
                a.Session.GroupId,
                a.Session.Group.Name
            })
            .Select(g => new TopGroupModel
            {
                GroupName = g.Key.Name,

                StudentsCount = _context.StudentGroups
                    .Count(sg => sg.GroupId == g.Key.GroupId && sg.IsActive && sg.LeftAt == null && sg.Student.IsActive),

                AttendanceRate = g.Count() == 0
                    ? 0
                    : g.Count(x => x.Status == AttendanceStatus.Present) * 100.0 / g.Count()
            })
            .OrderByDescending(x => x.AttendanceRate)
            .ThenByDescending(x => x.StudentsCount)
            .Take(take)
            .ToListAsync(cancellationToken);

        return result;
    }

    public async Task<List<RecentActivityModel>> GetRecentActivityAsync(
        int take = 10,
        CancellationToken cancellationToken = default)
    {
        var activities = new List<RecentActivityModel>();

        // تسجيل طالب جديد
        var newStudents = await _context.Students
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new RecentActivityModel
            {
                ActivityType = "student_added",
                RelatedName = x.FullName,
                Date = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(newStudents);

        // حذف طالب
        var deletedStudents = await _context.Students
            .IgnoreQueryFilters()
            .Where(x => x.IsDeleted && x.DeletedAt.HasValue)
            .OrderByDescending(x => x.DeletedAt)
            .Take(take)
            .Select(x => new RecentActivityModel
            {
                ActivityType = "student_deleted",
                RelatedName = x.FullName,
                Date = x.DeletedAt!.Value
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(deletedStudents);

        // دفعة جديدة
        var payments = await _context.Payments
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new RecentActivityModel
            {
                ActivityType = "payment_created",
                RelatedName = x.Student.FullName,
                Amount = x.StudentAmounts.Sum(sa => sa.Amount),
                Date = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(payments);

        // مصروف جديد
        var expenses = await _context.Expenses
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new RecentActivityModel
            {
                ActivityType = "expense_created",
                RelatedName = x.Name,
                Amount = x.Amount,
                Date = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(expenses);

        // إيراد جديد
        var incomes = await _context.Incomes
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new RecentActivityModel
            {
                ActivityType = "income_created",
                RelatedName = x.Name,
                Amount = x.Amount,
                Date = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(incomes);

        // صرف مرتب مساعد
        var assistantPayments = await _context.AssistantPayments
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new RecentActivityModel
            {
                ActivityType = "assistant_salary",
                RelatedName = x.Assistant.FullName,
                Amount = x.NetSalary,
                Date = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(assistantPayments);

        // تسجيل حضور / غياب
        var attendances = await _context.Attendances
            .OrderByDescending(x => x.AttendanceDate)
            .Take(take)
            .Select(x => new
            {
                x.Status,
                StudentName = x.Student.FullName,
                Date = x.AttendanceDate
            })
            .ToListAsync(cancellationToken);

        activities.AddRange(attendances.Select(x =>
            new RecentActivityModel
            {
                ActivityType = x.Status == AttendanceStatus.Present
                    ? "attendance_present"
                    : "attendance_absent",
                RelatedName = x.StudentName,
                Date = x.Date.ToDateTime(TimeOnly.MinValue)
            }));

        return activities
            .OrderByDescending(x => x.Date)
            .Take(take)
            .ToList();
    }

    public async Task<List<StudentMovementModel>> GetStudentMovementAsync(
        int year,
        CancellationToken cancellationToken = default)
    {
        var startDate = new DateTime(year, 1, 1);
        var endDate = new DateTime(year + 1, 1, 1);

        var newStudents = await _context.Students
            .Where(x =>
                x.CreatedAt >= startDate &&
                x.CreatedAt < endDate)
            .GroupBy(x => x.CreatedAt.Month)
            .Select(g => new
            {
                Month = g.Key,
                Count = g.Count()
            })
            .ToDictionaryAsync(
                x => x.Month,
                x => x.Count,
                cancellationToken);

        var departedStudents = await _context.Students
            .IgnoreQueryFilters()
            .Where(x =>
                x.IsDeleted &&
                x.DeletedAt.HasValue &&
                x.DeletedAt.Value >= startDate &&
                x.DeletedAt.Value < endDate)
            .GroupBy(x => x.DeletedAt!.Value.Month)
            .Select(g => new
            {
                Month = g.Key,
                Count = g.Count()
            })
            .ToDictionaryAsync(
                x => x.Month,
                x => x.Count,
                cancellationToken);

        return Enumerable.Range(1, 12)
            .Select(month => new StudentMovementModel
            {
                Month = month,
                NewStudents = newStudents.GetValueOrDefault(month),
                DepartedStudents = departedStudents.GetValueOrDefault(month)
            })
            .ToList();
    }
}