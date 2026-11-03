using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Audit;
using CenterManagement.Data.Entities.Exams;
using CenterManagement.Data.Entities.Expenses;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Data.Entities.Messaging;
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
/// Deterministic marketing data set (Arabic video). It is only used when
/// ASPNETCORE_ENVIRONMENT is "E2E" AND E2E_MARKETING_SEED=1, and it runs against
/// the dedicated database CenterManagement_E2E_Marketing. It never touches the
/// Stage C database.
///
/// Numbers are internally consistent so that scenes recorded on different days
/// show the same story:
///   137 seeded students + 1 created during the video = 138 students.
///   Billed 70,800 / overdue 10,300 (10 students) / revenue 61,700
///   expenses 24,350 / assistant salaries 6,500 / net profit 31,150.
/// </summary>
public static class E2EMarketingSeeder
{
    private const string MarketingCenterName = "مركز النور التعليمي";
    private const string SoloCenterName = "مركز المعلم الفردي";
    private const string GraceCenterName = "مركز الفجر";
    private const string LimitedCenterName = "مركز الأمل";

    // Prices of the six seeded groups (per month).
    private static readonly decimal[] GroupPrices = [550m, 500m, 450m, 400m, 500m, 400m];
    private static readonly int[] GroupSizes = [20, 25, 22, 20, 20, 20];

    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var logger = serviceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("E2EMarketingSeeder");
        var hostEnvironment = serviceProvider.GetRequiredService<IHostEnvironment>();

        E2ESeedSafety.ValidateOrThrow(
            hostEnvironment.EnvironmentName,
            configuration.GetConnectionString("DefaultConnection"),
            Environment.GetEnvironmentVariable(E2ESeedSafety.AllowSeedEnvironmentVariable));

        if (!string.Equals(
                Environment.GetEnvironmentVariable("E2E_MARKETING_SEED"),
                "1",
                StringComparison.Ordinal))
        {
            return;
        }

        if (!configuration.GetValue("Seed:E2EEnabled", true))
            return;

        var db = serviceProvider.GetRequiredService<AppDbContext>();
        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<Role>>();

        if (configuration.GetValue("Seed:E2EReset", false))
        {
            logger.LogWarning("Marketing E2E reset requested: dropping marketing database.");
            await db.Database.EnsureDeletedAsync();
        }

        await db.Database.MigrateAsync();
        await EnsureRolesAsync(roleManager);

        if (await db.Centers.AnyAsync(c => c.Name == MarketingCenterName))
        {
            logger.LogInformation("Marketing E2E seed already present; skipping.");
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

        logger.LogInformation("Seeding marketing data set...");

        await using var transaction = await db.Database.BeginTransactionAsync();

        try
        {
            await SeedAsync(db, userManager, staffPassword, studentPassword);

            await transaction.CommitAsync();

            logger.LogInformation(
                "Marketing seed complete. Centers={Centers}, Students={Students}, Payments={Payments}, Users={Users}",
                await db.Centers.CountAsync(),
                await db.Students.CountAsync(),
                await db.Payments.CountAsync(),
                await db.Users.CountAsync());
        }
        catch
        {
            await transaction.RollbackAsync();
            logger.LogError("Marketing seeding failed and was rolled back.");
            throw;
        }
    }

    private static async Task SeedAsync(
        AppDbContext db,
        UserManager<User> userManager,
        string staffPassword,
        string studentPassword)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var localNow = DateTime.Now;
        var currentPeriod = new DateOnly(today.Year, today.Month, 1);
        var joinDate = currentPeriod.AddMonths(-3).ToDateTime(new TimeOnly(9, 0));

        // ------------------------------------------------------------------
        // Centers + modules + subscription history
        // ------------------------------------------------------------------

        var primary = AddCenter(
            db,
            name: MarketingCenterName,
            type: CenterType.MultiTeacher,
            phone: "01055500001",
            address: "٢٧ شارع الجيش - المنصورة",
            plan: "سنوي",
            start: today.AddDays(-75),
            end: today.AddDays(290),
            price: 12000m,
            paid: 12000m,
            notes: "مركز تعليمي متعدد المدرسين - بيانات تصوير بالكامل.",
            themeColor: "#0f766e");

        var solo = AddCenter(
            db,
            name: SoloCenterName,
            type: CenterType.SoloTeacher,
            phone: "01055500007",
            address: "٩ شارع البحر - طنطا",
            plan: "سنوي",
            start: today.AddDays(-40),
            end: today.AddDays(325),
            price: 6000m,
            paid: 6000m,
            notes: "مركز معلم فردي - بيانات تصوير بالكامل.",
            themeColor: "#7c3aed");

        var grace = AddCenter(
            db,
            name: GraceCenterName,
            type: CenterType.MultiTeacher,
            phone: "01055500005",
            address: "٤ شارع النصر - الإسكندرية",
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
            phone: "01055500006",
            address: "١٥ شارع الهرم - الجيزة",
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

        AddSubscriptionPayment(db, primary, 12000m, today.AddDays(-75), "تحويل بنكي");
        AddSubscriptionPayment(db, solo, 6000m, today.AddDays(-40), "فودافون كاش");
        AddSubscriptionPayment(db, grace, 1500m, today.AddDays(-31), "كاش");
        AddSubscriptionPayment(db, limited, 2000m, today.AddDays(-20), "إنستاباي");

        // ------------------------------------------------------------------
        // Staff accounts
        // ------------------------------------------------------------------

        var superAdmin = await CreateUserAsync(
            userManager, "01055500099", "مشرف المنصة", AppRoles.SuperAdmin, null, staffPassword);

        var owner = await CreateUserAsync(
            userManager, "01055500001", "أ. حسناء عبد الله", AppRoles.CenterOwner, primary.Id, staffPassword);

        primary.OwnerId = owner.Id;

        var teacherNames = new[]
        {
            "أ. محمد عبد الرحمن",
            "أ. سارة إبراهيم",
            "أ. هالة سمير",
            "أ. كريم فؤاد",
            "أ. نهى مصطفى",
            "أ. طارق منصور",
            "أ. دينا يوسف",
            "أ. عمرو زكي"
        };

        var teachers = new List<User>();
        for (var i = 0; i < teacherNames.Length; i++)
        {
            teachers.Add(await CreateUserAsync(
                userManager,
                $"0105550{1001 + i:D4}",
                teacherNames[i],
                AppRoles.Teacher,
                primary.Id,
                staffPassword));
        }

        var teacher1 = teachers[0];
        var teacher2 = teachers[1];

        var assistant1 = await CreateAssistantAsync(
            userManager,
            phone: "01055500003",
            fullName: "أ. منى حسن",
            centerId: primary.Id,
            password: staffPassword,
            salary: 4500m,
            teacherId: teacher1.Id,
            workingHoursPerWeek: 30,
            hireDate: DateOnly.FromDateTime(today.AddMonths(-10)));

        var assistant2 = await CreateAssistantAsync(
            userManager,
            phone: "01055500004",
            fullName: "أ. هدى سامي",
            centerId: primary.Id,
            password: staffPassword,
            salary: 2000m,
            teacherId: teacher2.Id,
            workingHoursPerWeek: 16,
            hireDate: DateOnly.FromDateTime(today.AddMonths(-5)));

        var studentAccount = await CreateUserAsync(
            userManager, "01155500001", "يوسف أحمد محمود", AppRoles.Student, primary.Id, studentPassword);

        var parent = await CreateUserAsync(
            userManager, "01055500005", "أحمد محمود السيد", AppRoles.Parent, primary.Id, staffPassword);

        var soloTeacher = await CreateUserAsync(
            userManager, "01055500007", "أ. كريم مصطفى", AppRoles.Teacher, solo.Id, staffPassword, isCenterAdmin: true);
        solo.OwnerId = soloTeacher.Id;

        var graceOwner = await CreateUserAsync(
            userManager, "01055500008", "أ. هدى كامل", AppRoles.CenterOwner, grace.Id, staffPassword);
        grace.OwnerId = graceOwner.Id;

        var limitedOwner = await CreateUserAsync(
            userManager, "01055500009", "أ. رامي نبيل", AppRoles.CenterOwner, limited.Id, staffPassword);
        limited.OwnerId = limitedOwner.Id;

        var graceTeacher = await CreateUserAsync(
            userManager, "01055500010", "أ. إيمان فؤاد", AppRoles.Teacher, grace.Id, staffPassword);

        var limitedTeacher = await CreateUserAsync(
            userManager, "01055500011", "أ. طارق منصور", AppRoles.Teacher, limited.Id, staffPassword);

        await db.SaveChangesAsync();

        db.TeacherProfiles.AddRange(
            NewTeacherProfile(teacher1, primary.Id, "الرياضيات", "مدرس الجبر والهندسة للمرحلة الإعدادية."),
            NewTeacherProfile(teacher2, primary.Id, "اللغة الإنجليزية", "مدرسة اللغة الإنجليزية للمرحلة الثانوية."),
            NewTeacherProfile(teachers[2], primary.Id, "العلوم", "مدرسة العلوم."),
            NewTeacherProfile(teachers[3], primary.Id, "اللغة العربية", "مدرس اللغة العربية."),
            NewTeacherProfile(teachers[4], primary.Id, "الفيزياء", "مدرسة الفيزياء."),
            NewTeacherProfile(teachers[5], primary.Id, "الكيمياء", "مدرس الكيمياء."),
            NewTeacherProfile(teachers[6], primary.Id, "الأحياء", "مدرسة الأحياء."),
            NewTeacherProfile(teachers[7], primary.Id, "الدراسات", "مدرس الدراسات الاجتماعية."),
            NewTeacherProfile(soloTeacher, solo.Id, "اللغة العربية", "مدرس اللغة العربية لجميع المراحل."),
            NewTeacherProfile(graceTeacher, grace.Id, "العلوم", "مدرسة العلوم."),
            NewTeacherProfile(limitedTeacher, limited.Id, "الفيزياء", "مدرس الفيزياء للمرحلة الثانوية."));

        // ------------------------------------------------------------------
        // Groups, teacher assignments, sessions
        // ------------------------------------------------------------------

        var groupNames = new[]
        {
            "الصف الثالث الإعدادي - أ",
            "الصف الثاني الثانوي - ب",
            "الصف الأول الثانوي - أ",
            "مراجعة ليلة الامتحان",
            "الصف الثالث الثانوي - علمي",
            "تأسيس اللغة الإنجليزية"
        };

        var groups = new List<Group>();
        for (var i = 0; i < groupNames.Length; i++)
            groups.Add(AddGroup(db, primary.Id, groupNames[i], GroupPrices[i], 8));

        var teacherForGroup = new[] { teacher1, teacher2, teachers[2], teachers[3], teachers[4], teachers[5] };
        for (var i = 0; i < groups.Count; i++)
        {
            db.TeacherGroups.Add(new TeacherGroup
            {
                TeacherId = teacherForGroup[i].Id,
                GroupId = groups[i].Id,
                CenterId = primary.Id
            });
        }

        var weeklySessions = new List<List<Session>>();
        var weekdays = new[]
        {
            new[] { DayOfWeek.Sunday, DayOfWeek.Tuesday },
            new[] { DayOfWeek.Monday, DayOfWeek.Wednesday },
            new[] { DayOfWeek.Saturday, DayOfWeek.Thursday },
            new[] { DayOfWeek.Friday, DayOfWeek.Sunday },
            new[] { DayOfWeek.Saturday, DayOfWeek.Wednesday },
            new[] { DayOfWeek.Tuesday, DayOfWeek.Thursday }
        };
        var times = new[]
        {
            (new TimeOnly(16, 0), new TimeOnly(18, 0)),
            (new TimeOnly(18, 0), new TimeOnly(20, 0)),
            (new TimeOnly(14, 0), new TimeOnly(16, 0)),
            (new TimeOnly(19, 0), new TimeOnly(21, 0)),
            (new TimeOnly(17, 0), new TimeOnly(19, 0)),
            (new TimeOnly(15, 0), new TimeOnly(17, 0))
        };

        for (var i = 0; i < groups.Count; i++)
        {
            var list = new List<Session>();
            for (var d = 0; d < 2; d++)
            {
                list.Add(AddSession(
                    db,
                    primary.Id,
                    groups[i],
                    weekdays[i][d],
                    times[i].Item1,
                    times[i].Item2));
            }

            weeklySessions.Add(list);
        }

        // A guaranteed running session for the QR scanner scene. It starts one
        // minute before the seed (which runs immediately before recording), so a
        // scan lands inside the product's ten-minute late grace and shows
        // "حاضر" instead of "متأخر". It still ends at the end of the day so the
        // session is running for the whole recording.
        var runningSession = AddSession(
            db,
            primary.Id,
            groups[0],
            localNow.DayOfWeek,
            TimeOnly.FromDateTime(localNow.AddMinutes(-1)),
            new TimeOnly(23, 59));

        // ------------------------------------------------------------------
        // Students (137 = 127 regular + 10 overdue)
        // ------------------------------------------------------------------

        var firstNames = new[]
        {
            "يوسف", "مريم", "عمر", "سلمى", "أحمد", "نور", "هنا", "مالك", "جنة", "زياد",
            "لينا", "عبد الرحمن", "فاطمة", "كريم", "ملك", "آدم", "رقية", "حمزة", "سارة", "علي"
        };
        var familyNames = new[]
        {
            "أحمد محمود", "خالد عبد العزيز", "محمد فؤاد", "سامي حسن", "وليد إبراهيم",
            "طارق سعيد", "عمرو شعبان", "هشام فتحي", "أشرف كمال", "ياسر علي",
            "صلاح الدين", "مجدي رشاد", "أيمن عبد الحميد", "مصطفى كامل", "حسنين علي"
        };

        var students = new List<Student>();
        var studentGroups = new List<Group>();
        var studentIndex = 0;

        // Regular students, in group sizes.
        for (var g = 0; g < groups.Count; g++)
        {
            for (var i = 0; i < GroupSizes[g]; i++)
            {
                var name = $"{firstNames[studentIndex % firstNames.Length]} {familyNames[(studentIndex / firstNames.Length + studentIndex) % familyNames.Length]}";
                var student = NewStudent(
                    primary.Id,
                    name,
                    $"0115550{studentIndex + 1:D4}",
                    $"0125550{studentIndex + 1:D4}",
                    $"MKT-{studentIndex + 1:D4}",
                    joinDate);

                // One higher custom price keeps the billed total exact.
                if (g == 2 && i == 0)
                    student.CustomMonthlyPrice = 1000m;

                // The first student is the portal demo account.
                if (studentIndex == 0)
                    student.UserId = studentAccount.Id;

                students.Add(student);
                studentGroups.Add(groups[g]);
                studentIndex++;
            }
        }

        // Ten overdue students on group 2 with custom prices summing 10,300.
        var overduePrices = new[]
        {
            1300m, 1200m, 1150m, 1100m, 1050m, 1000m, 950m, 900m, 850m, 800m
        };

        var overdueStudents = new List<Student>();
        for (var i = 0; i < overduePrices.Length; i++)
        {
            var student = NewStudent(
                primary.Id,
                $"{firstNames[(studentIndex + i) % firstNames.Length]} {familyNames[(i + 3) % familyNames.Length]}",
                $"0115551{i + 1:D4}",
                $"0125551{i + 1:D4}",
                $"MKT-{studentIndex + i + 1:D4}",
                joinDate);
            student.CustomMonthlyPrice = overduePrices[i];

            students.Add(student);
            studentGroups.Add(groups[1]);
            overdueStudents.Add(student);
        }

        db.Students.AddRange(students);
        await db.SaveChangesAsync();

        for (var i = 0; i < students.Count; i++)
        {
            db.StudentGroups.Add(new StudentGroup
            {
                StudentId = students[i].Id,
                GroupId = studentGroups[i].Id,
                CenterId = primary.Id,
                JoinDate = joinDate,
                IsActive = true
            });
        }

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

        var soloStudents = new List<Student>();
        var soloNames = new[] { "سلمى عادل", "يوسف عادل", "حبيبة عادل", "مازن عادل", "رقية عادل", "أدهم عادل" };
        for (var i = 0; i < soloNames.Length; i++)
        {
            soloStudents.Add(NewStudent(
                solo.Id,
                soloNames[i],
                $"0116550{i + 1:D4}",
                "01265500001",
                $"SOLO-{i + 1:D3}",
                joinDate));
        }

        db.Students.AddRange(soloStudents);

        var graceGroup = AddGroup(db, grace.Id, "الصف الأول الثانوي", 550m, 8);
        var limitedGroup = AddGroup(db, limited.Id, "الصف الثالث الثانوي", 800m, 8);
        db.TeacherGroups.AddRange(
            new TeacherGroup { TeacherId = graceTeacher.Id, GroupId = graceGroup.Id, CenterId = grace.Id },
            new TeacherGroup { TeacherId = limitedTeacher.Id, GroupId = limitedGroup.Id, CenterId = limited.Id });
        AddSession(db, grace.Id, graceGroup, DayOfWeek.Saturday, new TimeOnly(14, 0), new TimeOnly(16, 0));
        AddSession(db, limited.Id, limitedGroup, DayOfWeek.Friday, new TimeOnly(15, 0), new TimeOnly(17, 0));

        var graceStudents = new[]
        {
            NewStudent(grace.Id, "آدم سيد عبد الله", "01175500001", "01275500001", "GRACE-001", joinDate),
            NewStudent(grace.Id, "ليلى سيد عبد الله", "01175500002", "01275500001", "GRACE-002", joinDate)
        };
        var limitedStudents = new[]
        {
            NewStudent(limited.Id, "حسن فتحي محمود", "01185500001", "01285500001", "LIMIT-001", joinDate),
            NewStudent(limited.Id, "ملك فتحي محمود", "01185500002", "01285500001", "LIMIT-002", joinDate)
        };

        db.Students.AddRange(graceStudents);
        db.Students.AddRange(limitedStudents);
        await db.SaveChangesAsync();

        foreach (var s in soloStudents.Take(4))
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = sg1.Id, CenterId = solo.Id, JoinDate = joinDate, IsActive = true });
        foreach (var s in soloStudents.Skip(4))
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = sg2.Id, CenterId = solo.Id, JoinDate = joinDate, IsActive = true });
        foreach (var s in graceStudents)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = graceGroup.Id, CenterId = grace.Id, JoinDate = joinDate, IsActive = true });
        foreach (var s in limitedStudents)
            db.StudentGroups.Add(new StudentGroup { StudentId = s.Id, GroupId = limitedGroup.Id, CenterId = limited.Id, JoinDate = joinDate, IsActive = true });

        await db.SaveChangesAsync();

        // ------------------------------------------------------------------
        // Payments: current month (regular fully paid, overdue unpaid) and
        // five historical months with a rising revenue line.
        // ------------------------------------------------------------------

        var receipt = 1;

        for (var i = 0; i < students.Count; i++)
        {
            var student = students[i];
            var group = studentGroups[i];
            var total = student.CustomMonthlyPrice ?? group.MonthlyPrice;

            if (overdueStudents.Contains(student))
            {
                student.IsPaid = false;
                continue;
            }

            db.Payments.Add(BuildPayment(
                primary.Id, student, group, currentPeriod, total, total, receipt++,
                owner, currentPeriod.AddDays(2).ToDateTime(new TimeOnly(10, 0))));

            student.IsPaid = true;
        }

        // Historical revenue per month: 48,200 .. 58,400 (current month is 61,700).
        var historicalRevenue = new[] { 48200m, 50300m, 52900m, 55600m, 58400m };
        for (var m = 0; m < historicalRevenue.Length; m++)
        {
            var period = currentPeriod.AddMonths(-(historicalRevenue.Length - m));
            var target = historicalRevenue[m];
            var share = Math.Floor(target / groups.Count);
            var remainder = target - (share * groups.Count);

            for (var g = 0; g < groups.Count; g++)
            {
                var amount = share + (g == groups.Count - 1 ? remainder : 0m);
                var representative = students[GroupSizes.Take(g).Sum()];
                var payment = BuildPayment(
                    primary.Id,
                    representative,
                    groups[g],
                    period,
                    amount,
                    amount,
                    90000 + (m * 10) + g,
                    owner,
                    period.AddDays(3).ToDateTime(new TimeOnly(12, 0)));

                db.Payments.Add(payment);
            }
        }

        db.CenterReceiptCounters.Add(new CenterReceiptCounter
        {
            CenterId = primary.Id,
            LastNumber = receipt - 1
        });

        db.CenterReceiptCounters.Add(new CenterReceiptCounter
        {
            CenterId = solo.Id,
            LastNumber = 10
        });

        // ------------------------------------------------------------------
        // Attendance: three past weeks, 88% present / 12% absent.
        // ------------------------------------------------------------------

        var attendanceRows = new List<(Student Student, Session Session, DateTime Date)>();
        for (var g = 0; g < groups.Count; g++)
        {
            var groupStudents = students
                .Where((_, index) => studentGroups[index] == groups[g])
                .ToList();

            foreach (var session in weeklySessions[g])
            {
                for (var week = 1; week <= 3; week++)
                {
                    var date = today.AddDays(-7 * week);
                    while (date.DayOfWeek != session.DayOfWeek)
                        date = date.AddDays(-1);

                    foreach (var student in groupStudents)
                        attendanceRows.Add((student, session, date));
                }
            }
        }

        var absentCount = (int)Math.Round(attendanceRows.Count * 0.12);
        for (var i = 0; i < attendanceRows.Count; i++)
        {
            var row = attendanceRows[i];
            var isAbsent = Math.Floor((i + 1) * (double)absentCount / attendanceRows.Count)
                > Math.Floor(i * (double)absentCount / attendanceRows.Count);

            db.Attendances.Add(new Attendance
            {
                StudentId = row.Student.Id,
                SessionId = row.Session.Id,
                CenterId = primary.Id,
                AttendanceDate = DateOnly.FromDateTime(row.Date),
                Status = isAbsent ? AttendanceStatus.Absent : AttendanceStatus.Present,
                Source = AttendanceSource.Manual,
                RecordedAt = row.Date.AddHours(19),
                RecordedBy = owner.Id,
                Notes = isAbsent ? "غياب بدون إذن" : null
            });
        }

        // ------------------------------------------------------------------
        // Income + expenses (current month and the same five history months)
        // ------------------------------------------------------------------

        var incomeSubs = new IncomeCategory { Name = "اشتراكات الطلاب", CenterId = primary.Id };
        var incomeExtra = new IncomeCategory { Name = "حصص إضافية", CenterId = primary.Id };
        var incomeNotes = new IncomeCategory { Name = "بيع المذكرات", CenterId = primary.Id };
        db.IncomeCategories.AddRange(incomeSubs, incomeExtra, incomeNotes);

        var expenseRent = new ExpenseCategory { Name = "إيجار", CenterId = primary.Id };
        var expenseBills = new ExpenseCategory { Name = "كهرباء ومياه", CenterId = primary.Id };
        var expensePrint = new ExpenseCategory { Name = "طباعة ومستلزمات", CenterId = primary.Id };
        var expenseInternet = new ExpenseCategory { Name = "إنترنت", CenterId = primary.Id };
        var expenseSalaries = new ExpenseCategory { Name = "رواتب", CenterId = primary.Id };
        db.ExpenseCategories.AddRange(expenseRent, expenseBills, expensePrint, expenseInternet, expenseSalaries);

        var soloIncome = new IncomeCategory { Name = "اشتراكات شهرية", CenterId = solo.Id };
        var soloExpense = new ExpenseCategory { Name = "مصروفات المركز", CenterId = solo.Id };
        db.IncomeCategories.Add(soloIncome);
        db.ExpenseCategories.Add(soloExpense);

        await db.SaveChangesAsync();

        // Other income this month: 1,750 -> 59,950 + 1,750 = 61,700.
        db.Incomes.AddRange(
            NewIncome(primary.Id, incomeExtra.Id, "مراجعة إضافية - رياضيات", 900m, today.AddDays(-6), groups[0].Id),
            NewIncome(primary.Id, incomeNotes.Id, "بيع ملازم المراجعة", 850m, today.AddDays(-4), null));

        // One income row per historical month keeps the revenue chart rising.
        for (var m = 0; m < 5; m++)
        {
            var period = currentPeriod.AddMonths(-(5 - m));
            db.Incomes.Add(NewIncome(
                primary.Id,
                incomeSubs.Id,
                $"اشتراكات {period:yyyy-MM}",
                0m,
                period.ToDateTime(new TimeOnly(9, 0)),
                null));
        }

        // Current month expenses: 24,350 in total.
        db.Expenses.AddRange(
            NewExpense(primary.Id, expenseRent.Id, "إيجار المقر", 9000m, today.AddDays(-20)),
            NewExpense(primary.Id, expenseBills.Id, "كهرباء ومياه", 2400m, today.AddDays(-14)),
            NewExpense(primary.Id, expensePrint.Id, "طباعة ملازم وامتحانات", 3200m, today.AddDays(-10)),
            NewExpense(primary.Id, expenseInternet.Id, "باقة الإنترنت", 750m, today.AddDays(-8)),
            NewExpense(primary.Id, expenseSalaries.Id, "مستلزمات تشغيل", 9000m, today.AddDays(-3)));

        // Five historical months with believable expenses (not used in totals).
        for (var m = 0; m < 5; m++)
        {
            var period = currentPeriod.AddMonths(-(5 - m));
            db.Expenses.Add(NewExpense(primary.Id, expenseRent.Id, "إيجار المقر", 9000m, period.ToDateTime(new TimeOnly(9, 0))));
            db.Expenses.Add(NewExpense(primary.Id, expenseBills.Id, "كهرباء ومياه", 2400m, period.AddDays(10).ToDateTime(new TimeOnly(9, 0))));
        }

        db.Incomes.Add(NewIncome(solo.Id, soloIncome.Id, "اشتراكات الشهر", 2450m, today.AddDays(-12), sg1.Id));
        db.Expenses.Add(NewExpense(solo.Id, soloExpense.Id, "إيجار القاعة", 1200m, today.AddDays(-18)));

        // ------------------------------------------------------------------
        // Assistant salaries: 4,500 + 2,000 = 6,500 for the current month.
        // ------------------------------------------------------------------

        db.AssistantPayments.AddRange(
            NewAssistantPayment(assistant1, primary.Id, currentPeriod, 4500m, 0m, 0m, false),
            NewAssistantPayment(assistant2, primary.Id, currentPeriod, 2000m, 0m, 0m, false),
            NewAssistantPayment(assistant1, primary.Id, currentPeriod.AddMonths(-1), 4500m, 250m, 0m, true),
            NewAssistantPayment(assistant2, primary.Id, currentPeriod.AddMonths(-1), 2000m, 0m, 0m, true));

        // ------------------------------------------------------------------
        // Question bank + electronic exam
        // ------------------------------------------------------------------

        var academicYear = new AcademicYear { Name = "2026 / 2027", Order = 1 };
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

        await db.SaveChangesAsync();

        var liveExam = NewQuestionExam(
            primary.Id,
            "اختبار الجبر الإلكتروني",
            groups[0],
            academicYear,
            localNow.AddMinutes(-1),
            durationMinutes: 120,
            resultsPublished: false);

        AddExamQuestion(liveExam, q1, primary.Id, 1);
        AddExamQuestion(liveExam, q2, primary.Id, 2);
        AddExamQuestion(liveExam, q3, primary.Id, 3);
        db.QuestionExams.Add(liveExam);

        var pastExam = NewQuestionExam(
            primary.Id,
            "اختبار شهري - الأعداد والجبر",
            groups[0],
            academicYear,
            localNow.AddDays(-14),
            durationMinutes: 30,
            resultsPublished: true);
        pastExam.PublishedAt = localNow.AddDays(-13);

        AddExamQuestion(pastExam, q1, primary.Id, 1);
        AddExamQuestion(pastExam, q2, primary.Id, 2);
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
        // Monthly written exam with component marks. The parent portal's
        // "الدرجات" section reads StudentExamComponent rows only, so without
        // this seed it would be empty for both linked children.
        // ------------------------------------------------------------------

        var writtenExam = new Exam
        {
            Name = "امتحان أكتوبر - الجبر",
            GroupId = groups[0].Id,
            SessionId = weeklySessions[0][0].Id,
            ExamDate = localNow.AddDays(-7),
            CenterId = primary.Id
        };

        var writtenComponent = new ExamComponent
        {
            ExamId = writtenExam.Id,
            Type = ExamType.WrittenExam,
            TotalMarks = 20m,
            CenterId = primary.Id
        };

        var dictationComponent = new ExamComponent
        {
            ExamId = writtenExam.Id,
            Type = ExamType.Dictation,
            TotalMarks = 10m,
            CenterId = primary.Id
        };

        writtenExam.ExamComponents.Add(writtenComponent);
        writtenExam.ExamComponents.Add(dictationComponent);
        db.Exams.Add(writtenExam);

        db.StudentExamComponents.AddRange(
            new StudentExamComponent
            {
                StudentId = students[0].Id,
                ExamComponent = writtenComponent,
                Mark = 18m,
                CenterId = primary.Id
            },
            new StudentExamComponent
            {
                StudentId = students[0].Id,
                ExamComponent = dictationComponent,
                Mark = 9m,
                CenterId = primary.Id
            },
            new StudentExamComponent
            {
                StudentId = students[1].Id,
                ExamComponent = writtenComponent,
                Mark = 16m,
                CenterId = primary.Id
            },
            new StudentExamComponent
            {
                StudentId = students[1].Id,
                ExamComponent = dictationComponent,
                Mark = 10m,
                CenterId = primary.Id
            });

        await db.SaveChangesAsync();

        // ------------------------------------------------------------------
        // Notifications + message templates
        // ------------------------------------------------------------------

        db.Notifications.AddRange(
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
                Body = "الاشتراك الشهري لمريم غير مكتمل.",
                Type = "FeesReminder",
                ReferenceId = students[1].Id,
                ReferenceType = "Student",
                IsRead = false,
                CenterId = primary.Id,
                CreatedAt = now.AddHours(-4)
            });

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
        // Audit log
        // ------------------------------------------------------------------

        db.AuditLogs.AddRange(
            NewAudit(superAdmin.Id, "CenterCreated", "Center", primary.Id, "تم إنشاء مركز النور التعليمي", now.AddDays(-75)),
            NewAudit(superAdmin.Id, "SubscriptionRenewed", "Center", primary.Id, "تجديد اشتراك سنوي", now.AddDays(-75)),
            NewAudit(superAdmin.Id, "CenterCreated", "Center", solo.Id, "تم إنشاء مركز المعلم الفردي", now.AddDays(-40)),
            NewAudit(superAdmin.Id, "CenterCreated", "Center", grace.Id, "تم إنشاء مركز الفجر", now.AddDays(-31)),
            NewAudit(superAdmin.Id, "ModulesUpdated", "Center", limited.Id, "تعطيل وحدات في مركز الأمل", now.AddDays(-15)),
            NewAudit(superAdmin.Id, "PlatformStatisticsViewed", "Platform", null, "اطلاع على إحصائيات المنصة", now.AddDays(-2)));

        await db.SaveChangesAsync();

        _ = runningSession;
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

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
            Notes = "مساعد مدرس.",
            NationalId = "29901011234567"
        };

        await CreateOrThrowAsync(userManager, assistant, password);
        await AddToRoleOrThrowAsync(userManager, assistant, AppRoles.Assistant);
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
            Description = "بيانات تصوير تسويقي بالكامل.",
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
            return;

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
            School = "مدرسة النور الإعدادية",
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

    private static AssistantPayment NewAssistantPayment(
        Assistent assistant,
        Guid centerId,
        DateOnly period,
        decimal basic,
        decimal bonus,
        decimal deduction,
        bool isPaid) =>
        new()
        {
            AssistantId = assistant.Id,
            CenterId = centerId,
            Month = period.Month,
            Year = period.Year,
            BasicSalary = basic,
            Bonus = bonus,
            Deduction = deduction,
            NetSalary = basic + bonus - deduction,
            IsPaid = isPaid,
            PaidAt = isPaid ? period.AddMonths(1).ToDateTime(new TimeOnly(20, 0)) : null,
            Notes = isPaid ? "مرتب الشهر السابق مدفوع بالكامل." : "مرتب الشهر الحالي - لم يُقبض بعد."
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
}
