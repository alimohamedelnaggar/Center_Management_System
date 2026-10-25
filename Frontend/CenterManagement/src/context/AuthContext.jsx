import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient, { setAccessToken as setAxiosAccessToken } from "../api/axios";
import { authService } from "../components/Auth/Services/auth-service";
import { impersonationService } from "../services/platformService";
import { canUseModule, canUseCenterModule, normaliseModules } from "../constants/modules";
import {
  decodeToken,
  getRole,
  isCenterAdmin,
  isImpersonating,
  getImpersonatedBy,
  requiresPasswordChange,
} from "../utils/jwt";

export const AuthContext = createContext(null);

/**
 * Older builds (or a half-written snapshot) may have persisted a module list in
 * localStorage. We never trust it: if the key exists but is not a plain array
 * of strings we drop it, so a stale/broken value can never brick the app.
 */
function clearMalformedLegacyStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;

  for (const key of ["enabledModules", "centerModules", "cm.enabledModules"]) {
    let raw;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      continue;
    }
    if (raw === null) continue;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }

    const valid =
      Array.isArray(parsed) && parsed.every((k) => typeof k === "string");

    if (!valid) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [impersonationWarning, setImpersonationWarning] = useState(null);
  // Feature modules + subscription snapshot returned by SignIn / refresh / me.
  const [enabledModules, setEnabledModules] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  // "SoloTeacher" / "MultiTeacher" / null (platform users). Read from the DB
  // via /me so a center upgrade is reflected without a new token.
  const [centerType, setCenterType] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  // The caller's own teacher subject (null for non-teachers / unset).
  const [subject, setSubject] = useState(null);

  // The operator's own token, kept aside while an impersonation session runs.
  const originalTokenRef = useRef(null);

  const user = useMemo(() => {
    if (!accessToken) return null;

    try {
      return decodeToken(accessToken);
    } catch {
      return null;
    }
  }, [accessToken]);

  const role = useMemo(() => {
    if (!accessToken) return null;
    return getRole(accessToken);
  }, [accessToken]);

  const centerAdmin = useMemo(() => isCenterAdmin(accessToken), [accessToken]);
  const impersonating = useMemo(() => isImpersonating(accessToken), [accessToken]);
  const impersonatedBy = useMemo(() => getImpersonatedBy(accessToken), [accessToken]);

  // A solo teacher runs his own center (Teacher role + is_center_admin claim)
  // and keeps full management. Owners manage too; a plain teacher/assistant is
  // read-only.
  const soloTeacher = useMemo(
    () => role === "Teacher" && centerAdmin,
    [role, centerAdmin],
  );
  const isSuperAdmin = role === "SuperAdmin";
  const isStudent = role === "Student";
  // The rule is Center.Type, not role flags: any center upgraded to
  // MultiTeacher exposes the teacher features for every role automatically.
  // Before centerType has loaded we do NOT assume solo (fail open to multi).
  const isSoloCenter = useMemo(() => centerType === "SoloTeacher", [centerType]);
  const centerTypeLoaded = useMemo(
    () => isSuperAdmin === true || profileLoaded,
    [isSuperAdmin, profileLoaded],
  );
  const canManageGroups = useMemo(
    () => role === "CenterOwner" || soloTeacher,
    [role, soloTeacher],
  );

  const enabledSet = useMemo(
    () => new Set(normaliseModules(enabledModules)),
    [enabledModules],
  );

  /**
   * The single gate used everywhere (sidebar, routes, in-page buttons).
   * `core`, platform users and students are never gated; before the module
   * list has loaded we fail open so the UI never bricks.
   */
  const hasModule = useCallback(
    (key) =>
      canUseModule(key, enabledSet, {
        isSuperAdmin,
        isStudent,
        modulesLoaded,
      }),
    [enabledSet, isSuperAdmin, isStudent, modulesLoaded],
  );

  /**
   * Same idea as `hasModule` but ignores role exemptions — used by the student
   * portal nav so a Student only sees sections the center bought.
   */
  const hasCenterModule = useCallback(
    (key) => canUseCenterModule(key, enabledModules, modulesLoaded),
    [enabledModules, modulesLoaded],
  );

  /** Store the module + subscription snapshot from any auth response. */
  function applyAuthExtras(result) {
    if (!result || typeof result !== "object") return;

    // Always store a clean string[]; a missing field leaves the previous
    // snapshot untouched so a partial response never wipes the sidebar.
    if (result.enabledModules !== undefined) {
      setEnabledModules(normaliseModules(result.enabledModules));
      setModulesLoaded(true);
    }

    setSubscription(result.subscription ?? null);
  }

  /** Apply the /me payload (center type + modules + subscription). */
  function applyProfilePayload(payload) {
    if (!payload || typeof payload !== "object") return;

    if ("centerType" in payload) setCenterType(payload.centerType ?? null);
    if ("subject" in payload) setSubject(payload.subject ?? null);
    setProfileLoaded(true);

    if ("enabledModules" in payload) {
      setEnabledModules(normaliseModules(payload.enabledModules));
      setModulesLoaded(true);
    }
    if ("subscription" in payload) {
      setSubscription(payload.subscription ?? null);
    }
  }

  /**
   * Re-read the enabled modules + subscription without a full re-login.
   * Called on every 403 MODULE_DISABLED so a module the admin just turned off
   * disappears from the sidebar within the 45s server cache window.
   */
  const refreshModules = useCallback(async () => {
    if (!accessToken) return null;

    try {
      const response = await apiClient.get("/Profile/GetMyProfile");
      const payload = response?.data?.data ?? response?.data ?? null;
      applyProfilePayload(payload);
      return payload;
    } catch {
      return null;
    }
  }, [accessToken]);

  // A module toggled by the admin is announced by the axios interceptor.
  useEffect(() => {
    const onBlocked = () => {
      refreshModules();
    };

    // The API rejected a request because the temporary password is pending.
    const onPasswordChangeRequired = () => {
      setMustChangePassword(true);
    };

    window.addEventListener("module:blocked", onBlocked);
    window.addEventListener("password:change-required", onPasswordChangeRequired);

    return () => {
      window.removeEventListener("module:blocked", onBlocked);
      window.removeEventListener(
        "password:change-required",
        onPasswordChangeRequired,
      );
    };
  }, [refreshModules]);

  function applyToken(token) {
    setAxiosAccessToken(token);
    setToken(token);
    // The claim is authoritative: it is present on every access token until
    // the password is actually changed.
    setMustChangePassword(requiresPasswordChange(token));
  }

  async function restoreSession() {
    try {
      const result = await authService.refreshToken();
      applyToken(result.accessToken);
      setMustChangePassword(!!result.mustChangePassword);
      applyAuthExtras(result);
    } catch {
      applyToken(null);
      setEnabledModules([]);
      setSubscription(null);
      setModulesLoaded(false);
      setCenterType(null);
      setProfileLoaded(false);
      setSubject(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (() => {
      clearMalformedLegacyStorage();
      restoreSession();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch /me once a token exists so centerType is known for every role.
  useEffect(() => {
    if (accessToken && !profileLoaded) {
      refreshModules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, profileLoaded]);

  async function login(phoneNumber, password) {
    const result = await authService.login(phoneNumber, password);
    // Seed the context with the fresh token so isAuthenticated/role update
    // immediately; otherwise ProtectedRoute bounces the redirect back to /login.
    applyToken(result.accessToken);
    setMustChangePassword(!!result.mustChangePassword);
    applyAuthExtras(result);
    return decodeToken(result.accessToken);
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      originalTokenRef.current = null;
      setMustChangePassword(false);
      setImpersonationWarning(null);
      setEnabledModules([]);
      setSubscription(null);
      setModulesLoaded(false);
      setCenterType(null);
      setProfileLoaded(false);
      setSubject(null);
      applyToken(null);
    }
  }

  // SuperAdmin browses as another user; the operator token is stashed for later.
  async function startImpersonation(userId) {
    const response = await impersonationService.start(userId);
    if (response?.succeeded === false || !response?.data?.accessToken) {
      throw new Error(response?.message || "تعذر بدء الانتحال");
    }

    if (!isImpersonating(accessToken)) {
      originalTokenRef.current = accessToken;
    }

    setImpersonationWarning(response.data.centerWarning ?? null);
    applyToken(response.data.accessToken);
    // The impersonated user may have a different module set / subscription /
    // center type, so always re-read /me.
    setProfileLoaded(false);
    setCenterType(null);
    setSubject(null);
    if (response.data.enabledModules !== undefined) {
      applyAuthExtras(response.data);
    }
    refreshModules();
    return response.data;
  }

  async function stopImpersonation() {
    let restoredToken = null;

    try {
      const response = await impersonationService.stop();
      restoredToken = response?.data?.accessToken ?? null;
    } catch {
      restoredToken = null;
    }

    setImpersonationWarning(null);
    applyToken(restoredToken ?? originalTokenRef.current);
    originalTokenRef.current = null;
    // Back to the operator: platform users have no center subscription.
    setSubscription(null);
    setEnabledModules([]);
    setModulesLoaded(false);
    setCenterType(null);
    setProfileLoaded(false);
    setSubject(null);
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        loading,
        login,
        logout,
        role,
        isCenterAdmin: centerAdmin,
        isSoloTeacher: soloTeacher,
        canManageGroups,
        mustChangePassword,
        setMustChangePassword,
        impersonating,
        impersonatedBy,
        impersonationWarning,
        startImpersonation,
        stopImpersonation,
        setAccessToken: applyToken,
        isAuthenticated: !!accessToken,
        // Feature modules + subscription.
        enabledModules,
        subscription,
        modulesLoaded,
        // Center type ("SoloTeacher" / "MultiTeacher") drives multi-teacher UI.
        centerType,
        centerTypeLoaded,
        isSoloCenter,
        profileLoaded,
        // The caller's own teacher subject (null when unset / not a teacher).
        subject,
        hasModule,
        hasCenterModule,
        refreshModules,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
