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

// The overview tab has no table rows: it renders one card for every numeric
// aggregate the API returned. Keep this list in the same order as the cards in
// ReportsOverviewTab so a missing/extra card fails the smoke check.
const OVERVIEW_STAT_FIELDS = [
  'studentsCount',
  'activeStudentsCount',
  'inactiveStudentsCount',
  'groupsCount',
  'teachersCount',
  'assistantsCount',
  'sessionsCount',
  'presentCount',
  'absentCount',
  'lateCount',
  'excusedCount',
  'totalCount',
  'monthlyRevenue',
  'monthlyExpenses',
  'netProfit',
];

const readOverviewCards = (body) => {
  const data = body?.data ?? body ?? {};
  const cards = OVERVIEW_STAT_FIELDS.filter(
    (key) => data[key] !== null && data[key] !== undefined,
  ).length;

  return { rows: cards, totalCount: cards, pageSize: cards };
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

// Batch 9: the center report answers once and paints two independent tables.
// Comparing both against the same payload catches a regression that hides one
// breakdown or renders rows from a different envelope.
async function captureCenterReports(page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      /\/Reports\/Center-Overview(\?|$)/.test(response.url()) &&
      response.request().method() === 'GET',
    { timeout: 60_000 },
  );

  await page.goto('/center-reports', { waitUntil: 'domcontentloaded' });

  const response = await responsePromise;
  expect(
    response.ok(),
    `/center-reports: ${response.url()} answered ${response.status()}`,
  ).toBeTruthy();

  const body = await response.json();
  const report = body?.data ?? body ?? {};
  const teachers = Array.isArray(report.teachers) ? report.teachers : [];
  const groups = Array.isArray(report.groups) ? report.groups : [];

  await expect(page.getByTestId('center-reports-page')).toBeVisible();
  await expect(page.getByTestId('center-teacher-row')).toHaveCount(
    teachers.length,
  );
  await expect(page.getByTestId('center-group-row')).toHaveCount(groups.length);

  return { teachers: teachers.length, groups: groups.length };
}

// Batch 9: the header bell must mirror the unread-count endpoint, including
// the "99+" cap, instead of showing a stale or hard-coded number.
async function captureBellUnread(page, { path, api }) {
  const responsePromise = page.waitForResponse(
    (response) =>
      api.test(response.url()) && response.request().method() === 'GET',
    { timeout: 60_000 },
  );

  await page.goto(path, { waitUntil: 'domcontentloaded' });

  const response = await responsePromise;
  expect(
    response.ok(),
    `${path}: ${response.url()} answered ${response.status()}`,
  ).toBeTruthy();

  const body = await response.json();
  const count = Number(body?.data ?? 0) || 0;
  const badge = page.locator('[data-testid="notification-unread-count"]:visible');
  const bell = page.locator('[data-testid="notification-bell-button"]:visible');

  await expect(bell.first()).toBeVisible();
  if (count > 0) {
    await expect(badge.first()).toHaveText(count > 99 ? '99+' : String(count));
    await expect(bell.first()).toHaveAttribute(
      'aria-label',
      `الإشعارات (${count} غير مقروء)`,
    );
  } else {
    await expect(badge).toHaveCount(0);
    await expect(bell.first()).toHaveAttribute('aria-label', 'الإشعارات');
  }

  return count;
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
  {
    name: 'student report rows',
    path: '/student-reports',
    api: /\/Student\/Paginated(\?|$)/,
    rows: '[data-testid="reports-students-page"] table tbody tr',
  },
  {
    name: 'report groups',
    path: '/reports',
    api: /\/Group\/Paginated(\?|$)/,
    rows: '[data-testid="reports-groups-page"] table tbody tr',
    open: async (page) => {
      await page.getByTestId('reports-tab-groups').click();
    },
  },
  {
    name: 'report overview cards',
    path: '/reports',
    api: /\/Reports\/Overview(\?|$)/,
    rows: '[data-testid="reports-stat-card"]',
    parse: readOverviewCards,
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

  test('center report teacher and group rows match the API payload', async ({
    page,
  }) => {
    const result = await captureCenterReports(page);

    test.info().annotations.push({
      type: 'api-rows',
      description: `${result.teachers} teachers, ${result.groups} groups`,
    });
  });
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

test.describe('notification bell mirrors the API — student', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'student');
  });

  test('unread count matches Unread-Count', async ({ page }) => {
    const count = await captureBellUnread(page, {
      path: '/student/dashboard',
      api: /\/StudentPortal\/Notifications\/Unread-Count(\?|$)/,
    });

    test.info().annotations.push({
      type: 'api-rows',
      description: `${count} unread`,
    });
  });
});

test.describe('notification bell mirrors the API — parent', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'parent');
  });

  test('unread count matches Unread-Count', async ({ page }) => {
    const count = await captureBellUnread(page, {
      path: '/parent/dashboard',
      api: /\/ParentPortal\/Notifications\/Unread-Count(\?|$)/,
    });

    test.info().annotations.push({
      type: 'api-rows',
      description: `${count} unread`,
    });
  });
});
