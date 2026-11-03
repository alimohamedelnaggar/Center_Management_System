# Stage C — Full Coverage Matrix

Date: 2026-10-27
Repository: `Center_Management_SystemV02`
Environment: `(localdb)\MSSQLLocalDB` / database `CenterManagement_E2E`
Status: **APPROVED — Stage C recording authorised, role by role.**
Purpose: prove that the full tour covers 100% of the features that are actually implemented, at the page and action level, before a single frame is recorded.

Approval record (2026-10-27):

| # | Decision | Value |
|---|---|---|
| 1 | Scope | 106 chapters / 3h 56m 30s / 76 role-page visits, no shortening |
| 2 | Negative states | recorded inside the SuperAdmin part (SA-07) via `limitedOwner` / `graceOwner`, not an eighth role |
| 3 | Mobile gap (F-003) | **Option A** — horizontal scroll accepted for non-student tables; no UI work in Stage C |
| 4 | F-002 (student count) | recorded only, no product change |
| 5 | Order / gate | SA → CO → T → A → S → P → ST, each role approved before the next |
| 6 | Voiceover | written Arabic captions only; TTS deferred |

Chapter rows stay ⏳ until their part is reviewed; ✅ means recorded **and** approved. The first
SuperAdmin attempt stopped at SA-06 on `F-005` (impersonation banner showed the generic label);
after the approved one-line fix, the SuperAdmin part is being re-recorded, so every row is still ⏳.

---

## 0. How this matrix was derived

This matrix is **code-derived**, not copied from the one-page features PDF. The PDF is a 13-line commercial checklist; the running product is much larger. Where the PDF and the code disagree, the code wins.

Sources read for this matrix:

| Source | What it proves |
|---|---|
| `Frontend/CenterManagement/src/constants/modules.js` | The only sidebar table (`NAV_ITEMS`), role tokens, module keys, module dependencies, role-dependent labels, `ROUTE_MODULES`. |
| `Frontend/CenterManagement/src/App.jsx` | Every React route, role guard, module guard, landing redirect, portal gate, public route, force-password route. |
| `Frontend/CenterManagement/src/constants/routeGuards.js` | `/teachers`, `/adminDashboard`, `/bulk-parent-accounts`, `/student-reports` guard rules. |
| `Frontend/CenterManagement/src/components/AppSidebar.jsx` | Staff shell, role titles, brand, theme, logout, exact sidebar order. |
| `Frontend/CenterManagement/src/components/StudentSidebar.jsx` | Student portal navigation and module gating. |
| `Frontend/CenterManagement/src/layouts/ParentLayout.jsx` | Parent header, notification bell, theme, logout; no sidebar. |
| `Frontend/CenterManagement/src/pages/**/*.jsx` (81 page files) | Buttons, tabs, modals, filters, search, pagination, print, export, confirmations, validation. |
| `Frontend/CenterManagement/src/components/**/*.jsx` | Reusable modals and guards (`ConfirmModal`, `ModuleLocked`, `ParentPortalGate`, `StudentPortalGate`, `Pagination`, receipt/print modals). |
| `API/CenterManagementCleanArchitecture/CenterManagement.Api/Controllers/` | 38 controllers, 199 HTTP endpoint attributes. Not every endpoint has a UI; only UI-reachable features are in scope. |
| `API/CenterManagementCleanArchitecture/CenterManagement.Infrustructure/Data/E2ESeeder.cs` | Four centers, nine accounts, groups, sessions, attendance, payments, exams, notes, notifications, audit rows, disabled-module center, grace center. |
| `e2e/accounts.json` | Seven tour accounts + two supplementary accounts; fixed Stage C order. |
| `docs/e2e-findings.md` | F-001 (assistant tenant scope), F-002 (student-count mismatch), F-003 (mobile card gap). |

### Scope rule

- **In scope:** every screen reachable through a real React route, every visible action on that screen, every module-gated state, and every role/permission boundary.
- **Out of scope with a stated reason:** only the items in §8. Nothing is silently dropped.
- **Not a product change:** this matrix does not modify product logic. F-002 and F-003 are recorded, not fixed.

---

## 1. Status legend

| Status | Meaning |
|---|---|
| ⏳ Planned | Chapter is written and has a real assertion; not recorded yet. |
| ✅ Recorded | Video part exists, assertion passed, and the part is approved. |
| ❌ Failed | Recorded but the assertion failed; the defect is linked in `docs/e2e-findings.md`; not approved. |
| ⛔ Excluded | Not reachable / not implemented / not assertable; explicit reason in §8. |

All rows below are ⏳ until a part is recorded and approved. The matrix will be updated role by role; approval of a role is what flips its rows to ✅.

---

## 2. Coverage summary

| Role (Stage C order) | Account | Sidebar pages | Chapters | Planned duration | Planned start | Planned end |
|---|---|---:|---:|---:|---|---|
| SuperAdmin | `01000000001` | 5 (+ force-password, 404, impersonated views) | 13 | 26m 00s | 00:00:00 | 00:26:00 |
| CenterOwner | `01000000002` | 14 | 22 | 51m 00s | 00:26:00 | 01:17:00 |
| Teacher | `01000000003` | 14 | 19 | 45m 30s | 01:17:00 | 02:02:30 |
| Assistant | `01000000005` | 11 | 15 | 34m 30s | 02:02:30 | 02:37:00 |
| Student | `01110000001` | 8 | 10 | 17m 00s | 02:37:00 | 02:54:00 |
| Parent | `01000000006` | 3 (+ public card lookup) | 5 | 9m 30s | 02:54:00 | 03:03:30 |
| SoloTeacher | `01000000007` | 21 | 22 | 53m 00s | 03:03:30 | 03:56:30 |
| **Total** | 7 roles + 2 supplementary | **76 role-page visits** | **106** | **3h 56m 30s** | 00:00:00 | **03:56:30** |

Supplementary accounts used only inside the SuperAdmin part, through impersonation, for negative states:

- `limitedOwner` `01000000009` — center `مركز الأمل`, with `question_bank`, `online_exams`, `study_notes`, `accounting`, `center_reports`, `whatsapp`, `parent_portal` disabled.
- `graceOwner` `01000000008` — center `مركز الفجر التعليمي`, subscription in grace period.

**Time budget:** 3h 56m 30s planned, inside the 2–4 hour requirement and far below the 6-hour per-job cap. Chapter durations are 1:00–3:30, inside the 1–4 minute rule. Planned start times assume the actual parts match the plan; `chapters.md` will be regenerated from the real ffprobe durations after the merge.

**Route accounting:** 52 route declarations in `App.jsx` (including redirect-only routes, two card-lookup forms, force/change password, and the wildcard). 44 of them render a screen; the rest are redirects or aliases. Every screen is assigned to a chapter in §4. Tabs, modals, drawers, and wizards are page components, not routes; they are exercised as actions inside their parent chapter.

---

## 3. Global recording rules (apply to every part)

1. **One part = one role = one fresh Context.** Each part logs in once at the start, uses its own storage state, records its own `.webm`/`.mp4`, and never reads another part's artifact.
2. **One part = one seed.** Each part starts from a clean `CenterManagement_E2E` seed with its own `E2E_PART_SEED` (`SA`, `CO`, `T`, `A`, `S`, `P`, `ST`). No part depends on a row created by another part. The two supplementary accounts are seeded, not created by an earlier part.
3. **Every action has an assertion.** A click is not coverage. Each row in §4 states the observable result that must be true on the recording. Assertions are DOM/text/URL/API-response/download/console based, never "it looked fine".
4. **Arabic captions are written, not spoken.** Each chapter starts with a short Arabic caption card (chapter number + title + what will be proved). No TTS in this stage; see §10.
5. **Show the result, not only the click.** After add/edit/delete/toggle, the recording must show the changed row, badge, total, toast, or empty state. Delete is always shown twice: cancel (nothing changes) then confirm (row disappears).
6. **Negative cases are first-class.** Missing-field validation, locked-module screen, permission denial, and out-of-scope data are recorded, not skipped. See §6.
7. **Mobile snapshot per role.** 390×844 viewport, sidebar drawer opened, densest list page shown. See §7.
8. **No weakened assertions.** If a real defect appears, the chapter fails and the finding is logged; the assertion is not softened to make the tour green.
9. **1280×720, H.264, yuv420p, 25 fps, silent** for every part, so the final concat is stream-copy safe. 25 fps is the rate Playwright actually captures; re-timing to 30 fps would only duplicate frames.
10. **Approval gate.** Role N+1 is not recorded until role N's part is reviewed and approved.

---

## 4. Detailed matrix

Legend for the **Module** column: `Core` means always available; otherwise the route is gated by `ModuleGuard` for that module key.

### 4.1 SuperAdmin — planned 26m 00s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| SA-01 | `/login` → `/centers` | Sign in as `01000000001`; inspect shell; open/close theme; read sidebar | Core | 00:00:00 | 1:00 | ⏳ | Login returns 200; URL is `/centers`; sidebar is exactly: المراكز، الاشتراكات، إحصائيات المنصة، سجل المراجعة، ملفي الشخصي; no center brand; no console error. |
| SA-02 | `/centers` | Inspect the seeded centers; search `النور`; clear; inspect the row counts | Core | 00:01:00 | 2:30 | ⏳ | Exactly 4 rows (`مركز النور`, `مركز المدرس الفردي`, `مركز الفجر التعليمي`, `مركز الأمل`) ordered by `CreatedAt DESC`; search narrows to 1 and clearing restores 4; **no pager is rendered** because `totalPages = 1` (server `pageSize = 10`); `مركز النور` shows `الطلاب = 1` (F-002, recorded not reconciled); real pagination is proven in SA-10. |
| SA-03 | `/centers` | `مركز جديد`; submit empty; fill name/owner/phone/password/plan/dates/modules; save | Core | 00:03:30 | 2:30 | ⏳ | Empty submit shows the toast `يرجى إدخال اسم المدرس!` and issues **no** create request (network log asserted); valid submit shows `تم إنشاء الحساب والمركز بنجاح` plus the `تم إنشاء الحساب` modal with `initialPassword`; new row appears with type `مركز`; count goes 4→5. |
| SA-04 | `/centers` | `مدرس فردي`; fill the solo preset; save | Core | 00:06:00 | 2:00 | ⏳ | New row has type `مدرس فردي`; owner phone matches the input; `ترقية` renders only on the two solo rows (the seeded solo center and the new one); count goes 5→6. |
| SA-05 | `/centers` | Edit a center name (cancel then save); suspend/activate; upgrade the solo center→multi; delete the SA-03 test center (cancel then confirm) | Core | 00:08:00 | 2:30 | ⏳ | Cancel closes the edit modal with no change; save persists after reload; status cancel keeps the badge, confirm flips it and back; upgrade changes type `مدرس فردي`→`مركز` and removes `ترقية`; delete cancel keeps the row, confirm removes it (6→5). Password reset is deliberately not here — it moved to SA-12. |
| SA-06 | `/centers` → owner shell | `دخول كالمالك` on `مركز النور`; inspect banner + owner sidebar; `إنهاء الانتحال` | Core | 00:10:30 | 2:00 | ⏳ | Impersonation banner is visible; sidebar becomes the owner's **13** items; API calls are made as the owner; no SuperAdmin-only link remains; exit returns to `/centers` as SuperAdmin and the banner disappears. |
| SA-07 | `/center-reports`, `/bulk-parent-accounts`, `/finance`, `/my-subscription` | Impersonate `limitedOwner`; open each locked route; assert the locked screen; attempt `/centers` and `/platform` (denied); impersonate `graceOwner`; open `/my-subscription`; exit | center_reports, parent_portal, accounting | 00:12:30 | 2:00 | ⏳ | The limited center shows the real `غير مشترك في هذه الوحدة` screen for `تقارير المركز`, `بوابة ولي الأمر` and `الحسابات` (the `ModuleLocked` page, not `ParentPortalGate`) with the module name and WhatsApp contact; `/centers` and `/platform` bounce to the owner home (permission denial); no redirect loop, no other-center data; grace center shows `فترة سماح` + the banner `انتهى اشتراكك وأنت في فترة السماح` with a positive days-left value while the page still loads. |
| SA-08 | `/subscriptions` | Search `النور`; renew the grace center (cancel then submit); edit plan/end date; reload | Core | 00:14:30 | 2:30 | ⏳ | Search narrows; the renewal modal has **no** confirmation dialog (assertion: one submit → `تم تجديد الاشتراك بنجاح`); cancel leaves state unchanged; after renewal the grace row becomes `نشط`; subscription edit persists after reload; no console error. |
| SA-09 | `/platform` | Inspect every stat card | Core | 00:17:00 | 1:30 | ⏳ | Cards render `إجمالي المراكز`, active/suspended/solo/multi, active subscriptions, total users, owners, teachers, assistants, students, groups, grace centers; each value equals the seeded DB count captured before recording. |
| SA-10 | `/audit-log` | Refresh; search `مركز`; filter `إنشاء مركز`; page next/prev | Core | 00:18:30 | 2:00 | ⏳ | **Only 3 action labels are translated** (`OnboardCenter`→`إنشاء مركز`, `Impersonate`→`بدء انتحال`, `ImpersonationEnd`→`إنهاء انتحال`); every other action renders its raw name (F-004, recorded); search narrows; the action filter returns only that action; ~25 rows over `pageSize = 20` produce 2 pages and next/prev really moves; no 5xx. |
| SA-11 | `/profile` | Inspect the read-only identity card; change password with a mismatch, then a valid change | Core | 00:20:30 | 2:00 | ⏳ | The profile is read-only (name/phone/email shown, no edit/save control for a SuperAdmin); mismatch shows `كلمتا المرور غير متطابقتين` and issues no request; the valid change returns `تم تغيير كلمة المرور بنجاح`; the new password is captured for SA-12. |
| SA-12 | `/centers`, `/force-password` | Reset the primary owner's password (capture temp); sign out; sign in as that owner; assert the forced page; mismatch then valid change; sign out and back in as SuperAdmin | Core | 00:22:30 | 2:00 | ⏳ | Reset dialog shows the temporary password; the owner's first sign-in lands on `تغيير كلمة المرور` and no route is reachable before the change; mismatch error is visible; a valid change is accepted; the temp password is then rejected and the new one succeeds; SuperAdmin is signed back in for SA-13. |
| SA-13 | `/dashboard`, `/admin`, `/nope`, mobile `/centers` | Direct-visit `/dashboard`; `/admin`; `/nope`; 390×844 snapshot | Core | 00:24:30 | 1:30 | ⏳ | `/dashboard` renders no staff data (SA is redirected by the role guard); `/admin` redirects to `/centers`; `/nope` shows the real 404 page; at 390×844 the sidebar collapses to the fixed 64px icon rail (no drawer/hamburger) and the centers table scrolls horizontally inside its container (GAP: table, not cards, F-003). |

---

### 4.1.1 Recorded SuperAdmin part vs. this matrix

The SA part (13 chapters, `e2e/artifacts/stage-c-superadmin/`) asserts every SA row above with
one addition and four wording-level gaps. All are recorded here rather than hidden:

| Matrix statement | What the recording actually asserts | Verdict |
|---|---|---|
| SA-02: seeded centers, search, row counts | also exercises the **status filter** (`Suspended` → empty state → reset) | extra coverage, no gap |
| SA-03/SA-04: count 4→5→6 | yes, plus phone/type/badge columns and the generated-password modal | covered |
| SA-06: "API calls are made as the owner" | the owner shell, 13-item sidebar, owner-only heading and the denial of `/centers` are asserted; the **token subject of a live API request is not**. The banner-name assertion failed on the first attempt (`F-005`), which is now fixed and covered by a unit test; the part is re-recorded | **gap** — planned follow-up assertion before final sign-off |
| SA-07: "no redirect loop, no other-center data" | locked screen, module label, no table, and both platform routes denied; no explicit loop/other-center probe | **gap (partial)** — route bounce is proven, data isolation on the locked screens is proven by the absent table only |
| SA-10: search `مركز` | search runs on the raw identifier `PlatformStatisticsViewed` (F-004) and returns exactly 1 row; filters `OnboardCenter` (2) / `Impersonate` (3) / `ImpersonationEnd` (3); 23 real rows, page 1 = 20, page 2 exists | equivalent coverage, different term |
| SA-11: name/phone/**email** shown | phone `01000000001` and role `مشرف المنصة` asserted; the seeded SuperAdmin has no email to display | **gap (cosmetic)** |

No SA row is unrecorded: all 13 chapters exist and pass their assertions. The four deltas above
are the only places where the matrix text is stronger than the recorded assertions.

### 4.2 CenterOwner — planned 51m 00s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| CO-01 | `/login` → `/teachers` | Sign in as `01000000002`; inspect brand + sidebar order | Core | 00:26:00 | 1:00 | ⏳ | URL is `/teachers`; brand is `مركز النور`; sidebar is exactly the 14 owner items in `NAV_ITEMS` order; no `/dashboard` link. |
| CO-02 | `/teachers` | Inspect 2 seeded teachers; search by name and phone; clear | Core | 00:27:00 | 2:30 | ⏳ | 2 rows with name/phone/subject/group chips; search narrows to the matching teacher; clear restores 2; no "no teachers" empty state. |
| CO-03 | `/teachers` | `إضافة مدرس`; submit empty; fill name/phone/password/subject; save | Core | 00:29:30 | 2:30 | ⏳ | Empty submit shows field errors; valid submit shows success; row count 2→3; the new teacher appears in the group teacher selector. |
| CO-04 | `/teachers` | Edit name/subject; delete with cancel then confirm | Core | 00:32:00 | 2:00 | ⏳ | Edit persists after reload; delete cancel keeps the row; confirm removes it (3→2); the confirm dialog names the teacher. |
| CO-05 | `/income` | Open page; inspect totals/list; search; add income empty→valid | accounting | 00:34:00 | 2:30 | ⏳ | Totals and rows render; search narrows; empty add shows validation; valid add shows toast and a new row; the total increases by the added amount. |
| CO-06 | `/income` | Edit row; delete cancel/confirm; categories tab: add/edit/delete | accounting | 00:36:30 | 2:30 | ⏳ | Edit persists and total updates; delete confirm removes the row; category add/edit/delete works and the income row keeps its category label. |
| CO-07 | `/finance` | Payments tab; add payment; edit; delete cancel/confirm; receipt modal; print (stubbed `window.print`) | accounting | 00:39:00 | 3:00 | ⏳ | Payment totals update; validation blocks empty; receipt shows student/amount/date; `window.print` is called exactly once per print click; delete confirm updates the total. |
| CO-08 | `/finance` | Students tab; search; pagination; paid/unpaid badges | accounting | 00:42:00 | 2:00 | ⏳ | Tab switch loads the student finance table; search narrows; next/prev works; badge matches the seeded paid state. |
| CO-09 | `/overdue` | List; search; `تذكير` WhatsApp; add payment prefilled; save; reload | payments | 00:44:00 | 3:00 | ⏳ | `wa.me/20...` popup opens with an encoded Arabic message; payment modal is prefilled with the row's student; save reduces/removes the overdue row. |
| CO-10 | `/expense` | List; add empty→valid; edit; view; delete cancel/confirm | accounting | 00:47:00 | 3:00 | ⏳ | Totals render; empty add blocked; view modal shows the full row; delete cancel keeps it, confirm removes it. |
| CO-11 | `/expense` | Categories tab: add/edit/delete | accounting | 00:50:00 | 2:00 | ⏳ | Category CRUD works; deleting a category used by an expense shows the real guard/behavior (assert the actual product rule, do not assume). |
| CO-12 | `/center-reports` | Set month/group filter; print (stub); download CSV | center_reports | 00:52:00 | 3:00 | ⏳ | Filter changes the report; print calls `window.print` once; CSV download event fires with an Arabic filename and a BOM; totals match the on-screen report. |
| CO-13 | `/adminDashboard` | Month/year select; inspect charts; refresh/retry | Core | 00:55:00 | 2:00 | ⏳ | `إجمالي الطلاب = 15` (the Students-record count); charts render; changing month/year reloads without error; retry works. |
| CO-14 | `/bulk-parent-accounts` | Search student; select; export Excel; print; create accounts with confirm | parent_portal | 00:57:00 | 2:30 | ⏳ | Selection count matches checked rows; XLSX download fires; print called; confirm creates only selected accounts and lists skipped students; re-run does not duplicate. |
| CO-15 | `/settings` | `إضافة مجموعة جديدة`; submit empty; fill name/price/sessions/teacher; save | Core | 00:59:30 | 2:30 | ⏳ | Empty submit shows validation; saved group appears in `المجموعات الحالية` with the right teacher and price. |
| CO-16 | `/settings` | Groups list; sessions modal add/edit/delete; edit group; delete with confirm | Core | 01:02:00 | 2:30 | ⏳ | Session rows persist; edit persists; delete confirm removes the group; pagination works. |
| CO-17 | `/assistants` | Add empty→valid; edit; reset password; delete cancel/confirm | Core | 01:04:30 | 2:30 | ⏳ | Validation; list 1→2; reset shows the temp-password dialog; delete cancel keeps, confirm removes. |
| CO-18 | `/assistants` | Salaries tab; pay salary; open salary log; edit payment | Core | 01:07:00 | 2:30 | ⏳ | Salary card shows the assistant; pay modal saves; log row appears; edit payment persists after reload. |
| CO-19 | `/my-subscription` | Inspect state, dates, module grid, upgrade link | Core | 01:09:30 | 1:30 | ⏳ | State is active; enabled/locked modules match the center; the WhatsApp upgrade link has the expected `wa.me` href. |
| CO-20 | `/center-settings` | Clear name→save error; upload valid logo; change color/phone/address/description; save | Core | 01:11:00 | 2:30 | ⏳ | Name-required error is visible; logo preview updates; save toast; sidebar brand/color reflect the new values after reload. |
| CO-21 | `/profile` | Edit allowed fields; change password mismatch then valid | Core | 01:13:30 | 1:30 | ⏳ | Save toast; mismatch error; valid change accepted; no subject card for an owner. |
| CO-22 | `/centers`, `/dashboard`, search, mobile `/finance` | Direct `/centers`; direct `/dashboard`; search `آدم` and `حسن`; 390×844 snapshot | Core | 01:15:00 | 2:00 | ⏳ | Both direct routes leave the owner in the owner shell (no SuperAdmin/student page); both cross-center searches return 0 rows; mobile table scrolls horizontally (GAP: not cards, F-003). |

---

### 4.3 Teacher — planned 45m 30s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| T-01 | `/login` → `/dashboard` | Sign in as `01000000003`; inspect brand + sidebar | Core | 01:17:00 | 1:00 | ⏳ | URL is `/dashboard`; brand `مركز النور`; sidebar is exactly the 14 teacher items; no owner-only links. |
| T-02 | `/dashboard` (`StudentManagement`) | Inspect list; search name/phone; group filter; status filter; reset; pagination | Core | 01:18:00 | 2:30 | ⏳ | Only the teacher's scoped students render; search narrows; each filter changes the rows; reset restores; pagination reflects the scoped total. |
| T-03 | `/dashboard` | `إضافة طالب`; submit empty; fill required fields + group; save | Core | 01:20:30 | 2:30 | ⏳ | Empty submit shows field errors; valid save shows toast and the new student appears; the group assignment is visible. |
| T-04 | `/dashboard` | View modal; payment toggle cancel/confirm; active toggle cancel/confirm; delete cancel/confirm | payments | 01:23:00 | 3:00 | ⏳ | View shows the student's data; cancel leaves the badge, confirm flips `مدفوع/غير مدفوع`; active badge flips; delete confirm removes the row and cancel keeps it. |
| T-05 | `/dashboard` | Generate student accounts; print credentials (stub); generate parent accounts; inspect skipped | Core | 01:26:00 | 3:00 | ⏳ | Generated credentials modal lists phone/password; print calls `window.print` once; parent-account generation creates only eligible parents and lists skipped reasons. |
| T-06 | `/attendance` | Select group/session; mark present/absent/late/excused; add note; save; bulk notify absentees | attendance | 01:29:00 | 3:00 | ⏳ | Counts update per status; save toast and persisted values after reload; note modal saves; bulk-notify opens `wa.me` with the absence template. |
| T-07 | `/scanner` | Open scanner; manual code path; inspect running sessions; clear log | attendance | 01:32:00 | 2:00 | ⏳ | Manual code resolves the seeded student; the log row appears; an invalid code shows the real error; running sessions load; clear empties the log. |
| T-08 | `/qr-cards` | Generate codes; search; print all; print one; copy; WhatsApp share; email modal validation | attendance | 01:34:00 | 2:30 | ⏳ | QR cards render; search narrows; print calls `window.print`; copy writes the code to the clipboard; WhatsApp opens `wa.me`; email empty submit is blocked. |
| T-09 | `/student-reports` | Search student; open attendance/grades/full report; print; download CSV | Core | 01:36:30 | 2:30 | ⏳ | Report modal opens with the correct student; attendance/grades columns respect modules; print called once; CSV download fires with the student's name. |
| T-10 | `/grades` | `رصد الدرجات` tab: create exam/roster; add mark; `إدارة الدرجات` tab: edit/delete mark | grades | 01:39:00 | 3:00 | ⏳ | Mark saves and appears with the right total; edit persists; delete removes it; tab switch keeps the data. |
| T-11 | `/question-bank` | Academic years CRUD; bank CRUD; question CRUD (true/false, multiple, essay); image upload/remove | question_bank | 01:42:00 | 3:30 | ⏳ | Each CRUD shows the row/modal change; question type switches the answer controls; validation blocks an empty question; bank counts update. |
| T-12 | `/exams` | Create paper exam; create electronic exam; pick questions; publish toggle; results modal; grade essay; print paper | online_exams | 01:45:30 | 3:30 | ⏳ | Both modes save; publish toggle changes the badge/student visibility; results show attempts; essay grade persists; print paper route opens and print is called. |
| T-13 | `/notes` | Add note with title/description/group/file; edit; delete cancel/confirm; download | study_notes | 01:49:00 | 2:00 | ⏳ | Note appears with group and file; edit persists; delete cancel keeps it and confirm removes it; download event fires. |
| T-14 | `/income` | List; search; add; edit; delete | accounting | 01:51:00 | 2:00 | ⏳ | Only the teacher's scoped income renders; total updates after add/edit/delete; search narrows. |
| T-15 | `/overdue` | List; search; WhatsApp reminder; add payment | payments | 01:53:00 | 2:00 | ⏳ | Only scoped overdue students render; `wa.me` popup opens; prefilled payment saves and reduces/removes the row. |
| T-16 | `/reports` | Inspect tabs; switch overview/groups; assert no teachers tab | center_reports | 01:55:00 | 2:00 | ⏳ | Only `نظرة عامة` and `المجموعات` exist for a pure teacher; no center-wide teachers tab; data is scoped. |
| T-17 | `/settings` (`مجموعاتي`) | Inspect list; open sessions; assert no add/edit/delete controls | Core | 01:57:00 | 1:30 | ⏳ | Heading is `مجموعاتي`; read-only list; sessions modal is read-only; no add/edit/delete buttons render. |
| T-18 | `/profile` | Inspect data; edit name/phone; save subject; password mismatch→valid | Core | 01:58:30 | 1:30 | ⏳ | Subject card exists for a teacher; save toast; password validation; new password works. |
| T-19 | `/finance`, `/expense`, `/assistants`, `/center-settings`, `/teachers`, `/adminDashboard`, `/dashboard` search, mobile | Direct-visit each denied route; search a grace-center student; 390×844 snapshot on `/dashboard` | Core | 02:00:00 | 2:30 | ⏳ | Every denied route leaves the teacher in the teacher shell (no finance/expense/admin data); cross-center search returns 0; mobile student list renders **cards** (`StudentCardList`, meets requirement). |

---

### 4.4 Assistant — planned 34m 30s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| A-01 | `/login` → `/dashboard` | Sign in as `01000000005`; inspect brand + sidebar | Core | 02:02:30 | 1:00 | ⏳ | URL is `/dashboard`; sidebar is exactly the 11 assistant items; no income/reports/owner links; brand present (F-001 workaround applies only to the seeded account). |
| A-02 | `/dashboard` | List; search; group filter; status filter; reset; pagination | Core | 02:03:30 | 2:30 | ⏳ | Only the assistant's scoped students render; search/filters/reset/pagination all change the rows. |
| A-03 | `/dashboard` | Add student empty→valid; edit existing student; save | Core | 02:06:00 | 2:30 | ⏳ | Validation blocks empty; add shows the new row; edit persists after reload. |
| A-04 | `/dashboard` | View; payment toggle; active toggle; delete cancel/confirm; create parent account | payments | 02:08:30 | 2:30 | ⏳ | View data correct; badges flip only on confirm; delete cancel/confirm; parent account creation shows credentials or the real duplicate/skip message. |
| A-05 | `/attendance` | Select session; mark statuses; add note; save; reload | attendance | 02:11:00 | 3:00 | ⏳ | Status counts update; save toast; values persist after reload. |
| A-06 | `/scanner` | Manual code path; invalid code; running sessions | attendance | 02:14:00 | 2:00 | ⏳ | Valid code logs the student; invalid code shows the error; running sessions load. |
| A-07 | `/qr-cards` | Generate; search; print; copy | attendance | 02:16:00 | 2:30 | ⏳ | Cards render; search narrows; print called; copy writes the code. |
| A-08 | `/grades` | Roster tab: add mark; management tab: edit/delete | grades | 02:18:30 | 3:00 | ⏳ | Mark appears with the right total; edit/delete persist. |
| A-09 | `/question-bank` | Years/banks/questions CRUD; all three question types | question_bank | 02:21:30 | 3:00 | ⏳ | Each CRUD changes the list; question type switches controls; validation blocks empty content. |
| A-10 | `/exams` | Create exam; publish toggle; open results | online_exams | 02:24:30 | 2:30 | ⏳ | Exam saves; publish badge changes; results modal opens with attempts. |
| A-11 | `/notes` | Add note; edit; delete confirm; download | study_notes | 02:27:00 | 2:30 | ⏳ | Note/group/file render; edit persists; delete confirm removes; download fires. |
| A-12 | `/overdue` | List; search; WhatsApp reminder; add payment | payments | 02:29:30 | 2:00 | ⏳ | Scoped rows; `wa.me` popup; prefilled payment reduces/removes the row. |
| A-13 | `/settings` (`مجموعاتي`) | Read-only groups; open sessions | Core | 02:31:30 | 1:30 | ⏳ | No add/edit/delete controls; sessions visible read-only. |
| A-14 | `/profile` | Inspect and edit allowed fields; password mismatch→valid | Core | 02:33:00 | 1:30 | ⏳ | Save toast; mismatch error; valid change accepted. |
| A-15 | `/income`, `/finance`, `/expense`, `/center-settings`, `/assistants`, `/reports`, `/student-reports`, `/teachers`, `/adminDashboard`, mobile | Direct-visit each denied route; cross-center search; 390×844 snapshot on `/dashboard` | Core | 02:34:30 | 2:30 | ⏳ | Every denied route leaves the assistant in the assistant shell; no finance/owner data; cross-center search 0; mobile student list renders **cards** (meets requirement). |

---

### 4.5 Student — planned 17m 00s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| S-01 | `/login` → `/student/dashboard` | Sign in as `01110000001`; inspect portal sidebar + dashboard cards | student_portal | 02:37:00 | 1:30 | ⏳ | URL is `/student/dashboard`; sidebar is exactly the 8 student items; dashboard shows exams/results/attendance/fees/notes/notifications; no staff shell. |
| S-02 | `/student/exams` | Inspect statuses; open the live exam; read instructions | online_exams | 02:38:30 | 2:00 | ⏳ | Seeded live exam shows `متاح الآن`; past exam shows `منتهى`; start button opens the attempt; no other student's exam. |
| S-03 | `/student/attempt/:id` | Start; fullscreen; answer questions; submit with confirm; assert result state | online_exams | 02:40:30 | 2:30 | ⏳ | Attempt loads its own questions; answers persist while navigating; submit confirm names answered/total; submit succeeds and the exam becomes `تم التسليم`. |
| S-04 | `/student/results` | Inspect results; open `مراجعة`; assert answers; print (stub) | grades | 02:43:00 | 2:30 | ⏳ | Published result shows score/percentage/status; review modal shows the student's answers; print called once. |
| S-05 | `/student/notes` | Inspect notes; download a note | study_notes | 02:45:30 | 1:30 | ⏳ | Only the student's notes render; download event fires with the file name. |
| S-06 | `/student/attendance` | Inspect summary + records | attendance | 02:47:00 | 1:30 | ⏳ | Totals (`إجمالي الحصص/حاضر/غائب/متأخر/بعذر`) match the seeded attendance; only the student's rows. |
| S-07 | `/student/payments` | Inspect totals + payment rows | payments | 02:48:30 | 1:30 | ⏳ | Total paid/due/count match the seed; only the student's payments. |
| S-08 | `/student/notifications` | Mark one read; `تعليم الكل كمقروء`; refresh | student_portal | 02:50:00 | 1:30 | ⏳ | Unread badge decreases; mark-all succeeds; state persists after reload. |
| S-09 | `/student/profile` | Inspect profile; assert read-only | student_portal | 02:51:30 | 1:00 | ⏳ | Name/phone/group/status/payment state render; no edit/save control for the student. |
| S-10 | `/dashboard`, mobile | Direct staff route; 390×844 snapshot on `/student/results` | Core | 02:52:30 | 1:30 | ⏳ | Staff route does not render; student stays in the portal; mobile drawer works and the results table scrolls horizontally (GAP: not cards, F-003). |

---

### 4.6 Parent — planned 9m 30s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| P-01 | `/login` → `/parent/dashboard` | Sign in as `01000000006`; inspect header + 2 children | parent_portal | 02:54:00 | 1:30 | ⏳ | No sidebar; header has portal title, notification bell, theme, logout; exactly 2 linked children; no other family's children. |
| P-02 | `/parent/children/:id` | Open child 1: attendance, grades, electronic-exam results, payments; open child 2; assert isolation | parent_portal | 02:55:30 | 3:30 | ⏳ | Each section renders its own data; attendance totals match; published grades/exams only; payments show paid/remaining; child 2 shows different data; no cross-family data. |
| P-03 | `/parent/notifications` | Mark one read; `تعليم الكل كمقروء`; click a notification with a child id | parent_portal | 02:59:00 | 1:30 | ⏳ | Unread state changes and persists; clicking navigates to `/parent/children/:studentId` for the linked child. |
| P-04 | `/student-card` | Open public lookup; submit a seeded code; submit an invalid code | Core | 03:00:30 | 1:30 | ⏳ | Valid code shows the public card/student summary; invalid code shows the real not-found/error; no login required; no private finance data. |
| P-05 | `/parent/children/:otherId`, mobile | Direct-visit a different family's student id; 390×844 snapshot | parent_portal | 03:02:00 | 1:30 | ⏳ | The other family's child is not rendered (error/empty state); mobile header and child cards fit without overlap. |

---

### 4.7 SoloTeacher — planned 53m 00s

| Ch | Page | Action exercised (in order) | Module | Start | Dur | Status | Assertion that must be true on video |
|---|---|---|---|---|---|---|---|
| ST-01 | `/login` → `/dashboard` | Sign in as `01000000007`; inspect solo shell + sidebar | Core | 03:03:30 | 1:00 | ⏳ | URL is `/dashboard`; sidebar is the 21 solo-visible items; `إدارة المدرسين` is absent; label is `مدرس / صاحب المركز`. |
| ST-02 | `/dashboard` | List; search; add student empty→valid; edit | Core | 03:04:30 | 3:00 | ⏳ | Scoped list; validation; add appears; edit persists. |
| ST-03 | `/dashboard` | View; payment/active toggles; delete confirm; generate accounts; print | payments | 03:07:30 | 2:30 | ⏳ | Badges flip only on confirm; delete confirm; credentials modal + print; parent-account flow. |
| ST-04 | `/attendance` | Session; mark statuses; note; save; bulk notify | attendance | 03:10:00 | 3:00 | ⏳ | Counts update; save persists; `wa.me` bulk notify. |
| ST-05 | `/scanner` | Manual code; invalid code; running sessions | attendance | 03:13:00 | 2:00 | ⏳ | Valid/invalid code outcomes; sessions load. |
| ST-06 | `/qr-cards` | Generate; search; print all/one; copy; WhatsApp; email validation | attendance | 03:15:00 | 2:30 | ⏳ | Cards render; print called; copy; `wa.me`; email empty blocked. |
| ST-07 | `/student-reports` | Search; open report; print; CSV | Core | 03:17:30 | 2:30 | ⏳ | Report modal correct; print/CSV fire; scoped to solo center. |
| ST-08 | `/grades` | Roster + management; add/edit/delete mark | grades | 03:20:00 | 3:00 | ⏳ | Marks persist; totals correct; delete works. |
| ST-09 | `/question-bank` | Years/banks/questions CRUD; all types | question_bank | 03:23:00 | 3:00 | ⏳ | CRUD and validation; type switching. |
| ST-10 | `/exams` | Paper/electronic; pick questions; publish; results; grade; print | online_exams | 03:26:00 | 3:00 | ⏳ | Both modes; publish badge; results/grade; print. |
| ST-11 | `/notes` | Add with file; edit; delete; download | study_notes | 03:29:00 | 2:00 | ⏳ | Note renders; edit/delete; download. |
| ST-12 | `/income` | List; search; add/edit/delete | accounting | 03:31:00 | 2:00 | ⏳ | Scoped totals; CRUD updates total. |
| ST-13 | `/finance` | Payments + students tabs; add/edit/delete; receipt print | accounting | 03:33:00 | 3:00 | ⏳ | Totals; validation; receipt print; student tab. |
| ST-14 | `/overdue` | Search; remind; add payment | payments | 03:36:00 | 2:00 | ⏳ | `wa.me`; prefilled payment reduces/removes row. |
| ST-15 | `/expenses` | List; add/edit/delete/view; categories | accounting | 03:38:00 | 2:30 | ⏳ | CRUD; totals; category guard. |
| ST-16 | `/center-reports` | Filters; print; CSV | center_reports | 03:40:30 | 2:00 | ⏳ | Filter changes report; print/CSV; totals match. |
| ST-17 | `/adminDashboard` | Month/year; charts; retry | Core | 03:42:30 | 2:00 | ⏳ | Solo center totals; charts; retry. |
| ST-18 | `/bulk-parent-accounts` | Search/select/export/print/create | parent_portal | 03:44:30 | 2:00 | ⏳ | Selection; XLSX; print; create/skip. |
| ST-19 | `/settings` | Add group; sessions; edit; delete | Core | 03:46:30 | 3:00 | ⏳ | Full group CRUD in a solo center (single teacher). |
| ST-20 | `/assistants` | Add/edit/delete; pay salary; log | Core | 03:49:30 | 2:30 | ⏳ | Assistant CRUD; salary payment/log. |
| ST-21 | `/my-subscription`, `/center-settings`, `/profile` | State/modules; settings save; profile/subject/password | Core | 03:52:00 | 2:30 | ⏳ | Subscription/module grid; settings persist; profile saves. |
| ST-22 | `/teachers`, mobile | Direct-visit `/teachers`; 390×844 snapshot on `/dashboard` | Core | 03:54:30 | 2:00 | ⏳ | `/teachers` is blocked/hidden for a solo center (route guard); mobile student list renders **cards** (meets requirement). |

---

## 5. Page-to-chapter index (nothing orphaned)

| Screen | Route | Chapters |
|---|---|---|
| Login | `/login` | SA-01, CO-01, T-01, A-01, S-01, P-01, ST-01 |
| Centers | `/centers` | SA-02…SA-06, SA-12 (reset), SA-13, CO-22 |
| Subscriptions | `/subscriptions` | SA-08 |
| Platform statistics | `/platform` | SA-09 |
| Audit log | `/audit-log` | SA-10 |
| Profile | `/profile` | SA-11, CO-21, T-18, A-14, ST-21 |
| Force/change password | `/force-password`, `/change-password` | SA-12 |
| Teachers | `/teachers` | CO-02…CO-04, T-19, A-15, ST-22 |
| Income | `/income` | CO-05, CO-06, T-14, ST-12 |
| Finance | `/finance` | CO-07, CO-08, ST-13, SA-07 (locked) |
| Overdue | `/overdue` | CO-09, T-15, A-12, ST-14 |
| Expenses | `/expense` | CO-10, CO-11, ST-15 |
| Center reports | `/center-reports` | CO-12, ST-16, SA-07 (locked) |
| Admin dashboard | `/adminDashboard` | CO-13, ST-17 |
| Bulk parent accounts | `/bulk-parent-accounts` | CO-14, ST-18, SA-07 (locked) |
| Groups | `/settings` | CO-15, CO-16, T-17, A-13, ST-19 |
| Assistants | `/assistants` | CO-17, CO-18, ST-20 |
| My subscription | `/my-subscription` | CO-19, ST-21, SA-07 (grace) |
| Center settings | `/center-settings` | CO-20, ST-21 |
| Students (staff) | `/dashboard` | T-02…T-05, A-02…A-04, ST-02, ST-03 |
| Attendance | `/attendance` | T-06, A-05, ST-04 |
| Scanner | `/scanner` | T-07, A-06, ST-05 |
| QR cards | `/qr-cards` | T-08, A-07, ST-06 |
| Student reports | `/student-reports` | T-09, ST-07 |
| Grades | `/grades` | T-10, A-08, ST-08 |
| Question bank | `/question-bank` | T-11, A-09, ST-09 |
| Exams | `/exams` | T-12, A-10, ST-10 |
| Exam paper | `/exams/:id/paper` | T-12, A-10, ST-10 |
| Notes | `/notes` | T-13, A-11, ST-11 |
| Reports | `/reports` | T-16 |
| Student portal | `/student/*` | S-01…S-10 |
| Exam attempt | `/student/attempt/:attemptId` | S-02, S-03 |
| Parent portal | `/parent/*` | P-01…P-03, P-05 |
| Public card lookup | `/student-card`, `/student-card/:code` | P-04 |
| Not found | `*` | SA-13 |
| Redirects | `/`, `/admin`, `/center/dashboard`, `/teacher/dashboard`, `/student`, `/parent` | SA-13, CO-22, T-19, A-15, S-10, P-05, ST-22 |

---

## 6. Negative-case matrix (must be recorded, not skipped)

| Case | Chapter | Exact check | Expected result |
|---|---|---|---|
| Missing required field — center | SA-03 | Submit `مركز جديد` empty | Toast `يرجى إدخال اسم المدرس!`; no POST; modal stays open; center count unchanged. |
| Missing required field — teacher | CO-03 | Submit `إضافة مدرس` empty | Required-field errors; no row added. |
| Missing required field — student | T-03 / A-03 / ST-02 | Submit empty student form | Required-field errors; no row added. |
| Missing required field — group | CO-15 / ST-19 | Submit empty group form | Required-field errors; no group added. |
| Missing required field — question/exam/note | T-11 / T-12 / T-13 | Save with empty title/text/options | Validation blocks save; no orphan row. |
| Missing required field — center settings | CO-20 | Clear center name and save | `اسم المركز مطلوب`; no save request. |
| Password mismatch | SA-11 / SA-12 / CO-21 / T-18 / A-14 / ST-21 | Submit mismatched new passwords | Arabic mismatch error; password unchanged. |
| Delete confirmation — cancel | SA-05 / CO-04 / CO-16 / T-04 / A-04 / ST-03 | Open delete, press cancel | Row remains; no success toast. |
| Delete confirmation — confirm | same | Open delete, confirm | Row disappears; success toast; total decreases. |
| Locked module — finance | SA-07 | Impersonated limited owner opens `/finance` | `غير مشترك في هذه الوحدة` for `الحسابات` with platform contact; no finance data. (`/question-bank` is not reachable by an owner at all — its route is teacher/assistant only — so it is not used as the owner lock screen.) |
| Locked module — center reports | SA-07 | Impersonated limited owner opens `/center-reports` | Same locked screen; no report data. |
| Locked portal — parent accounts | SA-07 | Impersonated limited owner opens `/bulk-parent-accounts` | `ModuleLocked` (`غير مشترك في هذه الوحدة`) for `بوابة ولي الأمر`, not `ParentPortalGate`; no account creation. |
| Grace state | SA-07 | Impersonated grace owner opens `/my-subscription` | `فترة السماح` + positive days left; page still usable. |
| Permission denial — SuperAdmin | SA-13 | Open `/dashboard` | No staff student page; role guard redirects. |
| Permission denial — CenterOwner | CO-22 | Open `/centers`, `/dashboard` | No SuperAdmin/student page; stays in owner shell. |
| Permission denial — Teacher | T-19 | Open `/finance`, `/expense`, `/assistants`, `/center-settings`, `/teachers`, `/adminDashboard` | No owner/admin data; stays in teacher shell. |
| Permission denial — Assistant | A-15 | Open `/income`, `/finance`, `/expense`, `/center-settings`, `/assistants`, `/reports`, `/student-reports`, `/teachers`, `/adminDashboard` | No owner/admin data; stays in assistant shell. |
| Permission denial — Student | S-10 | Open `/dashboard` | No staff page; stays in student portal. |
| Permission denial — Parent | P-05 | Open a staff route | No staff page; stays in parent portal. |
| Permission denial — SoloTeacher | ST-22 | Open `/teachers` | Blocked/hidden because the center is solo; no teachers page. |
| Out-of-scope data — Owner | CO-22 | Search `آدم` (grace) and `حسن` (limited) | 0 rows; only `مركز النور` data visible. |
| Out-of-scope data — Teacher | T-19 | Search a grace/limited student and a primary student outside the teacher's groups | 0 rows; only assigned groups visible. |
| Out-of-scope data — Assistant | A-15 | Same search | 0 rows; only assigned scope. |
| Out-of-scope data — Parent | P-05 | Open `/parent/children/:otherFamilyStudentId` | Other child not rendered; error/empty state; no finance data. |
| Out-of-scope data — Student | S-01…S-09 | Inspect every portal page | Only the signed-in student's records; no sibling/other student rows. |
| Invalid QR / invalid card code | T-07 / A-06 / P-04 | Submit an unknown code | Real error/not-found; no crash; no data leak. |

---

## 7. Mobile viewport matrix (390×844)

The requirement says "tables converted to cards". The code audit shows this is **only true for the staff student list**:

- `StudentPage/StudentManagement.jsx` renders `StudentTable` + `StudentCardList`; `StudentCardList` has `md:hidden`.
- Every other list page uses `overflow-x-auto` around a `<table>`; there is no card renderer. This includes the student-portal results/payments/attendance tables (`StudentResultsPage.jsx:73`, `StudentPaymentsPage.jsx:122`, `StudentAttendancePage.jsx:150`).
- The parent portal has no `<table>` at all, and the student exams page is a card list, so those two already meet the requirement.

This matrix will record the truth, not fake a card layout:

| Role | Page captured | Expected current behavior | Status |
|---|---|---|---|
| SuperAdmin | `/centers` | Fixed 64px icon rail (no drawer/hamburger); horizontally scrollable table | ⏳ (GAP: table, not cards) |
| CenterOwner | `/finance` (payments) | Drawer; horizontally scrollable table | ⏳ (GAP: table, not cards) |
| Teacher | `/dashboard` | Drawer; **student cards** (`StudentCardList`) | ⏳ (meets requirement) |
| Assistant | `/dashboard` | Drawer; **student cards** | ⏳ (meets requirement) |
| Student | `/student/results` | Portal drawer; horizontally scrollable table (exams page *is* cards, but the densest list is not) | ⏳ (GAP: table, not cards) |
| Parent | `/parent/children/:id` | Stacked sections/cards; header fits; no `<table>` in the parent portal | ⏳ (meets requirement) |
| SoloTeacher | `/dashboard` | Drawer; **student cards** | ⏳ (meets requirement) |

**Decision requested:** either (A) accept horizontal scroll as the mobile pattern for non-student tables and amend the requirement, or (B) authorize a follow-up UI task to add card renderers to every table. This matrix does not change product UI without approval. See F-003.

---

## 8. Explicitly not covered (with reasons)

| Item | Why it is not a chapter | What the tour does instead |
|---|---|---|
| Forgot-password flow | Not implemented. `Login.jsx` shows the toast `سيتم توفير استعادة كلمة المرور قريباً`; there is no route/API/UI. | SA-11/SA-12 cover the implemented password-change and forced-change flows. |
| Email confirmation / verification | No UI or route; `EmailController` only sends an email. | Not asserted. Email modal validation is covered in T-08; actual SMTP delivery is not. |
| WhatsApp template **editor** | No editor UI; `whatsappTemplates.js` says the override editor is a later step. Only client-side `wa.me` links exist. | Reminder/absence/result links are asserted (popup URL + encoded Arabic text). |
| Server-side WhatsApp sender | No server sender; all links are client `wa.me` deep links. | Same as above. |
| PWA / offline mode / install prompt | No service worker or manifest-based offline flow in the code. | Not covered. |
| Backup / restore | No UI or API endpoint. | Not covered. |
| Payment gateway / online checkout | No gateway integration; payments are recorded manually. | CO-07/CO-16/ST-13 cover manual payment recording. |
| Native PDF generation | The product uses browser print (`window.print`) and CSV/XLSX downloads, not a server PDF generator. | Print and downloads are asserted; "Save as PDF" is a browser feature, not a product screen. |
| Camera QR scanning in headless CI | Headless Chromium has no real camera; permission/frame decoding is not deterministic in CI. | Manual-code scan path is fully asserted (T-07/A-06/ST-05); camera path is documented as manual-only. |
| Real SMTP delivery | E2E has no SMTP server; asserting delivery would test infrastructure, not the product. | Email modal validation is asserted; delivery is not. |
| SignalR real-time push | Not a distinct screen; no user-visible action required for the tour. | Group/session lists are asserted through normal reloads. |
| Arabic TTS voiceover | Deferred by decision; written Arabic captions are the current deliverable. | §10 proposes the later option only. |
| Every one of the 199 API endpoints | Not all endpoints are reachable from the UI (internal/identity/admin utilities). | The tour covers UI-reachable actions; backend unit/integration tests cover the rest (284 passing). |

---

## 9. Seed independence and per-part setup

| Part | Account | Seed key | Extra data used | Must not depend on |
|---|---|---|---|---|
| SA | `01000000001` | `E2E_PART_SEED=SA` | primary/solo/grace/limited centers; audit rows; impersonation | Any row created by another part |
| CO | `01000000002` | `E2E_PART_SEED=CO` | primary center: 2 teachers, 1 assistant, 15 students, groups, payments, income/expense, parents | SA-created centers |
| T | `01000000003` | `E2E_PART_SEED=T` | primary center, teacher's groups/students, attendance, grades, QB, exams, notes | CO edits |
| A | `01000000005` | `E2E_PART_SEED=A` | primary center, assistant scope, attendance, QB, exams, notes | T edits |
| S | `01110000001` | `E2E_PART_SEED=S` | primary center student login, live/past exams, results, notes, attendance, payments, notifications | Staff parts |
| P | `01000000006` | `E2E_PART_SEED=P` | parent linked to 2 primary students, notifications, card codes | Student part |
| ST | `01000000007` | `E2E_PART_SEED=ST` | solo center: 1 group, students, payments, exams, notes | Primary-center data |

Execution rules:

- Each part runs `global-setup` against `CenterManagement_E2E` on `(localdb)\MSSQLLocalDB`, with `[E2E SAFETY]` proof printed before recording.
- Each part uses a fresh browser context and a fresh video file. No cookies, localStorage, or downloaded files are shared.
- If a part needs a created row (e.g., a new teacher), it creates it inside that part; it never reads a row from another part.
- The two supplementary accounts are part of the seed, so SA-07 is independent of CO/ST.
- CI regeneration (after approval) may run the seven parts as parallel jobs with per-job seeds; the approval run is sequential because each role gates the next.

---

## 10. Merge, chapters, and later Arabic TTS

### Merge (after all seven parts are approved)

1. Normalize each part to identical streams:
   `ffmpeg -i part.mp4 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an normalized.mp4`
2. Concatenate with the concat demuxer (`-f concat -safe 0 -i parts.txt -c copy`).
3. Add chapter metadata with `;FFMETADATA1` / `[CHAPTER]` blocks, `TIMEBASE=1/1000`, Arabic titles.
4. Re-mux with `-map_metadata 1 -c copy` to `center-management-full-tour.mp4`.
5. Validate with `ffprobe`: duration, 1280×720, H.264, yuv420p, 25 fps, chapter count = 106, no audio.
6. Write `docs/chapters.md` from the **actual** ffprobe times; the planned times in §2 are replaced by real times.
7. Extract 3 spot-check frames (start, middle, end) and verify Arabic rendering.

### Later Arabic TTS (proposal only — not implemented now)

- Keep the written Arabic caption cards as the source of truth.
- After approval, generate one short Arabic script per chapter from the matrix's `Action` + `Assertion` text.
- Use an Arabic TTS voice (e.g., Azure Speech `ar-EG`, Google Cloud TTS `ar-XA`, or ElevenLabs multilingual) with a consistent narrator.
- Synthesize one WAV per chapter, then mux with `ffmpeg` using `adelay`/`amix` or concatenate per-chapter audio; add `-metadata:s:a:0 language=ara`.
- Keep the burned-in Arabic captions and optionally ship a soft SRT.
- This is deliberately deferred; no TTS code or dependency is added in Stage C.

---

## 11. Approval checklist

Before recording starts, please confirm:

1. **Matrix scope** — 106 chapters / 3h 56m 30s / 76 role-page visits is the approved shape (no shortening).
2. **Negative cases** — locked modules and grace state are recorded inside the SuperAdmin part via impersonation (SA-07), not as an eighth role.
3. **Mobile gap** — choose (A) accept horizontal scroll for non-student tables, or (B) authorize a card-conversion follow-up. Until then, §7 records the real behavior.
4. **F-002** — the `الطلاب` count discrepancy is recorded and **not fixed** without separate approval.
5. **Per-role gate** — after each role part, you receive path + duration + findings and must approve before the next role.
6. **Final output** — one `center-management-full-tour.mp4` + `docs/chapters.md`, 1280×720, silent, Arabic captions.

No recording begins until this checklist is approved.
