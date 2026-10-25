INSERT INTO Groups
(
    Id,
    Name,
    MonthlyPrice,
    CreatedAt,
    UpdatedAt
)
VALUES
(
    NEWID(),
    N'السبت والثلاثاء',
    350.00,
    GETUTCDATE(),
    NULL
),
(
    NEWID(),
    N'الأحد والأربعاء',
    400.00,
    GETUTCDATE(),
    NULL
),
(
    NEWID(),
    N'الاثنين والخميس',
    0.00,
    GETUTCDATE(),
    NULL
);