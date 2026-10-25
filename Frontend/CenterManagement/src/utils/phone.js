/**
 * Egyptian phone helpers.
 *
 * Numbers are stored in the local format (01xxxxxxxxx). WhatsApp needs the
 * international format (201xxxxxxxxx) with no leading zero and no "+" in the
 * wa.me path.
 */

/**
 * Normalizes an Egyptian mobile number to the international digits used by
 * wa.me: 01xxxxxxxxx / +201xxxxxxxxx / 00201... -> 201xxxxxxxxx.
 * Returns null when the input is not a valid Egyptian mobile number.
 */
export function normalizeEgyptianPhone(rawPhone) {
  if (!rawPhone) return null;

  // Keep digits only.
  let digits = String(rawPhone).replace(/\D/g, "");

  if (!digits) return null;

  // 0020... -> 20...
  if (digits.startsWith("0020")) {
    digits = digits.slice(2);
  }

  // 20... -> keep; 01... -> 2 01...; 1... -> 20 1...
  if (digits.startsWith("20")) {
    // already international (20 + 1xxxxxxxxx)
  } else if (digits.startsWith("0")) {
    digits = "20" + digits.slice(1);
  } else {
    digits = "20" + digits;
  }

  // A valid Egyptian mobile: 20 + 1[0125] + 8 digits = 12 digits.
  if (!/^201[0125]\d{8}$/.test(digits)) {
    return null;
  }

  return digits;
}

/**
 * Builds a wa.me link with a prefilled reminder message.
 * Returns null when the phone number cannot be normalized.
 */
export function buildWhatsAppLink(rawPhone, message) {
  const normalized = normalizeEgyptianPhone(rawPhone);

  if (!normalized) return null;

  const text = message ? `?text=${encodeURIComponent(message)}` : "";

  return `https://wa.me/${normalized}${text}`;
}
