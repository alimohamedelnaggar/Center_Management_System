import * as XLSX from "xlsx";

const STATUS = {
  CREATED: "تم إنشاء الحساب",
  LINKED: "تم الربط بحساب موجود",
  SKIPPED: "لم يتم الإنشاء",
};

/**
 * Flattens the three buckets of a bulk run into one printable/exportable list.
 * Created accounts come first, then the reused ones, then the skipped students.
 */
export function flattenParentAccounts({ created = [], linked = [], skipped = [] } = {}) {
  return [
    ...created.map((item) => ({
      studentId: item.studentId,
      studentName: item.studentName,
      groupName: item.groupName,
      parentPhone: item.parentPhone,
      username: item.username,
      temporaryPassword: item.temporaryPassword,
      passwordChanged: false,
      status: STATUS.CREATED,
      reason: "",
    })),
    ...linked.map((item) => ({
      studentId: item.studentId,
      studentName: item.studentName,
      groupName: item.groupName,
      parentPhone: item.parentPhone,
      username: item.username,
      temporaryPassword: "",
      passwordChanged: !!item.passwordChanged,
      status: STATUS.LINKED,
      reason: "",
    })),
    ...skipped.map((item) => ({
      studentId: item.studentId,
      studentName: item.studentName,
      groupName: item.groupName,
      parentPhone: item.parentPhone,
      username: "",
      temporaryPassword: "",
      passwordChanged: false,
      status: STATUS.SKIPPED,
      reason: item.reason,
    })),
  ];
}

/** Downloads the bulk-run result as an Excel sheet (one row per student). */
export function exportParentAccountsToExcel(
  { created = [], linked = [], skipped = [], centerName = "" } = {},
  fileName = "حسابات_أولياء_الأمور",
) {
  const rows = flattenParentAccounts({ created, linked, skipped });

  if (!rows.length) return false;

  const formattedData = rows.map((item, index) => ({
    "م": index + 1,
    "اسم الطالب": item.studentName,
    "المجموعة": item.groupName || "-",
    "رقم هاتف ولي الأمر": item.parentPhone || "-",
    "رقم الدخول": item.username || "-",
    "كلمة المرور المؤقتة": item.passwordChanged
      ? "تم تغييرها"
      : item.temporaryPassword || "-",
    "الحالة": item.status,
    "السبب": item.reason || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();

  const info = XLSX.utils.aoa_to_sheet([
    ["حسابات دخول أولياء الأمور"],
    ["المركز", centerName || "-"],
    ["تاريخ التقرير", new Date().toLocaleDateString("ar-EG")],
    ["كلمة المرور المؤقتة ستُطلب منك تغييرها عند أول دخول"],
    [],
  ]);

  XLSX.utils.book_append_sheet(workbook, info, "معلومات التقرير");
  XLSX.utils.book_append_sheet(workbook, worksheet, "حسابات أولياء الأمور");

  XLSX.writeFile(
    workbook,
    `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );

  return true;
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Opens a printable window (PDF via the browser's print dialog) holding the
 * whole bulk-run result: the new credentials, the reused accounts and the
 * students that were skipped. Returns false when the popup was blocked.
 */
export function printParentAccounts({
  created = [],
  linked = [],
  skipped = [],
  centerName = "",
} = {}) {
  if (typeof window === "undefined") return false;

  const win = window.open("", "_blank", "width=1000,height=900");
  if (!win) return false;

  const rows = flattenParentAccounts({ created, linked, skipped });

  const bodyRows = rows.length
    ? rows
        .map(
          (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.studentName)}</td>
          <td>${escapeHtml(item.groupName || "-")}</td>
          <td class="ltr">${escapeHtml(item.parentPhone || "-")}</td>
          <td class="ltr">${escapeHtml(item.username || "-")}</td>
          <td class="ltr code">${escapeHtml(
            item.passwordChanged
              ? "تم تغييرها"
              : item.temporaryPassword || "-",
          )}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(item.reason || "-")}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="8" class="empty">لا يوجد طلاب في هذا التقرير</td></tr>`;

  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>حسابات دخول أولياء الأمور</title>
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
  <h1>${escapeHtml(centerName || "حسابات دخول أولياء الأمور")}</h1>
  <div class="meta">تاريخ التقرير: ${escapeHtml(new Date().toLocaleDateString("ar-EG"))}</div>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>اسم الطالب</th>
        <th>المجموعة</th>
        <th>رقم هاتف ولي الأمر</th>
        <th>رقم الدخول</th>
        <th>كلمة المرور المؤقتة</th>
        <th>الحالة</th>
        <th>السبب</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="note">اسم المستخدم وكلمة المرور المؤقتة هما رقم هاتف ولي الأمر، وستُطلب منك تغييرها عند أول دخول. «تم تغييرها» تعني أن الحساب اختار كلمة مرور دائمة.</p>
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
