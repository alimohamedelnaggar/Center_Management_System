using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Audit;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Data.Entities.Messaging;
using CenterManagement.Data.Entities.Notes;
using CenterManagement.Data.Entities.Notifications;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.Subscriptions;
using CenterManagement.Data.Entities.Teachers;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CenterManagement.Infrustructure.Data;

/// <summary>
/// Deterministic, fully fictional data set used by the Playwright feature tour.
/// It is only invoked when ASPNETCORE_ENVIRONMENT is "E2E" and is never used by
/// Development, Testing or Production.
///
/// Accounts and data are idempotent: if "مركز النور" already exists the seeder
/// returns immediately. Set Seed:E2EReset=true to drop/recreate the database
/// before seeding (local runs).
/// </summary>
public static class E2ESeeder
{
    private const string PrimaryCenterName = "مركز النور";
    private const string SoloCenterName = "مركز المدرس الفردي";
    private const string GraceCenterName = "مركز الفجر التعليمي";
    private const string LimitedCenterName = "مركز الأمل";

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var logger = serviceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("E2ESeeder");
        var hostEnvironment = serviceProvider.GetRequiredService<IHostEnvironment>();

        // Defence in depth: the host validates this before it is built, but the
        // seeder repeats it before resolving AppDbContext or touching the DB.
        E2ESeedSafety.ValidateOrThrow(
            hostEnvironment.EnvironmentName,
            configuration.GetConnectionString("DefaultConnection"),
            Environment.GetEnvironmentVariable(E2ESeedSafety.AllowSeedEnvironmentVariable));

        if (!configuration.GetValue("Seed:E2EEnabled", true))
            return;

        var db = serviceProvider.GetRequiredService<AppDbContext>();
        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<Role>>();

        if (configuration.GetValue("Seed:E2EReset", false))
        {
            logger.LogWarning("E2E reset requested: dropping database.");
            await db.Database.EnsureDeletedAsync();
        }

        await db.Database.MigrateAsync();
        await EnsureRolesAsync(roleManager);

        if (await db.Centers.AnyAsync(c => c.Name == PrimaryCenterName))
        {
            logger.LogInformation("E2E seed already present; skipping.");
            return;
        }

        var staffPassword = configuration["Seed:E2EPassword"];
        var studentPassword = configuration["Seed:E2EStudentPassword"];

        if (string.IsNullOrWhiteSpace(staffPassword) ||
            string.IsNullOrWhiteSpace(studentPassword))
        {
            throw new InvalidOperationException(
                "Seed:E2EPassword and Seed:E2EStudentPassword must be configured for the E2E environment.");
        }

        logger.LogInformation("Seeding E2E feature-tour data set...");

        await using var transaction = await db.Database.BeginTransactionAsync();

        try
        {
            var seeds = await SeedAsync(
                db,
                userManager,
                staffPassword,
                studentPassword);

            await transaction.CommitAsync();

            logger.LogInformation(
                "E2E seed complete. Centers={Centers}, Students={Students}, Payments={Payments}, Users={Users}",
                await db.Centers.CountAsync(),
                await db.Students.CountAsync(),
                await db.Payments.CountAsync(),
                await db.Users.CountAsync());

            _ = seeds;
        }
        catch
        {
            await transaction.RollbackAsync();
            logger.LogError("E2E seeding failed and was rolled back.");
            throw;
        }
    }

    private static async Task<SeedGraph> SeedAsync(
        AppDbContext db,
        UserManager<User> userManager,
        string staffPassword,
        string studentPassword)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var localNow = DateTime.Now;
        var currentPeriod = new DateOnly(today.Year, today.Month, 1);
        var previousPeriod = currentPeriod.AddMonths(-1);
        var joinDate = currentPeriod.AddMonths(-2).ToDateTime(new TimeOnly(9, 0));

        // ------------------------------------------------------------------
        // Centers (modules + subscription history)
        // ------------------------------------------------------------------

        var primary = AddCenter(
            db,
            name: PrimaryCenterName,
            type: CenterType.MultiTeacher,
            phone: "01000000002",
            address: "١٥ شارع الجمهورية - المنصورة",
            plan: "سنوي",
            start: today.AddDays(-60),
            end: today.AddDays(305),
            price: 12000m,
            paid: 12000m,
            notes: "مركز تعليمي متعدد المدرسين - بيانات تجريبية بالكامل.",
            themeColor: "#0f766e");

        var solo = AddCenter(
            db,
            name: SoloCenterName,
            type: CenterType.SoloTeacher,
            phone: "01000000007",
            address: "٧ شارع النصر - طنطا",
            plan: "سنوي",
            start: today.AddDays(-40),
            end: today.AddDays(325),
            price: 6000m,
            paid: 6000m,
            notes: "مركز مدرس فردي - بيانات تجريبية بالكامل.",
            themeColor: "#7c3aed");

        var grace = AddCenter(
            db,
            name: GraceCenterName,
            type: CenterType.MultiTeacher,
            phone: "01000000008",
            address: "٣ شارع البحر - الإسكندرية",
            plan: "شهري",
            start: today.AddDays(-31),
            end: today.AddDays(-1),
            graceDays: 3,
            price: 1500m,
            paid: 1500m,
            notes: "الاشتراك منتهٍ ويظهر شريط فترة السماح.",
            themeColor: "#b45309");

        var limited = AddCenter(
            db,
            name: LimitedCenterName,
            type: CenterType.MultiTeacher,
            phone: "01000000009",
            address: "١٢ شارع الهرم - الجيزة",
            plan: "ربع سنوي",
            start: today.AddDays(-20),
            end: today.AddDays(70),
            price: 4000m,
            paid: 2000m,
            notes: "بعض الوحدات معطّلة لإظهار شاشة القفل.",
            themeColor: "#0e7490",
            disabledModules:
            [
                ModuleKeys.QuestionBank,
                ModuleKeys.OnlineExams,
                ModuleKeys.StudyNotes,
                ModuleKeys.Accounting,
                ModuleKeys.CenterReports,
                ModuleKeys.Whatsapp,
                ModuleKeys.ParentPortal
            ]);

        await db.SaveChangesAsync();

        AddSubscriptionPayment(db, primary, 12000m, today.AddDays(-60), "تحويل بنكي");
        AddSubscriptionPayment(db, solo, 6000m, today.AddDays(-40), "فودافون كاش");
        AddSubscriptionPayment(db, grace, 1500m, today.AddDays(-31), "كاش");
        AddSubscriptionPayment(db, limited, 2000m, today.AddDays(-20), "إنستاباي");

        // ------------------------------------------------------------------
        // Staff accounts
        // ------------------------------------------------------------------

        var superAdmin = await CreateUserAsync(
            userManager, "01000000001", "مشرف المنصة", AppRoles.SuperAdmin, null, staffPassword);

        var owner = await CreateUserAsync(
            userManager, "01000000002", "أ. حسناء عبد الله", AppRoles.CenterOwner, primary.Id, staffPassword);

        primary.OwnerId = owner.Id;

        var teacher1 = await CreateUserAsync(
            userManager, "01000000003", "أ. محمد عبد الرحمن", AppRoles.Teacher, primary.Id, staffPassword);

        var teacher2 = await CreateUserAsync(
            userManager, "01000000004", "أ. سارة إبراهيم", AppRoles.Teacher, primary.Id, staffPassword);

        var assistant = await CreateAssistantAsync(
            userManager,
            phone: "01000000005",
            fullName: "أ. منى حسن",
            centerId: primary.Id,
            password: staffPassword,
            salary: 4500m,
            teacherId: teacher1.Id,
            workingHoursPerWeek: 30,
            hireDate: DateOnly.FromDateTime(today.AddMonths(-10)));

        var studentAccount = await CreateUserAsync(
            userManager, "01110000001", "يوسف أحمد محمود", AppRoles.Student, primary.Id, studentPassword);

        var parent = await CreateUserAsync(
            userManager, "01000000006", "أحمد محمود السيد", AppRoles.Parent, primary.Id, staffPassword);

        var soloTeacher = await CreateUserAsync(
            userManager, "01000000007", "أ. كريم مصطفى", AppRoles.Teacher, solo.Id, staffPassword, isCenterAdmin: true);

        solo.OwnerId = soloTeacher.Id;

        var graceOwner = await CreateUserAsync(
            userManager, "01000000008", "أ. هدى كامل", AppRoles.CenterOwner, grace.Id, staffPassword);

        grace.OwnerId = graceOwner.Id;

        var limitedOwner = await CreateUserAsync(
            userManager, "01000000009", "أ. رامي نبيل", AppRoles.CenterOwner, limited.Id, staffPassword);

        limited.OwnerId = limitedOwner.Id;

        // Teachers/profiles for the secondary centers.
        var graceTeacher = await CreateUserAsync(
            userManager, "01000000010", "أ. إيمان فؤاد", AppRoles.Teacher, grace.Id, staffPassword);

        var limitedTeacher = await CreateUserAsync(
            userManager, "01000000011", "أ. طارق منصور", AppRoles.Teacher, limited.Id, staffPassword);

        await db.SaveChangesAsync();

        db.TeacherProfiles.AddRange(
            NewTeacherProfile(teacher1, primary.Id, "الرياضيات", "مدرس الجبر والهندسة للمرحلة الإعدادية."),
            NewTeacherProfile(teacher2, primary.Id, "اللغة الإنجليزية", "مدرسة اللغة الإنجليزية للمرحلة الثانوية."),
            NewTeacherProfile(soloTeacher, solo.Id, "اللغة العربية", "مدرس اللغة العربية لجميع المراحل."),
            NewTeacherProfile(graceTeacher, grace.Id, "العلوم", "مدرسة العلوم."),
            NewTeacherProfile(limitedTeacher, limited.Id, "الفيزياء", "مدرس الفيزياء للمرحلة الثانوية."));

        // ------------------------------------------------------------------
        // Groups, sessions and students
        // ------------------------------------------------------------------

        var g1 = AddGroup(db, primary.Id, "الصف الثالث الإعدادي - أ", 600m, 8);
        var g2 = AddGroup(db, primary.Id, "الصف الثاني الثانوي - ب", 750m, 8);
        var g3 = AddGroup(db, primary.Id, "مراجعة ليلة الامتحان", 400m, 4);
        var primaryGroupForStudent = new Group[15];
        foreach (var index in new[] { 0, 2, 4, 6, 8, 10, 12, 14 })
            primaryGroupForStudent[index] = g1;
        foreach (var index in new[] { 1, 3, 5, 7, 9 })
            primaryGroupForStudent[index] = g2;
        foreach (var index in new[] { 11, 13 })
            primaryGroupForStudent[index] = g3;

        db.TeacherGroups.AddRange(
            new TeacherGroup { TeacherId = teacher1.Id, GroupId = g1.Id, CenterId = primary.Id },
            new TeacherGroup { TeacherId = teacher1.Id, GroupId = g3.Id, CenterId = primary.Id },
            new TeacherGroup { TeacherId = teacher2.Id, GroupId = g2.Id, CenterId = primary.Id });

        var s1a = AddSession(db, primary.Id, g1, DayOfWeek.Sunday, new TimeOnly(17, 0), new TimeOnly(19, 0));
        var s1b = AddSession(db, primary.Id, g1, DayOfWeek.Tuesday, new TimeOnly(17, 0), new TimeOnly(19, 0));
        var s2a = AddSession(db, primary.Id, g2, DayOfWeek.Monday, new TimeOnly(16, 0), new TimeOnly(18, 0));
        var s2b = AddSession(db, primary.Id, g2, DayOfWeek.Wednesday, new TimeOnly(16, 0), new TimeOnly(18, 0));
        var s3a = AddSession(db, primary.Id, g3, DayOfWeek.Thursday, new TimeOnly(18, 0), new TimeOnly(21, 0));
        var s3b = AddSession(db, primary.Id, g3, DayOfWeek.Saturday, new TimeOnly(10, 0), new TimeOnly(13, 0));

        // A guaranteed "running now" session for the scanner/attendance chapters.
        var runningSession = AddSession(
            db,
            primary.Id,
            g1,
            localNow.DayOfWeek,
            new TimeOnly(0, 0),
            new TimeOnly(23, 59));

        var studentNames = new[]
        {
            "يوسف أحمد محمود",
            "مريم أحمد محمود",
            "عمر خالد عبد العزيز",
            "سلمى محمد فؤاد",
            "أحمد سامي حسن",
            "نور الدين مصطفى",
            "هنا وليد إبراهيم",
            "مالك طارق سعيد",
            "جنة عمرو شعبان",
            "زياد هشام فتحي",
            "لينا أشرف كمال",
            "عبد الرحمن ياسر علي",
            "فاطمة صلاح الدين",
            "كريم مجدي رشاد",
            "ملك أيمن عبد الحميد"
        };

        var students = new List<Student>();
        for (var i = 0; i < studentNames.Length; i++)
        {
            var isFirstTwo = i < 2;
            var student = new Student
            {
                FullName = studentNames[i],
                PhoneNumber = $"0111000{i + 1:D4}",
                ParentPhoneNumber = isFirstTwo ? parent.PhoneNumber! : $"0122000{i + 1:D4}",
                School = i % 3 == 0 ? "مدرسة النور الإعدادية" : "مدرسة الأمل الثانوية",
                Notes = i % 4 == 0 ? "طالب متميز ومنتظم في الحضور." : null,
                IsActive = true,
                SubscriptionType = SubscriptionType.Month,
                CustomMonthlyPrice = i == 4 ? 500m : null,
                QrCode = $"QR-2026-{i + 1:D4}",
                CenterId = primary.Id,
                UserId = i == 0 ? studentAccount.Id : null,
                CreatedAt = joinDate
            };

            students.Add(student);
        }

        db.Students.AddRange(students);
        await db.SaveChangesAsync();

        var g1Students = new[] { 0, 2, 4, 6, 8, 10, 12, 14 }.Select(i => students[i]).ToList();
        var g2Students = new[] { 1, 3, 5, 7, 9 }.Select(i => students[i]).ToList();
        var g3Students = new[] { 11, 13 }.Select(i => students[i]).ToList();

        foreach (var s in g1Students)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = g1.Id, CenterId = primary.Id, JoinDate = joinDate, IsActive = true });

        foreach (var s in g2Students)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = g2.Id, CenterId = primary.Id, JoinDate = joinDate, IsActive = true });

        foreach (var s in g3Students)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = g3.Id, CenterId = primary.Id, JoinDate = currentPeriod.ToDateTime(new TimeOnly(9, 0)), IsActive = true });

        db.ParentStudentLinks.AddRange(
            new ParentStudentLink { ParentUserId = parent.Id, StudentId = students[0].Id, CenterId = primary.Id },
            new ParentStudentLink { ParentUserId = parent.Id, StudentId = students[1].Id, CenterId = primary.Id });

        // Solo centre: 2 groups, 6 students.
        var sg1 = AddGroup(db, solo.Id, "تأسيس اللغة العربية", 500m, 8);
        var sg2 = AddGroup(db, solo.Id, "مراجعة النحو والبلاغة", 350m, 4);

        db.TeacherGroups.AddRange(
            new TeacherGroup { TeacherId = soloTeacher.Id, GroupId = sg1.Id, CenterId = solo.Id },
            new TeacherGroup { TeacherId = soloTeacher.Id, GroupId = sg2.Id, CenterId = solo.Id });

        var soloSession1 = AddSession(db, solo.Id, sg1, DayOfWeek.Sunday, new TimeOnly(18, 0), new TimeOnly(20, 0));
        var soloSession2 = AddSession(db, solo.Id, sg2, DayOfWeek.Wednesday, new TimeOnly(19, 0), new TimeOnly(21, 0));

        var soloStudents = new List<Student>();
        var soloNames = new[] { "سلمى عادل", "يوسف عادل", "حبيبة عادل", "مازن عادل", "رقية عادل", "أدهم عادل" };
        for (var i = 0; i < soloNames.Length; i++)
        {
            soloStudents.Add(new Student
            {
                FullName = soloNames[i],
                PhoneNumber = $"0113000{i + 1:D4}",
                ParentPhoneNumber = "01230000001",
                School = "مدرسة طنطا الإعدادية",
                IsActive = true,
                SubscriptionType = SubscriptionType.Month,
                QrCode = $"QR-SOLO-{i + 1:D3}",
                CenterId = solo.Id,
                CreatedAt = joinDate
            });
        }

        db.Students.AddRange(soloStudents);
        await db.SaveChangesAsync();

        foreach (var s in soloStudents.Take(4))
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = sg1.Id, CenterId = solo.Id, JoinDate = joinDate, IsActive = true });

        foreach (var s in soloStudents.Skip(4))
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = sg2.Id, CenterId = solo.Id, JoinDate = currentPeriod.ToDateTime(new TimeOnly(9, 0)), IsActive = true });

        // Grace + limited centers: small believable data for SuperAdmin screens.
        var gg1 = AddGroup(db, grace.Id, "الصف الأول الثانوي", 550m, 8);
        var lg1 = AddGroup(db, limited.Id, "الصف الثالث الثانوي", 800m, 8);

        db.TeacherGroups.AddRange(
            new TeacherGroup { TeacherId = graceTeacher.Id, GroupId = gg1.Id, CenterId = grace.Id },
            new TeacherGroup { TeacherId = limitedTeacher.Id, GroupId = lg1.Id, CenterId = limited.Id });

        AddSession(db, grace.Id, gg1, DayOfWeek.Saturday, new TimeOnly(14, 0), new TimeOnly(16, 0));
        AddSession(db, limited.Id, lg1, DayOfWeek.Friday, new TimeOnly(15, 0), new TimeOnly(17, 0));

        var graceStudents = new[]
        {
            NewStudent(grace.Id, "آدم سيد عبد الله", "01140000001", "01240000001", "QR-GRACE-001", joinDate),
            NewStudent(grace.Id, "ليلى سيد عبد الله", "01140000002", "01240000001", "QR-GRACE-002", joinDate)
        };

        var limitedStudents = new[]
        {
            NewStudent(limited.Id, "حسن فتحي محمود", "01150000001", "01250000001", "QR-LIMIT-001", joinDate),
            NewStudent(limited.Id, "ملك فتحي محمود", "01150000002", "01250000001", "QR-LIMIT-002", joinDate)
        };

        db.Students.AddRange(graceStudents);
        db.Students.AddRange(limitedStudents);
        await db.SaveChangesAsync();

        foreach (var s in graceStudents)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = gg1.Id, CenterId = grace.Id, JoinDate = joinDate, IsActive = true });

        foreach (var s in limitedStudents)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = lg1.Id, CenterId = limited.Id, JoinDate = joinDate, IsActive = true });

        await db.SaveChangesAsync();

        // ------------------------------------------------------------------
        // Payments: 30 in primary (previous + current), 12 in solo.
        // 7 current full, 4 partial and 4 without a payment.
        // ------------------------------------------------------------------

        var receipt = 1;

        for (var i = 0; i < students.Count; i++)
        {
            var student = students[i];
            var group = primaryGroupForStudent[i];
            var total = student.CustomMonthlyPrice ?? group.MonthlyPrice;

            var previous = BuildPayment(
                primary.Id, student, group, previousPeriod, total, total, receipt++,
                owner, previousPeriod.ToDateTime(new TimeOnly(10, 0)));
            db.Payments.Add(previous);

            var currentPaid = CurrentPaidFor(i, total);
            if (currentPaid > 0)
            {
                var current = BuildPayment(
                    primary.Id, student, group, currentPeriod, total, currentPaid, receipt++,
                    owner, currentPeriod.ToDateTime(new TimeOnly(10, 0)));
                db.Payments.Add(current);
            }

            student.IsPaid = currentPaid >= total;
        }

        for (var i = 0; i < soloStudents.Count; i++)
        {
            var student = soloStudents[i];
            var group = i < 4 ? sg1 : sg2;
            var total = group.MonthlyPrice;
            var paid = i == soloStudents.Count - 1 ? 0m : (i == 4 ? total / 2 : total);

            if (paid > 0)
            {
                db.Payments.Add(BuildPayment(
                    solo.Id, student, group, currentPeriod, total, paid, i + 1,
                    soloTeacher, currentPeriod.ToDateTime(new TimeOnly(11, 0))));
            }

            student.IsPaid = paid >= total;
        }

        db.CenterReceiptCounters.Add(new CenterReceiptCounter
        {
            CenterId = primary.Id,
            LastNumber = receipt - 1
        });

        db.CenterReceiptCounters.Add(new CenterReceiptCounter
        {
            CenterId = solo.Id,
            LastNumber = soloStudents.Count
        });

        // ------------------------------------------------------------------
        // Attendance: 3 past weeks for every weekly session.
        // ------------------------------------------------------------------

        AddPastAttendance(db, primary.Id, g1, g1Students, [s1a, s1b], today, owner);
        AddPastAttendance(db, primary.Id, g2, g2Students, [s2a, s2b], today, owner);
        AddPastAttendance(db, primary.Id, g3, g3Students, [s3a, s3b], today, owner);
        AddPastAttendance(db, solo.Id, sg1, soloStudents.Take(4).ToList(), [soloSession1], today, soloTeacher);
        AddPastAttendance(db, solo.Id, sg2, soloStudents.Skip(4).ToList(), [soloSession2], today, soloTeacher);

        _ = runningSession;

        _ = runningSession;

        // ------------------------------------------------------------------
        // Income / expenses
        // ------------------------------------------------------------------

        var incomeSubs = new IncomeCategory { Name = "اشتراكات الطلاب", CenterId = primary.Id };
        var incomeExtra = new IncomeCategory { Name = "حصص إضافية", CenterId = primary.Id };
        var incomeNotes = new IncomeCategory { Name = "بيع المذكرات", CenterId = primary.Id };
        db.IncomeCategories.AddRange(incomeSubs, incomeExtra, incomeNotes);

        var expenseRent = new ExpenseCategory { Name = "إيجار", CenterId = primary.Id };
        var expenseBills = new ExpenseCategory { Name = "كهرباء ومياه", CenterId = primary.Id };
        var expensePrint = new ExpenseCategory { Name = "طباعة ومستلزمات", CenterId = primary.Id };
        var expenseInternet = new ExpenseCategory { Name = "إنترنت", CenterId = primary.Id };
        db.ExpenseCategories.AddRange(expenseRent, expenseBills, expensePrint, expenseInternet);

        var soloIncome = new IncomeCategory { Name = "اشتراكات شهرية", CenterId = solo.Id };
        var soloExpense = new ExpenseCategory { Name = "مصروفات المركز", CenterId = solo.Id };
        db.IncomeCategories.Add(soloIncome);
        db.ExpenseCategories.Add(soloExpense);

        await db.SaveChangesAsync();

        db.Incomes.AddRange(
            NewIncome(primary.Id, incomeSubs.Id, "اشتراكات شهر أكتوبر", 6000m, today.AddDays(-20), g1.Id),
            NewIncome(primary.Id, incomeSubs.Id, "اشتراكات مجموعة الثانوي", 3750m, today.AddDays(-17), g2.Id),
            NewIncome(primary.Id, incomeExtra.Id, "مراجعة إضافية - رياضيات", 1500m, today.AddDays(-10), g1.Id),
            NewIncome(primary.Id, incomeNotes.Id, "بيع ملازم المراجعة", 800m, today.AddDays(-7), null),
            NewIncome(solo.Id, soloIncome.Id, "اشتراكات الشهر", 2450m, today.AddDays(-12), sg1.Id),
            NewIncome(solo.Id, soloIncome.Id, "مجموعة النحو", 1050m, today.AddDays(-9), sg2.Id));

        db.Expenses.AddRange(
            NewExpense(primary.Id, expenseRent.Id, "إيجار المقر - أكتوبر", 2500m, today.AddDays(-25)),
            NewExpense(primary.Id, expenseBills.Id, "فاتورة الكهرباء", 450m, today.AddDays(-15)),
            NewExpense(primary.Id, expensePrint.Id, "طباعة ملازم وامتحانات", 600m, today.AddDays(-12)),
            NewExpense(primary.Id, expenseInternet.Id, "باقة الإنترنت", 300m, today.AddDays(-8)),
            NewExpense(primary.Id, expensePrint.Id, "أدوات مكتبية", 250m, today.AddDays(-4)),
            NewExpense(solo.Id, soloExpense.Id, "إيجار القاعة", 1200m, today.AddDays(-18)),
            NewExpense(solo.Id, soloExpense.Id, "طباعة مذكرات", 350m, today.AddDays(-6)));

        // ------------------------------------------------------------------
        // Assistant salary history
        // ------------------------------------------------------------------

        db.AssistantPayments.AddRange(
            new AssistantPayment
            {
                AssistantId = assistant.Id,
                CenterId = primary.Id,
                Month = previousPeriod.Month,
                Year = previousPeriod.Year,
                BasicSalary = 4500m,
                Bonus = 250m,
                Deduction = 0m,
                NetSalary = 4750m,
                IsPaid = true,
                PaidAt = previousPeriod.ToDateTime(new TimeOnly(20, 0)),
                Notes = "مرتب الشهر السابق مدفوع بالكامل."
            },
            new AssistantPayment
            {
                AssistantId = assistant.Id,
                CenterId = primary.Id,
                Month = currentPeriod.Month,
                Year = currentPeriod.Year,
                BasicSalary = 4500m,
                Bonus = 0m,
                Deduction = 0m,
                NetSalary = 4500m,
                IsPaid = false,
                Notes = "مرتب الشهر الحالي - لم يُقبض بعد."
            });

        // ------------------------------------------------------------------
        // Traditional exams + marks
        // ------------------------------------------------------------------

        var exam = new Exam
        {
            Name = "امتحان شهر أكتوبر - الجبر",
            GroupId = g1.Id,
            SessionId = s1a.Id,
            ExamDate = today.AddDays(-10),
            CenterId = primary.Id
        };

        exam.ExamComponents.Add(new ExamComponent { Type = ExamType.Paragraph, TotalMarks = 10m, CenterId = primary.Id });
        exam.ExamComponents.Add(new ExamComponent { Type = ExamType.Dictation, TotalMarks = 10m, CenterId = primary.Id });
        exam.ExamComponents.Add(new ExamComponent { Type = ExamType.WrittenExam, TotalMarks = 20m, CenterId = primary.Id });

        db.Exams.Add(exam);
        await db.SaveChangesAsync();

        var components = exam.ExamComponents.OrderBy(c => c.Type).ToList();
        var markPattern = new[]
        {
            new[] { 9m, 9m, 18m },
            new[] { 8m, 7m, 15m },
            new[] { 7m, 8m, 14m },
            new[] { 10m, 10m, 19m },
            new[] { 6m, 7m, 12m },
            new[] { 9m, 8m, 17m },
            new[] { 5m, 6m, 10m },
            new[] { 8m, 9m, 16m }
        };

        for (var i = 0; i < g1Students.Count; i++)
        {
            for (var c = 0; c < components.Count; c++)
            {
                db.StudentExamComponents.Add(new StudentExamComponent
                {
                    StudentId = g1Students[i].Id,
                    ExamComponentId = components[c].Id,
                    Mark = markPattern[i % markPattern.Length][c],
                    CenterId = primary.Id
                });
            }
        }

        db.StudentExamParentContacts.Add(new StudentExamParentContact
        {
            StudentId = g1Students[0].Id,
            ExamId = exam.Id,
            IsContacted = false,
            CenterId = primary.Id
        });

        // ------------------------------------------------------------------
        // Question bank + electronic exams
        // ------------------------------------------------------------------

        var academicYear = new AcademicYear
        {
            Name = "2026 / 2027",
            Order = 1
        };
        db.AcademicYears.Add(academicYear);
        await db.SaveChangesAsync();

        var bank = new QuestionBank
        {
            Name = "بنك أسئلة الجبر",
            AcademicYearId = academicYear.Id,
            CenterId = primary.Id
        };

        var q1 = NewQuestion(bank, QuestionType.TrueFalse, "المعادلة س + ٢ = ٥ حلها س = ٣.", 1m, primary.Id);
        q1.Options.Add(new QuestionOption { Order = 1, Text = "صح", IsCorrect = true, CenterId = primary.Id });
        q1.Options.Add(new QuestionOption { Order = 2, Text = "خطأ", IsCorrect = false, CenterId = primary.Id });

        var q2 = NewQuestion(bank, QuestionType.MultipleChoice, "ما هو حل المعادلة ٢س = ١٠؟", 2m, primary.Id);
        q2.Options.Add(new QuestionOption { Order = 1, Text = "٢", IsCorrect = false, CenterId = primary.Id });
        q2.Options.Add(new QuestionOption { Order = 2, Text = "٥", IsCorrect = true, CenterId = primary.Id });
        q2.Options.Add(new QuestionOption { Order = 3, Text = "١٠", IsCorrect = false, CenterId = primary.Id });
        q2.Options.Add(new QuestionOption { Order = 4, Text = "٢٠", IsCorrect = false, CenterId = primary.Id });

        var q3 = NewQuestion(bank, QuestionType.Essay, "اشرح خطوات حل المعادلة التربيعية س² - ٥س + ٦ = ٠.", 3m, primary.Id);

        db.QuestionBanks.Add(bank);

        var soloBank = new QuestionBank
        {
            Name = "بنك أسئلة النحو",
            AcademicYearId = academicYear.Id,
            CenterId = solo.Id
        };
        var soloQ = NewQuestion(soloBank, QuestionType.MultipleChoice, "ما إعراب كلمة (الطالبُ) في جملة: نجح الطالبُ؟", 2m, solo.Id);
        soloQ.Options.Add(new QuestionOption { Order = 1, Text = "فاعل مرفوع", IsCorrect = true, CenterId = solo.Id });
        soloQ.Options.Add(new QuestionOption { Order = 2, Text = "مفعول به منصوب", IsCorrect = false, CenterId = solo.Id });
        soloQ.Options.Add(new QuestionOption { Order = 3, Text = "مبتدأ مرفوع", IsCorrect = false, CenterId = solo.Id });
        db.QuestionBanks.Add(soloBank);

        await db.SaveChangesAsync();

        // Live electronic exam (available for 2 hours after seeding).
        var liveExam = NewQuestionExam(
            primary.Id,
            "اختبار الجبر الإلكتروني",
            g1,
            academicYear,
            localNow.AddMinutes(-1),
            durationMinutes: 120,
            resultsPublished: false);

        AddExamQuestion(liveExam, q1, primary.Id, order: 1);
        AddExamQuestion(liveExam, q2, primary.Id, order: 2);
        AddExamQuestion(liveExam, q3, primary.Id, order: 3);
        db.QuestionExams.Add(liveExam);

        // A previously submitted/published exam so results are visible immediately.
        var pastExam = NewQuestionExam(
            primary.Id,
            "اختبار شهري - الأعداد والجبر",
            g1,
            academicYear,
            localNow.AddDays(-14),
            durationMinutes: 30,
            resultsPublished: true);
        pastExam.PublishedAt = localNow.AddDays(-13);

        AddExamQuestion(pastExam, q1, primary.Id, order: 1);
        AddExamQuestion(pastExam, q2, primary.Id, order: 2);
        db.QuestionExams.Add(pastExam);

        await db.SaveChangesAsync();

        var pastAttempt = new StudentExamAttempt
        {
            QuestionExamId = pastExam.Id,
            StudentId = students[0].Id,
            StartedAt = localNow.AddDays(-14).AddMinutes(-20),
            SubmittedAt = localNow.AddDays(-14).AddMinutes(-5),
            Status = StudentExamAttemptStatus.Submitted,
            Score = 3m,
            TotalMark = 3m,
            HasPendingManualGrading = false,
            CenterId = primary.Id
        };

        foreach (var examQuestion in pastExam.Questions.OrderBy(q => q.Order))
        {
            var correct = examQuestion.Options.FirstOrDefault(o => o.IsCorrect);
            pastAttempt.Answers.Add(new StudentExamAnswer
            {
                QuestionExamQuestionId = examQuestion.Id,
                SelectedOptionId = correct?.Id,
                IsCorrect = true,
                AwardedMark = examQuestion.Mark,
                CenterId = primary.Id
            });
        }

        db.StudentExamAttempts.Add(pastAttempt);

        // ------------------------------------------------------------------
        // Study note (with a real file on disk)
        // ------------------------------------------------------------------

        var noteFileName = $"{Guid.NewGuid():N}.pdf";
        var noteFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "notes");
        Directory.CreateDirectory(noteFolder);
        var noteContents =
            "%PDF-1.4\n" +
            "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
            "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
            "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
            "4 0 obj<</Length 60>>stream\nBT /F1 24 Tf 72 760 Td (E2E Algebra Note) Tj ET\nendstream endobj\n" +
            "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n" +
            "trailer<</Root 1 0 R>>\n%%EOF\n";
        var notePath = Path.Combine(noteFolder, noteFileName);
        await File.WriteAllTextAsync(notePath, noteContents);

        var note = new StudyNote
        {
            Title = "ملزمة الجبر - الوحدة الأولى",
            Description = "مذكرة مراجعة شاملة على المعادلات والجبر للصف الثالث الإعدادي.",
            FileName = noteFileName,
            OriginalFileName = "ملزمة-الجبر-الوحدة-الأولى.pdf",
            FileSize = new FileInfo(notePath).Length,
            UploadedBy = teacher1.Id,
            CenterId = primary.Id
        };
        note.StudyNoteGroups.Add(new StudyNoteGroup { GroupId = g1.Id, CenterId = primary.Id });
        note.StudyNoteGroups.Add(new StudyNoteGroup { GroupId = g2.Id, CenterId = primary.Id });
        db.StudyNotes.Add(note);

        var soloNote = new StudyNote
        {
            Title = "مذكرة النحو المبسطة",
            Description = "شرح مبسط لقواعد النحو مع تدريبات.",
            FileName = noteFileName,
            OriginalFileName = "مذكرة-النحو.pdf",
            FileSize = new FileInfo(notePath).Length,
            UploadedBy = soloTeacher.Id,
            CenterId = solo.Id
        };
        soloNote.StudyNoteGroups.Add(new StudyNoteGroup { GroupId = sg1.Id, CenterId = solo.Id });

        // Two notes cannot share the same stored file name if one is deleted;
        // copy the file for the solo center.
        var soloNoteFileName = $"{Guid.NewGuid():N}.pdf";
        await File.WriteAllTextAsync(Path.Combine(noteFolder, soloNoteFileName), noteContents);
        soloNote.FileName = soloNoteFileName;
        db.StudyNotes.Add(soloNote);

        // ------------------------------------------------------------------
        // Notifications
        // ------------------------------------------------------------------

        db.Notifications.AddRange(
            new Notification
            {
                UserId = studentAccount.Id,
                Title = "مذكرة جديدة متاحة",
                Body = "تمت إضافة ملزمة الجبر - الوحدة الأولى إلى مذكراتك.",
                Type = "StudyNoteCreated",
                ReferenceId = note.Id,
                ReferenceType = nameof(StudyNote),
                IsRead = false,
                CenterId = primary.Id,
                CreatedAt = now.AddHours(-3)
            },
            new Notification
            {
                UserId = studentAccount.Id,
                Title = "اختبار إلكتروني جديد",
                Body = "اختبار الجبر الإلكتروني متاح الآن لمدة 120 دقيقة.",
                Type = "QuestionExamCreated",
                ReferenceId = liveExam.Id,
                ReferenceType = nameof(QuestionExam),
                IsRead = false,
                CenterId = primary.Id,
                CreatedAt = now.AddHours(-2)
            },
            new Notification
            {
                UserId = studentAccount.Id,
                Title = "تم نشر نتيجة اختبار",
                Body = "نتيجة اختبار الأعداد والجبر متاحة الآن.",
                Type = "ExamResultPublished",
                ReferenceId = pastExam.Id,
                ReferenceType = nameof(QuestionExam),
                IsRead = true,
                ReadAt = now.AddHours(-1),
                CenterId = primary.Id,
                CreatedAt = now.AddDays(-2)
            },
            new Notification
            {
                ParentUserId = parent.Id,
                StudentId = students[0].Id,
                Title = "غياب عن حصة",
                Body = "تم تسجيل غياب يوسف عن حصة الأحد. برجاء المتابعة.",
                Type = "Absence",
                ReferenceId = students[0].Id,
                ReferenceType = "Student",
                IsRead = false,
                CenterId = primary.Id,
                CreatedAt = now.AddHours(-5)
            },
            new Notification
            {
                ParentUserId = parent.Id,
                StudentId = students[1].Id,
                Title = "تذكير بالاشتراك",
                Body = "الاشتراك الشهري لمريم غير مكتمل. المتبقي 375 ج.م.",
                Type = "FeesReminder",
                ReferenceId = students[1].Id,
                ReferenceType = "Student",
                IsRead = false,
                CenterId = primary.Id,
                CreatedAt = now.AddHours(-4)
            },
            new Notification
            {
                ParentUserId = parent.Id,
                StudentId = students[1].Id,
                Title = "نتيجة اختبار",
                Body = "تم نشر نتيجة اختبار الأعداد والجبر.",
                Type = "ExamResult",
                ReferenceId = pastExam.Id,
                ReferenceType = "QuestionExam",
                IsRead = true,
                ReadAt = now.AddHours(-1),
                CenterId = primary.Id,
                CreatedAt = now.AddDays(-1)
            });

        // ------------------------------------------------------------------
        // WhatsApp templates (data only; the UI has no editor yet)
        // ------------------------------------------------------------------

        db.CenterMessageTemplates.AddRange(
            new CenterMessageTemplate
            {
                CenterId = primary.Id,
                Type = MessageTemplateType.Absence,
                Body = "عزيزي ولي الأمر، تم تسجيل غياب الطالب عن حصة اليوم. برجاء التواصل مع المركز."
            },
            new CenterMessageTemplate
            {
                CenterId = primary.Id,
                Type = MessageTemplateType.ExamResult,
                Body = "عزيزي ولي الأمر، تم نشر نتيجة اختبار الطالب. يمكنكم متابعة التفاصيل من بوابة ولي الأمر."
            },
            new CenterMessageTemplate
            {
                CenterId = primary.Id,
                Type = MessageTemplateType.FeesReminder,
                Body = "عزيزي ولي الأمر، نود تذكيركم بسداد الاشتراك الشهري. شكراً لتعاونكم."
            });

        // ------------------------------------------------------------------
        // Audit log + SuperAdmin-facing activity
        // ------------------------------------------------------------------

        db.AuditLogs.AddRange(
            NewAudit(superAdmin.Id, "CenterCreated", "Center", primary.Id, "تم إنشاء مركز النور", now.AddDays(-60)),
            NewAudit(superAdmin.Id, "CenterCreated", "Center", solo.Id, "تم إنشاء مركز المدرس الفردي", now.AddDays(-40)),
            NewAudit(superAdmin.Id, "SubscriptionRenewed", "Center", primary.Id, "تجديد اشتراك سنوي", now.AddDays(-60)),
            NewAudit(superAdmin.Id, "CenterCreated", "Center", grace.Id, "تم إنشاء مركز الفجر", now.AddDays(-31)),
            NewAudit(superAdmin.Id, "ModulesUpdated", "Center", limited.Id, "تعطيل وحدات في مركز الأمل", now.AddDays(-15)),
            NewAudit(superAdmin.Id, "PasswordReset", "User", owner.Id, "إعادة تعيين كلمة مرور صاحب المركز", now.AddDays(-8)),
            NewAudit(superAdmin.Id, "PlatformStatisticsViewed", "Platform", null, "اطلاع على إحصائيات المنصة", now.AddDays(-2)));

        await db.SaveChangesAsync();

        return new SeedGraph(primary.Id, owner.Id, studentAccount.Id, parent.Id, g1.Id, students[0].Id);
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    private sealed record SeedGraph(
        Guid PrimaryCenterId,
        Guid OwnerId,
        Guid StudentUserId,
        Guid ParentUserId,
        Guid GroupId,
        Guid StudentId);

    private static async Task EnsureRolesAsync(RoleManager<Role> roleManager)
    {
        foreach (var roleName in new[]
                 {
                     AppRoles.Assistant,
                     AppRoles.Parent,
                     AppRoles.Student,
                     AppRoles.SuperAdmin,
                     AppRoles.CenterOwner,
                     AppRoles.Teacher
                 })
        {
            if (await roleManager.RoleExistsAsync(roleName))
                continue;

            var result = await roleManager.CreateAsync(new Role { Name = roleName });
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not create role {roleName}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }
        }
    }

    private static async Task<User> CreateUserAsync(
        UserManager<User> userManager,
        string phone,
        string fullName,
        string role,
        Guid? centerId,
        string password,
        bool isCenterAdmin = false)
    {
        var user = new User
        {
            UserName = phone,
            PhoneNumber = phone,
            FullName = fullName,
            CenterId = centerId,
            IsActive = true,
            IsCenterAdmin = isCenterAdmin,
            MustChangePassword = false,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        await CreateOrThrowAsync(userManager, user, password);
        await AddToRoleOrThrowAsync(userManager, user, role);

        return user;
    }

    private static async Task<Assistent> CreateAssistantAsync(
        UserManager<User> userManager,
        string phone,
        string fullName,
        Guid centerId,
        string password,
        decimal salary,
        Guid teacherId,
        int workingHoursPerWeek,
        DateOnly hireDate)
    {
        var assistant = new Assistent
        {
            UserName = phone,
            PhoneNumber = phone,
            FullName = fullName,
            CenterId = centerId,
            Salary = salary,
            TeacherId = teacherId,
            WorkingHoursPerWeek = workingHoursPerWeek,
            HireDate = hireDate,
            IsActive = true,
            MustChangePassword = false,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow,
            Notes = "مساعد مدرس الرياضيات.",
            NationalId = "29901011234567"
        };

        await CreateOrThrowAsync(userManager, assistant, password);
        await AddToRoleOrThrowAsync(userManager, assistant, AppRoles.Assistant);

        // Assistent declares its own CenterId which shadows User.CenterId; EF
        // maps only the base property. Set the mapped value explicitly so this
        // seeded assistant is tenant-scoped (the production create handler does
        // not set it - tracked in docs/e2e-findings.md).
        ((User)assistant).CenterId = centerId;

        return assistant;
    }

    private static async Task CreateOrThrowAsync(
        UserManager<User> userManager,
        User user,
        string password)
    {
        var result = await userManager.CreateAsync(user, password);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Could not create user {user.PhoneNumber}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }

    private static async Task AddToRoleOrThrowAsync(
        UserManager<User> userManager,
        User user,
        string role)
    {
        if (await userManager.IsInRoleAsync(user, role))
            return;

        var result = await userManager.AddToRoleAsync(user, role);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Could not add user {user.PhoneNumber} to role {role}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }

    private static Center AddCenter(
        AppDbContext db,
        string name,
        CenterType type,
        string phone,
        string address,
        string plan,
        DateTime start,
        DateTime end,
        decimal price,
        decimal paid,
        string notes,
        string themeColor,
        int graceDays = 3,
        IEnumerable<string>? disabledModules = null)
    {
        var center = new Center
        {
            Name = name,
            Type = type,
            Status = CenterStatus.Active,
            Phone = phone,
            Address = address,
            ThemeColor = themeColor,
            Description = "بيانات تجريبية بالكامل لتصوير جولة الميزات.",
            Plan = plan,
            SubscriptionStart = start,
            SubscriptionEnd = end,
            GraceDays = graceDays,
            IsActive = true,
            Notes = notes,
            CreatedAt = DateTime.UtcNow
        };

        db.Centers.Add(center);

        var disabled = (disabledModules ?? []).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var modules = CenterModuleFactory.CreateFullSet(center.Id);

        foreach (var module in modules)
            module.IsEnabled = !disabled.Contains(module.ModuleKey);

        db.CenterModules.AddRange(modules);

        db.CenterSubscriptions.Add(new CenterSubscription
        {
            CenterId = center.Id,
            Type = SubscriptionPlanType.Annual,
            StartDate = start,
            EndDate = end,
            Price = price,
            PaidAmount = paid,
            Currency = "EGP",
            Notes = notes
        });

        return center;
    }

    private static void AddSubscriptionPayment(
        AppDbContext db,
        Center center,
        decimal amount,
        DateTime paidAt,
        string method)
    {
        var subscription = db.CenterSubscriptions.Local
            .FirstOrDefault(s => s.CenterId == center.Id);

        if (subscription is null)
        {
            subscription = db.CenterSubscriptions
                .FirstOrDefault(s => s.CenterId == center.Id);

            if (subscription is null)
                return;
        }

        db.CenterSubscriptionPayments.Add(new CenterSubscriptionPayment
        {
            CenterId = center.Id,
            CenterSubscriptionId = subscription.Id,
            Amount = amount,
            PaidAt = paidAt,
            Method = method,
            Note = "دفعة اشتراك تجريبية."
        });
    }

    private static TeacherProfile NewTeacherProfile(
        User user,
        Guid centerId,
        string subject,
        string bio) =>
        new()
        {
            UserId = user.Id,
            CenterId = centerId,
            Subject = subject,
            Bio = bio
        };

    private static Group AddGroup(
        AppDbContext db,
        Guid centerId,
        string name,
        decimal monthlyPrice,
        int sessionsPerMonth)
    {
        var group = new Group
        {
            Name = name,
            MonthlyPrice = monthlyPrice,
            SessionsPerMonth = sessionsPerMonth,
            CenterId = centerId
        };

        db.Groups.Add(group);
        return group;
    }

    private static Session AddSession(
        AppDbContext db,
        Guid centerId,
        Group group,
        DayOfWeek dayOfWeek,
        TimeOnly startTime,
        TimeOnly endTime)
    {
        var session = new Session
        {
            GroupId = group.Id,
            CenterId = centerId,
            DayOfWeek = dayOfWeek,
            StartTime = startTime,
            EndTime = endTime,
            SessionPrice = 0m
        };

        db.Sessions.Add(session);
        return session;
    }

    private static Student NewStudent(
        Guid centerId,
        string fullName,
        string phone,
        string parentPhone,
        string qrCode,
        DateTime joinDate) =>
        new()
        {
            FullName = fullName,
            PhoneNumber = phone,
            ParentPhoneNumber = parentPhone,
            School = "مدرسة تجريبية",
            IsActive = true,
            SubscriptionType = SubscriptionType.Month,
            QrCode = qrCode,
            CenterId = centerId,
            CreatedAt = joinDate
        };

    private static Payment BuildPayment(
        Guid centerId,
        Student student,
        Group group,
        DateOnly period,
        decimal total,
        decimal paid,
        int receiptNumber,
        User receivedBy,
        DateTime createdAt)
    {
        var status = paid >= total ? PaymentStatus.FullyPaid : PaymentStatus.PartialPaid;

        var payment = new Payment
        {
            StudentId = student.Id,
            GroupId = group.Id,
            CenterId = centerId,
            PaymentDate = createdAt,
            BillingPeriod = period,
            ReceiptNumber = receiptNumber,
            ReceivedBy = receivedBy.Id,
            ReceivedByName = receivedBy.FullName,
            ReceivedAt = createdAt,
            CreatedAt = createdAt,
            Notes = status == PaymentStatus.FullyPaid ? "سداد كامل الشهر" : "سداد جزئي"
        };

        payment.StudentAmounts.Add(new StudentAmount
        {
            CenterId = centerId,
            Amount = paid,
            TotalAmount = total,
            PaidAmount = paid,
            RemainingAmount = total - paid,
            Status = status,
            CreatedAt = createdAt.AddSeconds(1)
        });

        return payment;
    }

    private static void AddPastAttendance(
        AppDbContext db,
        Guid centerId,
        Group group,
        IReadOnlyList<Student> students,
        IReadOnlyList<Session> sessions,
        DateTime today,
        User recordedBy)
    {
        foreach (var session in sessions)
        {
            for (var week = 1; week <= 3; week++)
            {
                var date = today.AddDays(-7 * week);
                while (date.DayOfWeek != session.DayOfWeek)
                    date = date.AddDays(-1);

                for (var i = 0; i < students.Count; i++)
                {
                    var status = (i + week) % 9 == 0
                        ? AttendanceStatus.Absent
                        : (i + week) % 11 == 0
                            ? AttendanceStatus.Late
                            : AttendanceStatus.Present;

                    db.Attendances.Add(new Attendance
                    {
                        StudentId = students[i].Id,
                        SessionId = session.Id,
                        CenterId = centerId,
                        AttendanceDate = DateOnly.FromDateTime(date),
                        Status = status,
                        Source = AttendanceSource.Manual,
                        RecordedAt = date.AddHours(19),
                        RecordedBy = recordedBy.Id,
                        Notes = status == AttendanceStatus.Absent ? "غياب بدون إذن" : null
                    });
                }
            }
        }

        _ = group;
    }

    private static Income NewIncome(
        Guid centerId,
        Guid categoryId,
        string name,
        decimal amount,
        DateTime date,
        Guid? groupId) =>
        new()
        {
            CenterId = centerId,
            CategoryId = categoryId,
            Name = name,
            Amount = amount,
            IncomeDate = DateOnly.FromDateTime(date),
            GroupId = groupId,
            Notes = "إيراد تجريبي."
        };

    private static Expense NewExpense(
        Guid centerId,
        Guid categoryId,
        string name,
        decimal amount,
        DateTime date) =>
        new()
        {
            CenterId = centerId,
            CategoryId = categoryId,
            Name = name,
            Amount = amount,
            ExpenseDate = DateOnly.FromDateTime(date),
            Notes = "مصروف تجريبي."
        };

    private static Question NewQuestion(
        QuestionBank bank,
        QuestionType type,
        string text,
        decimal mark,
        Guid centerId)
    {
        var question = new Question
        {
            QuestionBankId = bank.Id,
            Type = type,
            Text = text,
            Mark = mark,
            CenterId = centerId
        };

        bank.Questions.Add(question);
        return question;
    }

    private static QuestionExam NewQuestionExam(
        Guid centerId,
        string name,
        Group group,
        AcademicYear academicYear,
        DateTime examDate,
        int durationMinutes,
        bool resultsPublished) =>
        new()
        {
            CenterId = centerId,
            Name = name,
            GroupId = group.Id,
            AcademicYearId = academicYear.Id,
            Mode = QuestionExamMode.Electronic,
            ExamDate = examDate,
            DurationMinutes = durationMinutes,
            IsResultsPublished = resultsPublished,
            ShuffleQuestions = true,
            ShuffleOptions = true
        };

    private static void AddExamQuestion(
        QuestionExam exam,
        Question source,
        Guid centerId,
        int order)
    {
        var target = new QuestionExamQuestion
        {
            QuestionExamId = exam.Id,
            SourceQuestionId = source.Id,
            CenterId = centerId,
            Type = source.Type,
            Text = source.Text,
            ImageName = source.ImageName,
            Mark = source.Mark,
            Order = order
        };

        var optionOrder = 1;
        foreach (var option in source.Options.OrderBy(o => o.Order))
        {
            target.Options.Add(new QuestionExamQuestionOption
            {
                CenterId = centerId,
                Order = optionOrder++,
                Text = option.Text,
                IsCorrect = option.IsCorrect
            });
        }

        exam.Questions.Add(target);
    }

    private static AuditLog NewAudit(
        Guid actorUserId,
        string action,
        string? entityType,
        Guid? entityId,
        string details,
        DateTime createdAt) =>
        new()
        {
            ActorUserId = actorUserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId?.ToString(),
            Details = details,
            IpAddress = "127.0.0.1",
            CreatedAt = createdAt
        };

    private static decimal CurrentPaidFor(int studentIndex, decimal total) =>
        studentIndex switch
        {
            // fully paid current month
            0 or 2 or 4 or 1 or 3 or 5 => total,
            // partial
            7 or 9 or 6 or 8 => total / 2,
            // no payment (overdue)
            _ => 0m
        };
}
