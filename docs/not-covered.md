# Not Covered — Prohibition Reference for the Marketing Video

Date: 2026-10-27
Repository: `Center_Management_SystemV02`
Sources: `docs/features-inventory.md` (static surface), `docs/e2e-findings.md` (verified defects),
and hands-on checks against the running system on `CenterManagement_E2E_Marketing`.

**How to use this file.** Every on-screen caption, title card, voice-less claim and visual in
`marketing-tour.mp4` must be compatible with this list. If a claim is not backed by something
visible in the same shot, it is out. If it is listed under **A**, it must never appear, in any
wording. Sections **B** and **C** are conditional: the feature exists, but only the stated role,
module state or screen may be shown, and only when asserted at that moment.

---

## A. Never claim, imply or show

| # | Prohibited | Why (verified) | Allowed alternative |
|---|---|---|---|
| A1 | PWA, offline mode, installed app, "تطبيق" | No service worker, no web manifest, no app-store build. The product is a web app. | "افتحه من المتصفح على الموبايل" — browser only, and only if a phone-width shot is shown |
| A2 | Native Android/iOS app | Same as A1. | — |
| A3 | Push notifications on the phone | Notifications are persisted in-app and pushed over SignalR only (`NotificationHub`). There is no FCM/APNs/external push channel. | "إشعارات داخل النظام" for in-app notifications |
| A4 | Automatic WhatsApp messages, bulk sending, scheduled sending | WhatsApp is a manual `wa.me` deep link opened by a click; message bodies come from stored templates. No WhatsApp Business API, no queue, no scheduler. | "رابط واتساب جاهز تفتحه بضغطة" — only while the `wa.me` link is visible and asserted |
| A5 | WhatsApp template editor | **No longer prohibited:** owners and solo teachers edit the three fixed templates at `/message-templates` (module `whatsapp`). Still prohibited: creating/deleting template types, automatic sending, scheduling or bulk sending. | "عدّل نص الرسالة من قوالب الرسائل" — only on the owner/solo editor screen |
| A6 | Email confirmation of accounts | Confirmation is commented out in the register flow. | — |
| A7 | Email "forgot password" / reset link | The login link `نسيت كلمة المرور؟` only shows the toast `سيتم توفير استعادة كلمة المرور قريباً`; no reset-by-email flow. Password reset is an admin action. | "المدير يعيد تعيين كلمة المرور" only on the assistant/teacher reset action |
| A8 | SMS messaging | No SMS provider or endpoint. | — |
| A9 | Attendance states beyond present/absent | Backend enum has late/excused, the attendance UI exposes **present/absent only** (see `features-inventory.md` §7). | "سجّل الحضور والغياب بضغطة" |
| A10 | Online payment / payment gateway / card payment | Payments are recorded manually (cash/transfer) against a student+group+month; no gateway, no checkout. | "سجّل الدفعة" and the receipt |
| A11 | Server-generated PDF or automatic export on a schedule | PDF/Excel go through the browser print/export window; no server-side PDF job, no scheduler. | "اطبع الإيصال" only after the print view is asserted |
| A12 | Backup / restore / data recovery | No backup or restore feature exists. | — |
| A13 | Impersonation in the marketing video | The product supports SuperAdmin impersonation (`دخول كالمالك`), but the approved marketing cut must not show it, must not mention it, and must not imply "the platform can enter your center". | Show real role sign-ins only |
| A14 | Automatic grading of essay questions | Essay (`مقالي`) answers stay `بانتظار التصحيح` until a teacher grades them (`تصحيح المقالي`). Only objective questions are scored automatically. | "صحّح المقالي" / "راجع النتائج" only on the actual grading screen |
| A15 | "Multi-branch" / several branches per center | One center = one tenant with one subscription; there is no branch model. | — |
| A16 | Total student count in any scene after scene 3 | Import adds students in video order while later scenes are recorded earlier; a total would contradict the import result. | Per-group counts or "الطلاب" without a total |

## B. Exists, but conditional — show only with the stated condition

| Feature | Condition to show it | Evidence to assert in the same shot |
|---|---|---|
| Student portal | Module `student_portal` enabled | Portal page loads; no locked-module screen |
| Parent portal | Module `parent_portal` enabled (it itself requires `attendance` + `payments`) | Parent page with a child row |
| Electronic exams | `online_exams` enabled and `question_bank` enabled (dependency) | Exam list/detail, not a locked screen |
| Study notes | `study_notes` enabled | Notes list with a file row |
| Center reports | `center_reports` enabled | Report cards with real numbers |
| Accounting / finance | `accounting` enabled | Income/expense rows plus the totals card |
| WhatsApp link | `whatsapp` enabled **and** a real `wa.me` popup is intercepted and asserted | The encoded `wa.me` URL |
| Assistant features | Assistant account is center-scoped (see C1) | The assistant's own page, not center branding claims |
| Salary screen | Owner role (management) | Basic/bonus/deduction/net columns |
| Bulk parent accounts | Owner (or solo teacher) role | `/bulk-parent-accounts` rows, never the students-page button (see C6) |
| Audit log | SuperAdmin only; raw English action names are real | If shown, do not claim translated labels (see C4) |
| Grace period banner | Center whose `SubscriptionEnd + GraceDays` covers today | The banner itself |
| Locked module screen | Center with the module disabled | The lock message, framed as a control, not a defect |
| Print receipt | After `window.print` is intercepted and print media is emulated | The receipt preview, not the OS print dialog |

## C. Screen-level constraints from verified findings

| # | Finding | Constraint on the video |
|---|---|---|
| C1 | **F-001** — assistant accounts are created without a center scope (product bug; the E2E seeder works around it by setting the mapped `User.CenterId`) | Do not claim center branding/permissions for assistants in general. The seeded assistant works because the seed fixes the scope. |
| C2 | **F-002** — the SuperAdmin centers list and the center dashboard disagree on a center's student count | Never show both counts in one scene, and never narrate a platform-wide student total. |
| C3 | **F-003** — "tables become cards" on mobile only exists for the staff student list | Never claim the whole product is mobile-optimised. Only the staff student list may be shown at phone width as a card layout; other tables scroll horizontally. |
| C4 | **F-004** — most audit-log action names render as raw English identifiers | Do not claim a fully Arabic audit log. If the audit screen appears, the raw names are expected and must not be "cleaned" for the video. |
| C5 | **F-005** — impersonation banner name (fixed 2026-10-27) | Irrelevant to the marketing cut: impersonation is prohibited by A13 anyway. |
| C6 | **F-006** — `إنشاء حسابات أولياء الأمور` on `/dashboard` is unreachable in a multi-teacher center (route is Assistant/Teacher, button requires `is_center_admin`, which only solo teachers carry) | Never show that button. Use `/bulk-parent-accounts` for the owner. |
| C7 | Automatic print dialog | Never show the OS print dialog; intercept `window.print`, assert the receipt, emulate print media. |

## D. Claims that are allowed, with the exact wording limits

These are implemented and verified; they may appear only while the matching element is visible.

- **Students, groups, sessions** — create, edit, search, activate/deactivate, soft delete.
- **xlsx import** — preview then commit, with row-level errors; a duplicate row **inside the file**
  is classified as `Error`. The caption must quote the numbers actually returned by the Preview run
  (`146 طالبًا` style: students, not accounts) and must not invent a classification.
- **Attendance** — present/absent, per session, with history and percentages.
- **QR scanner** — camera-based check-in for a running session.
- **Payments and receipts** — full/partial payment, remaining amount, per-center receipt number,
  receipt print view.
- **Overdue list** — students with nothing paid or a remaining balance, with totals.
- **Income, expenses, salaries** — categories, rows, monthly totals, net profit from
  `لوحة الإحصائيات` (`/adminDashboard`) or the finance page.
- **Question bank and electronic exams** — true/false, multiple choice, essay; shuffle; duration;
  publish results; violations counter (`تم تسجيل مخالفة: مغادرة نافذة الامتحان`).
- **Manual essay grading** — `تصحيح المقالي`, `بانتظار التصحيح`, then `نشر النتائج للطلاب`.
- **Reports** — attendance/financial/grades reports and the print view.
- **Roles** — Owner, Teacher, Assistant, Student, Parent, SuperAdmin, each with its own landing.
- **Modules** — enable/disable per center; dependencies enforced; locked screen when disabled.
- **Platform** — centers, subscriptions, module toggles, statistics, audit log, impersonation
  (product only — **not** in the video, A13).
- **Mobile** — the web app opened in a phone browser; only the staff student list claims a card
  layout (C3).

## E. How each item was verified

- Static: controllers, MediatR handlers, React routes, sidebar, guards, module catalog, stores
  (`features-inventory.md` §8 evidence list).
- Runtime: 7-role logins and page walks on the E2E seed (Stage B/C runs, `docs/coverage-matrix.md`).
- Marketing numbers: `GET /dashboard-summary` and `GET /revenue-chart` against
  `CenterManagement_E2E_Marketing` on 2026-10-27 returned 137 students, revenue 61,700, expenses
  24,350, assistant salaries 6,500, net profit 30,850, attendance 87.87%, and a rising
  May→Oct revenue series (48,200 → 61,700).
- Forgot-password placeholder, print dialog interception and `wa.me` interception were checked in
  the running UI / Playwright helpers, not inferred.
