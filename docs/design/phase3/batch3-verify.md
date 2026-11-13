# المرحلة 3 — دفعة 3: كروت QR، الحسابات، واستيراد Excel

تم التوليد: 2026-11-11T13:38:35.537Z

النتيجة: **ALL PASS** — 96 تشغيلًا: 82 تشغيلًا أساسيًا، 10 تكبير نص 200%، 4 تكبير صفحة 200%.

الحالات: كروت QR (شبكة كاملة + مركز فارغ + نافذة الإرسال)، صفحة أولياء الأمور الجماعية قبل/بعد التشغيل، معالج الاستيراد (الخطوات 1–4)، ونافذة بيانات الدخول لمرة واحدة.

الأدوار: `/qr-cards` محمية لـAssistant/Teacher وتحتاج module `attendance`؛ تُفحص كـTeacher (مركز متعدد المدرسين، module مفعّل). `/bulk-parent-accounts` محمية لـCenterOwner أو Teacher في مركز فردي؛ تُفحص كـCenterOwner. `/dashboard` تُفحص كـTeacher مع `is_center_admin=true` لفتح المعالج وإجراء «إنشاء حساب ولي الأمر».

عقد الطباعة: تُحاكى وسائط `print` عبر CDP بعد الضغط على طباعة كارت واحد/الكل — الكارت المرحّل فقط يظهر، و`.qr-no-print` يختفي، وpadding الجذر يبقى كما هو على الشاشة.

## qr-cards — qr

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | qr · 8 cards · pagination=true |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | qr · 8 cards · pagination=true |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | qr · 8 cards · pagination=true |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | qr · 8 cards · pagination=true |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | qr · 8 cards · pagination=true |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | qr · 8 cards · pagination=true |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |

## qr-empty — qr-empty

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | empty · لا يوجد طلابأضف طلابًا من صفحة الط |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | empty · لا يوجد طلابأضف طلابًا من صفحة الط |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | empty · لا يوجد طلابأضف طلابًا من صفحة الط |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | empty · لا يوجد طلابأضف طلابًا من صفحة الط |

## qr-email-modal — qr-email

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | qr · 8 cards · pagination=true |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 6.15:1 | qr · 8 cards · pagination=true |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | qr · 8 cards · pagination=true |

## bulk-parents — bulk

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | bulk · stats — · 0 cards · table=false |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | bulk · stats — · 0 cards · table=false |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | bulk · stats — · 0 cards · table=false |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | bulk · stats — · 0 cards · table=false |

## bulk-parents-result — bulk-result

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | bulk · stats 2/1/1/4 · 2 cards · table=false |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | bulk · stats 2/1/1/4 · 2 cards · table=false |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.65:1 | bulk · stats 2/1/1/4 · 2 cards · table=false |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | bulk · stats 2/1/1/4 · 2 cards · table=false |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | bulk · stats 2/1/1/4 · 2 cards · table=true |

## import-step1 — import-step1

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | wizard step 1 · 360×599 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 1 · 360×599 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | wizard step 1 · 390×599 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 1 · 390×599 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | wizard step 1 · 736×566 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 1 · 736×566 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | wizard step 1 · 1152×566 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 1 · 1152×566 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | wizard step 1 · 1152×566 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 1 · 1152×566 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.31:1 | wizard step 1 · 812×359 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 1 · 812×359 |

## import-step2 — import-preview

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 2 · 360×800 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | wizard step 2 · 360×800 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 2 · 390×844 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | wizard step 2 · 390×844 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 2 · 736×829 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | wizard step 2 · 736×829 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 2 · 1152×736 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | wizard step 2 · 1152×736 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 2 · 1152×777 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | wizard step 2 · 1152×777 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 2 · 812×359 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.15:1 | wizard step 2 · 812×359 |

## import-step3 — import-options

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | wizard step 3 · 390×844 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 3 · 390×844 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | wizard step 3 · 1152×736 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 3 · 1152×736 |

## import-step4 — import-result

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 4 · 360×497 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 4 · 360×497 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 4 · 390×497 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 4 · 390×497 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.73:1 | wizard step 4 · 1152×382 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | wizard step 4 · 1152×382 |

## accounts-modal — accounts

| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360 (360×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | accounts · 1 credential · 360×595 |
| 360 (360×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | accounts · 1 credential · 360×595 |
| 390 (390×844) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | accounts · 1 credential · 390×572 |
| 390 (390×844) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | accounts · 1 credential · 390×572 |
| 768 (768×1024) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | accounts · 1 credential · 672×424 |
| 768 (768×1024) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | accounts · 1 credential · 672×424 |
| 1280 (1280×800) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | accounts · 1 credential · 672×424 |
| 1280 (1280×800) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | accounts · 1 credential · 672×424 |
| 1920 (1920×1080) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | accounts · 1 credential · 672×424 |
| 1920 (1920×1080) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | accounts · 1 credential · 672×424 |
| land-844 (844×390) | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 4.83:1 | accounts · 1 credential · 672×358 |
| land-844 (844×390) | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 | 5.26:1 | accounts · 1 credential · 672×358 |

## سلوك العناصر

```json
{
  "qrGenerate": {
    "beforeBanner": true,
    "posted": true,
    "after": {
      "banner": false,
      "cards": 8,
      "codes": 8
    }
  },
  "qrPrint": {
    "screenPadding": "24px",
    "screen": {
      "targets": 1,
      "printCalls": 1
    },
    "single": {
      "cards": 8,
      "visibleCards": 1,
      "targetVisible": true,
      "noPrintVisible": 0,
      "rootPadding": "24px",
      "rootPosition": "absolute"
    },
    "all": {
      "cards": 8,
      "visibleCards": 8,
      "targetVisible": false,
      "noPrintVisible": 0,
      "rootPadding": "24px",
      "rootPosition": "absolute"
    }
  },
  "qrEmail": {
    "posted": true,
    "email": "parent@example.com",
    "subject": "كروت حضور الطلاب",
    "messageHasCode": true,
    "closed": true
  },
  "bulk": {
    "body": {
      "skipAlreadyLinked": false,
      "isActive": true
    },
    "cards": 2,
    "hasPassword": true,
    "skippedHasReason": true,
    "excelToast": true,
    "pdf": {
      "opened": true,
      "toast": true
    }
  },
  "importPreview": {
    "before": [
      5,
      5
    ],
    "after": [
      3,
      3
    ],
    "hasPhones": true,
    "filteredValidOut": true,
    "hasSummary": true
  },
  "importCommit": {
    "body": {
      "sessionId": "import-session-1",
      "duplicateMode": "skip",
      "createMissingGroups": false,
      "createStudentAccounts": true,
      "createParentAccounts": true
    },
    "counts": [
      "2",
      "1",
      "1",
      "1"
    ],
    "posts": 1
  },
  "accounts": {
    "visible": true,
    "after": {
      "modalGone": true,
      "domLeak": false,
      "textLeak": false,
      "storage": []
    }
  },
  "console": {
    "entries": 365,
    "leaks": 0
  }
}
```

## تكبير النص 200%

| الحالة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| qr-cards | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| qr-cards | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| qr-cards | 1440 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| qr-cards | 1440 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| bulk-parents-result | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| bulk-parents-result | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| import-step2 | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| import-step2 | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| accounts-modal | 390 | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| accounts-modal | 390 | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |

## تكبير الصفحة 200% (عرض CSS نصف العرض)

| الحالة | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| qr-cards | 720px | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| qr-cards | 720px | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| import-step2 | 720px | light | 0px | 0 | 0 | 0 | 0 | 0 | 0 |
| import-step2 | 720px | dark | 0px | 0 | 0 | 0 | 0 | 0 | 0 |

## طلبات الـ API المعترضة

إجمالي المسارات المختلفة: 13

```json
{
  "/Api/V1/Authentication/refresh-token": 103,
  "/Api/V1/Group/get-all": 157,
  "/Api/V1/Student/Paginated": 129,
  "/Api/V1/Center/MyCenter": 157,
  "/Api/V1/Profile/GetMyProfile": 157,
  "/Api/V1/Student/Create-Parent-Accounts": 24,
  "/students/negotiate": 110,
  "/Api/V1/Student/stats": 83,
  "/Api/V1/Student/Import/Preview": 42,
  "/Api/V1/Student/Import/Commit": 11,
  "/Api/V1/Student/s1/Create-Parent-Account": 23,
  "/Api/V1/Student/generate-qr-codes": 2,
  "/Api/V1/EmailsRoute/SendEmail": 2
}
```

## اللقطات

`docs/design/shots/phase3b3/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.

لا إخفاقات: كل الحالات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، وأزرار النوافذ ثابتة ومرئية حتى على الشاشات القصيرة، والتكبير 200% سليم.

## ملاحظات التشغيل

- QR generate probe: POST https://center-system.runasp.net/Api/V1/Student/generate-qr-, 8/8 codes
- QR print probe: single=1/8, all=8/8, padding 24px, no-print hidden
- QR email probe: email=parent@example.com, subject=كروت حضور الطلاب, closed=true
- bulk probe: body={"skipAlreadyLinked":false,"isActive":true}, cards=2, excel=true, pdf=true
- import preview probe: cards/rows 5/5 -> 3/3 with the errors-only filter
- import commit probe: body={"sessionId":"import-session-1","duplicateMode":"skip","createMissingGroups":false,"createStudentAccounts":true,"createParentAccounts":true}, counts=2,1,1,1
- accounts probe: password visible once, modal gone=true, dom leak=false, storage=0
- console probe: 365 messages, 0 password leak(s)