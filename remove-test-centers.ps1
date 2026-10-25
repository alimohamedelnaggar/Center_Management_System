# Removes the four DEVELOPMENT subscription-state test centers created by
# DemoDataSeeder when "Seed:TestCentersEnabled" is true:
#   * grace / expired / attendance-only / lifetime
#   * their owner logins 01000000101 - 01000000104
#   * their CenterModules, CenterSubscriptions, payments and audit rows.
#
# Matching is done by OWNER PHONE (not Arabic names) so it is safe under any
# console code page. Idempotent: running it twice is harmless.
#
# DEV ONLY. Usage:
#   ./remove-test-centers.ps1
#   ./remove-test-centers.ps1 -Server <srv> -Database <db> -User <usr> -Password <pwd>

param(
    [string]$Server   = "db73301.public.databaseasp.net",
    [string]$Database = "db73301",
    [string]$User     = "db73301",
    [Parameter(Mandatory = $true)][string]$Password
)

$sql = @"
SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;

DECLARE @phones TABLE (PhoneNumber NVARCHAR(32));
INSERT INTO @phones (PhoneNumber) VALUES
    (N'01000000101'), (N'01000000102'), (N'01000000103'), (N'01000000104');

DECLARE @centers TABLE (Id UNIQUEIDENTIFIER);
INSERT INTO @centers (Id)
    SELECT CenterId FROM AspNetUsers
    WHERE PhoneNumber IN (SELECT PhoneNumber FROM @phones) AND CenterId IS NOT NULL;

-- Audit rows (EntityId is the center id as text).
DELETE FROM AuditLogs
WHERE EntityId IN (SELECT CAST(Id AS NVARCHAR(36)) FROM @centers);

-- Payment records.
DELETE FROM CenterSubscriptionPayments
WHERE CenterId IN (SELECT Id FROM @centers);

-- Module rows.
DELETE FROM CenterModules
WHERE CenterId IN (SELECT Id FROM @centers);

-- Subscription periods.
DELETE FROM CenterSubscriptions
WHERE CenterId IN (SELECT Id FROM @centers);

-- Owner role links + owner logins.
DELETE FROM AspNetUserRoles
WHERE UserId IN (SELECT Id FROM AspNetUsers WHERE PhoneNumber IN (SELECT PhoneNumber FROM @phones));

DELETE FROM AspNetUsers
WHERE PhoneNumber IN (SELECT PhoneNumber FROM @phones);

-- The centers themselves.
DELETE FROM Centers WHERE Id IN (SELECT Id FROM @centers);

SELECT @@ROWCOUNT AS CentersDeleted;
"@

& sqlcmd -S $Server -d $Database -U $User -P $Password -C -Q $sql
