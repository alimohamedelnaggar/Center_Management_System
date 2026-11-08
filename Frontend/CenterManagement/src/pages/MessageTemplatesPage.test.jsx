// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * The owner-only message-template editor: it reads the backend list, edits and
 * saves a body, inserts placeholders, previews live, restores the default and
 * surfaces the backend's Arabic validation errors. Unauthorized roles never see
 * the editor.
 */

const authState = vi.hoisted(() => ({
  auth: {
    role: "CenterOwner",
    isSoloTeacher: false,
    accessToken: "test-token",
    hasModule: () => true,
  },
}));

const serviceMock = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  reset: vi.fn(),
  preview: vi.fn(),
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));
vi.mock("@/services/messageTemplateService", () => ({
  messageTemplateService: serviceMock,
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import MessageTemplatesPage from "./MessageTemplatesPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ABSENCE_DEFAULT =
  "السلام عليكم، نحيطكم علماً بأن الطالب {student} تغيّب عن حصة {group} بتاريخ {date}.\nمع تحيات {center}.";
const EXAM_DEFAULT =
  "السلام عليكم، حصل الطالب {student} على {score} من {total} في {exam}.\nمع تحيات {center}.";
const FEES_DEFAULT =
  "مرحباً، نود تذكيركم بسداد اشتراك شهر {month} للطالب {student}. المتبقي: {amount}.\nمع تحيات {center}.";

const absenceTemplate = (overrides = {}) => ({
  key: "absence",
  body: ABSENCE_DEFAULT,
  defaultBody: ABSENCE_DEFAULT,
  isCustomized: false,
  maxLength: 500,
  placeholders: [
    { key: "student", label: "اسم الطالب" },
    { key: "group", label: "اسم المجموعة" },
    { key: "center", label: "اسم المركز" },
    { key: "date", label: "التاريخ" },
  ],
  ...overrides,
});

const TEMPLATES = [
  absenceTemplate(),
  {
    key: "examResult",
    body: EXAM_DEFAULT,
    defaultBody: EXAM_DEFAULT,
    isCustomized: false,
    maxLength: 500,
    placeholders: [
      { key: "student", label: "اسم الطالب" },
      { key: "center", label: "اسم المركز" },
      { key: "exam", label: "اسم الامتحان" },
      { key: "score", label: "الدرجة" },
      { key: "total", label: "الدرجة النهائية" },
    ],
  },
  {
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
  },
];

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

const renderPage = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(h(MessageTemplatesPage));
  });

  // Let the list request settle and the debounced preview run.
  await flush(300);
  return container;
};

const textarea = () => container.querySelector("#message-template-body");

const buttonByText = (label) =>
  [...container.querySelectorAll("button")].find((button) =>
    button.textContent.trim().includes(label),
  );

const click = async (button) => {
  expect(button).toBeTruthy();

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush(300);
};

const setTextarea = async (value) => {
  const field = textarea();
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  ).set;

  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush(300);
};

beforeEach(() => {
  vi.clearAllMocks();

  authState.auth = {
    role: "CenterOwner",
    isSoloTeacher: false,
    accessToken: "test-token",
    hasModule: () => true,
  };

  serviceMock.list.mockResolvedValue({
    succeeded: true,
    message: "",
    data: TEMPLATES,
  });
  serviceMock.preview.mockResolvedValue({
    succeeded: true,
    message: "",
    data: {
      key: "absence",
      text: "مرحباً أحمد، تغيّبت عن حصة الرياضيات.",
      encodedText: "",
      whatsAppUrl: "",
      sampleValues: {},
    },
  });
  serviceMock.update.mockImplementation(async (key, body) => ({
    succeeded: true,
    message: "تم حفظ قالب الرسالة بنجاح",
    data: absenceTemplate({ key, body, isCustomized: true }),
  }));
  serviceMock.reset.mockResolvedValue({
    succeeded: true,
    message: "تمت استعادة القالب الافتراضي",
    data: absenceTemplate(),
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.unstubAllGlobals();
});

describe("MessageTemplatesPage", () => {
  it("loads the backend bodies, shows the counter and renders a live preview", async () => {
    const scope = await renderPage();

    expect(serviceMock.list).toHaveBeenCalledTimes(1);
    expect(textarea().value).toBe(ABSENCE_DEFAULT);
    expect(scope.textContent).toContain("قوالب الرسائل");
    expect(scope.textContent).toContain(`${ABSENCE_DEFAULT.length} / 500 حرف`);

    expect(serviceMock.preview).toHaveBeenCalled();
    expect(scope.textContent).toContain("مرحباً أحمد، تغيّبت عن حصة الرياضيات.");
  });

  it("inserts a placeholder token at the cursor", async () => {
    await renderPage();
    await setTextarea("");

    await click(buttonByText("{group}"));

    expect(textarea().value).toBe("{group}");
  });

  it("saves the edited body and marks the template as customized", async () => {
    const scope = await renderPage();
    const custom = "أهلاً {student}، غياب يوم {date}.";

    await setTextarea(custom);
    await click(buttonByText("حفظ القالب"));

    expect(serviceMock.update).toHaveBeenCalledWith("absence", custom);
    expect(scope.textContent).toContain("مخصص");
  });

  it("restores the built-in default with one click", async () => {
    serviceMock.list.mockResolvedValue({
      succeeded: true,
      data: [
        absenceTemplate({
          body: "نص مخصص {student}",
          isCustomized: true,
        }),
        TEMPLATES[1],
        TEMPLATES[2],
      ],
    });

    await renderPage();
    expect(textarea().value).toBe("نص مخصص {student}");

    await click(buttonByText("استعادة الافتراضي"));

    expect(serviceMock.reset).toHaveBeenCalledWith("absence");
    expect(textarea().value).toBe(ABSENCE_DEFAULT);
  });

  it("shows the backend's Arabic validation error instead of saving", async () => {
    const scope = await renderPage();

    serviceMock.update.mockResolvedValueOnce({
      succeeded: false,
      message:
        "المتغير {parent} غير معروف. المتغيرات المسموحة: {student}، {group}، {center}، {date}",
    });

    await setTextarea("أهلاً {parent}");
    await click(buttonByText("حفظ القالب"));

    expect(scope.querySelector('[role="alert"]')?.textContent).toContain(
      "المتغير {parent} غير معروف",
    );
  });

  it("shows the API error message when the request fails", async () => {
    const scope = await renderPage();

    serviceMock.update.mockRejectedValueOnce({
      response: {
        data: { message: "لا يمكن أن يحتوي نص الرسالة على رقم هاتف" },
      },
    });

    await click(buttonByText("حفظ القالب"));

    expect(scope.querySelector('[role="alert"]')?.textContent).toContain(
      "لا يمكن أن يحتوي نص الرسالة على رقم هاتف",
    );
  });

  it("shows a preview validation error for an unknown placeholder", async () => {
    serviceMock.preview.mockResolvedValue({
      succeeded: false,
      message: "المتغير {parent} غير معروف",
    });

    const scope = await renderPage();

    expect(scope.querySelector('[role="alert"]')?.textContent).toContain(
      "المتغير {parent} غير معروف",
    );
  });

  it("warns when the body exceeds 500 characters", async () => {
    const scope = await renderPage();

    await setTextarea("ا".repeat(501));

    expect(scope.textContent).toContain("501 / 500 حرف");
    expect(scope.textContent).toContain(
      "نص الرسالة يجب ألا يزيد عن 500 حرف",
    );
  });

  it("is hidden from roles that cannot edit templates", async () => {
    authState.auth = {
      role: "Teacher",
      isSoloTeacher: false,
      accessToken: "test-token",
      hasModule: () => true,
    };

    const scope = await renderPage();

    expect(scope.textContent).toContain("لا تملك صلاحية تعديل القوالب");
    expect(scope.querySelector("#message-template-body")).toBeNull();
    expect(serviceMock.list).not.toHaveBeenCalled();
  });
});
