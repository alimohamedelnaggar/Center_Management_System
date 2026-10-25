import * as XLSX from "xlsx";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Builds the row list for the "all students / all parents" credentials files.
 * `rows` is the backend `all` array; every student is present, and only the
 * accounts created during this run carry a temporary password.
 */
function toRows(rows, { phoneKey, usernameKey }) {
  return rows.map((item, index) => ({
    index: index + 1,
    studentName: item.studentName || "-",
    groupName: item.groupName || "-",
    phone: item[phoneKey] || item.phone || "-",
    username: item[usernameKey] || item[phoneKey] || "-",
    password: item.passwordChanged
      ? "تم تغييرها"
      : item.temporaryPassword || "-",
  }));
}

/** Downloads the credentials as an Excel sheet (one row per student). */
export function exportCredentialsToExcel({
  rows = [],
  phoneKey = "phone",
  usernameKey = "username",
  title = "بيانات الدخول",
  phoneLabel = "رقم الهاتف",
  centerName = "",
  fileName = "بيانات_الدخول",
} = {}) {
  if (!rows.length) return false;

  const data = toRows(rows, { phoneKey, usernameKey }).map((row) => ({
    "م": row.index,
    "اسم الطالب": row.studentName,
    "المجموعة": row.groupName,
    [phoneLabel]: row.phone,
    "رقم الدخول": row.username,
    "كلمة المرور المؤقتة": row.password,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  const info = XLSX.utils.aoa_to_sheet([
    [title],
    ["المركز", centerName || "-"],
    ["تاريخ التقرير", new Date().toLocaleDateString("ar-EG")],
    ["كلمة المرور المؤقتة ستُطلب منك تغييرها عند أول دخول"],
    [],
  ]);

  XLSX.utils.book_append_sheet(workbook, info, "معلومات التقرير");
  XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الدخول");

  XLSX.writeFile(
    workbook,
    `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );

  return true;
}

/** Opens a printable window (PDF via print dialog) with every student's credentials. */
export function printCredentials({
  rows = [],
  phoneKey = "phone",
  usernameKey = "username",
  title = "بيانات الدخول",
  phoneLabel = "رقم الهاتف",
  centerName = "",
  win: preOpenedWindow = null,
} = {}) {
  if (typeof window === "undefined") return false;

  const win =
    preOpenedWindow ?? window.open("", "_blank", "width=1000,height=900");
  if (!win) return false;

  const data = toRows(rows, { phoneKey, usernameKey });

  const body = data.length
    ? data
        .map(
          (row) => `
        <tr>
          <td>${row.index}</td>
          <td>${escapeHtml(row.studentName)}</td>
          <td>${escapeHtml(row.groupName)}</td>
          <td class="ltr">${escapeHtml(row.phone)}</td>
          <td class="ltr">${escapeHtml(row.username)}</td>
          <td class="ltr code">${escapeHtml(row.password)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="empty">لا يوجد طلاب في هذا التقرير</td></tr>`;

  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 24px; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: right; }
    th { background: #f3f4f6; font-weight: 700; }
    .ltr { direction: ltr; text-align: left; font-family: monospace; }
    .code { font-weight: 700; letter-spacing: 1px; }
    .empty { text-align: center; color: #6b7280; padding: 16px; }
    .note { margin: 14px 0 0; font-size: 12px; color: #b45309; }
    @media print {
      body { margin: 8mm; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(centerName || title)}</h1>
  <div class="meta">${escapeHtml(title)} — ${escapeHtml(new Date().toLocaleDateString("ar-EG"))}</div>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>اسم الطالب</th>
        <th>المجموعة</th>
        <th>${escapeHtml(phoneLabel)}</th>
        <th>رقم الدخول</th>
        <th>كلمة المرور المؤقتة</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  <p class="note">اسم المستخدم وكلمة المرور المؤقتة هما رقم الهاتف، وستُطلب منك تغييرها عند أول دخول. «تم تغييرها» تعني أن الحساب اختار كلمة مرور دائمة.</p>
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

/**
 * Exports one report as both files: downloads the Excel sheet and opens the
 * printable PDF view.
 */
export function exportBothFormats(options) {
  let excel = false;
  let pdf = false;

  try {
    excel = exportCredentialsToExcel(options);
  } catch {
    excel = false;
  }

  try {
    pdf = printCredentials(options);
  } catch {
    pdf = false;
  }

  return { excel, pdf };
}
