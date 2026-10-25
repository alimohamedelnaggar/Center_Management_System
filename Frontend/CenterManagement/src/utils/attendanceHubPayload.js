/**
 * Helpers for the live attendance event of the attendance hub.
 *
 * The hub sends a single object:
 *   { sessionId, attendances: [{ id, groupId, fullName, phone, parentPhoneNumber, status }] }
 * An older build sent two arguments: (sessionId, students). Both shapes are
 * accepted here so a stale server cannot break the attendance sheet.
 */

const readField = (row, ...names) => {
  for (const name of names) {
    const value = row?.[name];

    if (value !== undefined && value !== null) return value;
  }

  return null;
};

function normalizeAttendanceRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      id: readField(row, "id", "studentId", "Id", "StudentId"),
      groupId: readField(row, "groupId", "GroupId"),
      status: readField(row, "status", "Status"),
      note: readField(row, "notes", "note", "Notes", "Note") ?? "",
      fullName: readField(row, "fullName", "FullName") ?? "",
    }))
    .filter((row) => row.id);
}

/**
 * Normalizes the arguments of the "AttendanceSaved" event into
 * `{ sessionId, attendances }`.
 */
export function parseAttendanceHubPayload(...args) {
  const [first, second] = args;

  if (Array.isArray(first)) {
    return { sessionId: null, attendances: normalizeAttendanceRows(first) };
  }

  if (first && typeof first === "object") {
    const rows =
      readField(
        first,
        "attendances",
        "Attendances",
        "students",
        "Students",
        "updatedStudents",
        "UpdatedStudents",
      ) ?? [];

    return {
      sessionId: readField(first, "sessionId", "SessionId"),
      attendances: normalizeAttendanceRows(rows),
    };
  }

  // Legacy shape: (sessionId, students)
  return {
    sessionId: first ?? null,
    attendances: normalizeAttendanceRows(Array.isArray(second) ? second : []),
  };
}

/**
 * Keeps only the rows that belong to the sheet that is currently open:
 *  - rows of another session are dropped,
 *  - rows of students that are not loaded on this page are dropped (they would
 *    break the counters of the sheet),
 *  - rows of a student the teacher marked by hand are dropped as well, an
 *    unsaved manual choice must not be overwritten by a live event.
 */
export function selectAttendanceRows(
  { sessionId, attendances } = {},
  {
    currentSessionId = "",
    loadedStudentIds = [],
    manualStudentIds = [],
  } = {},
) {
  if (sessionId && currentSessionId && sessionId !== currentSessionId) {
    return { rows: [], skipped: 0, otherSession: true };
  }

  const loaded = new Set(loadedStudentIds);
  const manual = new Set(manualStudentIds);
  const rows = [];

  let skipped = 0;

  attendances.forEach((row) => {
    if (!loaded.has(row.id)) return;

    if (manual.has(row.id)) {
      skipped += 1;

      return;
    }

    rows.push(row);
  });

  return { rows, skipped, otherSession: false };
}

/**
 * Merges the live rows into the attendance map of the sheet. The note of a
 * student is kept, the live event does not carry one.
 */
export function mergeAttendanceRows(previousMap = {}, rows = []) {
  if (!rows.length) return previousMap;

  const next = { ...previousMap };

  rows.forEach((row) => {
    const current = next[row.id] || {};

    next[row.id] = {
      ...current,
      status: row.status ?? current.status,
      note: row.note || current.note || "",
    };
  });

  return next;
}
