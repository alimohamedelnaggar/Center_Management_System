export const MONTH_NAMES_AR = {
  1: "يناير",
  2: "فبراير",
  3: "مارس",
  4: "أبريل",
  5: "مايو",
  6: "يونيو",
  7: "يوليو",
  8: "أغسطس",
  9: "سبتمبر",
  10: "أكتوبر",
  11: "نوفمبر",
  12: "ديسمبر",
};

export function getMonthLabel(month) {
  return MONTH_NAMES_AR[Number(month)] || month;
}

export function formatMonthYear(month, year) {
  return `${getMonthLabel(month)} ${year}`;
}

// dd/MM/yyyy
export function formatShortDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}/${date.getFullYear()}`;
}

export function currentMonthKey() {
  const now = new Date();

  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

// قائمة الأشهر المتاحة للاختيار:
// كل أشهر السنة الحالية + كل أشهر السنة التالية
export function getMonthOptions() {
  const options = [];

  const now = new Date();

  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  for (let year = currentYear; year <= nextYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      options.push({
        value: `${year}-${month}`,
        label: formatMonthYear(month, year),
      });
    }
  }

  return options;
}

export function parseMonthKey(value) {
  const [year, month] = String(value || "")
    .split("-")
    .map(Number);

  const now = new Date();

  return {
    month: month || now.getMonth() + 1,
    year: year || now.getFullYear(),
  };
}
