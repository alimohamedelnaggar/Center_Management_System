SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================================
-- One-time DATA update (no schema change).
-- Purpose: force a password change on next login for student accounts that are
--          STILL using the original default password ("123456").
-- Scope  : only the 27 accounts whose stored PBKDF2 hash was verified to match
--          the default password at the time of generation. The 1 linked student
--          account that already changed its password (phone 01010101010) is
--          intentionally LEFT UNTOUCHED.
-- Safe   : idempotent (sets the flag to 1). Nothing is deleted.
-- ============================================================================

-- ---- PREVIEW (optional, read-only) -----------------------------------------
-- SELECT Id, UserName, MustChangePassword
-- FROM AspNetUsers
-- WHERE Id IN (
--   '498d819f-96b1-48e8-8faa-0341a2a11383','4834d90c-424f-419a-9fa3-0831ef7c5f21',
--   'b00fba1c-9ab0-496c-8509-147937d0c93e','bbc3111d-c211-4cde-a686-156667195868',
--   'e37b89b0-fb50-401d-9ae9-16306fb95192','ef830608-db05-439b-aded-2ed58ef5a385',
--   'cfa08f3a-827b-4128-bd53-35718f3105b7','d8de05d0-189b-473f-af10-36807816661a',
--   '7582276e-d4d7-4b07-88c9-389acd0ffde3','23b88b1d-a15a-4ae3-a6b3-47625e1da0d5',
--   'cf2f982e-71a7-4c70-838a-4b0ad7bd7083','e13b8ebb-f2cd-41c0-a039-621abed93fb9',
--   'a2bf4f91-9626-4e37-8815-637eb7f10681','ca040972-06d0-49f6-b52d-795ae9ddddfd',
--   '9fa0fe78-3c93-472a-9510-8f5e31af4c72','8a408908-386d-4c6e-9e79-98284d9efeb1',
--   'dcdc9d6a-c63c-4fc9-a7b0-9ae217654e1b','d158463d-fa19-4e92-81f5-9d234d3580ff',
--   '6c5abcb2-31d2-43f6-ac2a-a173ee039773','ce129ee0-8d85-47ca-99d3-c03b67a1027a',
--   'ac6582b2-f0f1-4858-908b-c4765c4417ab','dd0c3d36-27e5-4738-8f48-c9247224d0d6',
--   '6bcbd425-066a-4f5e-99b5-dd9cfdeddbb9','0b56567b-8317-4889-87cf-e7b9a158c57f',
--   '360c041e-3be6-4d9b-9bbf-f22d970c2166','f5954511-741f-4384-81db-f3ea3ae85ae7',
--   'd2b52c3b-8969-489d-8f03-f5c5614f202f'
-- );

UPDATE AspNetUsers
SET MustChangePassword = 1
WHERE Id IN (
  '498d819f-96b1-48e8-8faa-0341a2a11383','4834d90c-424f-419a-9fa3-0831ef7c5f21',
  'b00fba1c-9ab0-496c-8509-147937d0c93e','bbc3111d-c211-4cde-a686-156667195868',
  'e37b89b0-fb50-401d-9ae9-16306fb95192','ef830608-db05-439b-aded-2ed58ef5a385',
  'cfa08f3a-827b-4128-bd53-35718f3105b7','d8de05d0-189b-473f-af10-36807816661a',
  '7582276e-d4d7-4b07-88c9-389acd0ffde3','23b88b1d-a15a-4ae3-a6b3-47625e1da0d5',
  'cf2f982e-71a7-4c70-838a-4b0ad7bd7083','e13b8ebb-f2cd-41c0-a039-621abed93fb9',
  'a2bf4f91-9626-4e37-8815-637eb7f10681','ca040972-06d0-49f6-b52d-795ae9ddddfd',
  '9fa0fe78-3c93-472a-9510-8f5e31af4c72','8a408908-386d-4c6e-9e79-98284d9efeb1',
  'dcdc9d6a-c63c-4fc9-a7b0-9ae217654e1b','d158463d-fa19-4e92-81f5-9d234d3580ff',
  '6c5abcb2-31d2-43f6-ac2a-a173ee039773','ce129ee0-8d85-47ca-99d3-c03b67a1027a',
  'ac6582b2-f0f1-4858-908b-c4765c4417ab','dd0c3d36-27e5-4738-8f48-c9247224d0d6',
  '6bcbd425-066a-4f5e-99b5-dd9cfdeddbb9','0b56567b-8317-4889-87cf-e7b9a158c57f',
  '360c041e-3be6-4d9b-9bbf-f22d970c2166','f5954511-741f-4384-81db-f3ea3ae85ae7',
  'd2b52c3b-8969-489d-8f03-f5c5614f202f'
);
