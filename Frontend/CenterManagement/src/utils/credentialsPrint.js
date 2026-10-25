const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Opens a printable window with one "بيانات الدخول" slip per credential and,
 * when present, a list of students whose account could not be created.
 * Returns false when the popup was blocked.
 */
export function printStudentAccounts({
  credentials = [],
  skipped = [],
  centerName = "",
} = {}) {
  if (typeof window === "undefined") return false;

  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return false;

  const slips = credentials
    .map(
      (credential) => `
      <div class="slip">
        <div class="brand">${escapeHtml(centerName || "بيانات الدخول")}</div>
        <h2>${escapeHtml(credential.studentName)}</h2>
        <table>
          <tr>
            <td>رقم الدخول (الهاتف)</td>
            <td class="ltr">${escapeHtml(credential.username)}</td>
          </tr>
          <tr>
            <td>كلمة المرور المؤقتة</td>
            <td class="ltr code">${escapeHtml(credential.temporaryPassword)}</td>
          </tr>
        </table>
        <p class="note">يجب تغيير كلمة المرور عند أول تسجيل دخول.</p>
      </div>`,
    )
    .join("");

  const skippedHtml = skipped.length
    ? `<section class="skipped">
         <h3>طلاب لم يتم إنشاء حساب لهم (${skipped.length})</h3>
         <ul>${skipped
           .map(
             (item) =>
               `<li>${escapeHtml(item.studentName)} — ${escapeHtml(item.reason)}</li>`,
           )
           .join("")}</ul>
       </section>`
    : "";

  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>بيانات الدخول</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 24px; color: #111827; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .slip { border: 1px dashed #94a3b8; border-radius: 12px; padding: 16px; page-break-inside: avoid; }
    .brand { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
    h2 { margin: 0 0 10px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 6px 0; vertical-align: middle; }
    td:first-child { color: #6b7280; width: 45%; }
    .ltr { direction: ltr; text-align: left; font-family: monospace; font-size: 15px; }
    .code { font-weight: 700; letter-spacing: 1px; }
    .note { margin: 10px 0 0; font-size: 11px; color: #b45309; }
    .skipped { margin-top: 20px; font-size: 13px; }
    .skipped h3 { font-size: 15px; margin: 0 0 8px; }
    .skipped ul { margin: 0; padding: 0 18px; }
    @media print { body { margin: 8mm; } }
  </style>
</head>
<body>
  ${credentials.length ? `<div class="grid">${slips}</div>` : ""}
  ${skippedHtml}
</body>
</html>`);

  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* printing is best-effort */
    }
  }, 350);

  return true;
}
