# الدفعة 9 — إصلاح `/assistants` والتحقق من قوائم الدفعات 3–8

تم التوليد: 2026-11-16

النتيجة: **إصلاح مؤكد على التطبيق الحقيقي + 17/17 اختبارات دخان للقوائم**.

## 1) العيب (F-036)

`/assistants` كان يعرض الحالة الفارغة «لا يوجد مساعدون بعد» مع وجود صف في الـ API.

- الطلب: `GET /Assistant/Paginated?PageNumber=1&PageSize=6&IsActive=true` (owner).
- الاستجابة: `200`، `succeeded: true`، `data.data.length = 1`، `totalCount = 1`،
  `totalPages = 1`، `pageSize = 6`، و`data.items = undefined`.
- السبب: الصفحة كانت تقرأ `res?.items` بينما هذا الـ endpoint يغلّف الصفوف في
  `Response<PaginatedResult<T>>` أي تحت `data.data`، بينما `/Student/Paginated`
  يستخدم `Response<PagedResult<T>>` (الصفوف تحت `data.items`).
- ليس انحدار إعادة تصميم: السطر نفسه موجود في `ec456e6` و`a826c13`.

**ما ليس السبب (تم فحصه صراحةً):**

- **الفلتر الافتراضي:** الصفحة تمرّر `IsActive = true` منذ ما قبل إعادة التصميم ولا
  يوجد في الواجهة مفتاح لعرض غير النشطين. لكن `/Assistant/Salary-Status` (تبويب سجل
  المرتبات) يطبّق نفس شرط `x.IsActive` في الباك، فلو كان المساعد غير نشط لاختفى من
  التبويبين معًا؛ لا يفسّر ظهوره في سجل المرتبات.
- **نطاق المدرس:** `AssistantController` محمي بـ`AppPolicies.CenterAdmin`، والمستودع
  يفلتر بـ`CenterId` فقط (`AssistantRepository`)، و`TeacherId` يأتي من جسم الطلب ولا
  يُستنتج من هوية المستدعي (`AddAssistantCommandHandler`: `TeacherId = request.TeacherId`).
  و`/assistants` مسار `CenterOwner` + `allowSoloTeacher`، فمدرّس المركز متعدد المدرسين
  لا يصل للصفحة ولا للـ endpoint.
- **الحالة أثناء التحميل/الخطأ:** التحميل كان ولا يزال يعرض `Spinner`، والحالة الفارغة
  كانت تُعرض فقط بعد انتهاء الطلب — أي أن الخطأ (نجاح/فشل بلا صفوف) كان يظهر كفراغ.

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
| `e2e/tests/lists-smoke.spec.js` | 17 | ناجحة |

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

## 5) مسح القوائم (الدفعات 3–8)

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

بوابتا الدفعة 8 تعرضان قوائمهما كبطاقات في كل المقاسات (لا جدول سطح مكتب في
`/student/notes` و`/parent/dashboard`)، لذلك يُعدّ الاختبار بطاقة واحدة لكل صف:

| القائمة | الدور | الـ endpoint | الشكل | الصفوف / الإجمالي |
|---|---|---|---|---|
| مدفوعات الطالب | student | `/StudentPortal/Payments` | `{ totalPaid, payments[] }` | 2 / 2 |
| نتائج الطالب | student | `/StudentPortal/Results` | مصفوفة مباشرة | 1 / 1 |
| حضور الطالب | student | `/StudentPortal/Attendance` | `{ records[] }` | 6 / 6 |
| مذكرات الطالب | student | `/StudentPortal/Notes` | مصفوفة مباشرة | 1 / 1 |
| إشعارات الطالب | student | `/StudentPortal/Notifications` | `Response<PaginatedResult>` | 3 / 3 |
| أبناء ولي الأمر | parent | `/ParentPortal/Children` | مصفوفة مباشرة | 2 / 2 |
| إشعارات ولي الأمر | parent | `/ParentPortal/Notifications` | `Response<PaginatedResult>` | 3 / 3 |

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
| دخان القوائم | `npx playwright test tests/lists-smoke.spec.js` | **17/17 ناجحة** (2.6m) |

ملاحظة تشغيل: `dotnet build` بالمسار الافتراضي يفشل في نسخ ملفات `CenterManagement.Api`
طالما نسختا الـ API (E2E 7092 والتطوير 7093) قيد التشغيل وتحتجز الـ DLL؛ في تلك الحالة
يُستخدم `-p:OutDir` مؤقت مع `dotnet test --no-build`. الأفضل إيقاف النسختين قبل بناء
`CenterManagement.Api`: في 2026-11-16 تسبّب بناء/اختبار سابق أثناء تشغيلهما في إعادة
كتابة تجميعة تحت التشغيل، فانهارت النسختان بـ`0xC0000006` (in-page error) عند أول طلب.
أُعيد البناء (`0 أخطاء`) ثم أُعيد تشغيل API الـE2E على 7092، وعادت كل الاستجابات 200.

## 7) ملاحظات بيئة (ليست عيوبًا)

- `Frontend/CenterManagement/.env` الحالي يشير إلى `7093` (وضع التطوير)، وCORS في
  `SerivesCollection.cs` يسمح فقط بـ`http://localhost:5173`، لذلك أُعيد تشغيل Vite على
  5173 مربوطًا بـ7092 أثناء الفحص ثم أُعيد إلى وضعه الأصلي.
- `launchSettings.json` و`src/services/financeService.js` فيهما تعديلات غير ملتزمة
  ليست من هذه الجلسة ولم تُلمس ولم تُضمَّن في الكوميت.
