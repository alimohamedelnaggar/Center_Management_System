DELETE FROM dbo.UserRefreshToken;
DELETE FROM dbo.SystemLogs;
DELETE FROM dbo.StudentExamComponents;
DELETE FROM dbo.ExamComponents;
DELETE FROM dbo.Exams;
DELETE FROM dbo.Attendances;
DELETE FROM dbo.Payments;
DELETE FROM dbo.StudentAmounts;
DELETE FROM dbo.Sessions;
DELETE FROM dbo.StudentGroups;
DELETE FROM dbo.Students;
DELETE FROM dbo.Groups;
DELETE FROM dbo.ExpenseCategories;
DELETE FROM dbo.Expenses;

-- Identity
DELETE FROM dbo.AspNetUserTokens;
DELETE FROM dbo.AspNetUserLogins;
DELETE FROM dbo.AspNetUserClaims;
DELETE FROM dbo.AspNetUserRoles;
DELETE FROM dbo.AspNetRoleClaims;
DELETE FROM dbo.AspNetUsers;
DELETE FROM dbo.AspNetRoles;