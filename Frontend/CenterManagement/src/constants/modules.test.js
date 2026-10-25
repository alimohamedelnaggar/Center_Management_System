import { describe, expect, it } from "vitest";
import {
  MODULES,
  canUseModule,
  canUseCenterModule,
  closureToEnable,
  moduleForPath,
  normaliseModules,
} from "./modules";

const loaded = { isSuperAdmin: false, isStudent: false, modulesLoaded: true };
const owner = ["attendance", "payments"];

describe("normaliseModules", () => {
  it("returns a clean, lowercase, de-duplicated array from an array", () => {
    expect(normaliseModules(["Attendance", "PAYMENTS", "attendance"])).toEqual([
      "attendance",
      "payments",
    ]);
  });

  it("accepts a Set (the value AuthContext actually passes)", () => {
    expect(normaliseModules(new Set(["grades", "GRADES"]))).toEqual(["grades"]);
  });

  it("accepts an object-map (keys with a truthy value)", () => {
    expect(
      normaliseModules({ attendance: true, grades: false, payments: 1 }),
    ).toEqual(["attendance", "payments"]);
  });

  it("accepts a comma-separated string", () => {
    expect(normaliseModules("attendance, grades ,payments")).toEqual([
      "attendance",
      "grades",
      "payments",
    ]);
  });

  it("wraps a single string", () => {
    expect(normaliseModules("attendance")).toEqual(["attendance"]);
  });

  it("returns [] for null, undefined and other shapes", () => {
    expect(normaliseModules(null)).toEqual([]);
    expect(normaliseModules(undefined)).toEqual([]);
    expect(normaliseModules(42)).toEqual([]);
    expect(normaliseModules(true)).toEqual([]);
    expect(normaliseModules("")).toEqual([]);
  });

  it("drops blank and non-string entries", () => {
    expect(normaliseModules(["attendance", "", "   ", null, 5])).toEqual([
      "attendance",
    ]);
  });

  it("returns a real array (has Array.prototype.filter)", () => {
    const result = normaliseModules(new Set(["attendance"]));
    expect(Array.isArray(result)).toBe(true);
    expect(typeof result.filter).toBe("function");
  });
});

describe("canUseModule", () => {
  it("never throws on odd enabledModules shapes (blank-page regression)", () => {
    for (const value of [
      null,
      undefined,
      {},
      "attendance",
      "attendance,grades",
      { attendance: true },
      new Set(["grades"]),
    ]) {
      expect(() => canUseModule("payments", value, loaded)).not.toThrow();
    }
  });

  it("works with the Set that AuthContext builds", () => {
    const set = new Set(["attendance", "payments"]);
    expect(canUseModule("payments", set, loaded)).toBe(true);
    expect(canUseModule("grades", set, loaded)).toBe(false);
  });

  it("always allows core and unknown keys", () => {
    expect(canUseModule("core", [], loaded)).toBe(true);
    expect(canUseModule(null, [], loaded)).toBe(true);
    expect(canUseModule("not_a_module", [], loaded)).toBe(true);
  });

  it("fails open before the module list has loaded", () => {
    expect(
      canUseModule("payments", [], { modulesLoaded: false }),
    ).toBe(true);
  });

  it("exempts SuperAdmin and Student", () => {
    expect(canUseModule("payments", [], { ...loaded, isSuperAdmin: true })).toBe(
      true,
    );
    expect(canUseModule("payments", [], { ...loaded, isStudent: true })).toBe(
      true,
    );
  });

  it("gates a center owner by the enabled module set", () => {
    expect(canUseModule("payments", owner, loaded)).toBe(true);
    expect(canUseModule("grades", owner, loaded)).toBe(false);
    expect(canUseModule(MODULES.ACCOUNTING, owner, loaded)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(canUseModule("PAYMENTS", owner, loaded)).toBe(true);
  });
});

describe("canUseCenterModule", () => {
  it("still gates a Student (no role exemption)", () => {
    expect(canUseCenterModule("payments", owner, true)).toBe(true);
    expect(canUseCenterModule("grades", owner, true)).toBe(false);
  });

  it("fails open before loading and always allows core", () => {
    expect(canUseCenterModule("grades", owner, false)).toBe(true);
    expect(canUseCenterModule("core", [], true)).toBe(true);
  });
});

describe("closureToEnable", () => {
  it("adds direct prerequisites", () => {
    const set = closureToEnable(["online_exams"]);
    expect(set.has("online_exams")).toBe(true);
    expect(set.has("question_bank")).toBe(true);
  });

  it("adds transitive prerequisites", () => {
    const set = closureToEnable(["parent_portal"]);
    expect(set.has("parent_portal")).toBe(true);
    expect(set.has("attendance")).toBe(true);
    expect(set.has("payments")).toBe(true);
    // The parent portal no longer depends on the student portal.
    expect(set.has("student_portal")).toBe(false);
  });

  it("leaves independent modules untouched", () => {
    const set = closureToEnable(["attendance"]);
    expect(Array.from(set)).toEqual(["attendance"]);
  });
});

describe("moduleForPath", () => {
  it("maps a path to its module and treats unknown as null", () => {
    expect(moduleForPath("/attendance")).toBe(MODULES.ATTENDANCE);
    expect(moduleForPath("/payments/x")).toBeNull();
    expect(moduleForPath("/overdue")).toBe(MODULES.PAYMENTS);
    expect(moduleForPath("/profile")).toBe("core");
  });

  it("ignores query strings and trailing slashes", () => {
    expect(moduleForPath("/grades?x=1")).toBe(MODULES.GRADES);
    expect(moduleForPath("/notes/")).toBe(MODULES.STUDY_NOTES);
  });

  it("maps the parent portal subtree to parent_portal", () => {
    expect(moduleForPath("/parent")).toBe(MODULES.PARENT_PORTAL);
    expect(moduleForPath("/parent/dashboard")).toBe(MODULES.PARENT_PORTAL);
    expect(moduleForPath("/parent/notifications")).toBe(MODULES.PARENT_PORTAL);
  });
});
