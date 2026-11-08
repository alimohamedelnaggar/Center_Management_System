// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

/**
 * End-to-end (frontend) proof that editing a template in the owner editor and
 * saving it changes the reminder link built by the overdue page: the page reads
 * the same backend body, so no hardcoded message text is left in the screen.
 */

const authState = vi.hoisted(() => ({
  auth: {
    role: "CenterOwner",
    isSoloTeacher: false,
    isCenterAdmin: true,
    isSoloCenter: true,
    centerTypeLoaded: true,
    accessToken: "test-token",
    user: { fullName: "QA Owner" },
    hasModule: () => true,
    hasCenterModule: () => true,
  },
}));

const store = vi.hoisted(() => ({ templates: [] }));

const templateService = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  reset: vi.fn(),
  preview: vi.fn(),
}));

const financeServiceMock = vi.hoisted(() => ({
  getOverdueStudents: vi.fn(),
}));

const examServiceMock = vi.hoisted(() => ({
  getGroups: vi.fn(),
}));

const teacherServiceMock = vi.hoisted(() => ({
  getPaginated: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));
vi.mock("@/context/useBranding", () => ({
  useBranding: () => ({ center: { name: "مركز النور" } }),
}));
vi.mock("@/services/messageTemplateService", () => ({
  messageTemplateService: templateService,
}));
vi.mock("@/services/financeService", () => ({
  financeService: financeServiceMock,
}));
vi.mock("@/services/examService", () => ({ examService: examServiceMock }));
vi.mock("@/services/teacherService", () => ({
  teacherService: teacherServiceMock,
}));
vi.mock("@/components/common/AddPaymentModal", () => ({ default: () => null }));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import MessageTemplatesPage from "./MessageTemplatesPage";
import OverduePage from "./OverduePage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ABSENCE = {
  key: "absence",
  body: "غياب {student}.",
  defaultBody: "غياب {student}.",
  isCustomized: false,
  maxLength: 500,
  placeholders: [{ key: "student", label: "اسم الطالب" }],
};

const EXAM = {
  key: "examResult",
  body: "نتيجة {student}.",
  defaultBody: "نتيجة {student}.",
  isCustomized: false,
  maxLength: 500,
  placeholders: [{ key: "student", label: "اسم الطالب" }],
};

const FEES_DEFAULT =
  "مرحباً، نود تذكيركم بسداد اشتراك شهر {month} للطالب {student}. المتبقي: {amount}.\nمع تحيات {center}.";

const FEES = {
  key: "feesReminder",
  body: FEES_DEFAULT,
  defaultBody: FEES_DEFAULT,
  isCustomized: false,
  maxLength: 500,
  placeholders: [
    { key: "student", label: "اسم الطالب" },
    { key: "center", label: "اسم المركز" },
    { key: "amount", label: "المبلغ المتبقي" },
    { key: "month", label: "الشهر" },
  ],
};

const OVERDUE_ROW = {
  studentId: "st1",
  studentName: "طالب متأخر",
  groupId: "g1",
  groupName: "مجموعة أ",
  teacherName: "المدرس",
  parentPhoneNumber: "01000000001",
  totalAmount: 500,
  paidAmount: 100,
  remainingAmount: 400,
  lastPaymentDate: null,
  status: 2,
};

let container;
let root;

const flush = async (delay = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });

  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const mount = async (element) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(element);
  });
  await flush(300);
};

const unmount = async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
};

const click = async (element) => {
  expect(element).toBeTruthy();

  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush(100);
};

const buttonByText = (label) =>
  [...container.querySelectorAll("button")].find((button) =>
    button.textContent.trim().includes(label),
  );

beforeEach(() => {
  vi.clearAllMocks();

  store.templates = [ABSENCE, EXAM, FEES];

  templateService.list.mockImplementation(async () => ({
    succeeded: true,
    message: "",
    data: store.templates.map((template) => ({ ...template })),
  }));

  templateService.preview.mockResolvedValue({
    succeeded: true,
    message: "",
    data: { key: "feesReminder", text: "معاينة", encodedText: "", whatsAppUrl: "", sampleValues: {} },
  });

  templateService.update.mockImplementation(async (key, body) => {
    const current = store.templates.find((template) => template.key === key);
    const updated = {
      ...current,
      body,
      isCustomized: body !== current.defaultBody,
    };

    store.templates = store.templates.map((template) =>
      template.key === key ? updated : template,
    );

    return { succeeded: true, message: "تم حفظ قالب الرسالة بنجاح", data: updated };
  });

  financeServiceMock.getOverdueStudents.mockResolvedValue({
    data: [OVERDUE_ROW],
    meta: {
      totalStudents: 1,
      totalDue: 500,
      totalPaid: 100,
      totalRemaining: 400,
    },
    totalCount: 1,
    totalPages: 1,
  });
  examServiceMock.getGroups.mockResolvedValue({ data: [] });
  teacherServiceMock.getPaginated.mockResolvedValue({ data: [] });
});

afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
});

describe("message-template editing changes the overdue WhatsApp link", () => {
  it("saves the edited body and opens wa.me with that body", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    const custom =
      "تذكير مخصص: الطالب {student} عليه {amount} لشهر {month}. مع تحيات {center}.";

    await mount(h(MessageTemplatesPage));

    await click(buttonByText("تذكير بالرسوم"));

    const textarea = container.querySelector("#message-template-body");
    expect(textarea).toBeTruthy();

    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    ).set;

    await act(async () => {
      setter.call(textarea, custom);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await click(buttonByText("حفظ القالب"));

    expect(templateService.update).toHaveBeenCalledWith("feesReminder", custom);
    expect(store.templates.find((t) => t.key === "feesReminder").body).toBe(
      custom,
    );

    await unmount();

    // The overdue screen reads the same backend body again.
    await mount(h(MemoryRouter, null, h(OverduePage)));

    expect(templateService.list).toHaveBeenCalledTimes(2);

    await click(buttonByText("تذكير واتساب"));

    expect(openMock).toHaveBeenCalledTimes(1);

    const link = openMock.mock.calls[0][0];
    expect(link).toContain("https://wa.me/201000000001?text=");

    const text = decodeURIComponent(link.split("text=")[1]);
    expect(text).toContain("تذكير مخصص: الطالب طالب متأخر");
    expect(text).toContain("مع تحيات مركز النور.");
    expect(text).not.toContain("نود تذكيركم بسداد");
  });
});
