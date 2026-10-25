using CenterManagement.Data.AppMetaData;
using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Identity;
using CenterManagement.Data.Entities.Incomes;
using CenterManagement.Data.Entities.Users;
using CenterManagement.Data.Enums;
using CenterManagement.Infrustructure.Data;

namespace CenterManagement.Tests;

public sealed record SeedResult(
    Guid CenterA,
    Guid CenterB,
    Guid CenterSolo,
    Guid TeacherA,
    Guid TeacherB,
    Guid GroupA,
    Guid GroupB,
    Guid StudentA,
    Guid StudentB,
    Guid AssistantA,
    Guid AssistantB,
    Guid CenterOwnerA,
    Guid SoloTeacherA,
    Guid SoloTeacherB,
    Guid IncomeCategoryA);

/// <summary>
/// Builds a deterministic two-center graph:
/// <list type="bullet">
/// <item>Center A holds Teacher A (group A) and Teacher B (group B) plus one
/// student in each group.</item>
/// <item>Center B holds a single assistant, used to prove center isolation.</item>
/// </list>
/// </summary>
public static class TestData
{
    public static SeedResult Seed(TestDatabase db) => Seed(db.Context);

    public static SeedResult Seed(AppDbContext ctx)
    {
        var centerA = new Center { Id = Guid.NewGuid(), Name = "Center A" };
        var centerB = new Center { Id = Guid.NewGuid(), Name = "Center B" };
        // A genuine solo-teacher center (Center.Type = SoloTeacher) so the
        // "no teacherId" group semantics are exercised against a center that
        // actually supports a single teacher.
        var centerSolo = new Center
        {
            Id = Guid.NewGuid(),
            Name = "Center Solo",
            Type = CenterType.SoloTeacher
        };
        ctx.Centers.AddRange(centerA, centerB, centerSolo);

        // Provision the full module set for both centers (a missing row = disabled).
        ctx.CenterModules.AddRange(CenterModuleFactory.CreateFullSet(centerA.Id));
        ctx.CenterModules.AddRange(CenterModuleFactory.CreateFullSet(centerB.Id));
        ctx.CenterModules.AddRange(CenterModuleFactory.CreateFullSet(centerSolo.Id));

        var teacherA = new User { Id = Guid.NewGuid(), FullName = "Teacher A", PhoneNumber = "01100000001", CenterId = centerA.Id, SecurityStamp = Guid.NewGuid().ToString() };
        var teacherB = new User { Id = Guid.NewGuid(), FullName = "Teacher B", PhoneNumber = "01100000002", CenterId = centerA.Id, SecurityStamp = Guid.NewGuid().ToString() };
        var centerOwnerA = new User { Id = Guid.NewGuid(), FullName = "Center Owner A", PhoneNumber = "01000000010", CenterId = centerA.Id, SecurityStamp = Guid.NewGuid().ToString() };
        ctx.Users.AddRange(teacherA, teacherB, centerOwnerA);

        // A solo teacher owns his center (is_center_admin = true) and therefore
        // keeps full group management.
        var soloTeacherA = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Solo Teacher A",
            PhoneNumber = "01100000009",
            CenterId = centerA.Id,
            IsCenterAdmin = true,
            SecurityStamp = Guid.NewGuid().ToString()
        };
        ctx.Users.Add(soloTeacherA);

        // The single teacher of Center Solo (owns it): group writes with no
        // teacherId must link him automatically.
        var soloTeacherB = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Solo Teacher B",
            PhoneNumber = "01100000008",
            CenterId = centerSolo.Id,
            IsCenterAdmin = true,
            SecurityStamp = Guid.NewGuid().ToString()
        };
        ctx.Users.Add(soloTeacherB);

        var groupA = new Group { Id = Guid.NewGuid(), Name = "Group A", CenterId = centerA.Id, MonthlyPrice = 100, SessionsPerMonth = 8 };
        var groupB = new Group { Id = Guid.NewGuid(), Name = "Group B", CenterId = centerA.Id, MonthlyPrice = 100, SessionsPerMonth = 8 };
        ctx.Groups.AddRange(groupA, groupB);

        ctx.TeacherGroups.AddRange(
            new TeacherGroup { TeacherId = teacherA.Id, GroupId = groupA.Id, CenterId = centerA.Id },
            new TeacherGroup { TeacherId = teacherB.Id, GroupId = groupB.Id, CenterId = centerA.Id });

        var studentA = new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Student A",
            PhoneNumber = "01200000001",
            ParentPhoneNumber = "01200000011",
            CenterId = centerA.Id
        };
        var studentB = new Student
        {
            Id = Guid.NewGuid(),
            FullName = "Student B",
            PhoneNumber = "01200000002",
            ParentPhoneNumber = "01200000012",
            CenterId = centerA.Id
        };
        ctx.Students.AddRange(studentA, studentB);

        ctx.StudentGroups.AddRange(
            new StudentGroup { StudentId = studentA.Id, GroupId = groupA.Id, CenterId = centerA.Id, IsActive = true, JoinDate = new DateTime(2026, 8, 1) },
            new StudentGroup { StudentId = studentB.Id, GroupId = groupB.Id, CenterId = centerA.Id, IsActive = true, JoinDate = new DateTime(2026, 8, 1) });

        var assistantA = new Assistent { Id = Guid.NewGuid(), FullName = "Assistant A", PhoneNumber = "01500000001", UserName = "01500000001", NormalizedUserName = "01500000001", CenterId = centerA.Id, SecurityStamp = Guid.NewGuid().ToString() };
        var assistantB = new Assistent { Id = Guid.NewGuid(), FullName = "Assistant B", PhoneNumber = "01500000002", UserName = "01500000002", NormalizedUserName = "01500000002", CenterId = centerB.Id, SecurityStamp = Guid.NewGuid().ToString() };

        // The TenantInterceptor normally mirrors the center onto the base
        // Identity row too; do it manually here since the interceptor isn't wired.
        ((User)assistantA).CenterId = centerA.Id;
        ((User)assistantB).CenterId = centerB.Id;

        ctx.Assistents.AddRange(assistantA, assistantB);

        // Income scoping fixture: one income per group so a teacher can prove
        // he never sees the other teacher's income.
        var incomeCategoryA = new IncomeCategory
        {
            Id = Guid.NewGuid(),
            Name = "Category A",
            CenterId = centerA.Id
        };
        ctx.IncomeCategories.Add(incomeCategoryA);

        ctx.Incomes.AddRange(
            new Income
            {
                Id = Guid.NewGuid(),
                Name = "Income A",
                CategoryId = incomeCategoryA.Id,
                Amount = 100,
                IncomeDate = new DateOnly(2026, 8, 1),
                GroupId = groupA.Id,
                CenterId = centerA.Id
            },
            new Income
            {
                Id = Guid.NewGuid(),
                Name = "Income B",
                CategoryId = incomeCategoryA.Id,
                Amount = 200,
                IncomeDate = new DateOnly(2026, 8, 1),
                GroupId = groupB.Id,
                CenterId = centerA.Id
            });

        ctx.SaveChanges();

        return new SeedResult(
            centerA.Id,
            centerB.Id,
            centerSolo.Id,
            teacherA.Id,
            teacherB.Id,
            groupA.Id,
            groupB.Id,
            studentA.Id,
            studentB.Id,
            assistantA.Id,
            assistantB.Id,
            centerOwnerA.Id,
            soloTeacherA.Id,
            soloTeacherB.Id,
            incomeCategoryA.Id);
    }
}
