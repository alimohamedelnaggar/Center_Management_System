IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Admins] (
        [Id] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_Admins] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] uniqueidentifier NOT NULL,
        [FullName] nvarchar(max) NOT NULL,
        [Address] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [Code] nvarchar(max) NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [ExpenseCategories] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ExpenseCategories] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Groups] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [MonthlyPrice] decimal(18,2) NOT NULL,
        [IsDeleted] bit NOT NULL,
        [SessionsPerMonth] int NOT NULL DEFAULT 8,
        [DeletedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        CONSTRAINT [PK_Groups] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [IdentityRole<Guid>] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NULL,
        [NormalizedName] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_IdentityRole<Guid>] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [IncomeCategories] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_IncomeCategories] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Students] (
        [Id] uniqueidentifier NOT NULL,
        [FullName] nvarchar(max) NOT NULL,
        [PhoneNumber] nvarchar(15) NOT NULL,
        [ParentPhoneNumber] nvarchar(15) NOT NULL,
        [School] nvarchar(200) NULL,
        [Notes] nvarchar(1000) NULL,
        [IsActive] bit NOT NULL,
        [IsPaid] bit NOT NULL,
        [CustomMonthlyPrice] decimal(18,2) NULL,
        [SubscriptionType] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Students] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] uniqueidentifier NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] uniqueidentifier NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] uniqueidentifier NOT NULL,
        [RoleId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] uniqueidentifier NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Assistents] (
        [Id] uniqueidentifier NOT NULL,
        [Salary] decimal(18,2) NOT NULL,
        [WorkingHoursPerWeek] int NULL,
        [HireDate] date NULL,
        [IsActive] bit NOT NULL,
        [NationalId] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        CONSTRAINT [PK_Assistents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Assistents_AspNetUsers_Id] FOREIGN KEY ([Id]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [UserRefreshToken] (
        [Id] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Token] nvarchar(max) NOT NULL,
        [JwtId] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [RevokedAt] datetime2 NULL,
        [IsRevoked] bit NOT NULL,
        [IsUsed] bit NOT NULL,
        CONSTRAINT [PK_UserRefreshToken] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserRefreshToken_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Expenses] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [CategoryId] uniqueidentifier NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [ExpenseDate] date NOT NULL,
        [Notes] nvarchar(500) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Expenses] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Expenses_ExpenseCategories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [ExpenseCategories] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Sessions] (
        [Id] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [SessionPrice] decimal(18,2) NOT NULL,
        [DayOfWeek] int NOT NULL,
        [StartTime] time NOT NULL,
        [EndTime] time NOT NULL,
        [IsDeleted] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Sessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Sessions_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Incomes] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [CategoryId] uniqueidentifier NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [IncomeDate] date NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Incomes] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Incomes_IncomeCategories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [IncomeCategories] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [StudentGroups] (
        [StudentId] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [JoinDate] datetime2 NOT NULL,
        [LeftAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_StudentGroups] PRIMARY KEY ([StudentId], [GroupId]),
        CONSTRAINT [FK_StudentGroups_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_StudentGroups_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [AssistantPayments] (
        [Id] uniqueidentifier NOT NULL,
        [AssistantId] uniqueidentifier NOT NULL,
        [Month] int NOT NULL,
        [Year] int NOT NULL,
        [BasicSalary] decimal(18,2) NOT NULL,
        [Bonus] decimal(18,2) NULL,
        [Deduction] decimal(18,2) NULL,
        [NetSalary] decimal(18,2) NOT NULL,
        [IsPaid] bit NOT NULL,
        [PaidAt] datetime2 NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_AssistantPayments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AssistantPayments_Assistents_AssistantId] FOREIGN KEY ([AssistantId]) REFERENCES [Assistents] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Attendances] (
        [StudentId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [AttendanceDate] date NOT NULL,
        [Status] int NOT NULL,
        [Notes] nvarchar(500) NULL,
        CONSTRAINT [PK_Attendances] PRIMARY KEY ([StudentId], [SessionId], [AttendanceDate]),
        CONSTRAINT [FK_Attendances_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]),
        CONSTRAINT [FK_Attendances_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Exams] (
        [Id] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NOT NULL,
        [ExamDate] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Exams] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Exams_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Exams_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [Payments] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [GroupId] uniqueidentifier NOT NULL,
        [SessionId] uniqueidentifier NULL,
        [PaymentDate] datetime2 NOT NULL,
        [BillingPeriod] date NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Payments_Groups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [Groups] ([Id]),
        CONSTRAINT [FK_Payments_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [Sessions] ([Id]),
        CONSTRAINT [FK_Payments_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [ExamComponents] (
        [Id] uniqueidentifier NOT NULL,
        [ExamId] uniqueidentifier NOT NULL,
        [Type] int NOT NULL,
        [TotalMarks] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_ExamComponents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExamComponents_Exams_ExamId] FOREIGN KEY ([ExamId]) REFERENCES [Exams] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [StudentExamParentContacts] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NOT NULL,
        [ExamId] uniqueidentifier NOT NULL,
        [IsContacted] bit NOT NULL,
        [ContactedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_StudentExamParentContacts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StudentExamParentContacts_Exams_ExamId] FOREIGN KEY ([ExamId]) REFERENCES [Exams] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_StudentExamParentContacts_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [StudentAmounts] (
        [Id] uniqueidentifier NOT NULL,
        [PaymentId] uniqueidentifier NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [PaidAmount] decimal(18,2) NOT NULL,
        [BilledSessions] int NULL,
        [RemainingAmount] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CreatedBy] uniqueidentifier NULL,
        [UpdatedBy] uniqueidentifier NULL,
        [DeletedBy] uniqueidentifier NULL,
        [IsDeleted] bit NOT NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_StudentAmounts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StudentAmounts_Payments_PaymentId] FOREIGN KEY ([PaymentId]) REFERENCES [Payments] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE TABLE [StudentExamComponents] (
        [Id] uniqueidentifier NOT NULL,
        [StudentId] uniqueidentifier NULL,
        [ExamComponentId] uniqueidentifier NOT NULL,
        [Mark] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_StudentExamComponents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StudentExamComponents_ExamComponents_ExamComponentId] FOREIGN KEY ([ExamComponentId]) REFERENCES [ExamComponents] ([Id]),
        CONSTRAINT [FK_StudentExamComponents_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'ConcurrencyStamp', N'Name', N'NormalizedName') AND [object_id] = OBJECT_ID(N'[IdentityRole<Guid>]'))
        SET IDENTITY_INSERT [IdentityRole<Guid>] ON;
    EXEC(N'INSERT INTO [IdentityRole<Guid>] ([Id], [ConcurrencyStamp], [Name], [NormalizedName])
    VALUES (''11111111-1111-1111-1111-111111111111'', N''11111111-1111-1111-1111-111111111111'', N''Admin'', N''ADMIN''),
    (''22222222-2222-2222-2222-222222222222'', N''22222222-2222-2222-2222-222222222222'', N''Assistant'', N''ASSISTANT''),
    (''22222222-3333-2222-2222-222222222222'', N''22222222-3333-2222-2222-222222222222'', N''Student'', N''STUDENT'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'ConcurrencyStamp', N'Name', N'NormalizedName') AND [object_id] = OBJECT_ID(N'[IdentityRole<Guid>]'))
        SET IDENTITY_INSERT [IdentityRole<Guid>] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_AssistantPayments_AssistantId] ON [AssistantPayments] ([AssistantId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Attendances_SessionId] ON [Attendances] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Attendances_StudentId_SessionId_AttendanceDate] ON [Attendances] ([StudentId], [SessionId], [AttendanceDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_ExamComponents_ExamId] ON [ExamComponents] ([ExamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Exams_GroupId] ON [Exams] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Exams_SessionId] ON [Exams] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Expenses_CategoryId] ON [Expenses] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Incomes_CategoryId] ON [Incomes] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Payments_GroupId] ON [Payments] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Payments_SessionId] ON [Payments] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Payments_StudentId] ON [Payments] ([StudentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_Sessions_GroupId] ON [Sessions] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_StudentAmounts_PaymentId] ON [StudentAmounts] ([PaymentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_StudentExamComponents_ExamComponentId] ON [StudentExamComponents] ([ExamComponentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_StudentExamComponents_StudentId] ON [StudentExamComponents] ([StudentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_StudentExamParentContacts_ExamId] ON [StudentExamParentContacts] ([ExamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StudentExamParentContacts_StudentId_ExamId] ON [StudentExamParentContacts] ([StudentId], [ExamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_StudentGroups_GroupId] ON [StudentGroups] ([GroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    CREATE INDEX [IX_UserRefreshToken_UserId] ON [UserRefreshToken] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260928161758_test'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260928161758_test', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN
    ALTER TABLE [Students] ADD [QrCode] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN

                    WITH Missing AS
                    (
                        SELECT Id,
                               CONCAT('STU', RIGHT('00000000' + CAST(ROW_NUMBER() OVER (ORDER BY CreatedAt, Id) AS varchar(8)), 8)) AS NewCode
                        FROM Students
                        WHERE QrCode IS NULL OR LTRIM(RTRIM(QrCode)) = ''
                    )
                    UPDATE Students
                    SET QrCode = m.NewCode
                    FROM Missing m
                    WHERE Students.Id = m.Id;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN
    ALTER TABLE [Attendances] ADD [RecordedAt] datetime2 NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN
    ALTER TABLE [Attendances] ADD [RecordedBy] uniqueidentifier NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN
    ALTER TABLE [Attendances] ADD [Source] int NOT NULL DEFAULT (1);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Students_QrCode] ON [Students] ([QrCode]) WHERE [QrCode] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261005163215_AddStudentQrCodeAndAttendanceAudit'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261005163215_AddStudentQrCodeAndAttendanceAudit', N'10.0.10');
END;

COMMIT;
GO

