// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

/**
 * Batch 10 contract tests for the four SuperAdmin screens.
 *
 * These are written against the agreed testid contract (the page redesigns add
 * the hooks), not against the current markup. Mock services are shared through
 * vi.hoisted so the vi.mock factories can reference them safely.
 */
const services = vi.hoisted(() => ({
  // centerService
  getCentersPaged: vi.fn(),
  setStatus: vi.fn(),
  resetUserPassword: vi.fn(),
  createWithOwner: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  upgradeToMultiTeacher: vi.fn(),
  // subscriptionService
  list: vi.fn(),
  renew: vi.fn(),
  // platformService / auditLogService
  getStatistics: vi.fn(),
  getPaginated: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  role: "SuperAdmin",
  hasModule: () => true,
  accessToken: "test-access-token",
  startImpersonation: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => authMock,
}));

vi.mock("../services/centerService", () => ({
  centerService: {
    getCentersPaged: services.getCentersPaged,
    setStatus: services.setStatus,
    resetUserPassword: services.resetUserPassword,
    createWithOwner: services.createWithOwner,
    update: services.update,
    softDelete: services.softDelete,
    upgradeToMultiTeacher: services.upgradeToMultiTeacher,
  },
}));

vi.mock("../services/subscriptionService", () => ({
  subscriptionService: {
    list: services.list,
    renew: services.renew,
  },
}));

vi.mock("../services/platformService", () => ({
  platformService: { getStatistics: services.getStatistics },
  auditLogService: { getPaginated: services.getPaginated },
}));

// Keep the page-level tests focused: the create/edit dialogs are not part of
// this batch's flow, and the two subscription dialogs are replaced with small
// controllable stubs that expose their real callback contract.
vi.mock("../components/common/AddTeacherModal", () => ({ default: () => null }));
vi.mock("../components/common/CenterEditModal", () => ({ default: () => null }));

vi.mock("../components/common/RenewSubscriptionModal", () => ({
  default: (props) =>
    props.isOpen && props.center
      ? h(
          "div",
          {
            "data-testid": "renew-subscription-modal",
            role: "dialog",
            "aria-modal": "true",
          },
          h("span", null, props.center.name ?? ""),
          h(
            "button",
            { type: "button", onClick: () => props.onClose?.() },
            "إلغاء",
          ),
          h(
            "button",
            { type: "button", onClick: () => props.onRenewed?.() },
            "تجديد",
          ),
        )
      : null,
}));

vi.mock("../components/common/SubscriptionEditModal", () => ({
  default: (props) =>
    props.isOpen
      ? h(
          "div",
          {
            "data-testid": "subscription-edit-modal",
            role: "dialog",
            "aria-modal": "true",
            "data-center-id": props.centerId ?? "",
          },
          h("span", null, String(props.centerId ?? "")),
        )
      : null,
}));

import CentersManagement from "./CentersManagement";
import SubscriptionsManagement from "./SubscriptionsManagement";
import PlatformStatistics from "./PlatformStatistics";
import AuditLogPage from "./AuditLogPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ---------------------------------------------------------------------------
// Fixtures (realistic Arabic data, matching the API response shapes)
// ---------------------------------------------------------------------------

const CENTERS = [
  {
    id: "center-1",
    ownerId: "owner-1",
    name: "مركز النور لتحفيظ القرآن",
    ownerName: "أ. خالد محمود",
    ownerPhone: "01000000001",
    type: "MultiTeacher",
    teachersCount: 8,
    studentsCount: 140,
    status: "Active",
  },
  {
    id: "center-2",
    ownerId: "owner-2",
    name: "أكاديمية الإتقان للعلوم",
    ownerName: "أ. سامي عبد العزيز",
    ownerPhone: "01000000002",
    type: "MultiTeacher",
    teachersCount: 5,
    studentsCount: 95,
    status: "Active",
  },
  {
    id: "center-3",
    ownerId: "owner-3",
    name: "مدرسة الفجر الفردية",
    ownerName: "أ. منى حسين",
    ownerPhone: "01000000003",
    type: "SoloTeacher",
    teachersCount: 1,
    studentsCount: 30,
    status: "Suspended",
  },
  {
    id: "center-4",
    ownerId: "owner-4",
    name: "مركز الهدى للغات",
    ownerName: "أ. عادل فتحي",
    ownerPhone: "01000000004",
    type: "MultiTeacher",
    teachersCount: 4,
    studentsCount: 60,
    status: "Expired",
  },
];

const paged = (data, totalCount = data.length, totalPages = 1) => ({
  succeeded: true,
  data: { data, totalCount, totalPages },
});

const CENTERS_PAGE = paged(CENTERS, 12, 2);
const CENTERS_PAGE_2 = paged(CENTERS.slice(2), 12, 2);
const CENTERS_SEARCH_PAGE = paged([CENTERS[0]], 1, 1);
const PASSWORD_RESPONSE = {
  succeeded: true,
  data: { temporaryPassword: "TEMP-123", phoneNumber: "01000000002" },
};

const SUBSCRIPTIONS = [
  {
    id: "center-1",
    name: "مركز النور لتحفيظ القرآن",
    state: "Active",
    plan: "الخطة الشاملة",
    type: "MultiTeacher",
    subscriptionStart: "2026-01-01",
    subscriptionEnd: "2026-12-31",
    enabledModuleCount: 9,
    totalModuleCount: 10,
    paidAmount: 8500,
    price: 9000,
    currency: "EGP",
    graceDays: 7,
  },
  {
    id: "center-2",
    name: "أكاديمية الإتقان للعلوم",
    state: "InGrace",
    plan: "الخطة المتقدمة",
    type: "MultiTeacher",
    subscriptionStart: "2025-07-01",
    subscriptionEnd: "2026-06-30",
    daysLeftInGrace: 3,
    enabledModuleCount: 7,
    totalModuleCount: 10,
    paidAmount: 6000,
    price: 7000,
    currency: "EGP",
    graceDays: 7,
  },
  {
    id: "center-4",
    name: "مركز الهدى للغات",
    state: "Expired",
    plan: "الخطة الأساسية",
    type: "MultiTeacher",
    subscriptionStart: "2025-01-01",
    subscriptionEnd: "2025-12-31",
    enabledModuleCount: 2,
    totalModuleCount: 10,
    paidAmount: 2000,
    price: 3000,
    currency: "EGP",
    graceDays: 7,
  },
];

const MONTH_LABELS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const STATS = {
  totalCenters: 421,
  activeCenters: 357,
  suspendedCenters: 19,
  soloTeacherCenters: 112,
  multiTeacherCenters: 309,
  centersCreatedThisMonth: 7,
  activeSubscriptions: 388,
  totalUsers: 1509,
  totalOwners: 421,
  totalTeachers: 268,
  totalAssistants: 85,
  totalStudents: 1107,
  totalGroups: 327,
  centersInGrace: 15,
  subscriptionsByType: [
    { type: 1, label: "أساسي", count: 101 },
    { type: 2, label: "متقدم", count: 202 },
    { type: 4, label: "شامل", count: 85 },
  ],
  monthlyRevenue: 125000,
  revenueByMonth: MONTH_LABELS.map((_, index) => ({
    month: index + 1,
    revenue: 1000 * (index + 1),
  })),
};

const AUDIT_ROWS = [
  {
    id: "audit-1",
    createdAt: "2026-11-16T09:12:00Z",
    actorName: "أ. خالد محمود",
    action: "OnboardCenter",
    details: "إنشاء مركز النور لتحفيظ القرآن",
    ipAddress: "192.168.1.10",
  },
  {
    id: "audit-2",
    createdAt: "2026-11-16T10:05:00Z",
    actorName: "أ. سارة أحمد",
    action: "Impersonate",
    details: "بدء انتحال حساب أ. سامي عبد العزيز",
    ipAddress: "192.168.1.11",
  },
  {
    id: "audit-3",
    createdAt: "2026-11-16T10:20:00Z",
    actorName: "أ. خالد محمود",
    // F-004: the raw value still drives search/filter; only the cell is labelled.
    action: "PlatformStatisticsViewed",
    details: "عرض إحصائيات المنصة",
    ipAddress: "192.168.1.10",
  },
  {
    id: "audit-4",
    createdAt: "2026-11-16T10:31:00Z",
    actorName: "أ. سارة أحمد",
    action: "ImpersonationEnd",
    details: "إنهاء انتحال حساب أ. سامي عبد العزيز",
    ipAddress: "192.168.1.11",
  },
];

const AUDIT_PAGE = paged(AUDIT_ROWS, 37, 2);
const AUDIT_SEARCH_PAGE = paged([AUDIT_ROWS[1]], 1, 1);

// ---------------------------------------------------------------------------
// Render / interaction helpers (same style as CenterReportsPage.batch9.test)
// ---------------------------------------------------------------------------

let container;
let root;

const flush = async (rounds = 5) => {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const waitFor = async (assertion, timeout = 2000) => {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeout) {
    try {
      await flush(1);
      return assertion();
    } catch (error) {
      lastError = error;
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  throw lastError;
};

const mountPage = async (Page) => {
  await act(async () => {
    root.render(h(MemoryRouter, null, h(Page)));
  });
  await flush();
};

const remountPage = async (Page, setup) => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  setup?.();
  await mountPage(Page);
};

const byTestId = (id) => container.querySelector(`[data-testid="${id}"]`);
const allByTestId = (id) => [
  ...container.querySelectorAll(`[data-testid="${id}"]`),
];

// Cards and table render from the same data (one is hidden with CSS). Scope to
// a single container so a row is counted once; fall back to the full page if
// the redesign only puts the row hook on one of the two views.
const scopedRows = (rowId, containerIds) => {
  const scope = containerIds.map(byTestId).find(Boolean) ?? container;
  const rows = [...scope.querySelectorAll(`[data-testid="${rowId}"]`)];
  return rows.length ? rows : allByTestId(rowId);
};
const centerRows = () =>
  scopedRows("center-row", ["centers-table", "centers-cards"]);
const subscriptionRows = () =>
  scopedRows("subscription-row", ["subscriptions-table", "subscriptions-cards"]);
const auditRows = () =>
  scopedRows("audit-row", ["audit-table", "audit-cards"]);

const click = async (element) => {
  expect(element, "element to click").toBeTruthy();
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
  });
  await flush();
};

const type = async (field, value) => {
  expect(field, "field to type into").toBeTruthy();
  const prototype =
    field.tagName === "SELECT"
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;

  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
};

const dialogs = () => [
  ...container.querySelectorAll('[role="dialog"][aria-modal="true"]'),
];
const dialogButton = (label) => {
  for (const dialog of dialogs()) {
    const button = [...dialog.querySelectorAll("button")].find((candidate) =>
      candidate.textContent.includes(label),
    );
    if (button) return button;
  }
  return null;
};
// Confirm button of the currently open dialog, without hard-coding its text.
const confirmActionButton = () => {
  const dialog = dialogs().at(-1);
  return [...(dialog?.querySelectorAll("button") ?? [])].find((button) => {
    const text = button.textContent.trim();
    return (
      text &&
      !text.includes("إلغاء") &&
      !text.includes("إغلاق") &&
      !text.includes("تم")
    );
  });
};

const rowWithText = (rows, text) =>
  rows.find((row) => row.textContent.includes(text));

const actionButton = (row, labels) => {
  const wanted = Array.isArray(labels) ? labels : [labels];
  return [...(row?.querySelectorAll("button") ?? [])].find((button) => {
    const label = [
      button.getAttribute("title") ?? "",
      button.getAttribute("aria-label") ?? "",
      button.textContent ?? "",
    ].join(" ");
    return wanted.some((candidate) => label.includes(candidate));
  });
};

const paginationButton = (testId, label) => {
  const buttons = [
    ...(byTestId(testId)?.querySelectorAll("button") ?? []),
  ];
  return (
    buttons.find((button) => button.textContent.includes(label)) ??
    [...container.querySelectorAll("button")].find((button) =>
      button.textContent.includes(label),
    )
  );
};

const lastArg = (fn) => fn.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.resetAllMocks();

  services.getCentersPaged.mockResolvedValue(CENTERS_PAGE);
  services.setStatus.mockResolvedValue({ succeeded: true });
  services.resetUserPassword.mockResolvedValue(PASSWORD_RESPONSE);
  services.createWithOwner.mockResolvedValue({ succeeded: true });
  services.update.mockResolvedValue({ succeeded: true });
  services.softDelete.mockResolvedValue({ succeeded: true });
  services.upgradeToMultiTeacher.mockResolvedValue({ succeeded: true });
  services.list.mockResolvedValue({ succeeded: true, data: SUBSCRIPTIONS });
  services.renew.mockResolvedValue({ succeeded: true });
  services.getStatistics.mockResolvedValue({ succeeded: true, data: STATS });
  services.getPaginated.mockResolvedValue(AUDIT_PAGE);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1-3. Centers
// ---------------------------------------------------------------------------

describe("centers management (batch 10)", () => {
  it("loads centers then applies search, status and pagination filters", async () => {
    let response = CENTERS_PAGE;
    services.getCentersPaged.mockImplementation(async (args) =>
      args?.pageNumber === 2 ? CENTERS_PAGE_2 : response,
    );

    await mountPage(CentersManagement);

    expect(byTestId("centers-page")).toBeTruthy();
    expect(byTestId("centers-cards") || byTestId("centers-table")).toBeTruthy();
    await waitFor(() => expect(centerRows()).toHaveLength(4));
    expect(lastArg(services.getCentersPaged)).toMatchObject({ pageNumber: 1 });

    response = CENTERS_SEARCH_PAGE;
    await type(byTestId("centers-search"), "  النور  ");
    await click(byTestId("centers-refresh"));
    await waitFor(() => expect(centerRows()).toHaveLength(1));
    expect(lastArg(services.getCentersPaged)).toMatchObject({
      pageNumber: 1,
      search: "النور",
    });

    response = CENTERS_PAGE;
    await type(byTestId("centers-status"), "Active");
    await click(byTestId("centers-refresh"));
    await waitFor(() =>
      expect(lastArg(services.getCentersPaged)).toMatchObject({
        pageNumber: 1,
        status: "Active",
      }),
    );

    await click(paginationButton("centers-pagination", "التالي"));
    await waitFor(() =>
      expect(lastArg(services.getCentersPaged)).toMatchObject({
        pageNumber: 2,
      }),
    );
  });

  it("confirms suspending an active center and reveals the temporary password", async () => {
    await mountPage(CentersManagement);
    await waitFor(() => expect(centerRows().length).toBeGreaterThan(0));

    const callsBeforeSuspend = services.getCentersPaged.mock.calls.length;
    const activeRow = rowWithText(centerRows(), CENTERS[0].name);
    await click(actionButton(activeRow, ["إيقاف"]));

    expect(dialogs().length).toBeGreaterThan(0);
    expect(dialogs().at(-1).getAttribute("aria-modal")).toBe("true");
    expect(dialogButton("إلغاء")).toBeTruthy();
    expect(dialogButton("إيقاف")).toBeTruthy();

    await click(dialogButton("إيقاف"));
    expect(services.setStatus).toHaveBeenCalledWith(CENTERS[0].id, 2);
    await waitFor(() => expect(dialogButton("إيقاف")).toBeFalsy());
    expect(services.getCentersPaged.mock.calls.length).toBeGreaterThan(
      callsBeforeSuspend,
    );

    const passwordRow = rowWithText(centerRows(), CENTERS[1].name);
    await click(actionButton(passwordRow, ["إعادة تعيين", "كلمة المرور"]));
    expect(dialogs().length).toBeGreaterThan(0);
    await click(confirmActionButton());

    await waitFor(() => expect(container.textContent).toContain("TEMP-123"));
    expect(services.resetUserPassword).toHaveBeenCalledWith(CENTERS[1].ownerId);
    expect(dialogButton("تم")).toBeTruthy();

    await click(dialogButton("تم"));
    await waitFor(() => expect(container.textContent).not.toContain("TEMP-123"));
  });

  it("shows a retryable error, then renders rows, and shows the empty state", async () => {
    services.getCentersPaged.mockRejectedValueOnce(new Error("network down"));
    await mountPage(CentersManagement);

    const alert = byTestId("centers-error");
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(byTestId("centers-retry")).toBeTruthy();

    services.getCentersPaged.mockResolvedValue(CENTERS_PAGE);
    await click(byTestId("centers-retry"));
    await waitFor(() => expect(byTestId("centers-error")).toBeFalsy());
    expect(centerRows()).toHaveLength(4);
    expect(services.getCentersPaged).toHaveBeenCalledTimes(2);

    await remountPage(CentersManagement, () =>
      services.getCentersPaged.mockResolvedValue(paged([], 0, 0)),
    );
    await click(byTestId("centers-refresh"));
    await waitFor(() => expect(byTestId("centers-empty")).toBeTruthy());
    expect(centerRows()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4-5. Subscriptions
// ---------------------------------------------------------------------------

describe("subscriptions management (batch 10)", () => {
  it("filters subscriptions, renews an expired one and opens the editor", async () => {
    await mountPage(SubscriptionsManagement);

    expect(byTestId("subscriptions-page")).toBeTruthy();
    expect(
      byTestId("subscriptions-cards") || byTestId("subscriptions-table"),
    ).toBeTruthy();
    await waitFor(() => expect(subscriptionRows()).toHaveLength(3));

    services.list.mockResolvedValue({
      succeeded: true,
      data: [SUBSCRIPTIONS[0]],
    });
    await type(byTestId("subscriptions-search"), "  النور  ");
    await click(byTestId("subscriptions-refresh"));
    await waitFor(() => expect(subscriptionRows()).toHaveLength(1));
    expect(services.list.mock.calls.at(-1)?.[0]).toBe("النور");

    services.list.mockResolvedValue({ succeeded: true, data: SUBSCRIPTIONS });
    await click(byTestId("subscriptions-refresh"));
    await waitFor(() => expect(subscriptionRows()).toHaveLength(3));

    const expiredRow = rowWithText(subscriptionRows(), SUBSCRIPTIONS[2].name);
    await click(actionButton(expiredRow, ["تجديد"]));
    const renewModal = byTestId("renew-subscription-modal");
    expect(renewModal).toBeTruthy();
    expect(renewModal.getAttribute("role")).toBe("dialog");

    const callsBeforeRenew = services.list.mock.calls.length;
    await click(
      [...renewModal.querySelectorAll("button")].find((button) =>
        button.textContent.includes("تجديد"),
      ),
    );
    await waitFor(() =>
      expect(services.list.mock.calls.length).toBeGreaterThan(callsBeforeRenew),
    );
    await click(
      [...renewModal.querySelectorAll("button")].find((button) =>
        button.textContent.includes("إلغاء"),
      ),
    );

    const editRow = rowWithText(subscriptionRows(), SUBSCRIPTIONS[2].name);
    await click(
      actionButton(editRow, [
        "الاشتراك والوحدات",
        "تعديل",
        "إعدادات الاشتراك",
      ]),
    );
    const editModal = byTestId("subscription-edit-modal");
    expect(editModal).toBeTruthy();
    expect(editModal.getAttribute("data-center-id")).toBe(SUBSCRIPTIONS[2].id);
    expect(editModal.textContent).toContain(SUBSCRIPTIONS[2].id);
  });

  it("shows a retryable failed response, then rows, and shows the empty state", async () => {
    services.list.mockResolvedValue({
      succeeded: false,
      message: "تعذر تحميل الاشتراكات",
    });
    await mountPage(SubscriptionsManagement);

    const alert = byTestId("subscriptions-error");
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(byTestId("subscriptions-retry")).toBeTruthy();

    services.list.mockResolvedValue({ succeeded: true, data: SUBSCRIPTIONS });
    await click(byTestId("subscriptions-retry"));
    await waitFor(() => expect(byTestId("subscriptions-error")).toBeFalsy());
    expect(subscriptionRows()).toHaveLength(3);
    expect(services.list.mock.calls.length).toBeGreaterThanOrEqual(2);

    await remountPage(SubscriptionsManagement, () =>
      services.list.mockResolvedValue({ succeeded: true, data: [] }),
    );
    await click(byTestId("subscriptions-refresh"));
    await waitFor(() => expect(byTestId("subscriptions-empty")).toBeTruthy());
    expect(subscriptionRows()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Platform statistics
// ---------------------------------------------------------------------------

describe("platform statistics (batch 10)", () => {
  it("renders every stat and 12 months, then recovers from an error", async () => {
    await mountPage(PlatformStatistics);

    expect(byTestId("platform-page")).toBeTruthy();
    const cards = allByTestId("platform-stat");
    expect(cards.length).toBeGreaterThanOrEqual(12);
    const cardValues = cards
      .map((card) => card.textContent.replace(/[,\u066c]/g, ""))
      .join(" ");
    ["421", "357", "1509", "268", "327", "125000"].forEach((value) =>
      expect(cardValues).toContain(value),
    );

    const chart = byTestId("platform-revenue-chart");
    expect(chart).toBeTruthy();
    MONTH_LABELS.forEach((month) => expect(chart.textContent).toContain(month));

    await remountPage(PlatformStatistics, () =>
      services.getStatistics.mockRejectedValueOnce(new Error("offline")),
    );

    const alert = byTestId("platform-error");
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(byTestId("platform-retry")).toBeTruthy();

    const callsBeforeRetry = services.getStatistics.mock.calls.length;
    services.getStatistics.mockResolvedValue({ succeeded: true, data: STATS });
    await click(byTestId("platform-retry"));
    await waitFor(() => expect(byTestId("platform-error")).toBeFalsy());
    expect(allByTestId("platform-stat").length).toBeGreaterThan(0);
    expect(services.getStatistics.mock.calls.length).toBeGreaterThan(
      callsBeforeRetry,
    );
  });
});

// ---------------------------------------------------------------------------
// 7-8. Audit log
// ---------------------------------------------------------------------------

describe("audit log (batch 10)", () => {
  it("filters and paginates events with Arabic action labels", async () => {
    await mountPage(AuditLogPage);

    expect(byTestId("audit-page")).toBeTruthy();
    expect(byTestId("audit-cards") || byTestId("audit-table")).toBeTruthy();
    await waitFor(() => expect(auditRows()).toHaveLength(4));
    expect(container.textContent).toContain("الاطلاع على إحصائيات المنصة");
    expect(container.textContent).not.toContain("PlatformStatisticsViewed");

    services.getPaginated.mockResolvedValue(AUDIT_SEARCH_PAGE);
    await type(byTestId("audit-search"), "  نور  ");
    await type(byTestId("audit-action"), "Impersonate");
    await click(byTestId("audit-submit"));

    expect(lastArg(services.getPaginated)).toMatchObject({
      pageNumber: 1,
      search: "نور",
      action: "Impersonate",
    });
    await waitFor(() => expect(auditRows()).toHaveLength(1));

    services.getPaginated.mockResolvedValue(AUDIT_PAGE);
    await click(byTestId("audit-refresh"));
    await waitFor(() => expect(auditRows()).toHaveLength(4));
    expect(container.textContent).toContain("الاطلاع على إحصائيات المنصة");
    expect(container.textContent).not.toContain("PlatformStatisticsViewed");

    await click(paginationButton("audit-pagination", "التالي"));
    await waitFor(() =>
      expect(lastArg(services.getPaginated)).toMatchObject({ pageNumber: 2 }),
    );
  });

  it("shows a retryable error, then rows, and shows the empty state", async () => {
    services.getPaginated.mockRejectedValueOnce(new Error("offline"));
    await mountPage(AuditLogPage);

    const alert = byTestId("audit-error");
    expect(alert).toBeTruthy();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(byTestId("audit-retry")).toBeTruthy();

    services.getPaginated.mockResolvedValue(AUDIT_PAGE);
    await click(byTestId("audit-retry"));
    await waitFor(() => expect(byTestId("audit-error")).toBeFalsy());
    expect(auditRows()).toHaveLength(4);
    expect(services.getPaginated).toHaveBeenCalledTimes(2);

    await remountPage(AuditLogPage, () =>
      services.getPaginated.mockResolvedValue(paged([], 0, 0)),
    );
    await click(byTestId("audit-refresh"));
    await waitFor(() => expect(byTestId("audit-empty")).toBeTruthy());
    expect(auditRows()).toHaveLength(0);
  });
});
