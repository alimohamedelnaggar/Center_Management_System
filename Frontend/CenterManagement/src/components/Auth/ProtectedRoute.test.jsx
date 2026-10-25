// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const state = vi.hoisted(() => ({ auth: {} }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

import ProtectedRoute from "./ProtectedRoute";
import { ROUTE_GUARDS } from "@/constants/routeGuards";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const HOME_PATHS = ["/dashboard", "/center/dashboard", "/teacher/dashboard"];

const render = async (path) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      h(
        MemoryRouter,
        { initialEntries: [path] },
        h(
          Routes,
          null,
          h(
            Route,
            { element: h(ProtectedRoute, { ...ROUTE_GUARDS[path] }) },
            h(Route, { path, element: h("div", null, "PAGE") }),
          ),
          ...HOME_PATHS.map((home) =>
            h(Route, { path: home, element: h("div", null, "HOME") }),
          ),
        ),
      ),
    );
  });

  return container.textContent;
};

beforeEach(() => {
  state.auth = {
    loading: false,
    isAuthenticated: true,
    role: "CenterOwner",
    isCenterAdmin: false,
    mustChangePassword: false,
    centerTypeLoaded: true,
    isSoloCenter: true,
  };
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("ProtectedRoute inside the real router", () => {
  it("a solo-center owner opening the statistics page stays on it", async () => {
    expect(await render("/adminDashboard")).toBe("PAGE");
  });

  it("a solo-center owner opening the teachers page is bounced to home", async () => {
    expect(await render("/teachers")).toBe("HOME");
  });

  it("a multi-center owner opening the teachers page stays on it", async () => {
    state.auth = { ...state.auth, isSoloCenter: false };
    expect(await render("/teachers")).toBe("PAGE");
  });
});
