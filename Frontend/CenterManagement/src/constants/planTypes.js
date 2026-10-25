// Single source of truth for CENTER subscription plan types (SubscriptionPlanType
// on the backend). Every screen that shows or edits a center's plan must read from
// here so the numbering can never drift from the server enum again.
//
// NOTE: this is NOT the student billing type (Session/Month). That one lives in
// ./studentSubscriptionType.js and has unrelated numbering.

export const PLAN_TYPES = [
  { name: "Monthly", number: 1, label: "شهري", color: "#2563eb", isTrial: false, months: 1 },
  { name: "Quarterly", number: 2, label: "ربع سنوي", color: "#0d9488", isTrial: false, months: 3 },
  { name: "SemiAnnual", number: 3, label: "نصف سنوي", color: "#7c3aed", isTrial: false, months: 6 },
  { name: "Annual", number: 4, label: "سنوي", color: "#1e3a8a", isTrial: false, months: 12 },
  { name: "Lifetime", number: 5, label: "مدى الحياة", color: "#b45309", isTrial: false, months: null },
  { name: "Trial", number: 6, label: "تجريبي", color: "#d97706", isTrial: true, months: null },
];

const BY_NAME = Object.fromEntries(PLAN_TYPES.map((p) => [p.name, p]));
const BY_NUMBER = Object.fromEntries(PLAN_TYPES.map((p) => [p.number, p]));

/** Plan by backend enum name, e.g. "Annual". Null when unknown. */
export function planByName(name) {
  if (name == null) return null;
  return BY_NAME[String(name)] ?? null;
}

/** Plan by backend enum number, e.g. 4. Null when unknown. */
export function planByNumber(number) {
  const n = Number(number);
  return Number.isNaN(n) ? null : BY_NUMBER[n] ?? null;
}

/** Arabic label for a plan name or number; falls back to the raw input. */
export function planLabel(value) {
  const plan = typeof value === "number" ? planByNumber(value) : planByName(value);
  return plan?.label ?? (value == null ? "" : String(value));
}

/** Accent colour for a plan name or number; null when unknown. */
export function planColor(value) {
  const plan = typeof value === "number" ? planByNumber(value) : planByName(value);
  return plan?.color ?? null;
}

export function isTrialPlan(value) {
  const plan = typeof value === "number" ? planByNumber(value) : planByName(value);
  return plan?.isTrial === true;
}

// Plans the SuperAdmin may pick when creating a subscription. Per product rules a
// free trial is only offered on creation, never on renewal / edit.
export const SELECTABLE_PLAN_TYPES = PLAN_TYPES;

// Plans offered when RENEWING an existing paid subscription (no Trial).
export const RENEWABLE_PLAN_TYPES = PLAN_TYPES.filter((p) => !p.isTrial);
