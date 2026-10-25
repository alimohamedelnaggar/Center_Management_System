import { buildWhatsAppLink } from "./phone";

/**
 * Shared WhatsApp message templates.
 *
 * A single place for the parent-facing messages so every screen (attendance,
 * grades, overdue) builds the same text, and so a center can later override the
 * wording (STEP 4) without touching the screens.
 *
 * Templates are plain strings containing {placeholder} tokens. The known tokens
 * are listed per template so the editor UI can advertise them.
 */

export const MESSAGE_TEMPLATE_KEYS = {
  absence: "absence",
  examResult: "examResult",
  feesReminder: "feesReminder",
};

export const MESSAGE_PLACEHOLDERS = {
  [MESSAGE_TEMPLATE_KEYS.absence]: [
    "parent",
    "student",
    "group",
    "center",
    "date",
  ],
  [MESSAGE_TEMPLATE_KEYS.examResult]: [
    "parent",
    "student",
    "center",
    "exam",
    "score",
    "total",
  ],
  [MESSAGE_TEMPLATE_KEYS.feesReminder]: [
    "parent",
    "student",
    "center",
    "amount",
    "month",
  ],
};

export const DEFAULT_MESSAGE_TEMPLATES = {
  [MESSAGE_TEMPLATE_KEYS.absence]:
    "السلام عليكم، نحيطكم علماً بأن الطالب {student} تغيّب عن حصة {group} بتاريخ {date}.\nمع تحيات {center}.",
  [MESSAGE_TEMPLATE_KEYS.examResult]:
    "السلام عليكم، حصل الطالب {student} على {score} من {total} في {exam}.\nمع تحيات {center}.",
  [MESSAGE_TEMPLATE_KEYS.feesReminder]:
    "مرحباً، نود تذكيركم بسداد اشتراك شهر {month} للطالب {student}. المتبقي: {amount}.\nمع تحيات {center}.",
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

/** Returns the template for a key, preferring a caller-supplied override. */
export function getMessageTemplate(key, overrides = null) {
  const override = overrides?.[key];
  if (typeof override === "string" && override.trim() !== "") {
    return override;
  }

  return DEFAULT_MESSAGE_TEMPLATES[key] ?? "";
}

/** Fills the (possibly overridden) template for a key with the given values. */
export function buildMessageFromTemplate(key, values = {}, overrides = null) {
  const template = getMessageTemplate(key, overrides);

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
 * number cannot be normalized, so callers can disable the button.
 */
export function buildTemplateWhatsAppLink(rawPhone, key, values, overrides = null) {
  const message = buildMessageFromTemplate(key, values, overrides);
  return buildWhatsAppLink(rawPhone, message);
}
