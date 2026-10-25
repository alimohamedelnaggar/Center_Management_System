import { describe, expect, it } from "vitest";
import {
  SCAN_OUTCOME_STATUS,
  buildScanErrorOutcome,
  isLateScan,
  outcomeFromApiResponse,
} from "./scanOutcome";

const at = (hours, minutes) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date;
};

describe("isLateScan", () => {
  it("is not late inside the grace period", () => {
    expect(isLateScan("16:00:00", at(16, 5))).toBe(false);
  });

  it("is late after the grace period", () => {
    expect(isLateScan("16:00:00", at(16, 11))).toBe(true);
  });

  it("is not late without a session start", () => {
    expect(isLateScan("", at(16, 40))).toBe(false);
    expect(isLateScan(null, at(16, 40))).toBe(false);
  });

  it("is not late when the session did not start yet", () => {
    expect(isLateScan("23:00:00", at(10, 0))).toBe(false);
  });
});

describe("outcomeFromApiResponse", () => {
  it("maps a fresh scan to present", () => {
    const outcome = outcomeFromApiResponse(
      {
        succeeded: true,
        message: "تم تسجيل حضور أحمد.",
        data: { fullName: "أحمد", qrCode: "STU00000001" },
      },
      { code: "STU00000001" },
    );

    expect(outcome.ok).toBe(true);
    expect(outcome.status).toBe(SCAN_OUTCOME_STATUS.PRESENT);
    expect(outcome.name).toBe("أحمد");
    expect(outcome.code).toBe("STU00000001");
  });

  it("maps a late scan to late", () => {
    const outcome = outcomeFromApiResponse(
      { succeeded: true, message: "تم", data: { fullName: "أحمد" } },
      { code: "STU00000001", isLate: true },
    );

    expect(outcome.status).toBe(SCAN_OUTCOME_STATUS.LATE);
  });

  it("maps a repeated card to already recorded", () => {
    const outcome = outcomeFromApiResponse(
      {
        succeeded: true,
        message: "أحمد متسجل حضوره بالفعل.",
        data: { fullName: "أحمد", alreadyRecorded: true },
      },
      { code: "STU00000001" },
    );

    expect(outcome.ok).toBe(true);
    expect(outcome.status).toBe(SCAN_OUTCOME_STATUS.ALREADY);
  });

  it("maps a rejected code to an error", () => {
    const outcome = outcomeFromApiResponse(
      { succeeded: false, message: "مفيش طالب بالكود ده." },
      { code: "STU00000009" },
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.status).toBe(SCAN_OUTCOME_STATUS.ERROR);
    expect(outcome.message).toBe("مفيش طالب بالكود ده.");
  });
});

describe("buildScanErrorOutcome", () => {
  it("keeps the code and the message", () => {
    const outcome = buildScanErrorOutcome("STU00000009", "مفيش حصة شغالة.");

    expect(outcome.ok).toBe(false);
    expect(outcome.status).toBe(SCAN_OUTCOME_STATUS.ERROR);
    expect(outcome.code).toBe("STU00000009");
    expect(outcome.message).toBe("مفيش حصة شغالة.");
  });
});
