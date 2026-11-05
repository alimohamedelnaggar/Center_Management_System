-- Email is optional for staff, students and parents, but when an account has
-- one it must be unique system-wide. Identity's default EmailIndex is not
-- unique, so replace it with a filtered unique index that still allows the
-- many rows whose NormalizedEmail is NULL.
--
-- Run this once on an existing database. The application also configures the
-- same index in AppDbContext for test databases created with EnsureCreated().

IF EXISTS (
    SELECT NormalizedEmail
    FROM [dbo].[AspNetUsers]
    WHERE NormalizedEmail IS NOT NULL
    GROUP BY NormalizedEmail
    HAVING COUNT(*) > 1
)
BEGIN
    THROW 50000, 'Duplicate normalized emails exist. Resolve them before creating the unique EmailIndex.', 1;
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'EmailIndex'
      AND object_id = OBJECT_ID('[dbo].[AspNetUsers]')
)
BEGIN
    DROP INDEX [EmailIndex] ON [dbo].[AspNetUsers];
END;
GO

CREATE UNIQUE INDEX [EmailIndex]
    ON [dbo].[AspNetUsers] ([NormalizedEmail])
    WHERE [NormalizedEmail] IS NOT NULL;
GO
