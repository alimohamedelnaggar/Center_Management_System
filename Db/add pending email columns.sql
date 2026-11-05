-- Self-service email changes are staged in PendingEmail until the account
-- holder opens the tokenized link. The current Email stays active (and stays
-- usable for password recovery) until then.
--
-- Run this once on an existing database. Test databases created with
-- EnsureCreated() pick the columns up from the entity.

IF COL_LENGTH('[dbo].[AspNetUsers]', 'PendingEmail') IS NULL
BEGIN
    ALTER TABLE [dbo].[AspNetUsers] ADD [PendingEmail] nvarchar(256) NULL;
END;
GO

IF COL_LENGTH('[dbo].[AspNetUsers]', 'PendingEmailRequestedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[AspNetUsers] ADD [PendingEmailRequestedAt] datetime2 NULL;
END;
GO
