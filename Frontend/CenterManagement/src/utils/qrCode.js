import QRCode from "qrcode";

export const QR_PREFIX = "STU";
export const STUDENT_CARD_PATH = "/student-card";
const QR_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Arabic letters mapped to the english key that sits in the same physical
 * position on the standard arabic (101) layout. Used by hardware scanners
 * typed on an arabic keyboard layout.
 */
const ARABIC_KEY_MAP = {
  ض: "q",
  ص: "w",
  ق: "e",
  ف: "r",
  غ: "t",
  ع: "y",
  ه: "u",
  خ: "i",
  ح: "o",
  ج: "p",
  د: "[",
  ذ: "]",
  ش: "a",
  س: "s",
  ي: "d",
  ب: "f",
  ل: "g",
  ا: "h",
  ت: "j",
  ن: "k",
  م: "l",
  ك: ";",
  ط: "'",
  ئ: "z",
  ء: "x",
  ؤ: "c",
  ر: "v",
  ى: "n",
  ة: "m",
  و: ",",
  ز: ".",
  ظ: "/",
};

const ARABIC_DIGIT_MAP = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const PERSIAN_DIGIT_MAP = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

/** Control chars, zero width chars, BOM, NBSP, soft hyphen, bidi marks. */
const INVISIBLE_CHARS_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F\u007F-\u009F\u00A0\u00AD\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\uFEFF]/g;

export function normalizeCode(raw) {
  if (typeof raw !== "string") return "";

  return raw.trim().toUpperCase();
}

/**
 * Removes every non visible character so a code read by a hardware scanner
 * (which may append a zero width char, a BOM or a control byte) still matches.
 */
export function stripInvisibleChars(raw) {
  if (typeof raw !== "string") return "";

  return raw.replace(INVISIBLE_CHARS_PATTERN, "");
}

/**
 * Converts arabic letters/digits to the ascii character sitting on the same
 * key of a qwerty keyboard (arabic 101 layout).
 */
export function toLatinKeyPositions(raw) {
  if (typeof raw !== "string") return "";

  // "لا" is a single key (b) on the arabic layout, not two separate keys.
  const expanded = raw.replace(/لا/g, "b");

  return [...expanded]
    .map(
      (char) =>
        ARABIC_KEY_MAP[char] ??
        ARABIC_DIGIT_MAP[char] ??
        PERSIAN_DIGIT_MAP[char] ??
        char,
    )
    .join("");
}

/**
 * Normalization shared by every code reader (hardware scanner wedge, camera
 * and manual entry):
 *   1. drop invisible characters + trim
 *   2. arabic letters/digits -> the ascii key in the same position
 *   3. uppercase
 *   4. pull the code out of a `/student-card/CODE` link when the qr carries a url
 */
export function normalizeScanCode(raw) {
  if (typeof raw !== "string") return "";

  const cleaned = stripInvisibleChars(raw).trim();

  if (!cleaned) return "";

  const latin = toLatinKeyPositions(cleaned).replace(/\s+/g, "").toUpperCase();

  if (!latin) return "";

  const cardLink = latin.match(/STUDENT-CARD\/([^/?#\s]+)/);

  if (cardLink) return cardLink[1];

  if (latin.includes("/")) {
    const segment = latin.split(/[/?#&=]/).filter(Boolean).pop() ?? "";

    return segment;
  }

  return latin;
}

export function isStudentCode(raw) {
  const code = normalizeCode(raw);

  if (!code.startsWith(QR_PREFIX)) return false;

  const body = code.slice(QR_PREFIX.length);

  return (
    body.length > 0 && [...body].every((char) => QR_ALPHABET.includes(char))
  );
}

/**
 * The card QR encodes a full URL so a parent can scan it with the phone camera,
 * while staff scanners read the same QR and must pull the code out of the URL.
 */
export function extractStudentCode(raw) {
  const text = normalizeCode(raw);

  if (!text) return "";
  if (isStudentCode(text)) return text;

  const segment = text.split(/[/?#&=]/).filter(Boolean).pop() ?? "";

  return isStudentCode(segment) ? segment : text;
}

export function buildStudentCardUrl(code, origin) {
  const base = origin ?? window.location.origin;

  return `${base}${STUDENT_CARD_PATH}/${normalizeCode(code)}`;
}

export async function toQrDataUrl(text, { size = 320, margin = 1 } = {}) {
  return QRCode.toDataURL(String(text ?? ""), {
    width: size,
    margin,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
