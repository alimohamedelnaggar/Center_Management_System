# Center Management System — Feature Inventory (Step 0)

Date: 2026-10-25
Repository: `Center_Management_SystemV02`
Method: static inspection of the running codebase (controllers, MediatR features, React routes/pages, sidebar navigation, guards, module catalog, test projects). No feature below was inferred from the legacy Word documents.

## 1. Stack and layout

| Layer | Technology | Root |
|---|---|---|
| API | .NET 10, ASP.NET Core, MediatR, EF Core, SQL Server, Identity + JWT | `API/CenterManagementCleanArchitecture` |
| Frontend | React 19 + Vite 5, React Router, Tailwind, Recharts, SignalR | `Frontend/CenterManagement` |
| Tests | xUnit + WebApplicationFactory (SQLite) · Vitest + Testing Library | `CenterManagement.Tests`, `src/**/*.test.*` |

Measured surface today:

- **38 API controllers**, **199 HTTP endpoint attributes** (`[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpDelete]`, `[HttpPatch]`).
- **81 React page components** under `src/pages` (excluding `.test` files).
- **6 roles**: `SuperAdmin`, `CenterOwner`, `Teacher`, `Assistant`, `Student`, `Parent`.
- **2 center types**: `MultiTeacher`, `SoloTeacher`.
- **1 always-on module** (`core`) + **11 toggleable modules**.
- Backend tests: 43 files, 239 `[Fact]`, 28 `[InlineData]` (267 static cases).
- Frontend tests: 28 files.
- No Playwright, Cypress, Selenium, E2E spec, E2E seed, or GitHub Actions workflow existed before this work.

## 2. Authentication and authorization

- Real login: `POST /Api/V1/Authentication/SignIn` with `phoneNumber` + `password`.
- Refresh cookie: `POST /Api/V1/Authentication/RefreshToken`; logout: `POST /Api/V1/Authentication/Logout`.
- Access token carries `Id`, standard role claim, `CenterId`, `IsCenterAdmin` (when set), expiry.
- Identity policy: password min length 6, no digit/upper/lower/symbol requirement; lockout after 5 failures for 5 minutes.
- Frontend routes are protected by role guards plus module guards. Landing routes after login:

| Role | Landing |
|---|---|
| SuperAdmin | `/admin` → `/centers` |
| CenterOwner | `/center/dashboard` → `/teachers` (or `/dashboard` for a solo center) |
| Teacher | `/teacher/dashboard` → `/dashboard` |
| Assistant | `/dashboard` |
| Student | `/student` → `/student/dashboard` |
| Parent | `/parent/dashboard` |

- UI logout is the sidebar button `تسجيل خروج`; there is no confirmation modal.
- Forced password change page exists for first-login/temporary passwords (`/force-password-change`).
- Impersonation exists for SuperAdmin (`/impersonation` + banner); not used in the tour.

## 3. Subscription, centers and modules

### Center lifecycle
- Center fields: name, type, status, owner, phone, address, theme, plan, start/end, `GraceDays`, notes.
- SuperAdmin can create/edit/delete centers, reset owner password, upgrade to multi-teacher, and manage modules.
- Grace period banner appears after `SubscriptionEnd` until `SubscriptionEnd + GraceDays`.
- Subscription plans/payments are recorded in `CenterSubscriptions` + `CenterSubscriptionPayments`.
- Platform statistics: centers, users, content counters, growth.
- Audit log for platform actions.

### Modules and dependencies
| Key | Arabic | Requires |
|---|---|---|
| `attendance` | الحضور والغياب | — |
| `grades` | الدرجات | — |
| `question_bank` | بنك الأسئلة | — |
| `online_exams` | الاختبارات الإلكترونية | `question_bank` |
| `study_notes` | المذكرات | — |
| `payments` | المدفوعات | — |
| `accounting` | الحسابات والمصروفات | — |
| `center_reports` | تقارير المركز | — |
| `whatsapp` | إشعارات واتساب | — |
| `student_portal` | بوابة الطالب | — |
| `parent_portal` | بوابة ولي الأمر | `attendance` + `payments` |

Dependency rules are enforced in `ModuleCatalog` (auto-enable closure and disable-conflict warnings). Module-gated routes render a locked screen when disabled.

## 4. Functional inventory

### 4.1 Students and groups (core)
- Student CRUD, activate/deactivate, soft delete, search/filter/pagination.
- Student profile: phone, parent phone, school, notes, QR code, subscription type, custom monthly price.
- Student QR card + public card lookup (`/student-card`, `/student-card/:code`).
- xlsx import (preview + commit, duplicate detection, row errors) and template download.
- Student account creation: phone is the temporary password and `MustChangePassword` is forced.
- Groups CRUD, per-group monthly price, sessions per month, teacher assignment.
- Group membership (join date, active), group details and attendance stats.
- Session CRUD: day of week, start/end, optional session price (session-based groups).
- Bulk parent accounts screen.

### 4.2 Attendance
- Session attendance sheet (present/absent/late/excused in the backend enum).
- Quick status toggles and notes.
- QR/barcode scanner page for student cards.
- Attendance history/statistics cards and per-student summaries.
- Manual vs scan source tracking, recorded-by/at.

### 4.3 Grades / traditional exams
- Exam definitions per group/session, date, components (paragraph/dictation/written).
- Enter/update student marks per component.
- Exam statistics and parent-contact flag.
- Grades module gates the exam pages.

### 4.4 Question bank + electronic exams
- Academic years CRUD.
- Question banks per academic year.
- Question types: true/false, multiple choice, essay; image support, marks, options, ordering.
- Electronic exams built from the bank or inline questions, duration, shuffle questions/options.
- Publish results, close/reopen availability by start time + duration.
- Student attempts: start, answer, submit, score, pending manual grading, violations count.
- Teacher review/publish results; per-question statistics.

### 4.5 Study notes
- Notes with title, description, file, target groups.
- File stored under `wwwroot/notes`; download by stored name.
- Student/parent notifications on publish.
- Group targeting and listing.

### 4.6 Payments and overdue
- Monthly billing calculator: group price or custom price, optional sessions count / partial month.
- Record payment for a student+group+month; full/partial status; remaining amount.
- Receipt number per center (`CenterReceiptCounters`), received-by metadata.
- Monthly due service shared by overdue page and reports.
- Overdue page (students who paid nothing or only part), filters and totals.
- Payment history, edit/view, WhatsApp reminder link (`wa.me`, manual).
- Session-based payment path also exists.

### 4.7 Accounting
- Income CRUD + income categories (optionally linked to a group).
- Expense CRUD + expense categories.
- Monthly income/expense summaries and net profit.
- Finance page split into income/expenses/categories.

### 4.8 Assistants and salaries
- Assistant accounts linked to a teacher, salary, working hours, hire date, notes.
- Monthly assistant payments (basic, bonus, deduction, net, paid/unpaid).
- Salary tab/cards; access is scoped by role and modules.

### 4.9 Center reports
- Center-wide reports/dashboard: students, attendance, groups, financial overview, recent activity.
- Student reports (teachers/owner) by period.
- Reports overview endpoints and print view.

### 4.10 Student portal
- Dashboard: greeting, subscription/payment state, attendance rate, upcoming exams, results trend.
- Attendance page/history.
- Exams: available, start attempt, timer, answer, submit; results when published.
- Results page.
- Study notes list/download.
- Notifications list/read.
- Profile.
- Whole portal gated by `student_portal`.

### 4.11 Parent portal
- Children list + child details (attendance, payments, exams/results, notes).
- Notifications (absence, fees, exam results), read state.
- Gated by `parent_portal`, which requires attendance + payments.

### 4.12 Notifications / WhatsApp
- In-app notifications persisted and pushed over SignalR (`NotificationHub`).
- Notification types for study notes, exams, results, absence, fees.
- WhatsApp is **manual deep-link** (`wa.me`) and message templates are stored data; there is **no** template editor and **no** WhatsApp Business API integration.
- Email exists for password reset/confirmation; confirmation is commented out in the register flow.

### 4.13 Platform administration
- Centers management, subscription management, modules, statistics, audit log.
- Impersonation start/stop.
- Platform users list.

## 5. Frontend route/page map (high level)

- Public: `/login`, `/student-card`, `/student-card/:code`, `/force-password-change`.
- Shared authenticated shell: `/`, `/profile`, `/dashboard`, `/notifications`, `/adminDashboard`, `/center-reports`, `/student-reports`, `/reports`, `/students`, `/groups`, `/sessions`, `/attendance`, `/scanner`, `/exams`, `/question-bank`, `/question-exams`, `/study-notes`, `/payments`, `/overdue`, `/finance`, `/income`, `/expenses`, `/assistants`, `/assistants/salary`, `/teachers`, `/settings`, `/audit-log`, `/bulk-parent-accounts`.
- SuperAdmin: `/centers`, `/subscriptions`, `/platform`, `/audit-log`, `/admin`.
- CenterOwner: `/center/dashboard`, `/my-subscription`, `/center-settings`.
- Student: `/student/dashboard`, `/student/attendance`, `/student/exams`, `/student/exams/:id`, `/student/results`, `/student/notes`, `/student/notifications`, `/student/profile`.
- Parent: `/parent/dashboard`, `/parent/children/:id`, `/parent/notifications`.
- Not found page.

## 6. E2E readiness findings

### Existing automation
- **No** Playwright/Cypress/E2E specs.
- **No** `.github/` workflow.
- **No** E2E-specific seed. Before this work:
  - `IdentitySeeder`: runs in all environments; creates roles; creates SuperAdmin/CenterOwner only when `Seed:SuperAdminPassword` / `Seed:CenterOwnerPassword` are configured; can create demo/test centers when `Seed:TestCentersEnabled=true` (Development).
  - `DemoDataSeeder`: Development-only, opt-in via `Seed:DemoEnabled` + `Seed:DemoPassword`; creates rich demo data.
- New: `E2ESeeder` (environment `E2E` only), idempotent by `مركز النور`, optional `Seed:E2EReset=true`.

### Local run configuration
- API: `https://localhost:7091` (HTTPS dev certificate, keeps refresh cookie `Secure`).
- Frontend: `http://localhost:5173`.
- CORS allows only `http://localhost:5173` and the deployed Vercel origin.
- Frontend API base comes from `.env`: `VITE_API_BASE_URL=https://localhost:7091/api/V1`.
- SQL Server LocalDB (`(localdb)\MSSQLLocalDB`) is available locally; Docker daemon is not running.
- `dotnet run` **must** be invoked with `--no-launch-profile` (or the built DLL directly) because `launchSettings.json` forces `Development` and the remote connection string. Use explicit `ASPNETCORE_ENVIRONMENT=E2E`.

### Rate limiting
- Sign-in limiter: per-IP 20/min and per-phone 5/min (production defaults).
- Now config-driven via `RateLimiting:SignIn`; default remains enabled.
- E2E config disables it; the 7-role login smoke also stays below the default IP limit, but the full tour performs many actions and must not depend on that.
- Account lockout (5 failures / 5 minutes) is **not** disabled and remains a risk if a spec ever submits wrong passwords; the tour uses the correct password.

### Test data needed for the tour
- 4 centers: full multi-teacher, solo, grace-period, partially disabled modules.
- 15 primary students (1 with a login), 1 parent linked to 2 students, 2 teachers, 1 assistant, groups/sessions/attendance, 25 payments, income/expense, assistant salary, traditional exam + marks, question bank (all types), live + published electronic exams, note file, notifications, templates, audit log.
- Credentials are fake and live in `appsettings.E2E.json` / `e2e/accounts.json`; no real data or phone numbers.

### Test baseline to preserve
- Backend: `dotnet test` expected runtime count to be verified; static attributes show 267 cases.
- Frontend: `npm run test:run` expected runtime count to be verified; 28 test files.

## 7. Known product limits relevant to the tour

See `docs/not-covered.md`. Summary: no PWA/offline, forgot-password UI is a placeholder, email confirmation is commented out, no WhatsApp template editing or API, attendance UI offers present/absent only (backend has 4 statuses), no external push channel, PDF via browser print, no backup/restore feature.

## 8. Evidence

- Controllers and endpoint attribute count: script over `*Controller.cs` → 38 controllers / 199 endpoint attributes.
- Pages: 81 non-test JSX files under `src/pages`.
- Module keys/labels/dependencies: `CenterManagement.Data/AppMetaData/ModuleKeys.cs`, `ModuleCatalog.cs`.
- Role lands: `src/utils/homeRoute.js`, `src/App.jsx`.
- Login selectors: `src/components/Auth/LoginComponent/Login.jsx` (`#login-phone`, `#login-password`, button `تسجيل الدخول`).
- Logout: `src/components/AppSidebar.jsx` (`title="تسجيل خروج"`).
- Billing: `MonthlyBillingCalculator.cs`, `IMonthlyDueService.cs`.
- Exam availability: `StudentPortalQueryHandler.cs` (`ExamDate` .. `ExamDate + DurationMinutes`).
