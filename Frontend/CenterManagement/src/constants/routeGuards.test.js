import { describe, expect, it } from "vitest";
import {
  NAV_ITEMS,
  canSeeNavItem,
  navRoleContext,
} from "@/constants/modules";
import { ROUTE_GUARDS, canEnterRoute } from "@/constants/routeGuards";

/**
 * The sidebar and the router must agree: a link the sidebar shows may never
 * bounce the user back to the home page. The "إحصائيات" link used to be shown
 * to solo-center owners while its route was multi-teacher-only, so clicking it
 * silently landed on the home page.
 */

const item = (key) => NAV_ITEMS.find((i) => i.key === key);

const viewer = ({ role, isCenterAdmin = false, centerType }) => {
  const ctx = navRoleContext({ role, isCenterAdmin, centerType });
  return {
    ctx,
    auth: {
      role,
      isCenterAdmin,
      isSoloCenter: ctx.isSoloCenter,
      centerTypeLoaded: true,
    },
  };
};

const SOLO_OWNER = viewer({
  role: "CenterOwner",
  centerType: "SoloTeacher",
});
const MULTI_OWNER = viewer({
  role: "CenterOwner",
  centerType: "MultiTeacher",
});
const SOLO_TEACHER = viewer({
  role: "Teacher",
  isCenterAdmin: true,
  centerType: "SoloTeacher",
});
const PURE_TEACHER = viewer({
  role: "Teacher",
  centerType: "MultiTeacher",
});
const ASSISTANT = viewer({
  role: "Assistant",
  centerType: "MultiTeacher",
});

describe("the statistics page matches its sidebar entry", () => {
  it("a solo-center owner sees it in the sidebar and is not bounced to home", () => {
    expect(canSeeNavItem(item("adminDashboard"), SOLO_OWNER.ctx)).toBe(true);

    const decision = canEnterRoute(
      ROUTE_GUARDS["/adminDashboard"],
      SOLO_OWNER.auth,
    );
    expect(decision.allowed).toBe(true);
    expect(decision.pending).toBe(false);
  });

  it("a solo teacher (teacher + center admin) sees it and is not bounced", () => {
    expect(canSeeNavItem(item("adminDashboard"), SOLO_TEACHER.ctx)).toBe(true);
    expect(
      canEnterRoute(ROUTE_GUARDS["/adminDashboard"], SOLO_TEACHER.auth)
        .allowed,
    ).toBe(true);
  });

  it("a multi-center owner sees it and is not bounced", () => {
    expect(canSeeNavItem(item("adminDashboard"), MULTI_OWNER.ctx)).toBe(true);
    expect(
      canEnterRoute(ROUTE_GUARDS["/adminDashboard"], MULTI_OWNER.auth)
        .allowed,
    ).toBe(true);
  });

  it("a pure teacher or an assistant never sees it and is bounced if they try", () => {
    for (const who of [PURE_TEACHER, ASSISTANT]) {
      expect(canSeeNavItem(item("adminDashboard"), who.ctx)).toBe(false);
      expect(
        canEnterRoute(ROUTE_GUARDS["/adminDashboard"], who.auth).allowed,
      ).toBe(false);
    }
  });
});

describe("the student reports page is for teachers", () => {
  it("a teacher and a solo teacher may open it", () => {
    for (const who of [PURE_TEACHER, SOLO_TEACHER]) {
      expect(canSeeNavItem(item("student-reports"), who.ctx)).toBe(true);
      expect(
        canEnterRoute(ROUTE_GUARDS["/student-reports"], who.auth).allowed,
      ).toBe(true);
    }
  });

  it("an owner or an assistant never sees it and is bounced if they try", () => {
    for (const who of [SOLO_OWNER, MULTI_OWNER, ASSISTANT]) {
      expect(canSeeNavItem(item("student-reports"), who.ctx)).toBe(false);
      expect(
        canEnterRoute(ROUTE_GUARDS["/student-reports"], who.auth).allowed,
      ).toBe(false);
    }
  });
});

describe("the teachers page stays multi-teacher only", () => {  it("is hidden in the sidebar and bounced in a solo center", () => {
    expect(canSeeNavItem(item("teachers"), SOLO_OWNER.ctx)).toBe(false);

    const decision = canEnterRoute(ROUTE_GUARDS["/teachers"], SOLO_OWNER.auth);
    expect(decision.allowed).toBe(false);
    expect(decision.pending).toBe(false);
    expect(decision.reason).toBe("solo-center");
  });

  it("is visible and reachable in a multi-teacher center", () => {
    expect(canSeeNavItem(item("teachers"), MULTI_OWNER.ctx)).toBe(true);
    expect(
      canEnterRoute(ROUTE_GUARDS["/teachers"], MULTI_OWNER.auth).allowed,
    ).toBe(true);
  });

  it("waits for the center type instead of bouncing while it is unknown", () => {
    const decision = canEnterRoute(ROUTE_GUARDS["/teachers"], {
      role: "CenterOwner",
      isCenterAdmin: false,
      isSoloCenter: false,
      centerTypeLoaded: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.pending).toBe(true);
  });
});

describe("no sidebar link points at a route that bounces the viewer", () => {
  const VIEWERS = [
    ["solo owner", SOLO_OWNER],
    ["multi owner", MULTI_OWNER],
    ["solo teacher", SOLO_TEACHER],
    ["pure teacher", PURE_TEACHER],
    ["assistant", ASSISTANT],
  ];

  it.each(VIEWERS)("%s: every visible entry is reachable", (_name, who) => {
    for (const navItem of NAV_ITEMS) {
      if (!canSeeNavItem(navItem, who.ctx)) continue;

      const guard = ROUTE_GUARDS[navItem.path];
      if (!guard) continue; // routes without a center-type rule keep their own guard

      const decision = canEnterRoute(guard, who.auth);
      expect(
        decision.allowed,
        `"${navItem.label}" is visible but the route bounces (${decision.reason})`,
      ).toBe(true);
    }
  });
});
