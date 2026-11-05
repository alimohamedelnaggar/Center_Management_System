import { z } from "zod";

/**
 * Shared rules for the optional email on staff accounts. Kept in one place so
 * every modal validates the same way and shows the same wording as the API.
 */
export const STAFF_EMAIL_MAX_LENGTH = 254;

export const STAFF_EMAIL_HELPER_TEXT =
  "اختياري، لكن بدونه لن تستطيع استعادة كلمة المرور بنفسك وستحتاج للتواصل مع المنصة.";

export const STAFF_EMAIL_INVALID_MESSAGE = "البريد الإلكتروني غير صحيح.";
export const STAFF_EMAIL_TOO_LONG_MESSAGE = "البريد الإلكتروني طويل جدًا";

/**
 * An omitted address is valid. A supplied address is trimmed, checked against
 * the length Identity allows, and must be a real email address.
 */
export const optionalStaffEmailSchema = z
  .string()
  .trim()
  .max(STAFF_EMAIL_MAX_LENGTH, { message: STAFF_EMAIL_TOO_LONG_MESSAGE })
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: STAFF_EMAIL_INVALID_MESSAGE,
  });

/** Trimmed + lower-cased address, or null when the field is empty. */
export function normalizeStaffEmail(value) {
  const trimmed = (value ?? "").trim();

  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * Returns <c>{ valid, message, value }</c>. <c>value</c> is the normalized
 * address (or null for an omitted one) and is only meaningful when valid.
 */
export function validateStaffEmail(value) {
  const result = optionalStaffEmailSchema.safeParse(value ?? "");

  if (!result.success) {
    return {
      valid: false,
      message: result.error.issues[0]?.message ?? STAFF_EMAIL_INVALID_MESSAGE,
      value: null,
    };
  }

  return { valid: true, message: null, value: normalizeStaffEmail(result.data) };
}
