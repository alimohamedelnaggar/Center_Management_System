import { buildWhatsAppLink } from "./phone";

/**
 * Shared WhatsApp message-template helpers.
 *
 * The message *text* is never defined here: the backend is the single source of
 * truth (`GET Api/V1/MessageTemplate/List`) and every screen passes the saved
 * body to these helpers. That way editing a template changes the attendance,
 * exam-result and overdue reminders together.
 *
 * These are manual wa.me links: the operator clicks the button and WhatsApp
 * opens with the text prefilled. Nothing is sent automatically and these are
 * not Meta message templates.
 */

export const MESSAGE_TEMPLATE_KEYS = {
  absence: "absence",
  examResult: "examResult",
  feesReminder: "feesReminder",
};

/** Arabic labels for the fixed template types (server keys stay English). */
export const MESSAGE_TEMPLATE_LABELS = {
  [MESSAGE_TEMPLATE_KEYS.absence]: "غياب طالب",
  [MESSAGE_TEMPLATE_KEYS.examResult]: "نتيجة امتحان",
  [MESSAGE_TEMPLATE_KEYS.feesReminder]: "تذكير بالرسوم",
};

/**
 * Placeholders that live on their own signature line. When their value is empty
 * the whole line is removed, so the message never ends with a dangling
 * "مع تحيات ." (or a literal "{center}").
 */
const OPTIONAL_LINE_PLACEHOLDERS = ["center"];

/**
 * Drops any line that still contains an unresolved optional placeholder. If that
 * would leave the message empty (the template was nothing but the signature),
 * the tokens are removed instead so the caller keeps a usable message.
 */
function collapseOptionalLines(message) {
  const tokens = OPTIONAL_LINE_PLACEHOLDERS.map((key) => `{${key}}`);
  if (!tokens.some((token) => message.includes(token))) return message;

  const kept = message
    .split("\n")
    .filter((line) => !tokens.some((token) => line.includes(token)));

  const joined = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (joined !== "") return joined;

  let fallback = message;
  for (const token of tokens) fallback = fallback.split(token).join("");
  return fallback.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Replaces every {token} in a template with the matching value. Unknown or
 * `null`/`undefined` values keep their placeholder so a missing value is visible
 * instead of silently collapsing the sentence.
 */
export function fillTemplate(template, values = {}) {
  if (!template) return "";

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Returns the saved body for a key. `bodies` is the `{ key: body }` map built
 * from the backend response; when it is missing the body is empty (the caller
 * must not fall back to a hardcoded message).
 */
export function getMessageTemplate(key, bodies = null) {
  const body = bodies?.[key];
  return typeof body === "string" ? body : "";
}

/** True once the backend body for a key has been loaded. */
export function hasMessageTemplate(key, bodies = null) {
  return getMessageTemplate(key, bodies).trim() !== "";
}

/** Fills the saved template for a key with the given values. */
export function buildMessageFromTemplate(key, values = {}, bodies = null) {
  const template = getMessageTemplate(key, bodies);

  // A blank center name must drop the signature line, not render "مع تحيات .".
  const normalized = { ...values };
  if (typeof normalized.center === "string") {
    const trimmed = normalized.center.trim();
    if (trimmed === "") {
      delete normalized.center;
    } else {
      normalized.center = trimmed;
    }
  }

  return collapseOptionalLines(fillTemplate(template, normalized));
}

/**
 * Builds a wa.me link from a template key + values. Returns null when the phone
 * number cannot be normalized or the template body has not loaded yet, so
 * callers can disable the button.
 */
export function buildTemplateWhatsAppLink(rawPhone, key, values, bodies = null) {
  const message = buildMessageFromTemplate(key, values, bodies);

  if (!message.trim()) return null;

  return buildWhatsAppLink(rawPhone, message);
}
