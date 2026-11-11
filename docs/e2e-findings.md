# E2E Findings

Running log of real product defects found while building/running the feature tour.
Assertions are never weakened to hide these; each entry includes evidence.

---

## F-001 — Assistant accounts are created without a center scope

**Severity:** High (assistant cannot be tenant-scoped / branding and center claims are missing)

**Found:** 2026-10-25 while proving all seven role logins against the E2E seed.

**Symptom**

- The assistant account signs in successfully, but the access token has **no `CenterId` claim**.
- The assistant sidebar renders no center brand (only the `E` logo) and the center name is missing.
- Direct database check after creation shows `AspNetUsers.CenterId = NULL` for the assistant, while
  teacher/owner/student/parent accounts in the same center have the center id.

**Evidence**

```
PhoneNumber  CenterId                              IsCenterAdmin  Discriminator
01000000005  NULL                                  0              Assistant
```

The token for the same account contains the role claim and user id but no `CenterId`.

**Cause**

`Assistent` declares a second `CenterId` property that shadows `User.CenterId`:

```csharp
// CenterManagement.Data/Entities/Users/Assistent.cs
public class Assistent : User, ITenantEntity
{
    ...
    public Guid? CenterId { get; set; }
    public virtual Center? Center { get; set; }
    ...
}
```

But the base `User` already has `CenterId`. EF maps only the base (`Users.CenterId`); the model
snapshot for `Assistents` has no `CenterId` column:

```
b.HasBaseType("CenterManagement.Data.Entities.Identity.User");
b.Property<DateOnly?>("HireDate")...
// no CenterId here
```

The production handler also never assigns the base value:

```csharp
// AddAssistantCommandHandler.cs
var assistant = new Assistent
{
    FullName = fullName,
    UserName = phoneNumber,
    PhoneNumber = phoneNumber,
    ...
    TeacherId = request.TeacherId,
    IsActive = true
};

await _userManager.CreateAsync(assistant, request.Password);
```

Assigning `assistant.CenterId` (as the E2E seed originally did) sets the shadowing CLR property,
which is not persisted; the mapped `User.CenterId` stays null.

**Workaround used for the tour**

The E2E seeder sets the mapped property explicitly after creation:

```csharp
((User)assistant).CenterId = centerId;
```

This makes the seeded assistant functional and keeps the tour honest; no product code was changed.

**Recommended fix (not applied here)**

- Remove the duplicate `CenterId` (and duplicated `Address`/`Center` navigation) from `Assistent`,
  relying on `User.CenterId`; **or**
- In `AddAssistantCommandHandler`, set `((User)assistant).CenterId` from the current tenant and make
  the tenant interceptor target the mapped base property.

Add a regression test asserting a created assistant token/record has the same `CenterId` as its teacher.

---

## F-002 — The centers list and the dashboard disagree on a center's student count

**Severity:** Medium (two official screens report different student totals for the same center)

**Found:** 2026-10-27 during the Stage C coverage-matrix code audit, and confirmed against the
seeded data used for the Stage B preview.

**Symptom**

- `إدارة المراكز` (`/centers`) shows `الطلاب = 1` for `مركز النور`.
- The center dashboard (`/adminDashboard`) shows `إجمالي الطلاب = 15` for the same center.
- The gap is not a rounding issue: the two screens count two different things.

**Evidence**

Centers list counts **Identity users in the `Student` role**, not student records:

```csharp
// GetCentersPaginatedQueryHandler.cs:81-82
var teacherCounts = await CountUsersByCenterAsync(AppRoles.Teacher, centerIds, cancellationToken);
var studentCounts  = await CountUsersByCenterAsync(AppRoles.Student,  centerIds, cancellationToken);

// :104
StudentsCount = studentCounts.GetValueOrDefault(row.Id),

// :117-130
from user in _context.Users.AsNoTracking()
join userRole in _context.UserRoles.AsNoTracking() on user.Id equals userRole.UserId
join role in _context.Roles.AsNoTracking() on userRole.RoleId equals role.Id
where role.Name == roleName && user.CenterId != null && centerIds.Contains(user.CenterId.Value)
group user by user.CenterId!.Value into g
select new { CenterId = g.Key, Count = g.Count() }
```

The dashboard/report counts **`Students` rows**:

```csharp
// ReportRepository.cs:34-41
statistics.TotalStudents    = await _context.Students.CountAsync(cancellationToken);
statistics.ActiveStudents   = await _context.Students.CountAsync(x => x.IsActive, cancellationToken);
statistics.InactiveStudents = await _context.Students.CountAsync(x => !x.IsActive, cancellationToken);
```

The E2E seed creates 15 `Student` rows for the primary center but links an Identity login to only
the first one:

```csharp
// E2ESeeder.cs:240-241 — the only student login in the primary center
var studentAccount = await CreateUserAsync(
    userManager, "01110000001", "يوسف أحمد محمود", AppRoles.Student, primary.Id, studentPassword);

// E2ESeeder.cs:333-352 — 15 student records
for (var i = 0; i < studentNames.Length; i++)
{
    var student = new Student { ..., UserId = i == 0 ? studentAccount.Id : null, ... };
    students.Add(student);
}
```

So the centers list counts 1 (the only student *login*), while the dashboard counts 15 (the student
*records*). A center with many student records and no student logins would show `0` in the centers
list, which is the more damaging version of the same bug.

Reproduction query against `CenterManagement_E2E`:

```sql
SELECT c.Name,
       (SELECT COUNT(*) FROM Students s WHERE s.CenterId = c.Id AND s.IsDeleted = 0) AS StudentRows,
       (SELECT COUNT(*) FROM AspNetUsers u
          JOIN AspNetUserRoles ur ON ur.UserId = u.Id
          JOIN AspNetRoles r ON r.Id = ur.RoleId
         WHERE u.CenterId = c.Id AND r.Name = 'Student') AS StudentLogins
FROM Centers c
ORDER BY c.Name;
```

**Why it is not fixed here**

The correct definition of "عدد الطلاب" is a product decision. Changing either counter changes a
number that owners and platform admins report on. The Stage C matrix records the current truth on
purpose (`SA-02` shows 1, `CO-13` shows 15) and this entry is the audit trail. No product code was
changed.

**Recommended fix (not applied, needs approval)**

- Pick one source of truth. Option A (recommended): make `GetCentersPaginatedQueryHandler` count
  `Student` rows per `CenterId` (matching the dashboard's meaning of "students"). Option B: keep the
  Identity count and relabel the column to `حسابات الطلاب` so it is not read as a student total.
- Apply the same counter in `GetCenterByIdQueryHandler.cs:71-73`, which repeats the Identity count.
- Add a regression test: for a seeded center, `centers.studentsCount == dashboard.TotalStudents`.

---

## F-003 — Mobile "tables become cards" only exists for the staff student list

**Severity:** Low (UI requirement gap, no data loss, no crash)

**Found:** 2026-10-27 during the Stage C coverage-matrix code audit.

**Symptom**

At a 390×844 viewport the requirement expects tables to become cards. Only one list does that.
Every other list keeps a `<table>` and scrolls horizontally inside `overflow-x-auto`.

The one real card renderer:

```jsx
// StudentPage/StudentTable.jsx:27
<div className="hidden overflow-x-auto md:block">

// StudentPage/StudentCardList.jsx:17
<div className="divide-y divide-surface-border md:hidden">

// StudentPage/StudentManagement.jsx:334 — both are rendered, CSS decides
<StudentCardList ... />
```

Confirmed `overflow-x-auto` tables (no card alternative) in:

- `CentersManagement.jsx:243` — SuperAdmin `/centers`
- `SubscriptionsManagement.jsx:94`, `AuditLogPage.jsx:121`
- `TeachersManagement.jsx:135`, `AssistantManagement.jsx:328`
- `FinancePage.jsx:941`, `:1112`; `IncomePages/IncomesTab.jsx:425`; `ExpensePages/ExpensesTab.jsx:433`
- `IncomePages/IncomeCategoriesTab.jsx:171`, `ExpensePages/CategoriesTab.jsx:171`
- `OverduePage.jsx:400`, `CenterReportsPage.jsx:514`, `:575`
- `StudyNotePages/StudyNotesPage.jsx:207`, `ExamsPage.jsx:292`, `QuestionBankPage.jsx:205`
- Student portal: `StudentResultsPage.jsx:73`, `StudentPaymentsPage.jsx:122`, `StudentAttendancePage.jsx:150`

The parent portal has no `<table>` at all (stacked sections), and the student exams page is a card
list, so those two are fine.

**Why it is not fixed here**

Adding card renderers to ~18 tables is a UI change with its own review, not a recording task. The
matrix (§7) records the real behaviour per role instead of faking a card layout.

**Options (needs a decision)**

- **A.** Accept horizontal scroll as the mobile pattern for non-student tables and amend the
  requirement text.
- **B.** Authorize a follow-up UI task to add card renderers, starting with `/centers`, `/finance`,
  `/overdue`, and the three student-portal tables, which are the densest screens.

---

## F-004 — Audit log renders most action names as raw English identifiers

**Severity:** Low (cosmetic/i18n; no data loss, no broken filter)

**Found:** 2026-10-27 while re-reading the SuperAdmin audit page to write the Stage C spec.

**Symptom**

The `الإجراء` column is Arabic only for three actions. Every other action — including all the
actions the SuperAdmin performs during this tour — is displayed as the raw backend identifier.

`Frontend/CenterManagement/src/pages/AuditLogPage.jsx`:

```js
const actionLabels = {
  OnboardCenter: "إنشاء مركز",
  Impersonate: "بدء انتحال",
  ImpersonationEnd: "إنهاء انتحال",
};

const formatAction = (action) => actionLabels[action] ?? action;
```

The seeded log already contains `CenterCreated`, `SubscriptionRenewed`, `ModulesUpdated`,
`PasswordReset`, `PlatformStatisticsViewed`, so the raw values are visible before any action.

**Impact on the tour**

SA-10 must **assert the real behaviour**: exactly three translated labels, and the rest raw.
The chapter is not failed by this; F-004 is recorded and the assertion matches the product.
The action **filter** is unaffected because it submits the raw action value.

**Why it is not fixed here**

Adding a complete label map is a product/i18n change outside the recording task. It is listed as a
follow-up; the filter and pagination still work.

---

## F-005 — The impersonation banner never shows the impersonated person's name

**Severity:** Medium (fails audit transparency: the operator cannot see whose account they are acting as)

**Found:** 2026-10-27, at 11.9 min into the first full SuperAdmin recording (SA-06), when the
spec asserted the owner's name in the banner and got `مستخدم` instead.

**Symptom**

After `دخول كالمالك` the amber banner reads:

```
أنت تتصفّح الآن كـ مستخدم (CenterOwner) — تُسجَّل كل العمليات في سجل المراجعة.
```

instead of the target owner's name (`أ. حسناء عبد الله` for `مركز النور`).

**Evidence**

The API is correct. `POST /Impersonation/Start` returns `fullName`, and the minted token carries
the name — under the standard .NET `ClaimTypes.Name` URI:

```json
"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "أ. حسناء عبد الله",
"http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "CenterOwner",
"impersonation": "true"
```

The banner looks in the wrong place:

```jsx
// src/components/ImpersonationBanner.jsx:13-19
const targetName = useMemo(
  () =>
    user?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/name"] ??
    user?.name ??
    "مستخدم",
  [user],
);
```

`.../2008/06/.../name` is a **Microsoft** namespace; `ClaimTypes.Name` is
`.../ws/2005/05/identity/claims/name` (`...xmlsoap.org...`). The first two lookups therefore always
miss, `user` being the decoded JWT payload (`AuthContext.jsx:73-81`), and the fallback `مستخدم`
always wins. Only the role in parentheses comes from the token, which is why the role renders
correctly.

**Impact on the tour**

This is the one SA-06 assertion that fails; the rest of the SA part is unaffected. The assertion is
correct and must not be weakened to match the defect. The chapter cannot be recorded as approved
until either the banner is fixed (preferred) or the matrix text is explicitly downgraded.

**Proposed fix (needs approval — presentation only, no business logic)**

```jsx
const targetName = useMemo(
  () =>
    user?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
    user?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/name"] ??
    user?.name ??
    "مستخدم",
  [user],
);
```

Related cosmetic point seen in the same banner: the role is printed as the raw token
(`(CenterOwner)`), untranslated, in an otherwise Arabic sentence.

**Status: FIXED (2026-10-27, approved by the product owner before the SuperAdmin re-record)**

- `src/components/ImpersonationBanner.jsx` now reads the xmlsoap 2005/05 `name` claim first and
  keeps the old keys as fallbacks.
- `src/components/ImpersonationBanner.render.test.js` adds 4 assertions: the real claim renders
  the owner's name, both legacy keys still work, a missing name falls back to `مستخدم`, and no
  banner renders outside an impersonation session.
- Frontend suite: 254/254 tests pass; `npm run build` succeeds.
- The SuperAdmin part is re-recorded from a freshly dropped database after this fix.

**Evidence file:** trace/screenshot/video of the failed run, copied to
`e2e/artifacts/f-005-evidence/`.

---

## F-006 — The parent-account button on the students page is unreachable in a multi-teacher center

**Severity:** Low (dead UI path; the same capability is reachable from `حسابات أولياء الأمور`)

**Found:** 2026-10-27 while planning the marketing scenes, when the students page was checked for a
parent-account entry point and the toolbar button could not be produced for either role.

**Symptom**

In a **multi-teacher** center, no signed-in role can see `إنشاء حسابات أولياء الأمور` on the
students page (`/dashboard`):

- `/dashboard` is role-gated to `Assistant` and `Teacher` only:
  `src/App.jsx:131-132` (`<ProtectedRoute allowedRoles={["Assistant", "Teacher"]}>`).
- The button requires `isCenterAdmin`:
  `src/pages/StudentPage/StudentManagement.jsx:27`
  (`const showParentAccount = isCenterAdmin && hasModule("parent_portal")`) and is rendered at
  `:278-291`.
- `isCenterAdmin` is read from the `is_center_admin` token claim
  (`src/utils/jwt.js`, `isCenterAdmin()`), and that claim is only minted for a **solo teacher**
  (`AppPolicies.IsCenterAdminClaim`); the owner token issued by the seeded marketing center has
  `CenterId` and `role=CenterOwner` but **no** `is_center_admin` claim.

So the owner (the only role allowed to call the bulk endpoint) cannot open the page, and the
assistant/teacher who can open it does not get the button. A solo teacher (`Teacher` +
`is_center_admin`) does reach it, so this is a role/route mismatch rather than a missing feature.

**Evidence**

```
# token payload for 01055500001 (CenterOwner, multi-teacher center)
{ "…/role": "CenterOwner", "CenterId": "d08d0cbd-…" }   # no is_center_admin
```

```
# route table, src/App.jsx
<Route element={<ProtectedRoute allowedRoles={["Assistant", "Teacher"]} />}>
  <Route path="/dashboard" element={<StudentManagement />} />
```

**Impact on the marketing video**

Not shown. `حسابات أولياء الأمور` (`/bulk-parent-accounts`) performs the same bulk creation and is
reachable by the owner (`ROUTE_GUARDS["/bulk-parent-accounts"]`), so the video uses that page only.

**Status: OPEN — logged by request, not fixed.** Per the approved plan, the button stays as-is;
fixing it would be a product change outside the recording task.

---

## F-007 — The attendance sheet's search box is rendered as an unknown `<inputSearch>` tag

**Severity:** Medium (a visible control on a daily-use screen does nothing)

**Found:** 2026-10-27 while recording scene 04 (attendance) for the marketing video.

**Symptom**

`/attendance` shows the search field's icon and placeholder area, but there is no input element:
`document.querySelector('input')` never matches the search box, typing into it is impossible, and
the page logs two React errors on every load:

```
<%s /> is using incorrect casing. Use PascalCase for React components, or lowercase for HTML elements. inputSearch
The tag <%s> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter. inputSearch
```

**Root cause**

`Frontend/CenterManagement/src/pages/AttendancePages/AttendanceSheet.jsx:756` opens the element as
`<inputSearch` (a typo for `<input`). Everything after it — `type="text"`, `placeholder="ابحث باسم
الطالب أو الهاتف..."`, `value={searchQuery}`, `onChange={(e) => setSearchQuery(e.target.value)}` —
is therefore attached to an unknown HTML element, which React renders as an empty custom tag.

**Evidence**

```
AttendanceSheet.jsx:756  <inputSearch
AttendanceSheet.jsx:757      type="text"
AttendanceSheet.jsx:758      placeholder="ابحث باسم الطالب أو الهاتف..."
```

```json
// e2e/artifacts/marketing/raw/scene04-attendance/clip.json
"consoleErrors": [
  "<%s /> is using incorrect casing. Use PascalCase … inputSearch",
  "The tag <%s> is unrecognized in this browser. … inputSearch"
]
```

**Impact on the marketing video**

Not shown and not claimed. Scene 04 marks attendance by clicking student cards, which is the
documented flow; the search field is deliberately left out of frame and no caption refers to
searching inside the attendance sheet. Scene 02's search is the student list (`/dashboard`), which
uses a real input and is unaffected.

**Status: OPEN — logged by request, not fixed.** The typo is a one-character product change and was
outside the approved recording scope.

---

## F-009 — A student sees an auto-scored exam result before the teacher publishes it

**Severity:** High (results privacy: a score becomes visible to the student before publication)

**Found:** 2026-10-31 while recording scene 06 (exams) for the marketing video.

**Symptom**

For an exam whose results are not published yet, the student's results page hides the score as
expected, but the student's exams page already shows it:

| Endpoint / page (role: student) | Before publish | After the teacher publishes |
|---|---|---|
| `GET /api/V1/StudentPortal/Results` | `score: null`, `totalMark: 6`, `isPublished: false`, `hasPendingManualGrading: true` | `score: 5`, `totalMark: 6`, `isPublished: true`, `hasPendingManualGrading: false` |
| `/student/exams` (exam card) | status `finished`, **`score: 3`** out of 6 | status `finished`, `score: 5` out of 6 |

The auto-graded part (true/false + MCQ = 3 marks) is exposed on the exams card while the essay is
still ungraded and the teacher has not published anything.

**Evidence**

```json
// e2e/artifacts/marketing/scene-06-exam-check.json → beforePublish
{
  "at": "2026-10-31T09:25:46.620Z",
  "results": { "score": null, "totalMark": 6, "isPublished": false, "hasPendingManualGrading": true },
  "examsPage": { "status": "finished", "score": 3, "scoredTotalMark": 6, "hasPendingManualGrading": true },
  "screenshot": "scene-06-prepublish-exams.png",
  "leak": true
}

// same file → afterPublish (after the essay mark and the publish click, same run)
{ "score": 5, "totalMark": 6, "isPublished": true, "hasPendingManualGrading": false }
```

Screenshot: `e2e/artifacts/marketing/scene-06-prepublish-exams.png` (taken as the student, on
`/student/exams`, before the teacher's publish step in the same run).

**Root cause (as observed)**

The results endpoint applies the publication rule, but the exams list endpoint that feeds
`/student/exams` returns the attempt's running `score` regardless of `IsResultsPublished`, so the
two student-facing screens disagree. The recording asserts both sides instead of hiding the
difference.

**Impact on the marketing video**

Scene 06 never shows `/student/exams` at a moment when that auto score is visible: the student clip
records the exam-taking screen, and the result clip starts on `/student/results` only after the
teacher publishes. Result visibility is proven through `/StudentPortal/Results` (hidden before,
visible after) so the video's claim matches the endpoint that actually enforces the rule.

**Status: OPEN — logged, not fixed** (product change outside the approved recording scope).

---

## F-010 — The overdue page sends one request per typed character, and the table re-renders on every response

**Severity:** Medium (each keystroke is a full paginated query; responses overlap and arrive out of
order, so the list can settle on an older search term)

**Found:** 2026-10-31 while recording scene 05 (payments) for the marketing video.

**Symptom**

Typing a four-character name in the overdue search box fires four requests, one per keystroke, with
no debounce:

```
6.403s  REQ  ?search=%D9%85&billingPeriod=2026-10-01&pageNumber=1&pageSize=10
6.477s  REQ  ?search=%D9%85%D8%A7&...
6.559s  REQ  ?search=%D9%85%D8%A7%D9%84&...
6.633s  REQ  ?search=%D9%85%D8%A7%D9%84%D9%83&...
6.967s  RES 200 ?search=%D9%85…
7.210s  RES 200 ?search=%D9%85%D8%A7…
7.441s  RES 200 ?search=%D9%85%D8%A7%D9%84…
7.561s  RES 200 ?search=%D9%85%D8%A7%D9%84%D9%83…
```

The first request is the slowest: `GetOverdueStudents` took **7,600.99 ms** server-side for a single
character (API log, 11:00:04), longer than the whole rest of the search. In the recorded pass the
search step alone took 33,234 ms (step `search` at 20,857 ms → step `partial` at 54,091 ms), because
the table re-rendered under the cursor while the queued responses landed.

**Root cause**

`Frontend/CenterManagement/src/pages/OverduePage.jsx:200-211` calls `fetchOverdue()` in a `useEffect`
whose dependency list includes `searchQuery`, with no debounce and no request cancellation:

```jsx
useEffect(() => {
  fetchOverdue();
}, [selectedGroup, selectedTeacher, selectedMonth, selectedYear, searchQuery, pageNumber, pageSize]);
```

**Impact on the marketing video**

The scene sets the whole term with a single `fill` so the clip shows the filtered row instead of a
stuttering list; the finding keeps the per-keystroke measurements. The video makes no claim about
search speed. The target student is still asserted by full name, and the visible row is read from
the same response the page renders.

**Status: OPEN — logged, not fixed.**

---

## F-011 — The add-payment modal calls two endpoint families that refuse center owners (403)

**Severity:** Medium (owner sees console errors and, when opening the modal for a group, gets empty
session/student lists)

**Found:** 2026-10-31 while recording scene 05 (payments) for the marketing video.

**Symptom**

Opening "إضافة دفعة" from `/overdue` as the center owner makes the modal request:

```
GET /api/V1/Attendance/student-attendence?PageIndex=1&PageSize=200&GroupId=…&Search=   → 403
GET /api/V1/SessionRolesRole-By-Group/{groupId}                                          → 403
```

and logs:

```
Failed to load resource: the server responded with a status of 403 ()
Error loading prefilled group data: AxiosError: Request failed with status code 403
    at attendanceService.getStudentsForAttendance (src/services/attendanceService.js:19)
```

Both endpoints are guarded by `AppPolicies.Operational`, which is deliberately
assistant/teacher only:

```csharp
// SerivesCollection.cs:291-296
option.AddPolicy(AppPolicies.Operational, policy =>
{
    policy.RequireAssertion(context =>
        context.User.IsInRole(AppRoles.Assistant)
        || context.User.IsInRole(AppRoles.Teacher));
});
```

The modal calls them for every group the owner selects
(`AddPaymentModal.jsx:196-215`, `:235-242`, `:327-334`), so `students` and `sessions` stay empty and
the owner cannot pick a student in the add flow; from `/overdue` the payment still works only
because `studentId` is prefilled. Occurrences in the API log during the batch: 10:36:54, 10:54:12,
11:00:36, 11:11:15 (each pair 0.7-5.5 s).

**Root cause**

A frontend permission mismatch: the payment modal reuses attendance/session endpoints that are
scoped to operators instead of a payment-safe student list (or the owner policy).

**Impact on the marketing video**

Scene 05 opens the modal from the overdue row, where the student is prefilled, so the displayed
student, amount and saved payment are real; the 403s never appear in frame and no caption refers to
picking a student. The clip manifest keeps the console errors as evidence.

**Status: OPEN — logged, not fixed.**

---

## F-012 — The expenses page mounts a controlled `<select>` with a `null` value

**Severity:** Low (React warning on every load of `/expense`; the filter still works, but the value is
not controlled until the user picks a category)

**Found:** 2026-10-31 while recording scene 05 (finance) for the marketing video.

**Symptom**

The expense page logs one console error on load, before any interaction:

```
`value` prop on `select` should not be null. Consider using an empty string to clear the component
or `undefined` for uncontrolled components. select
```

**Evidence**

`e2e/artifacts/marketing/raw/scene05-reports/clip.json → consoleErrors[0]` (captured during the
scene 05 recording pass; `pageErrors` is empty).

**Root cause**

`Frontend/CenterManagement/src/pages/ExpensePages/ExpensesTab.jsx:119` initialises the category
filter with `useState(null)` and binds it to a controlled `<select value={category}>` at line 348.

**Impact on the marketing video**

The warning is console-only and never rendered, so no frame or caption is affected. It is kept in
the clip manifest as evidence and the scene still passes with zero page errors.

**Status: OPEN — logged, not fixed.**

---

## F-013 — The student payments table has one more cell than its header row

**Severity:** Low (visual misalignment; the values are present, but they sit under the wrong headings)

**Found:** 2026-11-02 while recording scene 07 (the student portal on a phone).

**Symptom**

`/student/payments` renders eight `<th>` cells but nine `<td>` cells per row. The `المجموعة` value is
followed by two receiver cells and then the billing period, so every value from the month onward is
shifted one column to the left of the heading that describes it. At phone width the row is also wide
enough to need horizontal scrolling.

**Evidence**

- `Frontend/CenterManagement/src/pages/StudentPortalPages/StudentPaymentsPage.jsx:125-134` (headers:
  التاريخ، المجموعة، المجموع المستلم، الشهر، المبلغ، المدفوع، المتبقي، الحالة)
- `:143-167` (cells: date, group, receiver, receiver again, period, total, paid, remaining, status)
- Captured during the scene 07 `fees` step; the assertion stops at the summary cards and the first
  row, so no caption is attached to the misaligned header.

**Impact on the marketing video**

The payments summary (`إجمالي المدفوع`, `المتبقي`, `عدد الدفعات`) is correct and is what the caption
talks about. The table header is not claimed. The defect is recorded here and left untouched.

**Status: OPEN — logged, not fixed.**

---

## F-014 — Malformed request payloads escape as unhandled exceptions instead of an error response

**Severity:** Medium (clients get an aborted request or a generic 500 instead of the validation message)

**Found:** 2026-11-04 while adding the optional staff email field and testing that a malformed
address is rejected before it reaches the database.

**Symptom**

When a FluentValidation validator rejects a command (for example an onboarding request with
`ownerEmail = "not-an-email"`), the `ValidationException` is not converted into a response. The
request never returns a `400`/`422` body carrying the field message; under the real host the
exception surfaces as a 500 and the user only sees a generic failure.

**Evidence**

- `API/.../CenterManagement.Tests/StaffEmailPhaseOneTests.cs:122-145` — the only way to observe the
  rejection is `Assert.ThrowsAsync<FluentValidation.ValidationException>(...)`: the exception
  propagates through the test server rather than coming back as a status code.
- The same behaviour is pre-existing and asserted by `UpdateMySubjectTests.Empty_Subject_IsRejected`.
- `API/.../CenterManagement.Core/MiddleWare/ErrorHandlerMiddleware.cs:41-46` already maps
  `ValidationException` to `422 UnprocessableEntity`, but the middleware is never registered.

**Root cause**

`CenterManagement.Api/Program.cs` (middleware section, near lines 196-205) registers the sign-in
rate limiter, center-access enforcement and password-change enforcement middleware only. No
exception-handling middleware is added to the pipeline, so `ErrorHandlerMiddleware` is dead code.

**Why it was not fixed in this phase**

Registering `ErrorHandlerMiddleware` changes the status code of every failing validation across the
API. `UpdateMySubjectTests.Empty_Subject_IsRejected` currently relies on the exception propagating,
so enabling the middleware is a behaviour change that needs its own pass and updated assertions
rather than being slipped into the email feature. The email work therefore asserts the thrown
exception (matching the existing baseline) and keeps the product behaviour unchanged.

**Status: OPEN — logged, not fixed.** Phase 2 should decide whether to register the middleware and
update the affected tests, or to return explicit validation results from the handlers.

---

## F-015 — The overdue WhatsApp reminder button never opened WhatsApp

**Severity:** High (the reminder feature on `/overdue` was dead: clicking the button did nothing)

**Found:** 2026-11-07 while wiring the shared message templates into the overdue page.

**Symptom**

On `/overdue`, pressing `تذكير واتساب` never opened a `wa.me` link and never showed an error. The
button appeared enabled but the click handler ran during render instead of on click.

**Root cause**

`Frontend/CenterManagement/src/pages/OverduePage.jsx` passed the result of calling the handler:

```jsx
<button onClick={handleRemind(row)}>…</button>
```

`handleRemind(row)` executes on every render and its return value (`undefined`) becomes the click
handler. The link was built (and discarded) during render, so no popup ever opened.

**Fix applied**

```jsx
<button onClick={() => handleRemind(row)}>…</button>
```

**Status: FIXED (2026-11-07, in scope — it blocked the message-template feature).**

- Fixed while wiring the saved `feesReminder` body into the page.
- `src/pages/messageTemplates.integration.test.jsx` now saves a custom template in the editor and
  asserts the overdue button opens `wa.me` with that exact body (render → edit → save → open link).
- Other WhatsApp buttons were checked for the same pattern; none call the handler during render.

---

## F-016 — The students table renders one heading with no matching cell

**Severity:** Low (visual only; the row actions still work, but every table heading after the
missing cell is misaligned and the empty header is read out by screen readers)

**Found:** 2026-11-10 while rebuilding the students page for the design phase 1 comparison.

**Symptom**

The desktop students table (`/students`, `StudentTable.jsx`) renders **eight** `<th>` cells but
only **seven** `<td>` cells per row:

```
COLUMNS = ["الطالب", "رقم الهاتف", "رقم هاتف ولي الأمر", "المجموعة",
           "تاريخ الانضمام", "نوع الاشتراك", "الحالة", ""]
```

The row renders: name, phone, parent phone, group, join date, subscription type, then
`<RowActions>` — there is no status cell. `الحالة` therefore has no data under it, the actions
column sits under the `الحالة` heading, and the intentionally empty last heading has nothing under
it. The mismatch is also why the row actions can look attached to the wrong column on wide screens.

**Evidence**

- `Frontend/CenterManagement/src/pages/StudentPage/StudentTable.jsx:4-13` — eight column labels,
  the seventh being `الحالة` and the eighth an empty actions column.
- `StudentTable.jsx:48-90` — seven `<td>` cells per row; no cell reads or renders a status.
- The phase 1 comparison reproduces the defect on purpose: `compare-students.html?variant=before`
  hides `.col-status` so the “before” table has the same 8-heading/7-cell shape, while
  `variant=after` restores a visible status column.

**Impact on the design phase**

None on behaviour or the API; the comparison is CSS/HTML only and no application file was changed.
The fixed version in the mock-up adds the status cell and keeps the actions column last.

**Status: OPEN — logged, not fixed.** Planned for the students-page pass in phase 2.

---

## F-017 — The subscription banner never rendered for real center owners

**Severity:** Medium (an owner whose subscription is in its grace period or about to expire never
saw the banner or its renew call to action)

**Found:** 2026-11-11 while building the phase 3 batch 1 banner fixtures.

**Symptom**

`SubscriptionBanner` asked the auth context for a field that does not exist:

```jsx
// before
const { subscription, isCenterOwner, impersonating, ... } = useAuth();
...
if (!isCenterOwner && !soloTeacher && !impersonating) return null;
```

`AuthContext` exposes `role` (`"CenterOwner"`, `"Teacher"`, `"SuperAdmin"`, …) and never
`isCenterOwner`, so the flag was always `undefined`. The `soloTeacher` escape hatch only covers a
teacher who is alone in the center, which means a real owner on any normal account had
`isCenterOwner === undefined` **and** `soloTeacher === false`, and the component returned `null`
before reading `subscription` at all.

**Evidence**

- `Frontend/CenterManagement/src/context/AuthContext.jsx` — the context value contains `role`,
  `subscription`, `modulesLoaded`, `impersonating`, `stopImpersonation`; no `isCenterOwner`.
- `Frontend/CenterManagement/src/components/common/SubscriptionBanner.jsx` — the guard read
  `isCenterOwner` directly from `useAuth()`.
- The visual audit fixture for `/my-subscription` as a `CenterOwner` produced no
  `[data-testid="subscription-banner"]` node until the guard was changed.

**Fix applied**

The guard now derives the flag from the field the context actually provides:

```jsx
const isCenterOwner = role === "CenterOwner";
```

Product copy, variants, and the renew link are unchanged. Covered by
`src/components/banners.integration.test.jsx` (the grace and expiring cases mount with
`role: "CenterOwner"`) and by the `subscription-grace` / `subscription-expiring` scenarios in
`docs/design/phase3/batch1-verify.mjs`.

**Status: FIXED** in phase 3 batch 1 (commit on `redesign/ui-identity`).

---

## Harness failures during the Stage C dry runs (not product defects)

These stopped recordings before Stage C started. None of them is a product bug, and none of
them changed product code or weakened an assertion. They are logged because they cost runs and
because two of them can silently corrupt a part if they recur.

### H-01 — Login fails when the tour is pointed at `127.0.0.1` instead of `localhost`

**Classification:** harness configuration (CORS allowlist), **not** a product defect.

**Symptom:** the login page shows `تعذّر الاتصال بالخادم`, no `/Authentication/SignIn`
response ever arrives, and `signInWithTour` dies on `page.waitForResponse` after 45s.

**Root cause:** the API allowlist is explicit and credentials-enabled:

```csharp
// SerivesCollection.cs:57-69
policy.WithOrigins("http://localhost:5173", "https://center-management-system-v02.vercel.app")
      .AllowAnyMethod().AllowAnyHeader().AllowCredentials();
```

`http://127.0.0.1:5173` is a **different origin**. With `AllowCredentials` a wildcard is not
allowed either, so the browser blocks the request and the app's catch branch shows the
connection toast. Vite had also been started with `--host 127.0.0.1`, which made the mistake
easy to repeat.

**Fix applied:** Vite runs with `--host localhost`, and every E2E run sets
`E2E_BASE_URL=http://localhost:5173` (asserted by `e2e/scripts/preflight.mjs`, which now rejects
a non-local host but cannot know the allowlist). Correct product behaviour; no code change.

### H-02 — `locator('button', { name: … })` is not a Playwright API

**Classification:** test bug.

**Symptom:** SA-04 failed with a strict-mode violation:

```
locator('tbody tr').filter(...).first().locator('button')
resolved to 6 elements: دخول كالمالك, ترقية, تعديل, إعادة تعيين …, حذف, …
```

**Root cause:** `page.locator(selector, options)` accepts only `has`, `hasNot`, `hasText`,
`hasNotText`. The `{ name }` option belongs to `getByRole`; it was silently ignored, so the
locator degraded to “every button in the row”.

**Fix applied:** all five occurrences replaced with
`getByRole('button', { name: 'ترقية', exact: true })`. Rule for the remaining parts: never pass
`name` to `locator()`; use `getByRole` or `filter({ hasText })`.

### H-03 — A failed run leaves mutations behind, and `Seed__E2EReset` alone does not undo them

**Classification:** harness state, **not** a product defect.

**Symptom:** the re-run expected 4 seeded centers and got 6, failing SA-02 on `toHaveCount(4)`.

**Root cause:** the previous aborted run had already created two centers (SA-03/SA-04) before it
failed, and restarting the API with `Seed__E2EReset=true` had no effect because the reset branch
belongs to `E2ESeeder`, which was not running (see H-04). The database kept the extra rows.

**Fix applied:** before every recording run, drop `CenterManagement_E2E` and start the API with
`e2e/scripts/start-api.ps1 -ResetDatabase`, then verify the exact seed shape
(`centers = 4`, `audit = 7`, `users = 12`) before Playwright starts. A recording is never
started on a database whose counts are unknown.

### H-04 — The working copy had the E2E safety proof and seeder commented out

**Classification:** harness/working-copy configuration, **not** a product defect.

**Symptom:** the API printed no `[E2E SAFETY] PASS` line, the seeder never ran, and after the
database was dropped the process exited during startup:

```
System.InvalidOperationException … Cannot open database "CenterManagement_E2E" requested by the login.
   at IdentitySeeder.SeedAsync(...)   // Program.cs:156
```

**Root cause:** `Program.cs` had the E2E-only safety gate and the `E2ESeeder` branch commented
out, so startup fell through to `IdentitySeeder` against a database that no longer existed.

**Fix applied:** both blocks were re-enabled **temporarily** for Stage C. The original file is
backed up at `%TEMP%\Program.cs.stage-c.orig` and must be restored, together with
`Frontend/CenterManagement/.env` (7091 → 7092), after the seven parts are recorded. This is a
local recording modification, not a product change.

## Render pipeline verification (Windows + Linux)

The two rendering scripts are the only code between a Playwright `.webm` and the deliverable, so
they are tested on a synthetic clip before any real part is rendered.

`e2e/scripts/smoke-render.ps1` builds a 6 s `testsrc2` clip, renders it **twice** as two
independent parts through `render-part.ps1`, merges them through `merge-tour.ps1`, and asserts:

| Assertion | Expected |
|---|---|
| part frame | 1280×720, h264, yuv420p, 25 fps |
| lead-in trim | 1200 ms lead-in − 500 ms kept = 700 ms trimmed |
| chapter anchoring | chapter 1 at 0 ms; chapter 2 at 3500 ms ±40 |
| part duration | 5000–5700 ms |
| Arabic title | `الأول` survives the round-trip |
| merged duration | sum of the two real part durations ±200 ms |
| merged chapters | 4, chapter 3 at part-1 duration ±60 |
| merged stream | 1280×720, yuv420p |
| `docs/chapters.md` | 4 chapter rows, role name present |

Results:

| Host | PowerShell | ffmpeg / ffprobe | Result |
|---|---|---|---|
| Windows 11 (`Windows PowerShell 5.1`) | 5.1 | 7.x (winget build) | `SMOKE OK — parts 5320 ms each, merged 10640 ms, 4 chapters, 1280x720 yuv420p` |
| Ubuntu 26.04 on WSL 2 | pwsh **7.6.9** (`powershell-7.6.9-linux-x64`) | **7.0.2-static** (johnvansickle) | identical output |

Two portability defects were found and fixed by that test:

1. `Join-Path $PSScriptRoot '..\..'` does not resolve on Linux — `\` is a legal filename character
   there, so the path becomes a single directory name. All repo-root and docs paths now use nested
   `Join-Path` calls, which produce native separators on both platforms.
2. Number formatting and parsing were culture-sensitive (`'{0:0.###}' -f …`, `[double]$s`,
   `'{0:hh\:mm\:ss}' -f …`). They now use `CultureInfo.InvariantCulture` explicitly, which matters
   because the UI locale and the container locale are not guaranteed to be `en-US`.

Both scripts stay UTF-8 **with** a BOM (required by Windows PowerShell 5.1 to parse `—`, `·` and
Arabic), while `ffmetadata` and concat lists are written UTF-8 **without** a BOM (ffmpeg rejects a
leading BOM). Console output is forced to UTF-8 so Arabic chapter titles are not mojibake.

On WSL the only extra requirement was libicu: PowerShell refuses to start without it, and `sudo`
needs a password in this environment. Running with `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1`
exercises the same code paths; GitHub's `ubuntu-latest` image already ships libicu, so CI needs no
override.

CI: `.github/workflows/e2e-feature-tour.yml` now installs `ffmpeg`/`ffprobe` when missing, prints
`pwsh`, `ffmpeg -version` and `ffprobe -version`, and runs `./e2e/scripts/smoke-render.ps1` **before**
the tour, so a broken renderer fails in under a minute. The job timeout went from 75 to 330 minutes,
because the seven parts alone are ~3 h 56 m of video and a recording run takes at least as long as
the video it produces (GitHub caps a job at 360 minutes).

## Notes on environment (not product defects)

- `dotnet run` applies `launchSettings.json` and forces `Development`; it must not be used for E2E.
  Run the built DLL directly (or `dotnet run --no-launch-profile`) with `ASPNETCORE_ENVIRONMENT=E2E`.
- The parent/student layouts use a logout button with visible text but no `title`; the sidebar uses
  `title="تسجيل خروج"`. The tour helper locates the button by accessible name so it works in both.
