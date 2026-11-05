import { describe, expect, it } from "vitest";

import {
  STAFF_EMAIL_HELPER_TEXT,
  STAFF_EMAIL_INVALID_MESSAGE,
  STAFF_EMAIL_MAX_LENGTH,
  optionalStaffEmailSchema,
  validateStaffEmail,
} from "./staffEmail";

describe("optional staff email validation", () => {
  it("keeps the exact recovery warning used across the UI", () => {
    expect(STAFF_EMAIL_HELPER_TEXT).toBe(
      "اختياري، لكن بدونه لن تستطيع استعادة كلمة المرور بنفسك وستحتاج للتواصل مع المنصة.",
    );
  });

  it("treats an omitted address as valid", () => {
    expect(optionalStaffEmailSchema.safeParse("").success).toBe(true);
    expect(optionalStaffEmailSchema.safeParse("   ").success).toBe(true);
    expect(validateStaffEmail("")).toEqual({
      valid: true,
      message: null,
      value: null,
    });
  });

  it("trims and lower-cases a valid address", () => {
    expect(validateStaffEmail("  Person@Example.COM ")).toEqual({
      valid: true,
      message: null,
      value: "person@example.com",
    });
  });

  it.each([
    "not-an-email",
    "missing@tld",
    "two@@at.example.com",
    "space in@example.com",
  ])("rejects %s", (value) => {
    const result = validateStaffEmail(value);

    expect(result.valid).toBe(false);
    expect(result.message).toBe(STAFF_EMAIL_INVALID_MESSAGE);
    expect(result.value).toBeNull();
  });

  it("rejects an address longer than the API allows", () => {
    const local = "a".repeat(STAFF_EMAIL_MAX_LENGTH);
    const result = validateStaffEmail(`${local}@example.com`);

    expect(result.valid).toBe(false);
    expect(result.message).toBe("البريد الإلكتروني طويل جدًا");
  });
});
