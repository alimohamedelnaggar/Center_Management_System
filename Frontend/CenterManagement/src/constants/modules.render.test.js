import { describe, expect, it } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { canUseModule, normaliseModules } from "./modules";

/**
 * Mirrors exactly how AuthContext.hasModule + AppSidebar evaluate a module:
 * the context hands `canUseModule` a `Set`, and the sidebar calls it once per
 * nav item during render. This is the call that used to throw
 * "(keys || []).filter is not a function" and blank the page for a teacher.
 */
function SidebarGate({ role, enabledModules, modulesLoaded = true }) {
  const isSuperAdmin = role === "SuperAdmin";
  const isStudent = role === "Student";
  const set = new Set(normaliseModules(enabledModules));
  const hasModule = (key) =>
    canUseModule(key, set, { isSuperAdmin, isStudent, modulesLoaded });

  const items = ["core", "attendance", "payments", "grades"];
  return h(
    "ul",
    null,
    items.filter(hasModule).map((key) => h("li", { key }, key)),
  );
}

const cases = [
  ["CenterOwner", null],
  ["CenterOwner", undefined],
  ["CenterOwner", []],
  ["CenterOwner", "attendance"],
  ["CenterOwner", { attendance: true }],
  ["CenterOwner", new Set(["payments"])],
  ["CenterOwner", ["attendance", "payments"]],
  ["Teacher", []],
  ["Teacher", ["attendance"]],
  ["Assistant", []],
  ["Student", ["grades"]],
  ["SuperAdmin", null],
];

describe("sidebar gate renders for every role without crashing", () => {
  it.each(cases)("role=%s enabledModules=%o", (role, enabledModules) => {
    expect(() =>
      renderToStaticMarkup(h(SidebarGate, { role, enabledModules })),
    ).not.toThrow();
  });

  it("shows a bought module and hides the rest", () => {
    const html = renderToStaticMarkup(
      h(SidebarGate, { role: "CenterOwner", enabledModules: ["attendance"] }),
    );
    expect(html).toContain("attendance");
    expect(html).not.toContain("payments");
  });

  it("fails open before modules load (no locked flash)", () => {
    const html = renderToStaticMarkup(
      h(SidebarGate, {
        role: "CenterOwner",
        enabledModules: null,
        modulesLoaded: false,
      }),
    );
    expect(html).toContain("payments");
  });

  it("never gates a Student even with an empty list", () => {
    const html = renderToStaticMarkup(
      h(SidebarGate, { role: "Student", enabledModules: [] }),
    );
    expect(html).toContain("payments");
  });
});
