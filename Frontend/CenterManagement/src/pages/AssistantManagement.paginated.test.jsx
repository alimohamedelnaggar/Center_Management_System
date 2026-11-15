// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Regression for the empty `/assistants` list (F-036).
 *
 * The mock body below is a byte-for-byte copy of the payload the real API
 * returned for
 *   GET /Assistant/Paginated?PageNumber=1&PageSize=6&IsActive=true
 * (captured against CenterManagement_E2E): `Response<PaginatedResult<T>>`
 * with the rows under `data.data`, not `data.items`.
 */

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../api/axios", () => ({
  default: http,
  setAccessToken: vi.fn(),
  getAccessToken: () => null,
}));

vi.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    role: "CenterOwner",
    isCenterAdmin: true,
    isSoloCenter: false,
    centerTypeLoaded: true,
  }),
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import AssistantManagement from "./AssistantManagement";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const REAL_ASSISTANT = {
  id: "41ca79e9-2901-474b-5076-08df3411b5ab",
  fullName: "أ. منى حسن",
  phoneNumber: "01000000005",
  email: null,
  salary: 4500,
  workingHoursPerWeek: 30,
  hireDate: "2025-12-27",
  nationalId: null,
  address: null,
  notes: null,
  teacherId: "6f0f1a8c-1f4a-4f6b-9c1e-2c9d3a4b5e6f",
  teacherName: "أ. محمد علي",
  isActive: true,
};

const REAL_RESPONSE = {
  statusCode: 200,
  meta: null,
  succeeded: true,
  message: null,
  code: null,
  errors: null,
  errorsBag: null,
  data: {
    data: [REAL_ASSISTANT],
    currentPage: 1,
    totalPages: 1,
    totalCount: 1,
    meta: null,
    pageSize: 6,
    hasPreviousPage: false,
    hasNextPage: false,
    messages: null,
    succeeded: true,
  },
};

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
    root.render(h(AssistantManagement));
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

const rows = (node) =>
  node.querySelectorAll('[data-testid="assistants-page"] tbody tr');

beforeEach(() => {
  http.get.mockReset();
  http.post.mockReset();
  http.put.mockReset();
  http.delete.mockReset();
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

describe("assistants list pagination mapping", () => {
  it("renders the assistant returned under data.data of PaginatedResult", async () => {
    http.get.mockResolvedValue({ data: REAL_RESPONSE });

    await renderPage();

    await waitFor(() => {
      expect(rows(container)).toHaveLength(1);
    });

    expect(container.textContent).toContain("أ. منى حسن");
    expect(container.textContent).toContain("أ. محمد علي");
    expect(container.textContent).not.toContain("لا يوجد مساعدون بعد");

    expect(http.get).toHaveBeenCalledWith("/Assistant/Paginated", {
      params: { PageNumber: 1, PageSize: 6, IsActive: true },
    });
  });

  it("shows an explicit error with a working retry instead of the empty state", async () => {
    http.get
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ data: REAL_RESPONSE });

    await renderPage();

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="assistants-error"]'),
      ).toBeTruthy();
    });

    expect(container.textContent).toContain("تعذر تحميل المساعدين");
    expect(container.textContent).not.toContain("لا يوجد مساعدون بعد");

    await click(container.querySelector('[data-testid="assistants-retry"]'));

    await waitFor(() => {
      expect(rows(container)).toHaveLength(1);
    });

    expect(container.textContent).toContain("أ. منى حسن");
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
