# الدفعة 9 — إصلاح `/assistants` والتحقق من قوائم الدفعات 3–7

تم التوليد: 2026-11-15

النتيجة: **إصلاح مؤكد على التطبيق الحقيقي + 10/10 اختبارات دخان للقوائم**.

## 1) العيب (F-036)

`/assistants` كان يعرض الحالة الفارغة «لا يوجد مساعدون بعد» مع وجود صف في الـ API.

- الطلب: `GET /Assistant/Paginated?PageNumber=1&PageSize=6&IsActive=true` (owner).
- الاستجابة: `200`، `succeeded: true`، `data.data.length = 1`، `totalCount = 1`،
  `totalPages = 1`، `pageSize = 6`، و`data.items = undefined`.
- السبب: الصفحة كانت تقرأ `res?.items` بينما هذا الـ endpoint يغلّف الصفوف في
  `Response<PaginatedResult<T>>` أي تحت `data.data`، بينما `/Student/Paginated`
  يستخدم `Response<PagedResult<T>>` (الصفوف تحت `data.items`).
- ليس انحدار إعادة تصميم: السطر نفسه موجود في `ec456e6` و`a826c13`.

## 2) الإصلاح

| الملف | التغيير |
|---|---|
| `src/utils/paginated.js` (جديد) | `normalizePaginated` يقبل `Response<PaginatedResult<T>>` و`Response<PagedResult<T>>` و`PaginatedResult` غير المغلف، ويعيد `{ items, data, totalCount, totalPages, currentPage, pageSize }` |
| `src/services/assistantService.js` | `getPaginated` يمر عبر `normalizePaginated` |
| `src/services/teacherService.js` | نفس التطبيع — يصلح منتقي المدرس في `AssistantModal` الذي كان يقرأ `res?.data?.items` |
| `src/pages/AssistantManagement.jsx` | يقرأ `items`/`totalPages`/`totalCount` من نتيجة الخدمة المطبَّعة، وأضيفت حالة `error` مع `role="alert"` وزر إعادة المحاولة |

لا تغيير في أي منطق أو صلاحية أو عقد API، ولم يُلمس `#receipt-print-root` ولا منطق
الحسابات.

## 3) الاختبارات المضافة

| الاختبار | العدد | النتيجة |
|---|---|---|
| `src/utils/paginated.test.js` | 5 | ناجحة |
| `src/pages/AssistantManagement.paginated.test.jsx` | 2 | ناجحة (جسم الاستجابة منسوخ من استجابة الـ API الحقيقية) |
| `e2e/tests/lists-smoke.spec.js` | 10 | ناجحة |

## 4) التحقق على التطبيق الحقيقي (E2E API + `CenterManagement_E2E`)

المستخدم: owner `01000000002`. القياس آلي عبر Playwright (بدون أرقام هواتف في التقرير).

| المقاس | التخطيط | الصفوف الظاهرة | تمرير أفقي |
|---|---|---|---|
| 360×800 | بطاقات موبايل | بطاقة واحدة (الاسم، الهاتف، 4,500 ج.م، المدرس المرتبط) | 0px |
| 390×844 | بطاقات موبايل | بطاقة واحدة | 0px |
| 768×1024 | جدول | صف واحد + «عرض 1 إلى 1 من 1 مساعد» | 0px |
| 1280×900 | جدول | صف واحد | 0px |
| 1920×1080 | جدول | صف واحد | 0px |
| 844×390 أفقي | جدول | صف واحد | 0px |

حالة الفشل: عند إجهاض الطلب يظهر
«تعذر تحميل المساعدين. تحقق من الاتصال ثم أعد المحاولة.» مع زر «إعادة المحاولة»،
ولا يظهر «لا يوجد مساعدون بعد»؛ وبعد الضغط على الزر يُحمَّل الصف.

اللقطات: `docs/design/shots/phase3b9/` — 14 صورة:
`assistants-after-{360,390,768,1280,1920}-{light,dark}`،
`assistants-after-844x390-landscape-{light,dark}`،
`assistants-error-1280-{light,dark}`.

## 5) مسح القوائم (الدفعات 3–7)

| القائمة | الدور | الـ endpoint | الغلاف | الصفوف / الإجمالي |
|---|---|---|---|---|
| المدرسون | owner | `/Teacher/Paginated` | `Response<PaginatedResult>` | 2 / 2 |
| المساعدون | owner | `/Assistant/Paginated` | `Response<PaginatedResult>` | 1 / 1 |
| المجموعات | owner | `/Group/Paginated` | `PaginatedResult` غير مغلف | 3 / 3 |
| المدفوعات | owner | `/Payments/Paginated` | `PaginatedResult` غير مغلف | 10 / 10 |
| الإيرادات | owner | `/Income/Paginated` | `Response<PaginatedResult>` | 4 / 4 |
| المصروفات | owner | `/Expense/Paginated` | `Response<PaginatedResult>` | 5 / 5 |
| الطلاب | teacher | `/Student/Paginated` | `Response<PagedResult>` | 10 / 10 |
| بنك الأسئلة | teacher | `/QuestionBank/Paginated` | `Response<PaginatedResult>` | 1 / 1 |
| الامتحانات | teacher | `/QuestionExam/Paginated` | `Response<PaginatedResult>` | 2 / 2 |
| المذكرات | teacher | `/StudyNote/Paginated` | `Response<PaginatedResult>` | 1 / 1 |

ملاحظتان (ليستا عيبًا جديدًا):

- `/dashboard` (قائمة الطلاب) مسار `Assistant`/`Teacher` فقط، وكان كذلك قبل إعادة
  التصميم (تحقق `853d066^`)، لذلك فُحصت قائمة الطلاب بحساب المدرس.
- المالك يحصل على `403` من `/QuestionBank/Paginated` و`/QuestionExam/Paginated`
  و`/StudyNote/Paginated`؛ هذه المسارات للمدرس/المساعد بحكم التصميم، فاستُخدم حساب
  المدرس بدل إضعاف التحقق.

## 6) بوابات الجودة

| البوابة | الأمر | النتيجة |
|---|---|---|
| اختبارات الواجهة | `npx vitest run` | **67 ملفًا / 478 اختبارًا — كلها ناجحة** (قبل الإصلاح: 65 / 471) |
| اختبارات الباك | `dotnet test --no-build` | **356 ناجحًا / 0 فاشل** |
| بناء الباك | `dotnet build` | **0 أخطاء** (171 تحذيرًا قائمًا) |
| بناء الواجهة | `npm run build` | **نجح** — `index-h4QGn_f8.js` 3,036.48 kB (819.38 kB gzip)، `index-DnzcNOYV.css` 99.22 kB |
| دخان القوائم | `npx playwright test tests/lists-smoke.spec.js` | **10/10 ناجحة** (57.1s) |

ملاحظة تشغيل: `dotnet build` بالمسار الافتراضي يفشل في نسخ ملفات `CenterManagement.Api`
لأن نسختي الـ API (E2E 7092 والتطوير 7093) قيد التشغيل وتحتجز الـ DLL؛ البناء نجح
بإخراج مؤقت (`-p:OutDir=...`)، و`dotnet test --no-build` أعطى نفس العدد 356.

## 7) ملاحظات بيئة (ليست عيوبًا)

- `Frontend/CenterManagement/.env` الحالي يشير إلى `7093` (وضع التطوير)، وCORS في
  `SerivesCollection.cs` يسمح فقط بـ`http://localhost:5173`، لذلك أُعيد تشغيل Vite على
  5173 مربوطًا بـ7092 أثناء الفحص ثم أُعيد إلى وضعه الأصلي.
- `launchSettings.json` و`src/services/financeService.js` فيهما تعديلات غير ملتزمة
  ليست من هذه الجلسة ولم تُلمس ولم تُضمَّن في الكوميت.
