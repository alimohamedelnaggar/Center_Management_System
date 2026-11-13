// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The Excel wizard on a phone. The desktop table must stay in the DOM (other
 * tests count its rows) while the phone layout renders the same preview rows as
 * labelled cards. Phone numbers are shown exactly as the API returned them.
 */

const authState = vi.hoisted(() => ({
  auth: { isCenterAdmin: true, role: "CenterOwner", hasModule: () => true },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));
vi.mock("../../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../utils/bulkCredentialsExport", () => ({
  exportBothFormats: vi.fn(() => ({ excel: true, pdf: false })),
}));
vi.mock("react-hot-toast", () => {
  const toast = vi.fn((message) => message);
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import apiClient from "../../api/axios";
import StudentImportWizard from "./StudentImportWizard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const envelope = (data) => ({
  statusCode: 200,
  meta: null,
  succeeded: true,
  message: null,
  code: null,
  errors: null,
  errorsBag: null,
  data,
});

const rawRow = (overrides = {}) => ({
  rowNumber: 2,
  fullName: "أحمد محمد",
  phone: "01012345678",
  phoneParent: "01112345678",
  groupName: "المجموعة أ",
  groupId: "group-1",
  subscriptionType: "",
  customMonthlyPrice: "",
  school: "",
  notes: "",
  phoneNormalized: "01012345678",
  phoneParentNormalized: "01112345678",
  errors: [],
  isValid: true,
  isDuplicateInFile: false,
  isDuplicateInDb: false,
  canUpdate: false,
  groupWillBeCreated: false,
  ...overrides,
});

const ROWS = [
  rawRow(),
  rawRow({
    rowNumber: 3,
    fullName: "",
    phone: "01298765432",
    isValid: false,
    errors: ["الاسم الكامل مطلوب"],
  }),
];

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const renderWizard = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      h(StudentImportWizard, {
        open: true,
        onClose: vi.fn(),
        onImported: vi.fn(),
        centerName: "مركز الاختبار",
      }),
    );
  });

  return container;
};

const chooseFile = async (scope) => {
  const input = scope.querySelector('input[type="file"]');
  const file = new File(["x"], "students.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  await act(async () => {
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
};

const buttonByText = (scope, text) =>
  Array.from(scope.querySelectorAll("button")).find((button) =>
    button.textContent.includes(text),
  );

const goToPreview = async (scope) => {
  await chooseFile(scope);
  await act(async () => {
    buttonByText(scope, "متابعة").click();
  });
  await flush();
};

beforeEach(() => {
  apiClient.post.mockReset();
  apiClient.post.mockImplementation((url) => {
    if (url.includes("/Student/Import/Preview")) {
      return Promise.resolve({ data: envelope({ sessionId: "session-1", rows: ROWS, headers: [] }) });
    }
    return Promise.reject(new Error(`unexpected POST ${url}`));
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("StudentImportWizard phone preview", () => {
  it("keeps the desktop table and adds one card per preview row", async () => {
    const page = await renderWizard();

    const dialog = page.querySelector('[data-testid="import-wizard"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("role")).toBe("dialog");

    await goToPreview(page);

    expect(page.querySelector('[data-testid="import-step-2"]')).toBeTruthy();
    expect(page.querySelectorAll("tbody tr")).toHaveLength(2);

    const cards = page.querySelectorAll('[data-testid="import-preview-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("أحمد محمد");
    expect(cards[1].textContent).toContain("الاسم الكامل مطلوب");

    // Phones keep their API formatting in both layouts.
    const phoneMatches = page.textContent.match(/01012345678/g) ?? [];
    expect(phoneMatches).toHaveLength(2);
    expect(page.textContent).toContain("01298765432");
    expect(page.textContent).toContain("01112345678");

    expect(
      page.querySelector('[data-testid="summary-total"]').textContent,
    ).toBe("2");
  });

  it("filters the cards with the same state as the table", async () => {
    const page = await renderWizard();
    await goToPreview(page);

    const filter = Array.from(
      page.querySelectorAll('input[type="checkbox"]'),
    ).find((input) =>
      input.closest("label")?.textContent.includes("عرض الأخطاء فقط"),
    );
    expect(filter).toBeTruthy();

    await act(async () => {
      filter.click();
    });
    await flush();

    expect(page.querySelectorAll("tbody tr")).toHaveLength(1);
    const cards = page.querySelectorAll('[data-testid="import-preview-card"]');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("الاسم الكامل مطلوب");
  });
});
