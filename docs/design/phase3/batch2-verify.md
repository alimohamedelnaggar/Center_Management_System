# المرحلة 3 — دفعة 2: صفحة الطلاب (أ + ب)

تم التوليد: 2026-11-11T11:14:49.672Z

النتيجة: **ALL PASS** — 66 تشغيلًا: 58 تشغيلًا أساسيًا، 6 تكبير نص 200%، 2 تكبير صفحة 200%.

الحالات: القائمة (جدول على الديسكتوب وكروت على الموبايل)، الفراغ، بحث بلا نتائج، التحميل، لوحة الفلاتر مفتوحة، نافذة الإضافة/التعديل، وبطاقة الطالب.

الأدوار: `/dashboard` محمي في `App.jsx` لـTeacher وAssistant فقط؛ لذلك تُفحص الصفحة كـTeacher (مركز متعدد المدرسين)، وTeacher في مركز فردي (SoloTeacher)، وAssistant. المالك الحقيقي (CenterOwner) لا يصل إلى هذا المسار — `CenterLanding` يوجّهه إلى `/teachers` — فصلاحيته على صفحة الطلاب تُغطَّى بمسار SoloTeacher المكافئ.

النصوص الجديدة: «الفلاتر»، «كل الحالات»، «لا توجد نتائج مطابقة»، «امسح البحث أو الفلاتر لعرض كل الطلاب.»، «مسح الفلاتر»، ووصف aria «ترقيم الصفحات»، «الصفحة السابقة/التالية»، «إغلاق القائمة». النص المتغيّر الوحيد: الترقيم كان «عرض X إلى Y من أصل Z» وأصبح «عرض X إلى Y من Z».

## students-list — list

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | table · 8 headings · 8 cells · pagination=true |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | table · 8 headings · 8 cells · pagination=true |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | table · 8 headings · 8 cells · pagination=true |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | table · 8 headings · 8 cells · pagination=true |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | table · 8 headings · 8 cells · pagination=true |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | table · 8 headings · 8 cells · pagination=true |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | table · 8 headings · 8 cells · pagination=true |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | table · 8 headings · 8 cells · pagination=true |

## students-solo — list

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | table · 8 headings · 8 cells · pagination=true |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | table · 8 headings · 8 cells · pagination=true |

## students-assistant — list

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | 10 cards · 8 headings · 8 cells · pagination=true |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | table · 8 headings · 8 cells · pagination=true |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | table · 8 headings · 8 cells · pagination=true |

## students-empty — empty

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا يوجد طلابجرّب تغيير الفلاتر أو قم بإضاف |

## students-no-results — no-results

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا توجد نتائج مطابقةامسح البحث أو الفلاتر  |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا توجد نتائج مطابقةامسح البحث أو الفلاتر  |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | لا توجد نتائج مطابقةامسح البحث أو الفلاتر  |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | لا توجد نتائج مطابقةامسح البحث أو الفلاتر  |

## students-loading — loading

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | skeleton |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | skeleton |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | skeleton |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | skeleton |

## students-filters — filters

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | filters open |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | filters open |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | filters open |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | filters open |

## students-add-modal — add-modal

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | student-form-modal · 360×800 · submit 44px |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-form-modal · 360×800 · submit 44px |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | student-form-modal · 390×844 · submit 44px |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-form-modal · 390×844 · submit 44px |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | student-form-modal · 512×772 · submit 44px |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-form-modal · 512×772 · submit 44px |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | student-form-modal · 512×768 · submit 44px |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-form-modal · 512×768 · submit 44px |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | student-form-modal · 512×772 · submit 44px |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-form-modal · 512×772 · submit 44px |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | student-form-modal · 512×358 · submit 44px |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-form-modal · 512×358 · submit 44px |

## students-view-modal — view-modal

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | student-view-modal · 390×454 · submit —px |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-view-modal · 390×454 · submit —px |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.75:1 | student-view-modal · 512×454 · submit —px |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.78:1 | student-view-modal · 512×454 · submit —px |

## سلوك العناصر

```json
{
  "pagination": {
    "clickedPageTwo": true,
    "before": "1",
    "after": "2"
  },
  "search": {
    "search": "أحمد"
  },
  "filters": {
    "groupId": "g2",
    "isActive": "false",
    "badge": "الفلاتر2"
  },
  "clearFilters": {
    "search": null,
    "beforeText": "لا توجد نتائج مطابقةامسح البحث أو الفلاتر لعرض كل الطلاب.مسح الفلاتر",
    "restored": true
  },
  "addValidation": {
    "beforeSubmit": {
      "submitTop": 583,
      "submitBottom": 627,
      "viewport": 640,
      "bodyScrolls": true,
      "bodyOverflow": "auto"
    },
    "validation": "إضافة طالب جديداسم الطالباسم الطالب مطلوبرقم الهاتفرقم الهاتف مطلوبهاتف ولي الأمررقم ولي الأمر مطلوبالمجموعة-- اختر المجموعة --مجموعة أمجموعة بمجموعة جاختر المجموعةنوع الاشتراكبالحصةشهريسعر مخصص للطالب (اختياري — للخصومات)استخدمه لو الطالب عنده خصم أو اتفاق خاص (زي الإخوة أو الحالات الصعبة)إلغاءإضافة الطالب",
    "posts": 0
  },
  "addSubmit": {
    "posted": true,
    "stillOpen": false
  },
  "view": {
    "hasName": true,
    "hasPhone": true,
    "closed": true,
    "text": "بيانات الطالبالاسمأحمد عليرقم الهاتف01012345670هاتف ولي الأمر01112345670المجموعةمجموعة أحالة الطالبنشطإغلاق"
  },
  "escape": {
    "closed": true
  },
  "f016": {
    "headings": 8,
    "cells": 8
  }
}
```

## تكبير النص 200%

| الحالة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| students-list | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| students-list | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| students-list | 1440 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| students-list | 1440 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| students-add-modal | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| students-add-modal | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |

## تكبير الصفحة 200% (عرض CSS نصف العرض)

| الحالة | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| students-list | 720px | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| students-list | 720px | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |

## طلبات الـ API المعترضة

إجمالي المسارات المختلفة: 8

```json
{
  "/Api/V1/Authentication/refresh-token": 74,
  "/students/negotiate": 148,
  "/Api/V1/Student/Paginated": 130,
  "/Api/V1/Group/get-all": 111,
  "/Api/V1/Student/stats": 111,
  "/Api/V1/Center/MyCenter": 111,
  "/Api/V1/Profile/GetMyProfile": 111,
  "/Api/V1/Student/Create": 2
}
```

## اللقطات

`docs/design/shots/phase3b2/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.

لا إخفاقات: كل الحالات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، وأزرار النوافذ ثابتة ومرئية حتى على الشاشات القصيرة، والتكبير 200% سليم.

## ملاحظات التشغيل

- pagination probe: pageIndex 1 -> 2
- search probe: debounced request carries search=أحمد
- filters probe: {"groupId":"g2","isActive":"false","badge":"الفلاتر2"}
- clear-filters probe: empty state returns to the full list
- add dialog probe @360x640: submit bottom 627px of 640px, body scrolls=true
- add submit probe: POST https://center-system.runasp.net/Api/V1/Student/Create, dialog closed=true
- view probe: name=true, phone=true, closed=true
- F-016 probe: 8 headings / 8 cells