import { Navigate, Outlet } from "react-router-dom";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/useAuth";
import { homeFor } from "../../utils/homeRoute";
import { canEnterRoute } from "../../constants/routeGuards";

/**
 * Guards a route group.
 * - `allowedRoles`: the roles that may enter.
 * - `allowSoloTeacher`: also lets a Teacher who runs his own center in
 *   (Teacher role + is_center_admin claim), matching the backend policies.
 * - `multiTeacherOnly`: bounce out of a solo center (Center.Type gate), so the
 *   shared nav helper and this guard stay in sync.
 * - `allowWhilePasswordChange`: don't bounce to the change-password screen
 *   (used by that screen itself).
 */
export default function ProtectedRoute({
  allowedRoles,
  allowSoloTeacher = false,
  multiTeacherOnly = false,
  allowWhilePasswordChange = false,
}) {
  const {
    loading,
    isAuthenticated,
    role,
    isCenterAdmin,
    mustChangePassword,
    centerTypeLoaded,
    isSoloCenter,
  } = useAuth();

  if (loading) {
    return <Spinner msg="جاري التحميل" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && !allowWhilePasswordChange) {
    return <Navigate to="/force-password" replace />;
  }

  // A multi-teacher-only page in a solo center: wait for centerType, then bounce.
  const decision = canEnterRoute(
    { allowedRoles, allowSoloTeacher, multiTeacherOnly },
    { role, isCenterAdmin, isSoloCenter, centerTypeLoaded },
  );

  if (decision.pending) {
    return <Spinner msg="جاري التحميل" />;
  }

  if (!decision.allowed) {
    return <Navigate to={homeFor(role)} replace />;
  }

  return <Outlet />;
}
