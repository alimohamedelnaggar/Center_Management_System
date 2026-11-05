import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import OwnerEmailWarning from "./OwnerEmailWarning";

/**
 * The owner-only, non-blocking reminder for a missing recovery address. It must
 * never appear for teachers/assistants, never before /me loaded (so it cannot
 * flash on every sign-in), and never during impersonation.
 */

const state = vi.hoisted(() => ({
  auth: {
    role: "CenterOwner",
    isSoloTeacher: false,
    email: null,
    profileLoaded: true,
    impersonating: false,
  },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

const render = () =>
  renderToStaticMarkup(
    h(MemoryRouter, null, h(OwnerEmailWarning)),
  );

const WARNING = "أضف بريدك لتتمكن من استعادة كلمة المرور.";

afterEach(() => {
  state.auth = {
    role: "CenterOwner",
    isSoloTeacher: false,
    email: null,
    profileLoaded: true,
    impersonating: false,
  };
});

describe("OwnerEmailWarning", () => {
  it("shows the reminder and the profile link to an owner without an email", () => {
    const html = render();

    expect(html).toContain(WARNING);
    expect(html).toContain("/profile");
    expect(html).toContain("إضافة بريد إلكتروني");
  });

  it("also shows for a solo teacher", () => {
    state.auth = { ...state.auth, role: "Teacher", isSoloTeacher: true };

    expect(render()).toContain(WARNING);
  });

  it("stays hidden when the owner already has an email", () => {
    state.auth = { ...state.auth, email: "owner@example.com" };

    expect(render()).not.toContain(WARNING);
  });

  it("stays hidden for regular teachers and assistants", () => {
    for (const role of ["Teacher", "Assistant"]) {
      state.auth = { ...state.auth, role };
      expect(render()).not.toContain(WARNING);
    }
  });

  it("stays hidden until the profile has loaded", () => {
    state.auth = { ...state.auth, profileLoaded: false };

    expect(render()).not.toContain(WARNING);
  });

  it("stays hidden while a SuperAdmin impersonates the owner", () => {
    state.auth = { ...state.auth, impersonating: true };

    expect(render()).not.toContain(WARNING);
  });
});
