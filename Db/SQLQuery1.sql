select * from Groups
where id ='CB44F18E-11E5-4B7A-A1C2-E84C9A147D6D'

----

select * from Sessions
where GroupId ='CB44F18E-11E5-4B7A-A1C2-E84C9A147D6D'

select * from Attendances 
where attendanceDate = '08/06/2026'  

select * from Students 
where Id in ('793B49A1-AB92-4B57-8B11-95A8534744ED' ,
'98EFD7CF-9B8D-4366-9DDB-B31C4251A6EC' ,'040474D6-EFBC-4A8B-936B-E6DAABCEABA3')


delete from ExamComponents

delete from Exams 

delete from StudentExamComponents


SELECT ISNULL(SUM(Amount), 0) AS TotalRevenue
FROM StudentAmounts;


SELECT *
FROM Students
WHERE Id = 'F07C6960-B5DF-4D7A-95B4-B806D1810137';


select * from  Payments
where id ='b0a5750c-bd24-4794-a571-9b7b9d31c79a'

select * from StudentAmounts 
where Amount =222

DELETE SA
FROM StudentAmounts SA
INNER JOIN Payments P
    ON SA.PaymentId = P.Id
INNER JOIN Students S
    ON P.StudentId = S.Id
WHERE S.IsDeleted = 1;

select * from Students where IsDeleted = 1



select sum(Amount)
from StudentAmounts
where Amount in (160,150,180,170,200)