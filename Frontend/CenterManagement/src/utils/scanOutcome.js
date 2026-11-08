/**
 * Shared helpers that turn an attendance scan response into a small,
 * display ready outcome used by the scanner tab of the attendance modal.
 *
 * The API now resolves the stored status itself (Present inside the grace
 * window, Late after it) and returns it in `data.status`, so we trust the
 * server value. `isLate` stays as a fallback for older responses (and mocks)
 * that do not carry a status yet.
 */

import {
  ATTENDANCE_STATUS,
  normalizeAttendanceStatus,
} from "./attendance";

export const SCAN_OUTCOME_STATUS = {
  PRESENT: "present",
  LATE: "late",
  EXCUSED: "excused",
  ALREADY: "already",
  ERROR: "error",
};

export const SCAN_OUTCOME_LABELS = {
  [SCAN_OUTCOME_STATUS.PRESENT]: "حاضر",
  [SCAN_OUTCOME_STATUS.LATE]: "متأخر",
  [SCAN_OUTCOME_STATUS.EXCUSED]: "بعذر",
  [SCAN_OUTCOME_STATUS.ALREADY]: "متسجل بالفعل",
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
  const backendStatus = normalizeAttendanceStatus(data.status ?? data.Status);

  let status;

  if (alreadyRecorded) {
    status = SCAN_OUTCOME_STATUS.ALREADY;
  } else if (backendStatus === ATTENDANCE_STATUS.LATE) {
    status = SCAN_OUTCOME_STATUS.LATE;
  } else if (backendStatus === ATTENDANCE_STATUS.EXCUSED) {
    status = SCAN_OUTCOME_STATUS.EXCUSED;
  } else if (backendStatus === ATTENDANCE_STATUS.PRESENT) {
    status = SCAN_OUTCOME_STATUS.PRESENT;
  } else {
    // Backward compatibility: an old response has no status, so fall back to
    // the session-start display rule.
    status = isLate ? SCAN_OUTCOME_STATUS.LATE : SCAN_OUTCOME_STATUS.PRESENT;
  }

  return buildScanOutcome({
    ok: true,
    status,
    name,
    code: data.qrCode ?? data.QrCode ?? code,
    message: message || (name ? `تم تسجيل حضور ${name}.` : "تم تسجيل الحضور."),
  });
}
