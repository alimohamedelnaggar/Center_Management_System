import { describe, expect, it } from "vitest";
import {
  normalizeCode,
  normalizeScanCode,
  stripInvisibleChars,
  toLatinKeyPositions,
} from "./qrCode";

describe("stripInvisibleChars", () => {
  it("drops control characters, zero width chars and the BOM", () => {
    expect(stripInvisibleChars("STU\u200B0000\u0007 0001")).toBe("STU0000 0001");
    expect(stripInvisibleChars("\uFEFFSTU00000001")).toBe("STU00000001");
  });

  it("keeps a non string empty", () => {
    expect(stripInvisibleChars(null)).toBe("");
    expect(stripInvisibleChars(undefined)).toBe("");
  });
});

describe("toLatinKeyPositions", () => {
  it("maps arabic letters to the english key in the same position", () => {
    // "STU" typed on an arabic keyboard layout is "سغه"
    expect(toLatinKeyPositions("سغه")).toBe("stu");
  });

  it("maps the lam-alef ligature to its single key", () => {
    expect(toLatinKeyPositions("لا")).toBe("b");
  });

  it("maps arabic and persian digits to ascii", () => {
    expect(toLatinKeyPositions("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toLatinKeyPositions("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  it("leaves latin characters untouched", () => {
    expect(toLatinKeyPositions("STU00000001")).toBe("STU00000001");
  });
});

describe("normalizeScanCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeScanCode("  stu00000001  ")).toBe("STU00000001");
  });

  it("removes invisible characters before anything else", () => {
    expect(normalizeScanCode("STU\u200B0000\u00070001")).toBe("STU00000001");
  });

  it("reads a code typed on an arabic keyboard layout", () => {
    const arabicTyped = `سغه${"٠".repeat(7)}١`;

    expect(normalizeScanCode(arabicTyped)).toBe("STU00000001");
  });

  it("extracts the code out of a student card link", () => {
    expect(
      normalizeScanCode(
        "https://center.example.com/student-card/STU00000001",
      ),
    ).toBe("STU00000001");
  });

  it("extracts the code out of a student card link with a query string", () => {
    expect(
      normalizeScanCode(
        "https://center.example.com/student-card/STU00000001?ref=card",
      ),
    ).toBe("STU00000001");
  });

  it("falls back to the last url segment for any other link", () => {
    expect(normalizeScanCode("https://center.example.com/qr/STU00000001")).toBe(
      "STU00000001",
    );
  });

  it("returns an empty string for a blank payload", () => {
    expect(normalizeScanCode("")).toBe("");
    expect(normalizeScanCode("   ")).toBe("");
    expect(normalizeScanCode(null)).toBe("");
    expect(normalizeScanCode(undefined)).toBe("");
  });

  it("keeps the existing normalizeCode untouched", () => {
    expect(normalizeCode(" stu00000001 ")).toBe("STU00000001");
    expect(normalizeCode("سغه")).toBe("سغه");
  });
});
