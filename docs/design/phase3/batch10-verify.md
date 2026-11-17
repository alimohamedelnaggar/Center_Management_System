# المرحلة 3 — دفعة 10: المراكز والاشتراكات والمنصة وسجل المراجعة

تم التوليد: 2026-11-17T12:19:32.188Z

النتيجة: **ALL PASS** — 242 تشغيلًا: 220 تشغيلًا أساسيًا، 16 تكبير نص 200%، 6 تكبير صفحة 200%.

الحالات: إدارة المراكز (قائمة/فراغ/خطأ)، الاشتراكات (قائمة/منتهية وسماح/خطأ)، إحصائيات المنصة (قائمة/خطأ)، سجل المراجعة (قائمة/خطأ)، ثم إعادة توجيه /admin إلى /centers. دور واحد: SuperAdmin بصلاحيات كاملة واشتراك فعّال.

تُفحص كل شاشة على 360/390/768/1024/1280/1440/1920/2560 وأفقيًا 844×390 و640×360، فاتحًا وليليًا، مع تدقيق التمرير الأفقي وأهداف اللمس 44px ونص 14px والقطع والتراكب والتباين والخطوط المحلية، إضافة إلى ثبات ملفات التصدير/الطباعة.

## بوابات الجودة

| البوابة | الأمر | النتيجة |
| --- | --- | --- |
| اختبارات الوحدة | `npx vitest run` من `Frontend/CenterManagement` | 74 files (72 passed / 2 failed); 505 tests passed / 3 failed — all 3 from user-owned modules.js grades removal; batch10 suite 8/8 |
| بناء الإنتاج | `npm run build` | passed — JS 3,066.99 kB / 824.52 kB gzip, CSS 100.05 kB |
| اختبارات الباك | `dotnet test --no-build` | 356 passed / 0 failed |
| دخان E2E | `npm run test:smoke` + `npm run test:lists` | role-login 1/1; lists 23/23 on final rerun (official CenterManagement_E2E API) |
| طباعة/CSV (انحدار الدفعة 9) | فحص batch9 مضيّق | batch9 narrow ALL PASS: BOM [239,187,191], download intact, print .no-print hidden, overflowX 0 |

## ملخص المصفوفة

المقاسات (10): 360، 390، 768، 1024، 1280، 1440، 1920، 2560، land-844، land-640. الوضعان: light / dark. الحالات المطلوبة: 11.

| الحالة | المسار | المقاسات | التشغيلات الأساسية |
| --- | --- | --- | --- |
| centers | `/centers` | 10 | 20 |
| centers-empty | `/centers` | 10 | 20 |
| centers-error | `/centers` | 10 | 20 |
| subscriptions | `/subscriptions` | 10 | 20 |
| subscriptions-expired | `/subscriptions` | 10 | 20 |
| subscriptions-error | `/subscriptions` | 10 | 20 |
| platform | `/platform` | 10 | 20 |
| platform-error | `/platform` | 10 | 20 |
| audit | `/audit-log` | 10 | 20 |
| audit-error | `/audit-log` | 10 | 20 |
| admin-redirect | `/admin` | 10 | 20 |

## centers — centers

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |

## centers-empty — centers-empty

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · empty |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | centers · empty |

## centers-error — centers-error

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | error |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |

## subscriptions — subscriptions

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |

## subscriptions-expired — subscriptions-expired

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | 0 | subscriptions · 4 |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | subscriptions · 4 |

## subscriptions-error — subscriptions-error

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | error |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |

## platform — platform

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | 0 | stats · 18 |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 8.1:1 | 0 | stats · 18 |

## platform-error — platform-error

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.29:1 | 0 | error |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |

## audit — audit

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | audit · 4 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | audit · 4 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | 0 | audit · 4 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | audit · 4 |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | audit · 4 |

## audit-error — audit-error

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | 0 | error |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | 0 | error |

## admin-redirect — admin-redirect

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | تسريب كونسول | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1024 (1024×768) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1024 (1024×768) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1440 (1440×900) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1440 (1440×900) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| 2560 (2560×1440) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| 2560 (2560×1440) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |
| land-640 (640×360) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.7:1 | 0 | centers · 4 |
| land-640 (640×360) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | 0 | centers · 4 |

## فحوصات سلوكية

```json
{
  "exportsUnchanged": {
    "checked": [
      "Frontend/CenterManagement/src/pages/CenterReportsPage.jsx",
      "Frontend/CenterManagement/src/components/common/PrintableReport.jsx",
      "Frontend/CenterManagement/src/utils/export.js",
      "Frontend/CenterManagement/src/services/financeService.js",
      "Frontend/CenterManagement/src/components/common/PaymentReceiptModal.jsx",
      "Frontend/CenterManagement/src/utils/qrCode.js",
      "Frontend/CenterManagement/src/utils/exportToExcel.js",
      "Frontend/CenterManagement/src/pages/QuestionExamPages/ExamPaperPrintPage.jsx",
      "Frontend/CenterManagement/src/pages/StudentPages/StudentQrCardsPage.jsx"
    ],
    "userOwned": [
      "Frontend/CenterManagement/src/services/financeService.js"
    ],
    "changed": [
      "Frontend/CenterManagement/src/services/financeService.js"
    ],
    "userOwnedChanged": [
      "Frontend/CenterManagement/src/services/financeService.js"
    ],
    "batch10Changed": [],
    "gitError": null,
    "note": "financeService.js was already modified before batch 10; it is user-owned and must not be attributed to or reverted by this harness."
  },
  "printBatch10": {
    "screenOverflowX": 0,
    "noPrint": 3,
    "noPrintHidden": true,
    "overflowX": 0,
    "dir": "rtl",
    "table": true
  }
}
```

## فحص الطباعة (batch 10)

```json
{
  "screenOverflowX": 0,
  "noPrint": 3,
  "noPrintHidden": true,
  "overflowX": 0,
  "dir": "rtl",
  "table": true
}
```

تُحاكى الطباعة بـ `Emulation.setEmulatedMedia({media:'print'})` بعد عرض /centers بمقاس 390 فاتح؛ يُفحص إخفاء عناصر `.no-print` وعدم زيادة التمرير الأفقي، ثم تُلتقط لقطة وتُعاد الوسيط إلى `screen`.

## ثبات ملفات التصدير/الطباعة

فُحصت 9 مسارًا عبر `git diff --name-only HEAD`.

```json
{
  "checked": [
    "Frontend/CenterManagement/src/pages/CenterReportsPage.jsx",
    "Frontend/CenterManagement/src/components/common/PrintableReport.jsx",
    "Frontend/CenterManagement/src/utils/export.js",
    "Frontend/CenterManagement/src/services/financeService.js",
    "Frontend/CenterManagement/src/components/common/PaymentReceiptModal.jsx",
    "Frontend/CenterManagement/src/utils/qrCode.js",
    "Frontend/CenterManagement/src/utils/exportToExcel.js",
    "Frontend/CenterManagement/src/pages/QuestionExamPages/ExamPaperPrintPage.jsx",
    "Frontend/CenterManagement/src/pages/StudentPages/StudentQrCardsPage.jsx"
  ],
  "userOwned": [
    "Frontend/CenterManagement/src/services/financeService.js"
  ],
  "changed": [
    "Frontend/CenterManagement/src/services/financeService.js"
  ],
  "userOwnedChanged": [
    "Frontend/CenterManagement/src/services/financeService.js"
  ],
  "batch10Changed": [],
  "gitError": null,
  "note": "financeService.js was already modified before batch 10; it is user-owned and must not be attributed to or reverted by this harness."
}
```

## تكبير النص 200%

| الحالة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| centers | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| centers | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| centers | 1440 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| centers | 1440 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| centers-error | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| centers-error | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| subscriptions | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| subscriptions | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| subscriptions-expired | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| subscriptions-expired | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| platform | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| platform | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| audit | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| audit | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| admin-redirect | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| admin-redirect | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |

## تكبير الصفحة 200% (عرض CSS نصف العرض)

| الحالة | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| centers | 720px | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| centers | 720px | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| subscriptions | 720px | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| subscriptions | 720px | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| platform | 720px | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| platform | 720px | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |

## طلبات الـ API المعترضة

إجمالي المسارات المختلفة: 7

```json
{
  "/Api/V1/Authentication/refresh-token": 243,
  "/Api/V1/Center/Paginated": 144,
  "/Api/V1/Center/MyCenter": 376,
  "/Api/V1/Profile/GetMyProfile": 376,
  "/Api/V1/Center/Subscriptions": 100,
  "/Api/V1/Platform/Statistics": 72,
  "/Api/V1/AuditLogs/Paginated": 63
}
```

## وحدة التحكم

سجلت 729 رسالة، والتسريبات الحساسة 0، واستثناءات الصفحة 0.

## اللقطات

`docs/design/shots/phase3b10/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة)، ولقطات تكبير النص والصفحة 200% ولقطة الطباعة `phase3b10-print-390-light.png`.

## حدود الفحص الآلي

- **لا SQL Server حقيقي.** كل الشاشات تقرأ استجابات معترضة بـ fixtures؛ الأرقام الكبيرة والأسماء الطويلة وحالات الفراغ والخطأ اصطناعية لاختبار العرض.
- **لا شبكة إنتاجية.** كل طلبات الـ API معترضة؛ لا قياس لزمن الاستجابة أو سلوك إعادة المحاولة الحقيقي.
- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.
- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.
- **لا طابعة حقيقية.** الطباعة مُحاكاة بـ `Emulation.setEmulatedMedia`؛ يُفحص إخفاء `.no-print` وثبات العرض الأفقي، لا شكل الورقة الفعلي.
- **لا قارئ شاشة حقيقي.** تُفحص دلالات DOM (dir، aria-label، tabindex،-heading) فقط؛ لا إعلان فعلي لقارئ الشاشة.
- **الإشعارات الحيّة غير مقاسة.** SignalR معترض؛ لا يصل إشعار جديد أثناء التشغيل.
- **أزرار المودالات لم تُختبر في هذه الأداة.** فُحصت في اختبارات التكامل `batch10SuperAdmin.test.jsx` (تأكيد الإيقاف، كلمة المرور المؤقتة، التجديد والتعديل)؛ لم تُخترع مُحددات جديدة هنا.

لا إخفاقات: كل الحالات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، والتكبير 200% سليم.
