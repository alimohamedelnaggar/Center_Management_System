// Student billing type (backend enum SubscriptionType: Session = 1, Month = 2).
// Separate from center plan types (see ./planTypes.js) — different numbering and
// unrelated meaning, despite the shared "subscriptionType" field name.

export const STUDENT_SUBSCRIPTION_TYPES = {
  SESSION: 1,
  MONTH: 2,
};

export function getStudentSubscriptionTypeName(type) {
  switch (type) {
    case STUDENT_SUBSCRIPTION_TYPES.SESSION:
    case "1":
    case "Session":
    case "PerSession":
      return "حصة";

    case STUDENT_SUBSCRIPTION_TYPES.MONTH:
    case "2":
    case "Month":
    case "Monthly":
    default:
      return "شهري";
  }
}

export const STUDENT_SUBSCRIPTION_OPTIONS = [
  {
    value: STUDENT_SUBSCRIPTION_TYPES.SESSION,
    label: "حصة",
  },
  {
    value: STUDENT_SUBSCRIPTION_TYPES.MONTH,
    label: "شهري",
  },
];
