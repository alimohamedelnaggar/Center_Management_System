import { jwtDecode } from "jwt-decode";

export function decodeToken(token) {
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function getRole(token) {
  const payload = decodeToken(token);
if (!payload) return null;
  return (
    payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
    payload.role ??
    payload["roles"] ??
    null
  );
}

export function getUserId(token) {
  const payload = decodeToken(token);
if (!payload) return null;
  return (
    payload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ] ?? null
  );
}

export function getPhone(token) {
  const payload = decodeToken(token);

  return payload?.PhoneNumber ?? null;
}

export function isExpired(token) {
  const payload = decodeToken(token);

  if (!payload) return true;

  return payload.exp * 1000 < Date.now();
}

// Teachers flagged as center admins (solo teachers) get center-manager powers.
export function isCenterAdmin(token) {
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload?.["is_center_admin"] === "true";
}

// True while the account still uses a temporary password and must replace it.
export function requiresPasswordChange(token) {
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload?.["pwd_change_required"] === "true";
}

// True while a SuperAdmin is browsing as another user.
export function isImpersonating(token) {
  const payload = decodeToken(token);
  if (!payload) return false;
  return payload?.["impersonation"] === "true";
}

export function getImpersonatedBy(token) {
  const payload = decodeToken(token);
  if (!payload) return null;
  return payload?.["impersonated_by"] ?? null;
}

