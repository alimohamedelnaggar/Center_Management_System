import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { canUseModule, normaliseModules } from "@/constants/modules";

/**
 * Every WhatsApp action button in the staff UI (attendance sheet, overdue
 * reminders, student QR cards, exam results) is wrapped in this gate, so a
 * center without the `whatsapp` module never sees a WhatsApp link.
 */

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

import ModuleOnly from "@/components/common/ModuleOnly";

function auth(enabledModules, role = "Assistant") {
  const isSuperAdmin = role === "SuperAdmin";
  const isStudent = role === "Student";
  const set = new Set(normaliseModules(enabledModules));
  return {
    role,
    hasModule: (key) =>
      canUseModule(key, set, { isSuperAdmin, isStudent, modulesLoaded: true }),
  };
}

const renderWhatsApp = () =>
  renderToStaticMarkup(
    h(ModuleOnly, { moduleKey: "whatsapp" }, h("button", null, "WHATSAPP_ACTION")),
  );

describe("whatsapp action buttons are gated by the whatsapp module", () => {
  it("renders the action when whatsapp is enabled", () => {
    state.auth = auth(["whatsapp", "attendance"]);
    expect(renderWhatsApp()).toContain("WHATSAPP_ACTION");
  });

  it("hides the action when whatsapp is disabled", () => {
    state.auth = auth(["attendance", "payments"]);
    expect(renderWhatsApp()).not.toContain("WHATSAPP_ACTION");
  });

  it("hides the action when nothing is enabled", () => {
    state.auth = auth([]);
    expect(renderWhatsApp()).not.toContain("WHATSAPP_ACTION");
  });
});
