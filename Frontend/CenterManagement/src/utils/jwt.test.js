import { describe, expect, it } from "vitest";
import { requiresPasswordChange } from "./jwt";

function makeToken(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

describe("requiresPasswordChange", () => {
  it("returns true when the forced-change claim is set", () => {
    expect(requiresPasswordChange(makeToken({ pwd_change_required: "true" }))).toBe(
      true,
    );
  });

  it("returns false without the claim", () => {
    expect(requiresPasswordChange(makeToken({ role: "Student" }))).toBe(false);
  });

  it("returns false for an explicit false claim", () => {
    expect(
      requiresPasswordChange(makeToken({ pwd_change_required: "false" })),
    ).toBe(false);
  });

  it("returns false for a missing or invalid token", () => {
    expect(requiresPasswordChange(null)).toBe(false);
    expect(requiresPasswordChange("not-a-token")).toBe(false);
  });
});
