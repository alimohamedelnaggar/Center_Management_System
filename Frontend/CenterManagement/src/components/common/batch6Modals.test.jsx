// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Batch 6 proof for the exam / question-bank / note dialogs:
 *   - every dialog panel is capped to the viewport and scrolls internally;
 *   - every close button is a 44px target with an accessible name;
 *   - the primary/cancel actions are 44px and the long note dialog keeps the
 *     form usable on a short phone screen.
 */

const examServiceMock = vi.hoisted(() => ({
  getResults: vi.fn(),
  publishResults: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../services/questionExamService", () => ({
  questionExamService: examServiceMock,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

import ConfirmModal from "./ConfirmModal";
import QuestionBankModal from "../../pages/QuestionBankPages/QuestionBankModal";
import StudyNoteModal from "../../pages/StudyNotePages/StudyNoteModal";
import QuestionExamResultsModal from "../../pages/QuestionExamPages/QuestionExamResultsModal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const render = async (element) => {
  await act(async () => {
    root.render(element);
  });
  await flush();
};

const click = async (element) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const typeInto = async (element, value) => {
  const proto =
    element.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
};

const byText = (selector, label) =>
  [...container.querySelectorAll(selector)].find(
    (element) => element.textContent.trim() === label,
  );

const closeButton = () =>
  container.querySelector('button[aria-label="إغلاق"]');

const panelOf = (element) => element.closest('[class*="max-h-"]');

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  examServiceMock.getResults.mockResolvedValue({ succeeded: true, data: [] });
  examServiceMock.publishResults.mockResolvedValue({ succeeded: true });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe("batch 6 dialogs", () => {
  it("ConfirmModal is viewport-capped, scrollable, and every action is 44px", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    await render(
      h(ConfirmModal, {
        isOpen: true,
        onClose,
        onConfirm,
        title: "حذف المذكرة",
        message: "هل أنت متأكد؟",
        details: [{ label: "العنوان", value: "مذكرة النحو" }],
        confirmText: "حذف",
        cancelText: "إلغاء",
      }),
    );

    const close = closeButton();
    expect(close).toBeTruthy();
    expect(close.className).toContain("h-11");
    expect(close.className).toContain("w-11");

    const panel = close.parentElement;
    expect(panel.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(panel.className).toContain("overflow-y-auto");

    const cancel = byText("button", "إلغاء");
    const confirm = byText("button", "حذف");
    expect(cancel.className).toContain("min-h-11");
    expect(confirm.className).toContain("min-h-11");
    expect(container.textContent).toContain("مذكرة النحو");

    await click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("QuestionBankModal keeps 44px fields and saves the same payload", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    await render(
      h(QuestionBankModal, {
        open: true,
        bank: null,
        academicYears: [{ id: "y1", name: "الصف الأول" }],
        onClose,
        onSave,
      }),
    );

    const close = closeButton();
    expect(close.className).toContain("h-11");
    expect(close.className).toContain("w-11");

    const input = container.querySelector('input[type="text"]');
    const select = container.querySelector("select");
    expect(input.className).toContain("min-h-11");
    expect(select.className).toContain("min-h-11");

    await click(close);
    expect(onClose).toHaveBeenCalledTimes(1);

    await typeInto(input, "بنك النحو");
    await act(async () => {
      select.value = "y1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();

    await click(byText("button", "حفظ"));

    expect(onSave).toHaveBeenCalledWith({
      name: "بنك النحو",
      academicYearId: "y1",
    });
  });

  it("StudyNoteModal caps its form, uses 44px controls, and validates the file", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const groups = [
      { id: "g1", name: "مجموعة أ" },
      { id: "g2", name: "مجموعة ب" },
    ];

    await render(
      h(StudyNoteModal, {
        isOpen: true,
        onClose,
        onSave,
        groups,
        saving: false,
      }),
    );

    const form = container.querySelector("form");
    expect(form.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(form.className).toContain("overflow-y-auto");

    const close = closeButton();
    expect(close.className).toContain("h-11");
    expect(close.className).toContain("w-11");

    const title = container.querySelector('input[type="text"]');
    expect(title.className).toContain("min-h-11");
    expect(
      container.querySelector("textarea").className,
    ).toContain("min-h-11");

    const groupButton = byText("button", "مجموعة أ");
    expect(groupButton.className).toContain("min-h-11");
    await click(groupButton);
    expect(groupButton.className).toContain("border-primary");

    const cancel = byText("button", "إلغاء");
    const save = byText("button", "حفظ وإرسال");
    expect(cancel.className).toContain("min-h-11");
    expect(save.className).toContain("min-h-11");

    await typeInto(title, "مذكرة النحو");
    await click(save);

    expect(onSave).not.toHaveBeenCalled();
    expect(container.textContent).toContain("الرجاء إرفاق ملف المذكرة");
  });

  it("QuestionExamResultsModal is capped and closes with a 44px button", async () => {
    const onClose = vi.fn();

    await render(
      h(QuestionExamResultsModal, {
        open: true,
        exam: {
          id: "e1",
          name: "امتحان الرياضيات",
          isResultsPublished: false,
        },
        onClose,
      }),
    );

    expect(examServiceMock.getResults).toHaveBeenCalledWith("e1");

    const close = closeButton();
    expect(close.className).toContain("h-11");
    expect(close.className).toContain("w-11");

    const panel = panelOf(close);
    expect(panel.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(container.textContent).toContain("لا توجد نتائج لهذا الامتحان بعد.");

    await click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
