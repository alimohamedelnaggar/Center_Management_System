# المرحلة 4 — تقرير القبول (حقول الكارت · Rate Limiting · الاختبارات · الحزمة)

تاريخ التوليد: 2026-11-10

## 1) تطابق حقول كارت الطالب مع `HEAD`

تم استخراج كل الحقول التي يقرأها المكوّن آليًا من نسخة `HEAD` ومن شجرة العمل، ثم مقارنتها:

```powershell
git show HEAD:Frontend/CenterManagement/src/pages/PublicPages/StudentCardLookupPage.jsx
# استخراج: card.* | summary.* | item.* | exam.* | component.*
```

| القياس | `HEAD` | شجرة العمل |
| --- | --- | --- |
| عدد الحقول/المسارات المختلفة | 32 | 32 |
| فروق المقارنة (`Compare-Object`) | — | **0** |

النتيجة: **لا حقل حُذف ولا حقل أُضيف إلى جسم الكارت**. القائمة متطابقة حرفيًا:
`card.fullName, card.groupName, card.parentPhone, card.qrCode, card.school, card.subscriptionType,
summary.totalSessions, summary.presentSessions, summary.absentSessions, summary.lateSessions,
summary.excusedSessions, summary.attendanceRate, item.sessionId, item.groupName, item.attendanceDate,
item.dayName, item.startTime, item.endTime, item.status, item.statusLabel, exam.examId, exam.examName,
exam.examDate, exam.groupName, exam.isAbsent, exam.isLowGrade, exam.percentage, exam.components,
component.typeLabel, component.mark, component.totalMark, component.isAbsent`

### الإضافة الوحيدة: هوية المركز في الهيدر

البيانات المعروضة لم تتغير، لكن هيدر الكارت أصبح يعرض اسم/لوجو **مركز الطالب** بدل لوجو المنصة:

| الطبقة | التغيير |
| --- | --- |
| `StudentCardDTO` | `CenterName`, `CenterLogoUrl` (nullable) |
| `GetStudentCardQueryHandler` | تحميل `Center.Name`/`Center.LogoUrl` عبر `student.CenterId` |
| `StudentCardLookupPage` | `CenterBadge` + اسم المركز في `<h1>`، وإزالة `/logo.png`، بديل `Building2` عند غياب اللوجو |

عند `CenterId = null` (طالب قديم/عام) يبقى الهيدر بالعنوان العام «كارت الطالب» بلا لوجو منصة.

## 2) Rate Limiting الفعلي

| المسار | الحماية | الحدود |
| --- | --- | --- |
| `StudentCard/by-code/{code}` | **لا يوجد** | — |
| تسجيل الدخول (`AuthenticationController`) | `[SignInRateLimited]` | IP: **20/دقيقة** · معرّف الحساب: **5/دقيقة** |
| الاستعادة (`ConfirmEmailController`, `ManagePasswordController`) | `[RecoveryRateLimited]` | IP: **20/دقيقة** · المعرّف: **10/دقيقة** |

- النافذة: `FixedWindow` مدتها **60 ثانية** (`RateLimiting:SignIn:WindowSeconds` / `RateLimiting:Recovery:WindowSeconds`).
- الرفض: **HTTP 429** + ترويسة `Retry-After` + رسالة عربية موحّدة.
- يمكن تعطيلها في بيئة E2E عبر `RateLimiting:SignIn:Enabled=false`؛ الافتراضي مُفعّل.
- `StudentCardController` عليه `[AllowAnonymous]` و`[SelfModuleChecked]` فقط، ولا يوجد أي limiter على مستوى الـendpoint أو الـmiddleware.

**الخلاصة:** افتراض وجود Rate Limiting على كارت الطالب غير صحيح في الكود الحالي. الكارت العام قابل للتعداد بالكود، ويُنصح بإضافة limiter مستقل (مثلاً IP 30/دقيقة + كود 10/دقيقة) كبند باكندي منفصل؛ **لم يُنفّذ الآن** التزامًا بقيد «لا Endpoints/Migrations في هذه المرحلة».

## 3) الاختبارات

| البند | قبل | بعد |
| --- | --- | --- |
| ملفات الاختبار | 44 | **47** (+3) |
| الاختبارات | 360 | **380** (+20) |
| إخفاقات | 0 | **0** |

الملفات المضافة:

- `src/components/Auth/LoginComponent/Login.integration.test.jsx` — 6 اختبارات (تحقق الحقول، الهاتف غير الصحيح، إظهار/إخفاء كلمة المرور، تبديل الثيم، خطأ الباك، التوجيه بعد النجاح).
- `src/pages/PublicPages/StudentCardLookupPage.integration.test.jsx` — 6 اختبارات (الحقول كلها + هوية المركز، بديل اللوجو، كود غير موجود، فشل شبكة، استخراج الكود من رابط QR، منع البحث الفارغ).
- `src/pages/AdminDashboard.integration.test.jsx` — 8 اختبارات (الهيرو، البانر بكل الإشارات ودون مدفوعات، إخفاء البانر، تعطيل الحضور، تعطيل المدفوعات، تغيير الشهر، تسميات أفقية + tooltip، `tickInterval`).

## 4) الفحص البصري الآلي

`node docs/design/phase4-verify.mjs` → **ALL PASS**

| البند | العدد |
| --- | --- |
| إجمالي التشغيلات | 72 |
| تشغيلات أساسية (9 مقاسات × 2 وضع × 3 صفحات) | 54 |
| تكبير نص 200% | 10 |
| تكبير صفحة 200% | 8 |
| صفحات | login 18 · student-card 18 · dashboard 18 |

- كل المقاسات 360→2560 + أفقي 844×390 + 360×640 + **360×420 (لوحة المفاتيح)**: تمرير أفقي `0px`، خارج الشاشة `0`، أهداف لمس `<44` = `0`، نص مقطوع `0`، تراكب `0`، تباين ≥ AA.
- الدخول: زر الإرسال داخل الشاشة دائمًا — `517/640` عند 360×640، `353/420` عند 360×420، `313/390` أفقي — وبلا تمرير رأسي (`overflowY = 0`).
- 1280×800: أُصلح فيض رأسي 37px كان سببه طول عمود الهوية، وأصبح `overflowY = 0`.
- تسميات الأشهر: 6 تكات عند عرض `<720px` و12 عند `≥720px`، كلها أفقية (لا `rotate`)، وأصغر خط 12px.
- tooltip يفتح بالنقرة واللمس، ويظهر تفاصيل الشهر.
- التفاصيل الكاملة والجداول: `docs/design/phase4/phase4-verify.md`، واللقطات في `docs/design/shots/phase4/`.

## 5) الحزمة (`npm run build`)

| المخرج | قبل | بعد | الفرق |
| --- | --- | --- | --- |
| CSS | 101.86 kB | 103.49 kB (gzip 17.75) | +1.63 kB |
| JS | 3022.86 kB | 3023.67 kB (gzip 810.53) | +0.81 kB |

البناء ناجح. الحزمة ما زالت أحادية وكبيرة؛ **لم تُعالج الآن**، ويُقترح بند منفصل: `manualChunks` + تحميل كسول للرسوم/الصفحات الثقيلة (recharts/qrcode) لخفض JS الأولي.

## 6) اللقطات المرجعية

- الدخول: `docs/design/shots/phase4/login-360k-light.png` (لوحة مفاتيح 360×420)، `login-360s-light.png` و`login-land-844-light.png` (فورم أولًا، شريط هوية مضغوط، بلا تمرير).
- كارت الطالب: `docs/design/shots/phase4/student-card-360-light.png` (هوية المركز).
- الداشبورد: `docs/design/shots/phase4/dashboard-360-light.png` و`dashboard-1920-light.png` (تسميات أفقية)، ولقطتا tooltip.
