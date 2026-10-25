/**
 * Shared helpers that turn an attendance scan response into a small,
 * display ready outcome used by the scanner tab of the attendance modal.
 *
 * The attendance API always records a scan as "Present" (the `Late` value of
 * the enum is never produced by `POST /Attendance/scan`), so lateness is
 * derived on the client from the session start time. It is a display rule
 * only - it never changes what gets stored.
 */

export const SCAN_OUTCOME_STATUS = {
  PRESENT: "present",
  LATE: "late",
  ALREADY: "already",
  ERROR: "error",
};

export const SCAN_OUTCOME_LABELS = {
  [SCAN_OUTCOME_STATUS.PRESENT]: "حاضر",
  [SCAN_OUTCOME_STATUS.LATE]: "متأخر",
  [SCAN_OUTCOME_STATUS.ALREADY]: "مسجل مسبقاً",
  [SCAN_OUTCOME_STATUS.ERROR]: "غير مسجل",
};

export const SCAN_LATE_GRACE_MINUTES = 10;

/**
 * Builds the session start date for a session start value.
 * Sessions expose a time of day ("17:00:00"); we resolve it against today.
 */
function parseSessionStart(sessionStart) {
  if (!sessionStart) return null;

  if (sessionStart instanceof Date) {
    return Number.isNaN(sessionStart.getTime()) ? null : sessionStart;
  }

  if (typeof sessionStart !== "string") return null;

  const timeOnly = sessionStart.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (timeOnly) {
    const [, hours, minutes, seconds] = timeOnly;

    const start = new Date();
    start.setHours(Number(hours), Number(minutes), Number(seconds ?? 0), 0);

    return start;
  }

  const parsed = new Date(sessionStart);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * A scan is late when it happens more than `graceMinutes` after the session
 * started. Without a session start time we never report a late scan.
 */
export function isLateScan(
  sessionStart,
  now = new Date(),
  graceMinutes = SCAN_LATE_GRACE_MINUTES,
) {
  const start = parseSessionStart(sessionStart);

  if (!start) return false;

  const minutes = (now.getTime() - start.getTime()) / 60000;

  return minutes > graceMinutes;
}

export function buildScanOutcome({
  ok = false,
  status = SCAN_OUTCOME_STATUS.ERROR,
  name = "",
  code = "",
  message = "",
} = {}) {
  return { ok, status, name, code, message };
}

export function buildScanErrorOutcome(code = "", message = "") {
  return buildScanOutcome({
    ok: false,
    status: SCAN_OUTCOME_STATUS.ERROR,
    code,
    message: message || "الكود ده مش مسجل.",
  });
}

/**
 * Maps the existing `POST /Attendance/scan` response to an outcome.
 * No new endpoint and no change to the request/response contract.
 */
export function outcomeFromApiResponse(response, { code = "", isLate = false } = {}) {
  const succeeded = Boolean(response?.succeeded);
  const message = response?.message || "";
  const data = response?.data ?? {};

  if (!succeeded) {
    return buildScanErrorOutcome(code, message || "الكود ده مش مسجل.");
  }

  const name = data.fullName ?? data.FullName ?? "";
  const alreadyRecorded = Boolean(
    data.alreadyRecorded ?? data.AlreadyRecorded ?? false,
  );

  const status = alreadyRecorded
    ? SCAN_OUTCOME_STATUS.ALREADY
    : isLate
      ? SCAN_OUTCOME_STATUS.LATE
      : SCAN_OUTCOME_STATUS.PRESENT;

  return buildScanOutcome({
    ok: true,
    status,
    name,
    code: data.qrCode ?? data.QrCode ?? code,
    message: message || (name ? `تم تسجيل حضور ${name}.` : "تم تسجيل الحضور."),
  });
}
