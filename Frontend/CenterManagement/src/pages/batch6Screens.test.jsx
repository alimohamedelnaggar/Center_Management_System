// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

/**
 * Batch 6 proof for the exam / question-bank / study-note screens:
 *   - each screen renders the mobile cards AND the desktop table from the same
 *     paginated payload, and the shared pagination sits outside both views;
 *   - every row action (and every filter) meets the 44px touch target;
 *   - paging still asks the API for the same page number/size shape.
 */

const bankServiceMock = vi.hoisted(() => ({
  getAcademicYears: vi.fn(),
  getBanksPaged: vi.fn(),
}));

const examServiceMock = vi.hoisted(() => ({
  getPaged: vi.fn(),
}));

const notesServiceMock = vi.hoisted(() => ({
  getPaged: vi.fn(),
}));

const groupsServiceMock = vi.hoisted(() => ({
  getAllGroups: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../services/questionBankService", () => ({
  questionBankService: bankServiceMock,
  questionImageUrl: (name) => `/images/questions/${name}`,
}));

vi.mock("../services/questionExamService", () => ({
  questionExamService: examServiceMock,
}));

vi.mock("../services/studyNotesService", () => ({
  studyNotesService: notesServiceMock,
  studyNoteFileUrl: (name) => `/files/${name}`,
}));

vi.mock("../services/groupsService", () => ({
  groupsService: groupsServiceMock,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toastMock,
  toast: toastMock,
}));

import QuestionBankPage from "./QuestionBankPages/QuestionBankPage";
import ExamsPage from "./QuestionExamPages/ExamsPage";
import StudyNotesPage from "./StudyNotePages/StudyNotesPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BANKS = [
  {
    id: "b1",
    name: "بنك الرياضيات",
    academicYearName: "الصف الأول",
    questionsCount: 12,
  },
  {
    id: "b2",
    name: "بنك العلوم",
    academicYearName: "الصف الثاني",
    questionsCount: 7,
  },
];

const EXAMS = [
  {
    id: "e1",
    name: "امتحان الرياضيات",
    groupName: "مجموعة أ",
    academicYearName: "الصف الأول",
    mode: 2,
    modeName: "إلكتروني",
    examDate: "2026-11-10T09:00:00",
    durationMinutes: 60,
    questionsCount: 10,
    totalMarks: 20,
    isResultsPublished: false,
  },
];

const NOTES = [
  {
    id: "n1",
    title: "مذكرة النحو",
    description: "شرح كامل",
    groupNames: ["مجموعة أ"],
    fileName: "grammar.pdf",
    fileSize: 2048,
    createdAt: "2026-11-01T10:00:00",
  },
];

const paged = (data, totalCount, totalPages = 2, currentPage = 1) => ({
  succeeded: true,
  data: {
    data,
    totalCount,
    currentPage,
    totalPages,
    pageSize: 10,
  },
});

const TOUCH_TARGET = /\b(h-11|min-h-11|h-12|min-h-12)\b/;

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

const render = async (element, ms = 0) => {
  await act(async () => {
    root.render(element);
  });
  await flush(ms);
};

const click = async (element) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const byText = (selector, label) =>
  [...container.querySelectorAll(selector)].find((element) =>
    element.textContent.trim().includes(label),
  );

const pageButton = (nav, page) =>
  [...nav.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === String(page),
  );

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  bankServiceMock.getAcademicYears.mockResolvedValue({
    succeeded: true,
    data: [{ id: "y1", name: "الصف الأول" }],
  });
  bankServiceMock.getBanksPaged.mockImplementation(({ pageNumber = 1 }) =>
    Promise.resolve(paged(BANKS, 12, 2, pageNumber)),
  );
  examServiceMock.getPaged.mockImplementation(({ pageNumber = 1 }) =>
    Promise.resolve(paged(EXAMS, 12, 2, pageNumber)),
  );
  notesServiceMock.getPaged.mockResolvedValue(paged(NOTES, 3, 1));
  groupsServiceMock.getAllGroups.mockResolvedValue({
    succeeded: true,
    data: [{ id: "g1", name: "مجموعة أ" }],
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe("question bank batch 6", () => {
  it("renders cards and table from the same data with pagination outside", async () => {
    await render(h(QuestionBankPage));

    const cards = container.querySelector('[data-testid="question-bank-cards"]');
    const table = container.querySelector("table");

    expect(cards).toBeTruthy();
    expect(table).toBeTruthy();
    expect(cards.className).toContain("md:hidden");
    expect(table.closest(".hidden")).toBeTruthy();
    expect(table.closest(".hidden").className).toContain("md:block");

    expect(cards.textContent).toContain("بنك الرياضيات");
    expect(cards.textContent).toContain("الصف الأول");
    expect(cards.textContent).toContain("12 سؤال");
    expect(table.textContent).toContain("بنك الرياضيات");
    expect(table.textContent).toContain("الصف الأول");
    expect(table.textContent).toContain("12");

    const pagination = container.querySelector('nav[aria-label="ترقيم الصفحات"]');
    expect(pagination).toBeTruthy();
    expect(cards.contains(pagination)).toBe(false);
    expect(pagination.textContent).toContain("بنك");

    const filters = [
      container.querySelector('input[aria-label="بحث باسم البنك"]'),
      container.querySelector('select[aria-label="السنة الدراسية"]'),
    ];
    filters.forEach((control) => {
      expect(control).toBeTruthy();
      expect(control.className).toMatch(TOUCH_TARGET);
    });

    const tableActions = [...table.querySelectorAll("button[aria-label]")];
    expect(tableActions.length).toBeGreaterThanOrEqual(6);
    tableActions.forEach((button) => {
      expect(button.className).toMatch(TOUCH_TARGET);
    });

    await click(pageButton(pagination, 2));

    expect(bankServiceMock.getBanksPaged).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 2, pageSize: 10 }),
    );
    expect(cards.textContent).not.toContain("جاري التحميل");
  });
});

describe("exams batch 6", () => {
  it("renders the exam cards and table with 44px actions and working pagination", async () => {
    await render(
      h(MemoryRouter, null, h(ExamsPage)),
    );

    const cards = container.querySelector('[data-testid="exams-cards"]');
    const table = container.querySelector("table");

    expect(cards).toBeTruthy();
    expect(table).toBeTruthy();
    expect(cards.textContent).toContain("امتحان الرياضيات");
    expect(cards.textContent).toContain("مجموعة أ");
    expect(cards.textContent).toContain("إلكتروني");
    expect(table.textContent).toContain("امتحان الرياضيات");
    expect(table.textContent).toContain("20");

    // Electronic exams expose the results action in both views.
    const resultsButtons = container.querySelectorAll(
      'button[aria-label="نتائج امتحان الرياضيات"]',
    );
    expect(resultsButtons).toHaveLength(2);
    resultsButtons.forEach((button) => {
      expect(button.className).toMatch(TOUCH_TARGET);
    });

    const filters = [
      'input[aria-label="بحث باسم الامتحان"]',
      'select[aria-label="المجموعة"]',
      'select[aria-label="السنة الدراسية"]',
      'select[aria-label="نوع الامتحان"]',
      'select[aria-label="حالة النشر"]',
      'input[aria-label="من تاريخ"]',
      'input[aria-label="إلى تاريخ"]',
    ].map((selector) => container.querySelector(selector));

    filters.forEach((control) => {
      expect(control).toBeTruthy();
      expect(control.className).toMatch(TOUCH_TARGET);
    });

    const pagination = container.querySelector('nav[aria-label="ترقيم الصفحات"]');
    expect(pagination).toBeTruthy();
    expect(cards.contains(pagination)).toBe(false);
    expect(pagination.textContent).toContain("امتحان");

    await click(pageButton(pagination, 2));

    expect(examServiceMock.getPaged).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNumber: 2, pageSize: 10 }),
    );
  });
});

describe("study notes batch 6", () => {
  it("renders note cards and table, 44px actions, and downloads the same file", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    // The notes screen debounces its first load by 300ms.
    await render(h(StudyNotesPage), 50, 8);

    const cards = container.querySelector('[data-testid="study-notes-cards"]');
    const table = container.querySelector("table");

    expect(cards).toBeTruthy();
    expect(table).toBeTruthy();
    expect(cards.textContent).toContain("مذكرة النحو");
    expect(cards.textContent).toContain("شرح كامل");
    expect(table.textContent).toContain("مذكرة النحو");
    expect(table.textContent).toContain("مجموعة أ");

    const actions = [
      ...cards.querySelectorAll("button[aria-label]"),
      ...table.querySelectorAll("button[aria-label]"),
    ];
    expect(actions.length).toBeGreaterThanOrEqual(4);
    actions.forEach((button) => {
      expect(button.className).toMatch(TOUCH_TARGET);
    });

    expect(container.querySelector('input[aria-label="بحث بعنوان المذكرة"]').className).toMatch(
      TOUCH_TARGET,
    );
    expect(container.querySelector('select[aria-label="المجموعة"]').className).toMatch(
      TOUCH_TARGET,
    );

    const download = byText('button[aria-label^="تحميل "]', "تحميل");
    await click(download);
    expect(openSpy).toHaveBeenCalledWith(
      "/files/grammar.pdf",
      "_blank",
      "noopener",
    );

    const pagination = container.querySelector('nav[aria-label="ترقيم الصفحات"]');
    expect(pagination).toBeTruthy();
    expect(cards.contains(pagination)).toBe(false);
    expect(pagination.textContent).toContain("مذكرة");
  });
});
