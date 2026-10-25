using CenterManagement.Core.Features.NotificationFeature.Dtos;
using CenterManagement.Core.Features.StudentPortalFeature.Dtos;

namespace CenterManagement.Core.Features.StudentPortalFeature.Queries.Models;

public class GetStudentProfileQuery : IRequest<Response<StudentProfileDTO>>
{
}

public class GetAvailableStudentExamsQuery : IRequest<Response<List<StudentExamListItemDTO>>>
{
}

public class GetStudentAttemptQuery : IRequest<Response<StudentAttemptDTO>>
{
    public Guid AttemptId { get; set; }

    public GetStudentAttemptQuery(Guid attemptId)
    {
        AttemptId = attemptId;
    }
}

public class GetStudentResultsQuery : IRequest<Response<List<StudentResultDTO>>>
{
}

public class GetStudentExamPreviewQuery : IRequest<Response<StudentExamPreviewDTO>>
{
    public Guid ExamId { get; set; }

    public GetStudentExamPreviewQuery(Guid examId)
    {
        ExamId = examId;
    }
}

public class GetStudentNotificationsQuery
    : IRequest<Response<PaginatedResult<NotificationDTO>>>
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class GetStudentUnreadNotificationsCountQuery : IRequest<Response<int>>
{
}

public class GetStudentSubscriptionsQuery
    : IRequest<Response<List<StudentSubscriptionDTO>>>
{
}

public class GetStudentAttendanceQuery
    : IRequest<Response<StudentAttendanceSummaryDTO>>
{
}

public class GetStudentPaymentsQuery
    : IRequest<Response<StudentPaymentsDTO>>
{
}

public class GetStudentNotesQuery
    : IRequest<Response<List<StudentNoteDTO>>>
{
}
