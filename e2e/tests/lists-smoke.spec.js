import { test, expect } from '@playwright/test';
import { loginAs } from './support/auth.js';

/**
 * List smoke check.
 *
 * Every list screen rebuilt in phases 3-8 must show the rows the API returned,
 * not just "something". For each list we capture the page-1 response of the
 * endpoint the screen itself calls, then assert the rendered row count equals
 * the number of rows in that response. An envelope mismatch (reading
 * `res.items` from a `PaginatedResult` that serialises rows as `data.data`, or
 * vice versa) fails here instead of silently rendering an empty list.
 *
 * The expected counts are read from the live E2E database, so the check keeps
 * working as seed data changes.
 */

const readPage = (body) => {
  const envelope = body?.data ?? body;
  const rows = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.data)
      ? envelope.data
      : Array.isArray(envelope?.items)
        ? envelope.items
        : [];
  const meta = Array.isArray(envelope) ? body : envelope;

  return {
    rows: rows.length,
    totalCount: Number(meta?.totalCount ?? rows.length) || 0,
    pageSize: Number(meta?.pageSize ?? rows.length) || rows.length,
  };
};

// Portal screens answer with plain objects (`{ payments: [...] }`,
// `{ records: [...] }`) or a bare array, not the paginated envelope.
const readArray = (body, pick) => {
  const envelope = body?.data ?? body;
  const value = pick ? pick(envelope) : envelope;
  const rows = Array.isArray(value) ? value : [];

  return { rows: rows.length, totalCount: rows.length, pageSize: rows.length };
};

async function captureList(page, { path, api, rows: rowsSelector, open, parse }) {
  const responsePromise = page.waitForResponse(
    (response) =>
      api.test(response.url()) && response.request().method() === 'GET',
    { timeout: 60_000 },
  );

  await page.goto(path, { waitUntil: 'domcontentloaded' });

  if (open) await open(page);

  const response = await responsePromise;
  expect(
    response.ok(),
    `${path}: ${response.url()} answered ${response.status()}`,
  ).toBeTruthy();

  const body = await response.json();
  const expected = (parse ?? readPage)(body);

  await expect(
    page.locator(rowsSelector),
    `${path}: rendered rows must match the API payload (${expected.rows} rows, totalCount ${expected.totalCount})`,
  ).toHaveCount(expected.rows, { timeout: 30_000 });

  return expected;
}

// `/dashboard` (the students list) is an Assistant/Teacher route — it has been
// since before the UI-identity work — so the owner block does not include it.
const OWNER_LISTS = [
  {
    name: 'teachers',
    path: '/teachers',
    api: /\/Teacher\/Paginated(\?|$)/,
    rows: '[data-testid="teachers-page"] table tbody tr',
  },
  {
    name: 'assistants',
    path: '/assistants',
    api: /\/Assistant\/Paginated(\?|$)/,
    rows: '[data-testid="assistants-page"] table tbody tr',
  },
  {
    name: 'groups',
    path: '/settings',
    api: /\/Group\/Paginated(\?|$)/,
    rows: '[data-testid="settings-page"] [data-testid^="group-card-"]',
    open: async (page) => {
      // The groups list is the second tab of `/settings`; the tabs render with
      // role="tab", not role="button".
      await page
        .getByRole('tab', { name: 'المجموعات الحالية' })
        .click();
    },
  },
  {
    name: 'payments',
    path: '/finance',
    api: /\/Payments\/Paginated(\?|$)/,
    rows: '[data-testid="payments-table"] tbody tr',
  },
  {
    name: 'incomes',
    path: '/income',
    api: /\/Income\/Paginated(\?|$)/,
    rows: '[data-testid="incomes-page"] table tbody tr',
  },
  {
    name: 'expenses',
    path: '/expense',
    api: /\/Expense\/Paginated(\?|$)/,
    rows: '[data-testid="expenses-page"] table tbody tr',
  },
];

const TEACHER_LISTS = [
  {
    name: 'students',
    path: '/dashboard',
    api: /\/Student\/Paginated(\?|$)/,
    rows: '[data-testid="students-table"] tbody tr',
  },
  {
    name: 'question bank',
    path: '/question-bank',
    api: /\/QuestionBank\/Paginated(\?|$)/,
    rows: '[data-testid="question-bank-page"] table tbody tr',
  },
  {
    name: 'exams',
    path: '/exams',
    api: /\/QuestionExam\/Paginated(\?|$)/,
    rows: '[data-testid="exams-page"] table tbody tr',
  },
  {
    name: 'study notes',
    path: '/notes',
    api: /\/StudyNote\/Paginated(\?|$)/,
    rows: '[data-testid="study-notes-page"] table tbody tr',
  },
];

// Batch 8 rebuilt the two portals. Their lists are cards at every width (the
// tables that do exist are the desktop variant of the same rows), so the
// selector targets one card per row.
const STUDENT_LISTS = [
  {
    name: 'student payments',
    path: '/student/payments',
    api: /\/StudentPortal\/Payments(\?|$)/,
    rows: '[data-testid="student-payments-page"] [data-testid="student-payment-card"]',
    parse: (body) => readArray(body, (data) => data?.payments),
  },
  {
    name: 'student results',
    path: '/student/results',
    api: /\/StudentPortal\/Results(\?|$)/,
    rows: '[data-testid="student-results-page"] [data-testid="student-result-card"]',
  },
  {
    name: 'student attendance',
    path: '/student/attendance',
    api: /\/StudentPortal\/Attendance(\?|$)/,
    rows: '[data-testid="student-attendance-page"] [data-testid="student-attendance-card"]',
    parse: (body) => readArray(body, (data) => data?.records),
  },
  {
    name: 'student notes',
    path: '/student/notes',
    api: /\/StudentPortal\/Notes(\?|$)/,
    rows: '[data-testid="student-notes-page"] article',
  },
  {
    name: 'student notifications',
    path: '/student/notifications',
    api: /\/StudentPortal\/Notifications(\?|$)/,
    rows: '[data-testid="student-notifications-page"] ul > li',
  },
];

const PARENT_LISTS = [
  {
    name: 'parent children',
    path: '/parent/dashboard',
    api: /\/ParentPortal\/Children(\?|$)/,
    rows: '[data-testid="parent-child-card"]',
  },
  {
    name: 'parent notifications',
    path: '/parent/notifications',
    api: /\/ParentPortal\/Notifications(\?|$)/,
    rows: '[data-testid="parent-notifications-page"] ul > li',
  },
];

test.describe('list rows match the API — center owner', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'centerOwner');
  });

  for (const list of OWNER_LISTS) {
    test(`${list.name} list shows the API rows`, async ({ page }) => {
      const result = await captureList(page, list);

      if (list.name === 'assistants') {
        await expect(
          page.getByTestId('assistants-error'),
          'a failed request must not be shown as an empty list',
        ).toHaveCount(0);
      }

      test.info().annotations.push({
        type: 'api-rows',
        description: `${result.rows} of ${result.totalCount} (pageSize ${result.pageSize})`,
      });
    });
  }
});

test.describe('list rows match the API — teacher', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'teacher');
  });

  for (const list of TEACHER_LISTS) {
    test(`${list.name} list shows the API rows`, async ({ page }) => {
      const result = await captureList(page, list);

      test.info().annotations.push({
        type: 'api-rows',
        description: `${result.rows} of ${result.totalCount} (pageSize ${result.pageSize})`,
      });
    });
  }
});

test.describe('list rows match the API — student portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'student');
  });

  for (const list of STUDENT_LISTS) {
    test(`${list.name} list shows the API rows`, async ({ page }) => {
      const result = await captureList(page, list);

      test.info().annotations.push({
        type: 'api-rows',
        description: `${result.rows} of ${result.totalCount}`,
      });
    });
  }
});

test.describe('list rows match the API — parent portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'parent');
  });

  for (const list of PARENT_LISTS) {
    test(`${list.name} list shows the API rows`, async ({ page }) => {
      const result = await captureList(page, list);

      test.info().annotations.push({
        type: 'api-rows',
        description: `${result.rows} of ${result.totalCount}`,
      });
    });
  }
});
