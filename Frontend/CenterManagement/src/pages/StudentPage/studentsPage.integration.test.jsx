// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The students page, wired with the real list/form/actions hooks and a mocked
 * HTTP layer whose payloads mirror `Response<PaginatedResult<StudentDto>>`
 * from the API. Every test renders the page, performs the real gesture, and
 * asserts what the user sees or what the service receives.
 */

const authState = vi.hoisted(() => ({
  auth: {
    isCenterAdmin: true,
    role: "CenterOwner",
    hasModule: () => true,
    isImpersonating: false,
  },
}));

const studentsApi = vi.hoisted(() => ({
  getAllPaged: vi.fn(),
  getStats: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  generateAccounts: vi.fn(),
  bulkCreateParentAccounts: vi.fn(),
  createParentAccount: vi.fn(),
}));

const groupsApi = vi.hoisted(() => ({ getAllGroups: vi.fn() }));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));
vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ center: { name: "مركز الاختبار" } }),
}));
vi.mock("../../services/studentService", () => ({
  studentsService: studentsApi,
}));
vi.mock("../../services/groupsService", () => ({
  groupsService: groupsApi,
}));
vi.mock("../../services/signalr/studentHub", () => ({
  connection: { on: vi.fn(), off: vi.fn() },
  startConnection: vi.fn(),
}));
vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import StudentManagement from "./StudentManagement";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const GROUPS = [
  { id: "g1", name: "مجموعة أ" },
  { id: "g2", name: "مجموعة ب" },
];

const STUDENTS = [
  {
    id: "s1",
    fullName: "أحمد علي",
    phone: "01012345678",
    phoneParent: "01112345678",
    groupId: "g1",
    groupName: "مجموعة أ",
    isActive: true,
    isPaid: true,
    subscriptionType: 2,
    customMonthlyPrice: null,
    createdAt: "2026-10-01T10:00:00Z",
  },
  {
    id: "s2",
    fullName: "منى حسن",
    phone: "01212345678",
    phoneParent: "01512345678",
    groupId: "g2",
    groupName: "مجموعة ب",
    isActive: false,
    isPaid: false,
    subscriptionType: 1,
    customMonthlyPrice: 250,
    createdAt: "2026-09-01T10:00:00Z",
  },
];

const pageOf = (items, overrides = {}) => ({
  succeeded: true,
  message: null,
  data: {
    items,
    totalCount: items.length,
    pageIndex: 1,
    pageSize: 10,
    totalPages: 1,
    ...overrides,
  },
});

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
        await new Promise((resolve) => setTimeout(resolve, 25));
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
    root.render(h(StudentManagement));
  });

  return container;
};

const setNativeValue = (element, value) => {
  const prototype =
    element.tagName === "SELECT"
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
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

const type = async (element, value) => {
  await act(async () => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
};

const choose = async (element, value) => {
  await act(async () => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
};

const buttonByText = (rootNode, text) =>
  Array.from(rootNode.querySelectorAll("button")).find((button) =>
    button.textContent.includes(text),
  );

const lastListCall = () =>
  studentsApi.getAllPaged.mock.calls.at(-1)?.[0];

beforeEach(() => {
  window.localStorage.clear();
  authState.auth = {
    isCenterAdmin: true,
    role: "CenterOwner",
    hasModule: () => true,
    isImpersonating: false,
  };

  studentsApi.getAllPaged.mockReset();
  studentsApi.getStats.mockReset();
  studentsApi.create.mockReset();
  studentsApi.update.mockReset();
  studentsApi.delete.mockReset();
  groupsApi.getAllGroups.mockReset();

  groupsApi.getAllGroups.mockResolvedValue({ succeeded: true, data: GROUPS });
  studentsApi.getStats.mockResolvedValue({
    succeeded: true,
    data: {
      totalStudents: 12,
      activeStudents: 9,
      inactiveStudents: 3,
      newStudentsThisMonth: 2,
    },
  });
  studentsApi.getAllPaged.mockResolvedValue(
    pageOf(STUDENTS, { totalCount: 12, totalPages: 2 }),
  );
  studentsApi.create.mockResolvedValue({
    succeeded: true,
    data: { account: { username: "01012345678", temporaryPassword: "Temp#1234" } },
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  vi.clearAllMocks();
});

describe("students list", () => {
  it("renders the owner list with aligned table columns, cards and pagination", async () => {
    await renderPage();

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-testid="students-table"] tbody tr'),
      ).toHaveLength(2);
    });

    const table = container.querySelector('[data-testid="students-table"]');
    const headings = table.querySelectorAll("thead th");
    const firstRowCells = table.querySelectorAll("tbody tr")[0].querySelectorAll("td");

    // F-016 regression: every heading has exactly one cell under it.
    expect(headings).toHaveLength(8);
    expect(firstRowCells).toHaveLength(headings.length);
    expect(headings[6].textContent).toBe("الحالة");
    expect(firstRowCells[6].textContent).toBe("نشط");

    expect(container.textContent).toContain("أحمد علي");
    expect(container.textContent).toContain("منى حسن");
    expect(
      container.querySelectorAll('[data-testid="students-cards"] article'),
    ).toHaveLength(2);
    expect(container.textContent).toContain("من 12 طالب");
  });

  it("keeps the filters collapsed until asked, then applies group and status", async () => {
    await renderPage();
    await waitFor(() => expect(lastListCall()).toBeTruthy());

    const toggle = container.querySelector('[data-testid="students-filters-toggle"]');
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[data-testid="students-filters-panel"]')).toBeNull();

    await click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panel = container.querySelector('[data-testid="students-filters-panel"]');
    expect(panel).not.toBeNull();

    await choose(panel.querySelector('select[aria-label="تصفية حسب المجموعة"]'), "g1");
    await waitFor(() => expect(lastListCall().groupId).toBe("g1"));

    await choose(panel.querySelector('select[aria-label="تصفية حسب الحالة"]'), "false");
    await waitFor(() => expect(lastListCall().isActive).toBe(false));

    // The badge counts the group + status filters.
    expect(toggle.textContent).toContain("2");

    await click(buttonByText(panel, "إعادة تعيين"));
    await waitFor(() => {
      const call = lastListCall();
      expect(call.groupId).toBeNull();
      expect(call.isActive).toBeNull();
      expect(call.search).toBe("");
    });
  });

  it("searches through the API after the debounce window", async () => {
    await renderPage();
    await waitFor(() => expect(lastListCall()).toBeTruthy());

    const search = container.querySelector('[data-testid="students-search"]');
    await type(search, "أحمد");

    await waitFor(() => expect(lastListCall().search).toBe("أحمد"), 4000);
    expect(
      container.querySelector('[data-testid="students-filters-toggle"]').textContent,
    ).toContain("1");
  });

  it("moves to the second page through the pagination control", async () => {
    await renderPage();
    await waitFor(() => expect(lastListCall()).toBeTruthy());

    const pageTwo = Array.from(
      container.querySelectorAll('[data-testid="students-pagination"] button'),
    ).find((button) => button.textContent.trim() === "2");
    expect(pageTwo).toBeTruthy();

    await click(pageTwo);

    await waitFor(() => expect(lastListCall().pageIndex).toBe(2));
  });
});

describe("students empty and loading states", () => {
  it("offers to clear the filters when a search finds nothing", async () => {
    studentsApi.getAllPaged.mockResolvedValue(pageOf([], { totalCount: 0 }));

    await renderPage();
    await waitFor(() =>
      expect(container.textContent).toContain("لا يوجد طلاب"),
    );

    await type(container.querySelector('[data-testid="students-search"]'), "zzz");
    await waitFor(
      () => expect(container.textContent).toContain("لا توجد نتائج مطابقة"),
      4000,
    );

    await click(buttonByText(container, "مسح الفلاتر"));
    await waitFor(() => expect(lastListCall().search).toBe(""));
    expect(container.textContent).toContain("لا يوجد طلاب");
  });

  it("shows a skeleton and a live status while the list is loading", async () => {
    studentsApi.getAllPaged.mockReturnValue(new Promise(() => {}));

    await renderPage();

    const status = container.querySelector('[data-testid="students-loading"]');
    expect(status).not.toBeNull();
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toContain("جاري تحميل الطلاب...");
    expect(container.querySelector('[data-testid="students-table"]')).toBeNull();
  });
});

describe("student dialogs", () => {
  it("adds a student from the modal and keeps the primary action in a fixed footer", async () => {
    await renderPage();
    await waitFor(() => expect(lastListCall()).toBeTruthy());

    await click(container.querySelector('[data-testid="students-add"]'));

    const dialog = document.querySelector('[data-testid="student-form-modal"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.textContent).toContain("إضافة طالب جديد");
    expect(dialog.className).toContain("max-h-[100dvh]");

    const body = dialog.querySelector('[data-testid="student-form-modal-body"]');
    const footer = dialog.querySelector('[data-testid="student-form-modal-footer"]');
    expect(body.className).toContain("overflow-y-auto");
    expect(footer.contains(dialog.querySelector('[data-testid="student-form-submit"]'))).toBe(true);

    await type(document.getElementById("student-fullName"), "سارة محمد");
    await type(document.getElementById("student-phone"), "01099998888");
    await type(document.getElementById("student-parent-phone"), "01199998888");
    await choose(document.getElementById("student-group"), "g1");

    await click(dialog.querySelector('[data-testid="student-form-submit"]'));

    await waitFor(() => expect(studentsApi.create).toHaveBeenCalledTimes(1));
    expect(studentsApi.create).toHaveBeenCalledWith({
      fullName: "سارة محمد",
      phone: "01099998888",
      phoneParent: "01199998888",
      groupId: "g1",
      subscriptionType: 2,
      customMonthlyPrice: null,
    });
    await waitFor(() =>
      expect(document.querySelector('[data-testid="student-form-modal"]')).toBeNull(),
    );
  });

  it("blocks an empty submission with the existing validation copy", async () => {
    await renderPage();
    await waitFor(() => expect(lastListCall()).toBeTruthy());

    await click(container.querySelector('[data-testid="students-add"]'));
    const dialog = document.querySelector('[data-testid="student-form-modal"]');
    await click(dialog.querySelector('[data-testid="student-form-submit"]'));

    expect(dialog.textContent).toContain("اسم الطالب مطلوب");
    expect(dialog.textContent).toContain("رقم الهاتف مطلوب");
    expect(dialog.textContent).toContain("اختر المجموعة");
    expect(studentsApi.create).not.toHaveBeenCalled();
  });

  it("opens the read-only card from the row menu and closes it", async () => {
    await renderPage();
    await waitFor(() => expect(lastListCall()).toBeTruthy());

    await click(
      container.querySelector('[aria-label="Actions for أحمد علي"]'),
    );

    const menuItem = await waitFor(() =>
      Array.from(document.querySelectorAll('[role="menuitem"]')).find((item) =>
        item.textContent.includes("عرض الطالب"),
      ),
    );
    await click(menuItem);

    const view = document.querySelector('[data-testid="student-view-modal"]');
    expect(view).not.toBeNull();
    expect(view.textContent).toContain("بيانات الطالب");
    expect(view.textContent).toContain("أحمد علي");
    expect(view.textContent).toContain("01012345678");
    expect(view.textContent).toContain("نشط");

    await click(view.querySelector('[data-testid="student-view-close"]'));
    expect(document.querySelector('[data-testid="student-view-modal"]')).toBeNull();
  });
});
