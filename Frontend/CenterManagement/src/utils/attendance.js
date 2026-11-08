/**
 * Single source of truth for attendance in the frontend.
 *
 * The API stores the four statuses as numbers (see AttendanceStatus):
 *   1 = Present, 2 = Absent, 3 = Late, 4 = Excused.
 *
 * The unified rate is exactly the API formula:
 *   (Present + Late) / (Total - Excused)
 * Excused sessions leave the denominator, and a range with nothing countable
 * has no rate at all (null) so the UI can show "—" instead of a fake 0%.
 */

export const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 1,
  ABSENT: 2,
  LATE: 3,
  EXCUSED: 4,
});

/**
 * Fixed colour / icon / Arabic wording of every status. The label is always
 * rendered next to the colour so the meaning never depends on colour alone.
 */
export const ATTENDANCE_STATUS_META = Object.freeze({
  [ATTENDANCE_STATUS.PRESENT]: {
    key: "present",
    label: "حاضر",
    shortLabel: "حاضر",
    symbol: "✓",
    tone: "success",
    pillClass: "bg-status-success-bg text-status-success",
    panelClass: "bg-status-success-bg/60 border-status-success",
    activeClass: "bg-status-success text-text-inverse",
    dotClass: "bg-status-success",
  },
  [ATTENDANCE_STATUS.ABSENT]: {
    key: "absent",
    label: "غائب",
    shortLabel: "غياب",
    symbol: "✕",
    tone: "danger",
    pillClass: "bg-status-danger-bg text-status-danger",
    panelClass: "bg-status-danger-bg/40 border-status-danger",
    activeClass: "bg-status-danger text-text-inverse",
    dotClass: "bg-status-danger",
  },
  [ATTENDANCE_STATUS.LATE]: {
    key: "late",
    label: "متأخر",
    shortLabel: "تأخر",
    symbol: "⏱",
    tone: "warning",
    pillClass: "bg-status-warning-bg text-status-warning",
    panelClass: "bg-status-warning-bg/40 border-status-warning",
    activeClass: "bg-status-warning text-text-inverse",
    dotClass: "bg-status-warning",
  },
  [ATTENDANCE_STATUS.EXCUSED]: {
    key: "excused",
    label: "بعذر",
    shortLabel: "بعذر",
    symbol: "!",
    tone: "info",
    pillClass: "bg-status-info-bg text-status-info",
    panelClass: "bg-status-info-bg/40 border-status-info",
    activeClass: "bg-status-info text-text-inverse",
    dotClass: "bg-status-info",
  },
});

const UNKNOWN_STATUS_META = Object.freeze({
  key: "unknown",
  label: "غير محدد",
  shortLabel: "غير محدد",
  symbol: "?",
  tone: "neutral",
  pillClass: "bg-surface-muted text-text-muted",
  panelClass: "bg-surface-card border-surface-border",
  activeClass: "bg-surface-muted text-text-muted",
  dotClass: "bg-text-muted",
});

const ARABIC_STATUS = {
  حاضر: ATTENDANCE_STATUS.PRESENT,
  غائب: ATTENDANCE_STATUS.ABSENT,
  غياب: ATTENDANCE_STATUS.ABSENT,
  متأخر: ATTENDANCE_STATUS.LATE,
  تأخر: ATTENDANCE_STATUS.LATE,
  بعذر: ATTENDANCE_STATUS.EXCUSED,
  مستأذن: ATTENDANCE_STATUS.EXCUSED,
};

const ENGLISH_STATUS = {
  present: ATTENDANCE_STATUS.PRESENT,
  absent: ATTENDANCE_STATUS.ABSENT,
  late: ATTENDANCE_STATUS.LATE,
  excused: ATTENDANCE_STATUS.EXCUSED,
};

/**
 * Accepts the numeric enum, the enum name ("Late") or the Arabic label and
 * returns the numeric status, or null when the value is not a status.
 */
export function normalizeAttendanceStatus(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return ATTENDANCE_STATUS_META[value] ? value : null;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^[1-4]$/.test(text)) return Number(text);

  return (
    ENGLISH_STATUS[text.toLowerCase()] ??
    ARABIC_STATUS[text] ??
    null
  );
}

export function getAttendanceStatusMeta(value) {
  const status = normalizeAttendanceStatus(value);
  return status ? ATTENDANCE_STATUS_META[status] : UNKNOWN_STATUS_META;
}

export function attendanceStatusLabel(value) {
  return getAttendanceStatusMeta(value).label;
}

/**
 * C# `Math.Round(value, decimals)` defaults to banker's rounding (half to
 * even). Mirroring it here keeps the frontend numbers identical to the API.
 */
function roundHalfToEven(value, decimals) {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const difference = scaled - floor;
  const epsilon = 1e-9;

  let rounded;

  if (Math.abs(difference - 0.5) < epsilon) {
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(scaled);
  }

  return rounded / factor;
}

/**
 * The unified attendance rate, returned as a percentage (0–100) or null when
 * `total - excused <= 0`.
 */
export function calculateAttendanceRate(
  { present = 0, late = 0, excused = 0, total = 0 } = {},
  decimals = 2,
) {
  const countable = (Number(total) || 0) - (Number(excused) || 0);

  if (countable <= 0) return null;

  const attended = (Number(present) || 0) + (Number(late) || 0);

  return roundHalfToEven((attended * 100) / countable, decimals);
}

/**
 * Formats a rate for display. A missing/uncountable rate becomes "—", never
 * "0%".
 */
export function formatAttendanceRate(value, { suffix = "%", empty = "—" } = {}) {
  if (value === null || value === undefined || value === "") return empty;

  const number = Number(value);

  return Number.isFinite(number) ? `${number}${suffix}` : empty;
}

/**
 * Counts the four statuses of a list of records. `excused` is accepted both as
 * `excusedCount` and `excused` so report/portal payloads share one helper.
 * `total` defaults to the number of records (or the payload's own total).
 */
export function summarizeAttendance(
  records = [],
  { total = null, present = 0, late = 0, excused = 0 } = {},
) {
  const counts = {
    present: Number(present) || 0,
    absent: 0,
    late: Number(late) || 0,
    excused: Number(excused) || 0,
  };

  if (Array.isArray(records) && records.length > 0 && counts.present + counts.late + counts.excused === 0) {
    for (const record of records) {
      const status = normalizeAttendanceStatus(record?.status);

      if (status === ATTENDANCE_STATUS.PRESENT) counts.present += 1;
      else if (status === ATTENDANCE_STATUS.ABSENT) counts.absent += 1;
      else if (status === ATTENDANCE_STATUS.LATE) counts.late += 1;
      else if (status === ATTENDANCE_STATUS.EXCUSED) counts.excused += 1;
    }
  }

  const totalCount =
    Number(total) ||
    counts.present + counts.absent + counts.late + counts.excused;

  return {
    ...counts,
    total: totalCount,
    rate: calculateAttendanceRate({ ...counts, total: totalCount }),
  };
}
