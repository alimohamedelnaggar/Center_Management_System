import { describe, expect, it } from "vitest";
import { homeFor } from "./homeRoute";

describe("homeFor", () => {
  it("sends a Parent to the parent portal dashboard", () => {
    expect(homeFor("Parent")).toBe("/parent/dashboard");
  });

  it("keeps the existing role homes", () => {
    expect(homeFor("SuperAdmin")).toBe("/admin");
    expect(homeFor("CenterOwner")).toBe("/center/dashboard");
    expect(homeFor("Teacher")).toBe("/teacher/dashboard");
    expect(homeFor("Student")).toBe("/student");
  });

  it("falls back to /dashboard for an unknown role", () => {
    expect(homeFor("Unknown")).toBe("/dashboard");
    expect(homeFor(undefined)).toBe("/dashboard");
  });
});
