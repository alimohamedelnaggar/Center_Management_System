namespace CenterManagement.Data.AppMetaData;

public static class Routing
{
    public const string SignleRoute = "{id}";

    public const string root = "Api";
    public const string version = "V1";
    public const string Rule = root + "/" + version + "/";
    public const string getAll = "get-all";


    public static class AssistantRouting
    {
        public const string Prefix = Rule + "Assistant";
        public const string List = Prefix + "/List";
        public const string GetByID = Prefix + SignleRoute;
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string Pay = Prefix + "/Pay-Salary";
        public const string EditPay = Prefix + "/Pay-Salary/Edit";
        public const string DeletePay = Prefix + "/Pay-Salary/Delete";
        public const string SalaryInfo =Prefix + "/{assistantId:guid}/salary-info";
        public const string SalaryStatus = Prefix + "/Salary-Status";
        public const string ResetPassword = Prefix + "/{id}/Reset-Password";

    }
    public static class StudentRouting
    {
        public const string Prefix = Rule + "Student";
        public const string List = Prefix + "/List";
        public const string GetByID = Prefix + SignleRoute;
        public const string Create = Prefix + "/Create";
        public const string SaveAttendence = Prefix + "/save-attendence";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/delete/{id}";
        public const string ChangeStatus = Prefix + "/change-status/{id}";
        public const string ChangePaymentStatus = Prefix + "/change-payment-status/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string Stats = Prefix + "/stats";
        public const string GenerateQrCodes = Prefix + "/generate-qr-codes";
        public const string GenerateAccounts = Prefix + "/Generate-Accounts";
        public const string CreateParentAccount = Prefix + "/{id}/Create-Parent-Account";
        public const string BulkCreateParentAccounts = Prefix + "/Create-Parent-Accounts";
        public const string ResetPassword = Prefix + "/reset-password/{id}";
        public const string ImportTemplate = Prefix + "/Import/Template";
        public const string ImportPreview = Prefix + "/Import/Preview";
        public const string ImportCommit = Prefix + "/Import/Commit";
        public const string ImportErrorsReport = Prefix + "/Import/Errors/{sessionId}";
    }
    public static class ProfileRouting
    {
        public const string Prefix = Rule + "Profile";
        public const string GetMyProfile = Prefix + "/GetMyProfile";
        public const string EditMyProfile = Prefix + "/EditMyProfile";
        public const string ChangePassword = Prefix + "/ChangePassword";
    }
    #region ExpenseRouting
    public static class ExpenseRouting
    {
        public const string Prefix = Rule + "Expense/";
        public const string List = Prefix + "List";
        public const string GetByID = Prefix + "get-by-id/" + SignleRoute;
        public const string GetByGroupIdSessionId = Prefix + "get-by-group-session";
        public const string Create = Prefix + "Create";
        public const string Edit = Prefix + "Edit";
        public const string Delete = Prefix + "{id}";
        public const string Paginated = Prefix + "Paginated";
        public const string GetAll = Prefix + getAll;

    }
    public static class ExpenseCategoryRouting
    {
        public const string Prefix = Rule + "ExpenseCategory/";
        public const string List = Prefix + "List";
        public const string GetByID = Prefix + SignleRoute;
        public const string GetByGroupIdSessionId = Prefix + "get-by-group-session";
        public const string Create = Prefix + "Create";
        public const string Edit = Prefix + "Edit";
        public const string Delete = Prefix + "{id}";
        public const string Paginated = Prefix + "Paginated";
        public const string GetAll = Prefix + getAll;

    }
    #endregion
    public static class AttendanceRouting
    {
        public const string Prefix = Rule + "Attendance";
        public const string List = Prefix + "/List";
        public const string GetByID = Prefix + SignleRoute;
        public const string GetByGroupIdSessionId = Prefix + "/get-by-group-session";
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string GetForAttendence = Prefix + "/student-attendence";
        public const string Stats = Prefix + "/stats";
        public const string Scan = Prefix + "/scan";
        public const string RunningSessions = Prefix + "/running-sessions";

    }

    public static class ApplicationUserRouting
    {
        public const string Prefix = Rule + "User";
        public const string Create = Prefix + "Create";
        public const string Paginated = Prefix + "Paginated";
        public const string GetByID = Prefix + "get-by-id";
        public const string Edit = Prefix + "Edit";
        public const string Delete = Prefix + "{id}";
        public const string ChangePassword = Prefix + "Change-Password";
        public const string ResetPassword = Prefix + "Reset-Password";
    }
    public static class StudentCardRouting
    {
        public const string Prefix = Rule + "StudentCard";
        public const string ByCode = Prefix + "/by-code/{code}";
    }
    public static class AcademicYearRouting
    {
        public const string Prefix = Rule + "AcademicYear";
        public const string List = Prefix + "/List";
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/{id}";
        public const string GetAll = Prefix + "/get-all";
    }
    public static class QuestionBankRouting
    {
        public const string Prefix = Rule + "QuestionBank";
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string Questions = Prefix + "/{bankId}/questions";
        public const string UploadImage = Prefix + "/upload-image";
    }
    public static class Authentication
    {
        public const string Prefix = Rule + "Authentication";
        public const string SignIn = Prefix + "/SignIn";
        public const string Logout = Prefix + "/Logout";
        public const string Login = Prefix + "/Login";
        public const string RefreshToken = Prefix + "/Refresh-Token";
        public const string ValidateToken = Prefix + "/Validate-Token";
        //public const string ConfirmEmail = "/Api/Authentication/ConfirmEmail";
        public const string ConfirmEmail = Prefix + "ConfirmEmail";
        public const string SendResetCode = Prefix + "/Send-Reset-Code";
        public const string ResetPassword = Prefix + "/Reset-Password";

    }
    public static class AuthorizationRouting
    {
        public const string Prefix = Rule + "AuthorizationRouting";
        public const string Roles = Prefix + "Roles";
        public const string Claims = Prefix + "Claims";
        public const string Create = Roles + "Create";
        public const string Edit = Roles + "Edit";
        public const string Delete = Roles + "Delete/{id}";
        public const string RoleList = Roles + "Role-List";
        public const string GetRoleById = Roles + "Role-By-Id/{id}";
        public const string ManageUserRoles = Roles + "Manage-User-Roles/{userId}";
        public const string ManageUserClaims = Claims + "Manage-User-Claims/{userId}";
        public const string UpdateUserRoles = Roles + "Update-User-Roles";
        public const string UpdateUserClaims = Claims + "Update-User-Claims";
    }
    public static class EmailsRoute
    {
        public const string Prefix = Rule + "EmailsRoute";
        public const string SendEmail = Prefix + "SendEmail";
    }
    public static class SessionsRoute
    {
        public const string Prefix = Rule + "Session";

        public const string Roles = Prefix + "Roles";

        public const string Create = Prefix + "/Create";

        public const string Edit = Prefix + "/Edit";

        public const string Delete = Roles + "Delete/{id}";

        public const string GetSessionById = Roles + "Role-By-Id/{id}";

        public const string GetSessionByGroup = Roles + "Role-By-Group/{groupId}";
    }
    public static class PaymentsRoute
    {
        public const string Prefix = Rule + "Payments";

        public const string Roles = Prefix + "Roles";

        public const string Create = Prefix + "/Create";

        public const string GetAll = Prefix + "/GetAll";

        public const string Edit = Prefix + "/Edit";

        public const string Delete = Prefix+ "Delete/{paymentId}";

        public const string GetStudentPaymentInfo = "student-payment-info/{studentId:guid}";
        public const string Paginated = Prefix + "/Paginated";
        public const string StudentsFinance = Prefix + "/students-finance";

        public const string OverdueStudents = Prefix + "/overdue-students";

        public const string Receipt = Prefix + "/{paymentId:guid}/receipt";


    }
    public static class ReportsRoute
    {
        public const string Prefix = Rule + "Payments";

        public const string Roles = Prefix + "Roles";


        public const string GetAttendanceReport = Prefix + "/get-attendance-report/{studentId:guid}";

        public const string GetFinancialReport = Prefix + "/get-financial-report/{studentId:guid}";

        public const string GetGradesReport = Prefix + "/get-grade-report/{studentId:guid}";
        public const string GetStudentGroupsHistory = Prefix + "/student-groups-history/{studentId:guid}";

    }
    public static class ReportsOverviewRoute
    {
        public const string Prefix = Rule + "Reports";

        public const string Overview = Prefix + "/Overview";
    }
    public static class CenterReportsRoute
    {
        public const string Prefix = Rule + "Reports";

        // Center-wide reports for the center owner / solo teacher.
        public const string Overview = Prefix + "/Center-Overview";
    }
    public static class ExamRoute
    {
        public const string Prefix = Rule + "Exam";

        public const string Roles = Prefix + "Roles";

        public const string Create = Prefix + "/Create";

        public const string Edit = Prefix + "/Edit";

        public const string Delete = Prefix + "/Delete/{id}";

        public const string Stats = Roles + "/stats";

        public const string GroupSessionExams = Prefix + "/groups/{groupId}/sessions/{sessionId}/exams";

        public const string GetExamGrades = Prefix + "/groups/{groupId}/sessions/{sessionId}/exams/{examId}/grades";

        public const string UpdateParentContact =
    Prefix + "/ParentContact";
    }
    public static class QuestionExamRoute
    {
        public const string Prefix = Rule + "QuestionExam";
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string GetByID = Prefix + "/{id}";
        public const string Results = Prefix + "/{id}/Results";
        public const string PublishResults = Prefix + "/{id}/Publish";
        public const string AttemptDetail = Prefix + "/Attempts/{attemptId}";
        public const string GradeAttempt = Prefix + "/Attempts/{attemptId}/Grade";
    }
    public static class StudyNoteRoute
    {
        public const string Prefix = Rule + "StudyNote";
        public const string Create = Prefix + "/Create";
        public const string Delete = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
    }
    public static class StudentPortalRouting
    {
        public const string Prefix = Rule + "StudentPortal";
        public const string Profile = Prefix + "/Profile";
        public const string AvailableExams = Prefix + "/Exams";
        public const string StartExam = Prefix + "/Exams/{examId}/Start";
        public const string GetAttempt = Prefix + "/Attempts/{attemptId}";
        public const string SubmitAttempt = Prefix + "/Attempts/{attemptId}/Submit";
        public const string ReportViolation = Prefix + "/Attempts/{attemptId}/Violation";
        public const string ExamPreview = Prefix + "/Exams/{examId}/Preview";
        public const string Results = Prefix + "/Results";
        public const string Subscriptions = Prefix + "/Subscriptions";
        public const string Attendance = Prefix + "/Attendance";
        public const string Payments = Prefix + "/Payments";
        public const string Notes = Prefix + "/Notes";
        public const string Notifications = Prefix + "/Notifications";
        public const string UnreadCount = Prefix + "/Notifications/Unread-Count";
        public const string MarkRead = Prefix + "/Notifications/{id}/Read";
        public const string MarkAllRead = Prefix + "/Notifications/Read-All";
    }
    public static class ParentPortalRouting
    {
        public const string Prefix = Rule + "ParentPortal";
        public const string Children = Prefix + "/Children";
        public const string ChildSummary = Prefix + "/Children/{studentId}";
        public const string ChildAttendance = Prefix + "/Children/{studentId}/Attendance";
        public const string ChildGrades = Prefix + "/Children/{studentId}/Grades";
        public const string ChildExams = Prefix + "/Children/{studentId}/Exams";
        public const string ChildPayments = Prefix + "/Children/{studentId}/Payments";
        public const string Notifications = Prefix + "/Notifications";
        public const string UnreadCount = Prefix + "/Notifications/Unread-Count";
        public const string MarkRead = Prefix + "/Notifications/{id}/Read";
        public const string MarkAllRead = Prefix + "/Notifications/Read-All";
    }
    public static class GroupRouting
    {
        public const string Prefix = Rule + "Group";
        public const string List = Prefix + "/List";
        public const string GetByID = Prefix + SignleRoute;
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/delete/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string GetAll = Prefix + "/get-all";
    }

    public static class IncomeRouting
    {
        public const string Prefix = Rule + "Income/";
        public const string List = Prefix + "List";
        public const string GetByID = Prefix + "get-by-id/" + SignleRoute;
        public const string GetByGroupIdSessionId = Prefix + "get-by-group-session";
        public const string Create = Prefix + "Create";
        public const string Edit = Prefix + "Edit";
        public const string Delete = Prefix + "{id}";
        public const string Paginated = Prefix + "Paginated";
        public const string GetAll = Prefix + getAll;
    }

    public static class IncomeCategoryRouting
    {
        public const string Prefix = Rule + "IncomeCategory/";
        public const string List = Prefix + "List";
        public const string GetByID = Prefix + SignleRoute;
        public const string GetByGroupIdSessionId = Prefix + "get-by-group-session";
        public const string Create = Prefix + "Create";
        public const string Edit = Prefix + "Edit";
        public const string Delete = Prefix + "{id}";
        public const string Paginated = Prefix + "Paginated";
        public const string GetAll = Prefix + getAll;
    }



    public static class CenterRouting
    {
        public const string Prefix = Rule + "Center";
        public const string Create = Prefix + "/Create";
        public const string CreateWithOwner = Prefix + "/CreateWithOwner";
        public const string Edit = Prefix + "/Edit";
        public const string UpdateMyCenter = Prefix + "/UpdateMyCenter";
        public const string MyCenter = Prefix + "/MyCenter";
        public const string UploadLogo = Prefix + "/UploadLogo";
        public const string Delete = Prefix + "/{id}";
        public const string GetById = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
        public const string GetMyCenters = Prefix + "/MyCenters";
        public const string SetStatus = Prefix + "/{id}/Status";
        public const string UpgradeToMultiTeacher = Prefix + "/Upgrade-To-Multi-Teacher";

        // SuperAdmin subscription management.
        public const string Subscriptions = Prefix + "/Subscriptions";
        public const string SubscriptionDetail = Prefix + "/{id}/Subscription";
        public const string SubscriptionHistory = Prefix + "/{id}/Subscription/History";
        public const string UpdateSubscription = Prefix + "/Subscription/Update";
        public const string RenewSubscription = Prefix + "/{id}/Subscription/Renew";
        public const string AddSubscriptionPayment = Prefix + "/Subscription/Payment";
        public const string UpdateModules = Prefix + "/Modules/Update";
        public const string PreviewModules = Prefix + "/Modules/Preview";
    }

    public static class TeacherRouting
    {
        public const string Prefix = Rule + "Teacher";
        public const string Create = Prefix + "/Create";
        public const string Edit = Prefix + "/Edit";
        public const string Delete = Prefix + "/{id}";
        public const string GetById = Prefix + "/{id}";
        public const string Paginated = Prefix + "/Paginated";
    }

    public static class PlatformRouting
    {
        public const string Prefix = Rule + "Platform";
        public const string Statistics = Prefix + "/Statistics";
        public const string FlagLegacyPhonePasswords = Prefix + "/Flag-Legacy-Phone-Passwords";
    }

    public static class AuditLogRouting
    {
        public const string Prefix = Rule + "AuditLogs";
        public const string Paginated = Prefix + "/Paginated";
    }

    public static class ImpersonationRouting
    {
        public const string Prefix = Rule + "Impersonation";
        public const string Start = Prefix + "/Start";
        public const string Stop = Prefix + "/Stop";
    }

}


