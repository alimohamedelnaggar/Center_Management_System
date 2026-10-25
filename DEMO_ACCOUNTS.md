# حسابات تجريبية (DEMO ONLY) ⚠️

> **تحذير: هذه الحسابات للتجربة والتطوير فقط. لا تُستخدم في بيئة الإنتاج إطلاقًا.**

يُنشئ `DemoDataSeeder` (في طبقة Infrastructure) حسابات دخول تجريبية لتسهيل تجربة
النظام سريعًا. وهو **معطّل افتراضيًا** ولا يعمل إلا عند تحقق **الشرطين معًا**:

1. أن تكون البيئة `Development`.
2. أن يكون الإعداد `Seed:DemoEnabled = true` مع وجود `Seed:DemoPassword`.

إن لم يُضبط `Seed:DemoPassword`، لا يُنشئ أي حساب ويُسجّل تحذيرًا فقط.

## الحسابات التي تُنشأ

| الدور | رقم الدخول (الهاتف) | الإعداد | الافتراضي |
| --- | --- | --- | --- |
| مدرّس تجريبي | `Seed:DemoTeacherPhone` | `01000000007` |
| طالب تجريبي  | `Seed:DemoStudentPhone` | `01000000008` |

- كلمة مرور الحسابين = قيمة `Seed:DemoPassword` (لا تُخزَّن في المستودع).
- تُنشأ أيضًا مجموعة/مركز تجريبي (اسمه «المركز التجريبي») إن لم يوجد.

## حسابات المنصة (منفصلة)

حسابا المنصة يُنشَآن من `IdentitySeeder` (وليس البذور التجريبية) وفقط عند ضبط
كلمتيهما في الإعدادات:

| الدور | الإعداد (الهاتف) | الإعداد (كلمة المرور) |
| --- | --- | --- |
| SuperAdmin  | `Seed:SuperAdminPhone` (`01000000005`)  | `Seed:SuperAdminPassword`  |
| CenterOwner | `Seed:CenterOwnerPhone` (`01000000006`) | `Seed:CenterOwnerPassword` |

> لا يُنشَأ أي من هذين الحسابين إن لم تُضبط كلمة المرور الخاصة به.

## طريقة التفعيل (user-secrets)

```powershell
cd API\CenterManagementCleanArchitecture\CenterManagement.Api

dotnet user-secrets set "Seed:DemoEnabled" "true"
dotnet user-secrets set "Seed:DemoPassword" "<كلمة-مرور-تجريبية>"
dotnet user-secrets set "Seed:DemoTeacherPhone" "01000000007"
dotnet user-secrets set "Seed:DemoStudentPhone" "01000000008"

rem اختياري: حسابات المنصة
dotnet user-secrets set "Seed:SuperAdminPassword" "<كلمة-مرور>"
dotnet user-secrets set "Seed:CenterOwnerPassword" "<كلمة-مرور>"
```

لإيقاف البذور التجريبية: `dotnet user-secrets remove "Seed:DemoEnabled"` أو اضبطها على `false`.
