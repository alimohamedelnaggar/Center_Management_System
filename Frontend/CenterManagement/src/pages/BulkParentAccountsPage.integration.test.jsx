// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The bulk parent-accounts page, driven through the real hook and the real
 * confirm dialog. The mocked service answers with the same
 * `{created, linked, skipped}` buckets the API returns, so the test covers the
 * table, the phone cards, the tabs and the export/print wiring together.
 */

const studentsApi = vi.hoisted(() => ({
  bulkCreateParentAccounts: vi.fn(),
}));
const groupsApi = vi.hoisted(() => ({ getAllGroups: vi.fn() }));
const exportApi = vi.hoisted(() => ({
  exportParentAccountsToExcel: vi.fn(() => true),
  printParentAccounts: vi.fn(() => true),
}));

const RESULTS = {
  created: [
    {
      studentId: "s1",
      studentName: "أحمد علي",
      groupName: "مجموعة أ",
      parentPhone: "01112345678",
      username: "01112345678",
      temporaryPassword: "P-123",
    },
  ],
  linked: [
    {
      studentId: "s2",
      studentName: "منى حسن",
      groupName: "مجموعة ب",
      parentPhone: "01512345678",
      username: "01512345678",
    },
  ],
  skipped: [
    {
      studentId: "s3",
      studentName: "سارة محمد",
      groupName: "مجموعة ج",
      parentPhone: "01212345678",
      reason: "ولي الأمر مرتبط بالفعل",
    },
  ],
};

vi.mock("../services/studentService", () => ({
  studentsService: studentsApi,
}));
vi.mock("../services/groupsService", () => ({ groupsService: groupsApi }));
vi.mock("@/utils/parentAccountsExport", () => exportApi);
vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ center: { name: "مركز الاختبار" } }),
}));
vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import BulkParentAccountsPage from "./BulkParentAccountsPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitFor = async (assertion, timeout = 3000) => {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeout) {
    try {
      await flush();
      return assertion();
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  throw lastError;
};

const renderPage = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(h(BulkParentAccountsPage));
  });

  return container;
};

const click = async (element) => {
  expect(element, "element to click").toBeTruthy();
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
  });
  await flush();
};

const buttonByText = (scope, text) =>
  Array.from(scope.querySelectorAll("button")).find((button) =>
    button.textContent.includes(text),
  );

beforeEach(() => {
  studentsApi.bulkCreateParentAccounts.mockReset();
  groupsApi.getAllGroups.mockReset();
  exportApi.exportParentAccountsToExcel.mockClear();
  exportApi.printParentAccounts.mockClear();

  groupsApi.getAllGroups.mockResolvedValue({
    data: [{ id: "g1", name: "مجموعة أ" }],
  });
  studentsApi.bulkCreateParentAccounts.mockResolvedValue({
    succeeded: true,
    message: "تم إنشاء الحسابات",
    data: RESULTS,
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("BulkParentAccountsPage", () => {
  it("runs the bulk creation and renders the same rows as a table and cards", async () => {
    const page = await renderPage();
    expect(page.querySelector('[data-testid="bulk-parents-page"]')).toBeTruthy();

    await waitFor(() => {
      expect(page.querySelector("#bulk-parent-group option")).toBeTruthy();
    });

    await click(buttonByText(page, "إنشاء الحسابات"));
    expect(page.textContent).toContain("تأكيد إنشاء حسابات أولياء الأمور");

    await click(buttonByText(page, "ابدأ الإنشاء"));

    await waitFor(() => {
      expect(
        page.querySelector('[data-testid="bulk-parents-cards"]'),
      ).toBeTruthy();
    });

    expect(studentsApi.bulkCreateParentAccounts).toHaveBeenCalledWith({
      groupId: null,
      isActive: true,
      search: null,
      skipAlreadyLinked: false,
    });

    const cards = page.querySelectorAll('[data-testid="bulk-parent-card"]');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("أحمد علي");
    expect(cards[0].textContent).toContain("P-123");

    // Desktop table stays mounted for wide screens and keeps the same data.
    expect(page.querySelectorAll("table tbody tr")).toHaveLength(1);
    // The card duplicates the table value rather than hiding it.
    expect((page.textContent.match(/P-123/g) ?? [])).toHaveLength(2);

    await click(buttonByText(page, "تم تخطيهم"));
    expect(page.textContent).toContain("ولي الأمر مرتبط بالفعل");
    expect(page.textContent).toContain("سارة محمد");
  });

  it("exports and prints the three buckets through the existing helpers", async () => {
    const page = await renderPage();

    await waitFor(() => {
      expect(page.querySelector("#bulk-parent-group option")).toBeTruthy();
    });

    await click(buttonByText(page, "إنشاء الحسابات"));
    await click(buttonByText(page, "ابدأ الإنشاء"));

    await waitFor(() => {
      expect(
        page.querySelector('[data-testid="bulk-parents-export-excel"]')
          .disabled,
      ).toBe(false);
    });

    await click(
      page.querySelector('[data-testid="bulk-parents-export-excel"]'),
    );
    expect(exportApi.exportParentAccountsToExcel).toHaveBeenCalledWith(
      {
        created: RESULTS.created,
        linked: RESULTS.linked,
        skipped: RESULTS.skipped,
        centerName: "مركز الاختبار",
      },
      "حسابات_أولياء_الأمور",
    );

    await click(page.querySelector('[data-testid="bulk-parents-export-pdf"]'));
    expect(exportApi.printParentAccounts).toHaveBeenCalledWith({
      created: RESULTS.created,
      linked: RESULTS.linked,
      skipped: RESULTS.skipped,
      centerName: "مركز الاختبار",
    });
  });
});
