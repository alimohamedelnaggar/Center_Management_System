# Stage B feature tour map

This is the short review cut. It is not the full 35-chapter production plan and
it does not start Stage C.

## Selected chapters

| User chapter | Role | Route | What the video shows | Real assertions |
| --- | --- | --- | --- | --- |
| Intro | Visitor | `/login` | Arabic login screen, title, phone/password fields, submit button | `مرحباً بعودتك` heading, both inputs, submit button |
| SuperAdmin 1 | Super Admin | `/centers` | Four centers, primary center, owner, status, search, “مركز جديد” action | 4 table rows; `مركز النور`; `أ. حسناء عبد الله`; `نشط`; search `النور` returns 1 row and clears back to 4 |
| SuperAdmin 2 | Super Admin | `/subscriptions` | Subscription period, modules count, paid/price, “الاشتراك والوحدات” | 4 rows; `الوحدات`; `المدفوع / السعر`; 4 subscription buttons |
| CenterOwner 9 | Center owner | `/adminDashboard` | Student KPIs, student movement, charts | `لوحة التحكم`; `إجمالي الطلاب` card contains `15`; `حركة الطلاب` |
| CenterOwner 10 | Center owner | `/teachers` | Two teachers, search, add action | 2 rows; `أ. محمد عبد الرحمن`; `أ. سارة إبراهيم`; search `سارة` returns 1 row and clears back to 2 |
| Student 30 | Student | `/student/dashboard` | Student greeting, attendance, dues, performance, exams | `أهلاً، يوسف أحمد محمود`; `نسبة الحضور`; `المتبقي من الرسوم`; `تطور الأداء عبر الزمن`; `امتحانات تنتظرك` |

## Chapter mapping note

The repository does not contain the original 35-chapter numbering document.
The routes above are the concrete Stage B subset requested by the user, using
the existing application routes. They do not claim to be the final numbering
for the full tour.

## E2E data note

The existing `/centers` list counts linked student *user accounts* in its
students column. In the E2E seed only one of the primary center's 15 student
records has a login account, so that column shows `1`. The CenterOwner
dashboard counts the 15 student records and shows `15`. The video asserts the
two surfaces separately. This is existing product behavior, not a tour
workaround, and changing the count is outside Stage B.

## Recording

Start the API only with the official guarded script:

```powershell
.\e2e\scripts\start-api.ps1
```

Run the review video:

```powershell
cd e2e
$env:E2E_ALLOW_RUN = '1'
$env:E2E_VIDEO = 'on'
$env:E2E_SLOWMO = '180'
npm run test:video
```

The video is written under `e2e/test-results/` as `video.webm`. The test also
writes per-chapter screenshots into the same test-results directory.

The successful Stage B review run produced:

- `e2e/artifacts/stage-b-preview/Stage-B-Preview.mp4` — H.264, 1280×720,
  00:01:40.28, no audio.
- `e2e/artifacts/stage-b-preview/video.webm` — VP9, 1280×720,
  00:01:40.28, original Playwright capture.
- `e2e/artifacts/stage-b-preview/chapter-*.png` — six chapter screenshots.

The recording is silent with Arabic captions. The machine only has English SAPI
voices installed, so Arabic narration is not part of this preview. This is
called out so the preview is not mistaken for the final narrated cut.

## Safety

- The API must print
  `[E2E SAFETY] PASS environment=E2E server=(localdb)\MSSQLLocalDB database=CenterManagement_E2E`.
- No production connection string, SMTP password, or JWT secret is used by the
  tour.
- The tour signs in through the real login form; no token or storage injection.
- No Stage C work begins until the video is approved.
