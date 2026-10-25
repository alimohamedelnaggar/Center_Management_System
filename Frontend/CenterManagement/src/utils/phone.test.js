import { describe, expect, it } from "vitest";
import { normalizeEgyptianPhone, buildWhatsAppLink } from "./phone";

describe("normalizeEgyptianPhone", () => {
  it("normalizes 01xxxxxxxxx to 201xxxxxxxxx", () => {
    expect(normalizeEgyptianPhone("01012345678")).toBe("201012345678");
    expect(normalizeEgyptianPhone("01112345678")).toBe("201112345678");
    expect(normalizeEgyptianPhone("01212345678")).toBe("201212345678");
    expect(normalizeEgyptianPhone("01512345678")).toBe("201512345678");
  });

  it("strips spaces and dashes", () => {
    expect(normalizeEgyptianPhone("010 123 456 78")).toBe("201012345678");
  });

  it("keeps an already-international number", () => {
    expect(normalizeEgyptianPhone("201012345678")).toBe("201012345678");
    expect(normalizeEgyptianPhone("+201012345678")).toBe("201012345678");
    expect(normalizeEgyptianPhone("00201012345678")).toBe("201012345678");
  });

  it("returns null for invalid input", () => {
    expect(normalizeEgyptianPhone("123")).toBeNull();
    expect(normalizeEgyptianPhone("0101234567")).toBeNull();
    expect(normalizeEgyptianPhone("01312345678")).toBeNull();
    expect(normalizeEgyptianPhone("")).toBeNull();
    expect(normalizeEgyptianPhone(null)).toBeNull();
    expect(normalizeEgyptianPhone(undefined)).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    const link = buildWhatsAppLink("01012345678", "مرحبا بالطالب");
    expect(link.startsWith("https://wa.me/201012345678?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent("مرحبا بالطالب"));
  });

  it("omits the text param when no message is given", () => {
    expect(buildWhatsAppLink("01012345678", null)).toBe(
      "https://wa.me/201012345678",
    );
  });

  it("returns null when the phone is invalid", () => {
    expect(buildWhatsAppLink("123", "hi")).toBeNull();
    expect(buildWhatsAppLink("", "hi")).toBeNull();
    expect(buildWhatsAppLink(null, "hi")).toBeNull();
  });
});