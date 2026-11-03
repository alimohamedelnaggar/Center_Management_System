# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stage-c-superadmin.spec.js >> Stage C — SuperAdmin (SA-01 … SA-13)
- Location: tests\stage-c-superadmin.spec.js:184:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('div.bg-amber-100').first()
Expected substring: "أ. حسناء عبد الله"
Received string:    "أنت تتصفّح الآن كـ مستخدم (CenterOwner) — تُسجَّل كل العمليات في سجل المراجعة.إنهاء الانتحال"
Timeout: 20000ms

Call log:
  - Expect "toContainText" locator('div.bg-amber-100').first() with timeout 20000ms
  - waiting for locator('div.bg-amber-100').first()
    43 × locator resolved to <div class="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-900">…</div>
       - unexpected value "أنت تتصفّح الآن كـ مستخدم (CenterOwner) — تُسجَّل كل العمليات في سجل المراجعة.إنهاء الانتحال"

```

```yaml
- img
- text: أنت تتصفّح الآن كـ مستخدم (CenterOwner) — تُسجَّل كل العمليات في سجل المراجعة.
- button "إنهاء الانتحال"
```