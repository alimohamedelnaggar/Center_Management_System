import { describe, expect, it } from "vitest";
import {
  mergeAttendanceRows,
  parseAttendanceHubPayload,
  selectAttendanceRows,
} from "./attendanceHubPayload";

describe("parseAttendanceHubPayload", () => {
  it("reads the object the hub sends", () => {
    const payload = parseAttendanceHubPayload({
      sessionId: "session-1",
      attendances: [
        {
          id: "student-1",
          groupId: "group-1",
          fullName: "أحمد محمد",
          phone: "01000000000",
          status: 1,
        },
      ],
    });

    expect(payload.sessionId).toBe("session-1");
    expect(payload.attendances).toHaveLength(1);
    expect(payload.attendances[0]).toMatchObject({
      id: "student-1",
      groupId: "group-1",
      status: 1,
    });
  });

  it("reads the payload the hub really sends", () => {
    // Captured from a live scan of the running API.
    const payload = parseAttendanceHubPayload({
      sessionId: "0582723d-b9d3-4aec-96e1-5fadc85d6522",
      attendances: [
        {
          id: "0827377d-73de-4c0d-b955-004ad26f659f",
          groupId: "86b44fe1-7939-4600-95f8-f538421d14cf",
          fullName: "ليلى الشريف",
          phone: "01100000199",
          parentPhoneNumber: null,
          status: 1,
        },
      ],
    });

    expect(payload.sessionId).toBe("0582723d-b9d3-4aec-96e1-5fadc85d6522");
    expect(payload.attendances[0]).toMatchObject({
      id: "0827377d-73de-4c0d-b955-004ad26f659f",
      groupId: "86b44fe1-7939-4600-95f8-f538421d14cf",
      fullName: "ليلى الشريف",
      status: 1,
    });
  });

  it("reads the legacy two argument shape", () => {
    const payload = parseAttendanceHubPayload("session-2", [
      { id: "student-2", status: 2 },
    ]);

    expect(payload.sessionId).toBe("session-2");
    expect(payload.attendances[0]).toMatchObject({ id: "student-2", status: 2 });
  });

  it("survives an empty or broken event", () => {
    expect(parseAttendanceHubPayload()).toEqual({
      sessionId: null,
      attendances: [],
    });

    expect(parseAttendanceHubPayload({}).attendances).toEqual([]);
    expect(parseAttendanceHubPayload({ attendances: null }).attendances).toEqual(
      [],
    );
  });

  it("drops rows without a student id", () => {
    const payload = parseAttendanceHubPayload({
      sessionId: "session-1",
      attendances: [{ fullName: "بلا كود" }, { id: "student-3" }],
    });

    expect(payload.attendances).toHaveLength(1);
    expect(payload.attendances[0].id).toBe("student-3");
  });
});

describe("selectAttendanceRows", () => {
  const rows = [
    { id: "student-1", status: 1 },
    { id: "student-2", status: 2 },
  ];

  it("drops the rows of another session", () => {
    const result = selectAttendanceRows(
      { sessionId: "session-9", attendances: rows },
      { currentSessionId: "session-1", loadedStudentIds: ["student-1"] },
    );

    expect(result.otherSession).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("keeps the rows of the current session", () => {
    const result = selectAttendanceRows(
      { sessionId: "session-1", attendances: rows },
      {
        currentSessionId: "session-1",
        loadedStudentIds: ["student-1", "student-2"],
      },
    );

    expect(result.otherSession).toBe(false);
    expect(result.rows).toHaveLength(2);
  });

  it("drops students that are not loaded on the page", () => {
    const result = selectAttendanceRows(
      { sessionId: "session-1", attendances: rows },
      { currentSessionId: "session-1", loadedStudentIds: ["student-1"] },
    );

    expect(result.rows.map((row) => row.id)).toEqual(["student-1"]);
  });

  it("keeps a manual choice of the teacher", () => {
    const result = selectAttendanceRows(
      { sessionId: "session-1", attendances: rows },
      {
        currentSessionId: "session-1",
        loadedStudentIds: ["student-1", "student-2"],
        manualStudentIds: ["student-2"],
      },
    );

    expect(result.rows.map((row) => row.id)).toEqual(["student-1"]);
    expect(result.skipped).toBe(1);
  });
});

describe("mergeAttendanceRows", () => {
  it("updates the status and keeps the note", () => {
    const previous = { "student-1": { status: 2, note: "سأغيب" } };

    const next = mergeAttendanceRows(previous, [
      { id: "student-1", status: 1, note: "" },
    ]);

    expect(next["student-1"]).toEqual({ status: 1, note: "سأغيب" });
    expect(previous["student-1"].status).toBe(2);
  });

  it("keeps the previous status when the event has none", () => {
    const next = mergeAttendanceRows({ "student-1": { status: 2, note: "" } }, [
      { id: "student-1", status: null },
    ]);

    expect(next["student-1"].status).toBe(2);
  });

  it("returns the same map when there is nothing to merge", () => {
    const previous = { "student-1": { status: 1, note: "" } };

    expect(mergeAttendanceRows(previous, [])).toBe(previous);
  });
});
