using CenterManagement.Data.Entities;
using CenterManagement.Data.Entities.Abstractions;
using CenterManagement.Data.Entities.Groups;
using CenterManagement.Data.Entities.Notes;
using CenterManagement.Data.Entities.QuestionBank;
using CenterManagement.Data.Entities.Users;

namespace CenterManagement.Core.Bases;

/// <summary>
/// Applies a <see cref="UserScope"/> to entity queries so a teacher (or an
/// assistant linked to a teacher) only sees his own groups. Center-wide scopes
/// (owner, solo teacher, unlinked assistant) leave the query untouched.
/// </summary>
public static class ScopeQueryExtensions
{
    public static IQueryable<Group> ScopeToUser(this IQueryable<Group> query, UserScope scope)
        => scope.CenterWide ? query : query.Where(g => scope.GroupIds.Contains(g.Id));

    public static IQueryable<Session> ScopeToUser(this IQueryable<Session> query, UserScope scope)
        => scope.CenterWide ? query : query.Where(s => scope.GroupIds.Contains(s.GroupId));

    public static IQueryable<Student> ScopeToUser(this IQueryable<Student> query, UserScope scope)
        => scope.CenterWide
            ? query
            : query.Where(s => s.StudentGroups.Any(sg =>
                scope.GroupIds.Contains(sg.GroupId) && sg.IsActive && sg.LeftAt == null));

    public static IQueryable<Attendance> ScopeToUser(this IQueryable<Attendance> query, UserScope scope)
        => scope.CenterWide
            ? query
            : query.Where(a => scope.GroupIds.Contains(a.Session.GroupId));

    public static IQueryable<Payment> ScopeToUser(this IQueryable<Payment> query, UserScope scope)
        => scope.CenterWide
            ? query
            : query.Where(p => scope.GroupIds.Contains(p.GroupId));

    public static IQueryable<StudentAmount> ScopeToUser(this IQueryable<StudentAmount> query, UserScope scope)
        => scope.CenterWide
            ? query
            : query.Where(sa => scope.GroupIds.Contains(sa.Payment.GroupId));

    public static IQueryable<QuestionExam> ScopeToUser(this IQueryable<QuestionExam> query, UserScope scope)
        => scope.CenterWide
            ? query
            : query.Where(x => scope.GroupIds.Contains(x.GroupId));

    // A study note is shared with every group it is attached to, so a restricted
    // user only sees notes attached to at least one of his own groups.
    public static IQueryable<StudyNote> ScopeToUser(this IQueryable<StudyNote> query, UserScope scope)
        => scope.CenterWide
            ? query
            : query.Where(n => n.StudyNoteGroups.Any(g => scope.GroupIds.Contains(g.GroupId)));
}
