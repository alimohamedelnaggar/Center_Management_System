/**
 * Access rules for the staff routes the sidebar and the router must agree on,
 * plus the pure decision behind <ProtectedRoute>.
 *
 * The sidebar reads NAV_ITEMS (src/constants/modules.js) and the router reads
 * the table below, so a link the sidebar shows can never point at a route that
 * bounces the user back to the home page.
 */
export const ROUTE_GUARDS = {
  // "إدارة المدرسين" only makes sense in a multi-teacher center: it is hidden
  // in the sidebar while the center is solo (NAV_ITEMS.multiOnly) and the
  // route bounces the same way.
  "/teachers": {
    allowedRoles: ["CenterOwner"],
    allowSoloTeacher: true,
    multiTeacherOnly: true,
  },

  // "إحصائيات" is a center-wide stats page. The backend (AppPolicies.CenterAdmin)
  // allows owners and solo teachers in every center type, so the route must not
  // be multi-only - otherwise a solo-center owner clicks "إحصائيات" and lands
  // back on the home page.
  "/adminDashboard": {
    allowedRoles: ["CenterOwner"],
    allowSoloTeacher: true,
  },

  // "تقارير الطلاب" (accounts / attendance / exams): teachers only - the
  // report endpoints are not open to assistants.
  "/student-reports": {
    allowedRoles: ["Teacher"],
  },

  // "حسابات أولياء الأمور": the bulk endpoint uses the CenterAdmin policy
  // (AppPolicies.CenterAdmin), so owners and solo teachers only.
  "/bulk-parent-accounts": {
    allowedRoles: ["CenterOwner"],
    allowSoloTeacher: true,
  },
};

/**
 * The access decision used by <ProtectedRoute>.
 *
 * @param guard  { allowedRoles, allowSoloTeacher, multiTeacherOnly }
 * @param auth   { role, isCenterAdmin, isSoloCenter, centerTypeLoaded }
 * @returns { allowed, pending } - "pending" means the center type is not known
 *   yet, so the caller must wait instead of bouncing the user.
 */
export function canEnterRoute(guard, auth) {
  const {
    allowedRoles,
    allowSoloTeacher = false,
    multiTeacherOnly = false,
  } = guard ?? {};
  const { role, isCenterAdmin, isSoloCenter, centerTypeLoaded } = auth ?? {};

  if (multiTeacherOnly && !centerTypeLoaded) {
    return { allowed: false, pending: true, reason: "unknown-center-type" };
  }

  if (multiTeacherOnly && isSoloCenter) {
    return { allowed: false, pending: false, reason: "solo-center" };
  }

  const roleAllowed = !allowedRoles || allowedRoles.includes(role);
  const soloTeacherAllowed =
    allowSoloTeacher && role === "Teacher" && isCenterAdmin;

  if (!roleAllowed && !soloTeacherAllowed) {
    return { allowed: false, pending: false, reason: "role" };
  }

  return { allowed: true, pending: false, reason: null };
}
