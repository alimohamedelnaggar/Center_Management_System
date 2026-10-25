import { describe, expect, it } from "vitest";
import {
  hasNumber,
  hasAmount,
  hasPercent,
  hasItems,
  sumOrNone,
  formatAmountOrNone,
} from "./nullSections";

describe("hasNumber", () => {
  it("accepts real finite numbers only", () => {
    expect(hasNumber(0)).toBe(true);
    expect(hasNumber(12.5)).toBe(true);
    expect(hasNumber(NaN)).toBe(false);
    expect(hasNumber(null)).toBe(false);
    expect(hasNumber(undefined)).toBe(false);
    expect(hasNumber("5")).toBe(false);
  });
});

describe("hasAmount", () => {
  it("accepts numbers and numeric strings", () => {
    expect(hasAmount(0)).toBe(true);
    expect(hasAmount("1500")).toBe(true);
    expect(hasAmount(null)).toBe(false);
    expect(hasAmount("")).toBe(false);
    expect(hasAmount("abc")).toBe(false);
  });
});

describe("hasPercent", () => {
  it("mirrors hasNumber", () => {
    expect(hasPercent(75)).toBe(true);
    expect(hasPercent(null)).toBe(false);
  });
});

describe("hasItems", () => {
  it("is true only for non-empty arrays", () => {
    expect(hasItems([1])).toBe(true);
    expect(hasItems([])).toBe(false);
    expect(hasItems(null)).toBe(false);
  });
});

describe("sumOrNone", () => {
  it("sums numbers and returns null when nothing to sum", () => {
    expect(sumOrNone([1, 2, 3])).toBe(6);
    expect(sumOrNone([])).toBeNull();
    expect(sumOrNone([null, "x"])).toBeNull();
    expect(sumOrNone([1, null, 2])).toBe(3);
  });
});

describe("formatAmountOrNone", () => {
  it("hides null amounts and formats real ones", () => {
    expect(formatAmountOrNone(null)).toBeNull();
    expect(formatAmountOrNone("")).toBeNull();
    expect(formatAmountOrNone(250)).toBe(250);
    expect(formatAmountOrNone("250", (n) => `${n} ج.م`)).toBe("250 ج.م");
  });
});
