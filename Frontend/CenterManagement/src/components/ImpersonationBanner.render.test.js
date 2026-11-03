import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The banner must name the impersonated account, not the generic "مستخدم".
 * The API puts the name in ClaimTypes.Name, which is the xmlsoap 2005/05 URI —
 * the 2008/06 URI belongs to ClaimTypes.Role and never carries a name (F-005).
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("react-router-dom", () => ({ useNavigate: () => () => {} }));

import ImpersonationBanner from "@/components/ImpersonationBanner";

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const WRONG_NAME_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/name";

function render(auth) {
  state.auth = {
    stopImpersonation: () => {},
    role: null,
    impersonating: true,
    impersonationWarning: null,
    user: null,
    ...auth,
  };
  return renderToStaticMarkup(h(ImpersonationBanner));
}

describe("ImpersonationBanner", () => {
  it("shows the name carried by the ClaimTypes.Name claim", () => {
    const html = render({
      role: "CenterOwner",
      user: { [NAME_CLAIM]: "أ. حسناء عبد الله" },
    });

    expect(html).toContain("أ. حسناء عبد الله");
    expect(html).not.toContain("مستخدم");
  });

  it("still understands the 2008/06 name claim and a plain name property", () => {
    expect(
      render({ role: "Teacher", user: { [WRONG_NAME_CLAIM]: "أ. كريم مصطفى" } }),
    ).toContain("أ. كريم مصطفى");
    expect(render({ role: "Teacher", user: { name: "أ. هدى كامل" } })).toContain(
      "أ. هدى كامل",
    );
  });

  it("falls back to the generic label when the token has no name", () => {
    expect(render({ role: "Assistant", user: {} })).toContain("مستخدم");
  });

  it("renders nothing when no impersonation session is active", () => {
    expect(
      render({ impersonating: false, user: { [NAME_CLAIM]: "أ. حسناء عبد الله" } }),
    ).toBe("");
  });
});
