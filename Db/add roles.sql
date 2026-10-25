INSERT INTO AspNetRoles
(
    Id,
    Name,
    NormalizedName,
    ConcurrencyStamp
)
VALUES
(NEWID(), 'Admin', 'ADMIN', NEWID()),
(NEWID(), 'Assistant', 'ASSISTANT', NEWID()),
(NEWID(), 'Student', 'STUDENT', NEWID());