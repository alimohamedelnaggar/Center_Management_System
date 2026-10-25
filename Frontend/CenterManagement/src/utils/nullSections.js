// Helpers for hiding whole sections when a DTO field is null because the
// owning feature module is disabled. A null must hide the section (never show
// 0 / 0%) and must never crash.

/** True when the value is a usable number (not null/undefined/NaN). */
export function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** True when the value is a usable amount (number or numeric string). */
export function hasAmount(value) {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n);
}

/** True when the value is a usable percentage. */
export function hasPercent(value) {
  return hasNumber(value);
}

/** True when the value is a non-empty array. */
export function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

/** Sum of an array of numbers; null when there is nothing to sum. */
export function sumOrNone(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const nums = values.filter(hasNumber);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0);
}

/** Format a currency amount, or null when it should be hidden. */
export function formatAmountOrNone(value, formatter) {
  if (!hasAmount(value)) return null;
  return formatter ? formatter(Number(value)) : Number(value);
}
