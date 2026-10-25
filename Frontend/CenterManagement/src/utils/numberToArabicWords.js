// Converts a non-negative integer amount into Arabic words, e.g.
//   250      -> "مئتان وخمسون"
//   1250     -> "ألف ومئتان وخمسون"
//   1000000  -> "مليون"
// Returns null when the value is not a simple whole number (has piasters),
// so callers can fall back to showing digits only.

const ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
];

const TEENS = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

const TENS = [
  "",
  "عشرة",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
];

const HUNDREDS = [
  "",
  "مئة",
  "مئتان",
  "ثلاثمئة",
  "أربعمئة",
  "خمسمئة",
  "ستمئة",
  "سبعمئة",
  "ثمانمئة",
  "تسعمئة",
];

function joinWords(parts) {
  return parts.filter(Boolean).join(" و");
}

function below1000(n) {
  const parts = [];

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);

  if (rest > 0) {
    if (rest < 10) {
      parts.push(ONES[rest]);
    } else if (rest < 20) {
      parts.push(TEENS[rest - 10]);
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;

      if (ones > 0) {
        parts.push(`${ONES[ones]} و${TENS[tens]}`);
      } else {
        parts.push(TENS[tens]);
      }
    }
  }

  return joinWords(parts);
}

export function numberToArabicWords(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  if (n === 0) return "صفر";

  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const remainder = n % 1000;

  const parts = [];

  if (millions > 0) {
    parts.push(millions === 1 ? "مليون" : `${below1000(millions)} ملايين`);
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push("ألف");
    } else if (thousands === 2) {
      parts.push("ألفان");
    } else {
      parts.push(`${below1000(thousands)} آلاف`);
    }
  }

  if (remainder > 0) {
    parts.push(below1000(remainder));
  }

  return joinWords(parts);
}

// Full receipt phrase, e.g. "فقط مئتان وخمسون جنيهاً مصرياً لا غير".
// Returns null when the value is not a simple whole number.
export function formatAmountInWords(amount) {
  const words = numberToArabicWords(amount);
  if (!words) return null;
  return `فقط ${words} جنيهاً مصرياً لا غير`;
}
