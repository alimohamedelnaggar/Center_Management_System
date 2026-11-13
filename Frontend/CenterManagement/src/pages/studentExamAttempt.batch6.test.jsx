// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Batch 6 proof for the student e-exam attempt screen (the sensitive one):
 *   - the start screen explains the rules, then the exam shows all three
 *     question types (true/false, multiple choice, essay) with their images;
 *   - the timer, submit and violation counter live in ONE sticky header;
 *   - every option is at least 44px tall;
 *   - answers are drafted to localStorage, the draft state survives going
 *     offline, and the submit payload keeps the original API shape;
 *   - violations are reported to the API and listed in the in-app log.
 */

const portalMock = vi.hoisted(() => ({
  getAttempt: vi.fn(),
  submitAttempt: vi.fn(),
  reportViolation: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../services/studentPortalService", () => ({
  studentPortalService: portalMock,
}));

vi.mock("../services/questionBankService", () => ({
  questionBankService: {},
  questionImageUrl: (name) => `/images/questions/${name}`,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

import StudentExamAttemptPage from "./StudentPortalPages/StudentExamAttemptPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ATTEMPT = {
  examName: "امتحان العلوم",
  totalMark: 10,
  remainingSeconds: 720,
  violationCount: 0,
  questions: [
    {
      id: "q1",
      type: 1,
      typeName: "صح وغلط",
      text: "الشمس نجم.",
      imageName: null,
      mark: 2,
      options: [
        { id: "o1", text: "صح", isCorrect: true },
        { id: "o2", text: "غلط", isCorrect: false },
      ],
    },
    {
      id: "q2",
      type: 2,
      typeName: "اختر من متعدد",
      text: "ما أكبر كوكب في المجموعة الشمسية؟",
      imageName: "q2.png",
      mark: 2,
      options: [
        { id: "o3", text: "عطارد", isCorrect: false },
        { id: "o4", text: "المشتري", isCorrect: true },
        { id: "o5", text: "زحل", isCorrect: false },
        { id: "o6", text: "الأرض", isCorrect: false },
      ],
    },
    {
      id: "q3",
      type: 3,
      typeName: "مقالي",
      text: "اكتب تعريفًا موجزًا للطاقة.",
      imageName: "q3.png",
      mark: 6,
      options: [],
    },
  ],
};

const EMAIL_DRAFT_KEY = "exam-draft:attempt-1";

let container;
let root;

const flush = async (ms = 0, rounds = 10) => {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  }
};

const wait = async (ms) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
  await flush();
};

const render = async () => {
  await act(async () => {
    root.render(
      h(
        MemoryRouter,
        { initialEntries: ["/student/attempt/attempt-1"] },
        h(
          Routes,
          null,
          h(Route, {
            path: "/student/attempt/:attemptId",
            element: h(StudentExamAttemptPage),
          }),
          h(Route, {
            path: "/student/results",
            element: h("div", { "data-testid": "results-page" }),
          }),
          h(Route, { path: "*", element: null }),
        ),
      ),
    );
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
  [...container.querySelectorAll(selector)].find((element) =>
    element.textContent.trim().includes(label),
  );

const startExam = async () => {
  await render();
  await click(byText("button", "بدء الامتحان"));
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  localStorage.clear();

  Object.defineProperty(document, "fullscreenEnabled", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    writable: true,
    value: null,
  });
  document.documentElement.requestFullscreen = vi.fn().mockResolvedValue();
  document.exitFullscreen = vi.fn().mockResolvedValue();

  portalMock.getAttempt.mockResolvedValue({ succeeded: true, data: ATTEMPT });
  portalMock.submitAttempt.mockResolvedValue({
    succeeded: true,
    message: "تم تسليم الامتحان بنجاح",
  });
  portalMock.reportViolation.mockResolvedValue({ succeeded: true });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  document.fullscreenElement = null;
  localStorage.clear();
  container.remove();
});

describe("student e-exam attempt batch 6", () => {
  it("keeps timer, submit and violations in one sticky header over all question types", async () => {
    await startExam();

    const header = container.querySelector('[data-testid="exam-header"]');
    const timer = container.querySelector('[data-testid="exam-timer"]');
    const submit = container.querySelector('[data-testid="exam-submit"]');
    const warning = container.querySelector(
      '[data-testid="exam-fullscreen-warning"]',
    );

    expect(header).toBeTruthy();
    expect(timer).toBeTruthy();
    expect(submit).toBeTruthy();
    expect(header.contains(timer)).toBe(true);
    expect(header.contains(submit)).toBe(true);
    expect(timer.textContent.trim()).toContain("12:00");
    expect(submit.textContent).toContain("تسليم");

    // F-023: the warning and the header must share a single sticky wrapper,
    // never two stacked sticky elements that can cover the timer.
    expect(warning).toBeTruthy();
    const sticky = header.closest(".sticky");
    expect(sticky).toBeTruthy();
    expect(sticky.className).toContain("top-0");
    expect(warning.closest(".sticky")).toBe(sticky);
    expect(sticky.contains(warning)).toBe(true);
    expect(container.querySelectorAll(".sticky.top-0")).toHaveLength(1);

    const questions = [
      ...container.querySelectorAll('[data-testid="exam-question"]'),
    ];
    expect(questions.map((q) => q.dataset.questionType)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(questions[0].textContent).toContain("الشمس نجم.");
    expect(questions[1].textContent).toContain("ما أكبر كوكب");
    expect(questions[2].textContent).toContain("اكتب تعريفًا");
    expect(questions[2].querySelector("textarea")).toBeTruthy();

    const images = [...container.querySelectorAll('[data-testid="exam-question"] img')];
    expect(images).toHaveLength(2);
    expect(images.map((img) => img.getAttribute("src"))).toEqual([
      "/images/questions/q2.png",
      "/images/questions/q3.png",
    ]);

    const optionLabels = [
      ...container.querySelectorAll(
        '[data-question-type="1"] label, [data-question-type="2"] label',
      ),
    ];
    expect(optionLabels).toHaveLength(6);
    optionLabels.forEach((label) => {
      expect(label.className).toContain("min-h-11");
    });
  });

  it("drafts answers locally and keeps saving them while offline", async () => {
    await startExam();

    const trueOption = container.querySelector(
      'input[name="question-q1"]',
    );
    await click(trueOption);

    const essay = container.querySelector('[data-question-type="3"] textarea');
    await typeInto(essay, "إجابة تجريبية");

    await wait(320);

    const draft = JSON.parse(localStorage.getItem(EMAIL_DRAFT_KEY));
    expect(draft.answers.q1.selectedOptionId).toBe("o1");
    expect(draft.answers.q3.essayAnswer).toBe("إجابة تجريبية");
    expect(
      container.querySelector('[data-testid="exam-draft-state"]').textContent,
    ).toContain("حفظ تلقائي");

    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    await wait(320);

    expect(
      container.querySelector('[data-testid="exam-draft-state"]').textContent,
    ).toContain("غير متصل");
    expect(JSON.parse(localStorage.getItem(EMAIL_DRAFT_KEY)).answers.q1.selectedOptionId).toBe(
      "o1",
    );

    expect(
      container.querySelector('[data-testid="exam-offline-note"]').textContent,
    ).toContain("إجاباتك تُحفظ على هذا الجهاز");
  });

  it("collapses the sticky chrome on a short viewport (landscape or keyboard)", async () => {
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 400,
    });

    try {
      await startExam();

      const sticky = container.querySelector(
        '[data-testid="exam-sticky-header"]',
      );
      expect(sticky).toBeTruthy();
      // The tall warning strip is replaced by a 44px icon in the header row.
      expect(
        container.querySelector('[data-testid="exam-fullscreen-warning"]'),
      ).toBeNull();
      expect(
        container.querySelector('[data-testid="exam-fullscreen-inline"]'),
      ).toBeTruthy();
      // The progress/draft row is hidden so the wrapper stays under 20%.
      expect(
        container.querySelector('[data-testid="exam-draft-state"]').parentElement
          .className,
      ).toContain("hidden");
      // Timer and submit stay visible.
      expect(
        container.querySelector('[data-testid="exam-timer"]'),
      ).toBeTruthy();
      expect(
        container.querySelector('[data-testid="exam-submit"]'),
      ).toBeTruthy();
    } finally {
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalHeight,
      });
    }
  });

  it("collapses the fullscreen warning after the student dismisses it", async () => {
    await startExam();

    const dismiss = container.querySelector(
      '[data-testid="exam-fullscreen-dismiss"]',
    );
    expect(dismiss).toBeTruthy();
    await click(dismiss);

    expect(
      container.querySelector('[data-testid="exam-fullscreen-warning"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="exam-fullscreen-inline"]'),
    ).toBeTruthy();
    expect(container.textContent).not.toContain("أنت خارج وضع ملء الشاشة");
    // Dismissing the notice is not a violation.
    expect(portalMock.reportViolation).not.toHaveBeenCalled();
  });

  it("submitting offline keeps the draft and explains how to retry", async () => {
    await startExam();
    await click(container.querySelector('input[name="question-q1"]'));
    await wait(320);

    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    portalMock.submitAttempt.mockRejectedValueOnce(new Error("network down"));

    try {
      await click(container.querySelector('[data-testid="exam-submit"]'));
      const confirm = container.querySelector('[data-testid="confirm-modal"]');
      expect(confirm).toBeTruthy();
      expect(confirm.textContent).toContain("لا يوجد اتصال حاليًا");

      const confirmButton = [...confirm.querySelectorAll("button")].find(
        (btn) => btn.textContent.trim() === "تسليم",
      );
      await click(confirmButton);
      await wait(200);

      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("إجاباتك محفوظة على هذا الجهاز"),
      );
      // Nothing was lost: the local draft is still there and the student stays.
      expect(
        JSON.parse(localStorage.getItem(EMAIL_DRAFT_KEY)).answers.q1
          .selectedOptionId,
      ).toBe("o1");
      expect(
        container.querySelector('[data-testid="student-exam-attempt"]'),
      ).toBeTruthy();
      expect(
        container.querySelector('[data-testid="results-page"]'),
      ).toBeNull();
    } finally {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: true,
      });
    }
  });

  it("does not promise fullscreen on a browser without the API (iPhone Safari)", async () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: false,
    });

    await render();
    expect(container.textContent).toContain(
      "متصفح هذا الجهاز لا يدعم ملء الشاشة",
    );
    expect(container.textContent).not.toContain("الخروج منه يُسجَّل كمخالفة");

    await click(byText("button", "بدء الامتحان"));
    expect(
      container.querySelector('[data-testid="exam-fullscreen-warning"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="exam-fullscreen-inline"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="student-exam-attempt"]'),
    ).toBeTruthy();
  });

  it("reports violations to the API and lists them in the violation log", async () => {
    await startExam();

    await act(async () => {
      document.dispatchEvent(
        new Event("copy", { bubbles: true, cancelable: true }),
      );
    });
    await flush();

    expect(portalMock.reportViolation).toHaveBeenCalledWith(
      "attempt-1",
      "copy",
    );

    const counter = container.querySelector(
      '[data-testid="exam-violation-count"]',
    );
    expect(counter.textContent.trim()).toBe("1");

    await click(counter);

    const log = container.querySelector('[data-testid="violation-log"]');
    const list = container.querySelector('[data-testid="violation-log-list"]');
    expect(log).toBeTruthy();
    expect(list).toBeTruthy();
    expect(list.textContent).toContain("محاولة نسخ");
    expect(log.textContent).toContain("إجمالي المخالفات");
  });

  it("submits the original payload shape and clears the local draft", async () => {
    await startExam();

    await click(container.querySelector('input[name="question-q1"]'));
    await typeInto(
      container.querySelector('[data-question-type="3"] textarea'),
      "إجابة تجريبية",
    );

    await click(container.querySelector('[data-testid="exam-submit"]'));

    expect(container.textContent).toContain("تمت الإجابة عن 2 من 3 سؤال");

    const confirm = [...container.querySelectorAll("button")]
      .filter((button) => button.textContent.trim() === "تسليم")
      .at(-1);

    await click(confirm);

    expect(portalMock.submitAttempt).toHaveBeenCalledWith("attempt-1", [
      { questionId: "q1", selectedOptionId: "o1", essayAnswer: null },
      { questionId: "q2", selectedOptionId: null, essayAnswer: null },
      { questionId: "q3", selectedOptionId: null, essayAnswer: "إجابة تجريبية" },
    ]);
    expect(localStorage.getItem(EMAIL_DRAFT_KEY)).toBeNull();
    expect(container.querySelector('[data-testid="results-page"]')).toBeTruthy();
  });
});
