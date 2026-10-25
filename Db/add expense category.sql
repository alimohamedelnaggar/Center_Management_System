INSERT INTO ExpenseCategories
(
    Id,
    Name,
    CreatedAt,
    CreatedBy,
    IsDeleted
)
VALUES
(NEWID(), N'إيجار', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'كهرباء', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'مياه', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'إنترنت', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'مرتبات', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'مكافآت', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'صيانة', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'أدوات مكتبية', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'طباعة وتصوير', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'تنظيف', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'دعاية وإعلان', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'مستلزمات تعليمية', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'اشتراكات', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'مواصلات', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'ضيافة', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0),
(NEWID(), N'أخرى', GETDATE(), 'eee706cc-897c-4eb9-7331-08deeca4dd99', 0);