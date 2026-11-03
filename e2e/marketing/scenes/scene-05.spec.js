import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { apiLogin } from '../support/api.js';
import { artifactsRoot } from '../support/env.js';
import { recordClip } from '../support/scene.js';

// The scene follows one seeded overdue student through a real partial payment,
// then shows where the money lands (expenses, dashboard, monthly report). Every
// number on screen is read back from the same API the page calls, so a change in
// the seed fails the recording instead of silently changing the story.
const TARGET_NAME = 'مالك سامي حسن';
// Short enough to keep the live search responsive: the page fires one request
// per keystroke, and a full name queues a dozen queries on LocalDB.
const SEARCH_TERM = 'مالك';
// The partial payment is a fixed, exact amount so the scene can assert the
// remainder drops by precisely this value, on screen and through the API.
const PARTIAL_AMOUNT = 300;

// The product refuses an October payment until every month since the student
// joined (July) and the system's billing start (August) is fully paid. These
// two off-camera settlements only unlock the real October payment; they are
// deleted again right after the clip, so the dashboard the viewer sees shows
// the seeded revenue plus exactly the recorded 300.
const PREP_PERIODS = ['2026-08-01', '2026-09-01'];

const CHECK_PATH = path.join(artifactsRoot, 'scene-05-finance-check.json');

const onlyClip = (process.env.MARKETING_CLIP ?? '').trim();
const wants = (clipId) => !onlyClip || onlyClip === clipId;

const money = (value) => {
  const num = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `${formatted} ج.م`;
};

const parseMoney = (text) =>
  Number(String(text ?? '').replace(/[^\d.-]/g, '') || 0);

// The billing month is the one the page opens on: today in Cairo, not UTC.
function cairoMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  return { year: get('year'), month: get('month') };
}

async function overduePage(api, { month, year, search = '', pageSize = 50 }) {
  const response = await api.request.get('/api/V1/Payments/overdue-students', {
    params: { month, year, pageNumber: 1, pageSize, search },
  });
  if (!response.ok()) {
    throw new Error(`Overdue list failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

async function paymentsFor(api, search) {
  const response = await api.request.get('/api/V1/Payments/Paginated', {
    params: { pageNumber: 1, pageSize: 500, search },
  });
  if (!response.ok()) {
    throw new Error(`Payment list failed: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  return body?.data ?? [];
}

async function dashboardSummary(api, { year, month }) {
  const response = await api.request.get('/dashboard-summary', {
    params: { year, month },
  });
  if (!response.ok()) {
    throw new Error(
      `Dashboard summary failed: ${response.status()} ${await response.text()}`,
    );
  }
  const body = await response.json();
  const data = body?.data ?? body;
  return {
    monthlyRevenue: Number(data.monthlyRevenue),
    monthlyExpenses: Number(data.monthlyExpenses),
    monthlyAssistantSalaries: Number(data.monthlyAssistantSalaries),
    netProfit: Number(data.netProfit),
  };
}

async function expenseTotal(api) {
  const response = await api.request.get('/api/V1/Expense/Paginated', {
    params: { pageNumber: 1, pageSize: 5 },
  });
  if (!response.ok()) {
    throw new Error(`Expense list failed: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  return body?.data?.totalCount ?? 0;
}

function summaryCard(page, title) {
  return page.getByText(title, { exact: true }).locator('xpath=..');
}

function moneyCard(page, title) {
  return page
    .getByText(title, { exact: true })
    .locator('xpath=../..')
    .locator('p')
    .nth(1);
}

function reportRow(page, label) {
  return page
    .locator('dl > div', { has: page.getByText(label, { exact: true }) })
    .locator('dd');
}

async function openNav(s, label, pathname) {
  await s.click(s.page.locator('aside').getByRole('link', { name: label, exact: true }));
  await s.page.waitForURL((url) => url.pathname === pathname, { timeout: 30_000 });
  await s.hold(1000);
}

test('scene 05 - partial payment, expenses, profit and the monthly report', async ({ browser }) => {
  const { year, month } = cairoMonth();
  const ym = `${year}-${String(month).padStart(2, '0')}`;

  // -----------------------------------------------------------------------
  // Preparation (never on camera): remove the payment this scene created on a
  // previous run so the student is overdue again with the full amount, then
  // read everything the recording is going to assert.
  // -----------------------------------------------------------------------
  const prep = await apiLogin('centerOwner');
  let before;
  let paymentsBefore;
  let prepPayments = [];
  let dashboardBefore = null;
  let dashboardAfter = null;
  // Student ids are regenerated by every reseed, so the target is resolved from
  // the live overdue list by name instead of being hard-coded.
  let targetId;
  try {
    const initial = await overduePage(prep, { month, year });
    const seeded = (initial.data ?? []).find(
      (item) => item.studentName === TARGET_NAME,
    );
    if (!seeded) {
      throw new Error(
        `Scene 05 needs ${TARGET_NAME} to be overdue in ${ym}. ` +
          'Reseed the marketing database first.',
      );
    }
    targetId = seeded.studentId;

    const existing = (await paymentsFor(prep, TARGET_NAME)).filter(
      (payment) =>
        payment.studentId === targetId &&
        String(payment.billingPeriod ?? '').startsWith(ym),
    );
    paymentsBefore = existing.length;
    for (const payment of existing) {
      const response = await prep.request.delete(`/api/V1/PaymentsDelete/${payment.id}`);
      if (!response.ok()) {
        throw new Error(
          `Could not reset payment ${payment.id}: ${response.status()} ${await response.text()}`,
        );
      }
    }

    // The on-screen total cards are the server totals for the whole billing
    // month, not for the searched student, so they are read from a separate
    // unfiltered call made at the same moment as the page load.
    // … but first, unlock the October payment by settling the prior months.
    // The dashboard is read before the settlement: after the clip removes it
    // again, revenue and profit must be exactly this plus the recorded 300.
    dashboardBefore = await dashboardSummary(prep, { year, month });
    const existingPrior = await paymentsFor(prep, TARGET_NAME);
    for (const period of PREP_PERIODS) {
      const monthKey = period.slice(0, 7);
      const already = existingPrior.find(
        (payment) =>
          payment.studentId === targetId &&
          String(payment.billingPeriod ?? '').startsWith(monthKey),
      );
      if (already) {
        prepPayments.push({
          id: already.id,
          period,
          amount: Number(already.amount),
          created: false,
        });
        continue;
      }

      const settle = await prep.request.post('/api/V1/Payments/Create', {
        data: {
          studentId: targetId,
          groupId: seeded.groupId,
          billingPeriod: period,
          amount: Number(seeded.totalAmount),
          notes: 'تسوية شهر سابق قبل تسجيل المشهد',
        },
      });
      if (!settle.ok()) {
        throw new Error(
          `Settling ${monthKey} for ${TARGET_NAME} failed: ` +
            `${settle.status()} ${await settle.text()}`,
        );
      }
      const created = (await paymentsFor(prep, TARGET_NAME)).find(
        (payment) =>
          payment.studentId === targetId &&
          String(payment.billingPeriod ?? '').startsWith(monthKey),
      );
      if (!created) {
        throw new Error(
          `Settling ${monthKey} returned no payment for ${TARGET_NAME}.`,
        );
      }
      prepPayments.push({
        id: created.id,
        period,
        amount: Number(created.amount),
        created: true,
      });
    }
    if (prepPayments.length !== PREP_PERIODS.length) {
      throw new Error(
        `Scene 05 expected ${PREP_PERIODS.length} prior-month settlements, ` +
          `got ${prepPayments.length}.`,
      );
    }

    const all = await overduePage(prep, { month, year });
    const row = (all.data ?? []).find((item) => item.studentId === targetId);
    if (!row) {
      throw new Error(
        `Scene 05 could not re-read the overdue row for ${TARGET_NAME} in ${ym} ` +
          'after resetting the recorded payment.',
      );
    }

    before = {
      row,
      meta: all.meta,
      totalCount: all.totalCount,
    };
  } finally {
    await prep.dispose();
  }

  const partial = PARTIAL_AMOUNT;
  const beforeRemaining = Number(before.row.remainingAmount);
  if (!(beforeRemaining > partial)) {
    throw new Error(
      `Scene 05 needs a remaining amount greater than ${partial} to record a ` +
        `partial payment, got ${beforeRemaining}.`,
    );
  }
  const after = beforeRemaining - partial;

  const check = {
    at: new Date().toISOString(),
    billingPeriod: ym,
    removedPayments: paymentsBefore,
    prep: {
      periods: PREP_PERIODS,
      payments: prepPayments,
      note: 'Settled off camera only to satisfy the prior-unpaid-month rule; removed after clip 1.',
    },
    before: {
      studentId: before.row.studentId,
      studentName: before.row.studentName,
      totalAmount: before.row.totalAmount,
      paidAmount: before.row.paidAmount,
      remainingAmount: before.row.remainingAmount,
      meta: before.meta,
    },
    recorded: { amount: partial, remainingAfter: after, delta: partial },
    dashboard: { before: dashboardBefore, after: null },
    verified: null,
    cleanup: null,
  };

  // -----------------------------------------------------------------------
  // Clip 1: the finance page, the overdue list, and a real partial payment.
  // -----------------------------------------------------------------------
  if (wants('scene05-finance')) {
    await recordClip({
      browser,
      sceneId: '5',
      clipId: 'scene05-finance',
      role: 'centerOwner',
      startPath: '/finance',
      slowMo: 220,
      tailMs: 1200,
      steps: async (s) => {
        const { page } = s;

        await s.hold(700);

        s.mark('finance');
        await s.expect(
          page.getByRole('heading', { name: 'إدارة المالية والاشتراكات' }),
        ).toBeVisible();
        await s.expect(page.getByText('متابعة تحصيل المدفوعات واشتراكات الطلاب')).toBeVisible();
        await s.expect(page.getByRole('button', { name: 'سجل الحركات المالية' })).toBeVisible();
        await s.hold(3900);

        s.mark('overdue');
        await openNav(s, 'المتأخرين', '/overdue');
        await s.expect(page.getByRole('heading', { name: 'متابعة المتأخرين' })).toBeVisible();
        await s.expect(page.getByRole('columnheader', { name: 'اسم الطالب' })).toBeVisible();
        await s.expect(page.getByRole('columnheader', { name: 'المتبقي' })).toBeVisible();
        await s.hold(3200);

        s.mark('totals');
        await s.expect(
          page.getByText('الطلاب الذين لم يسددوا اشتراك شهر', { exact: false }),
        ).toBeVisible();
        const totalStudents = summaryCard(page, 'عدد المتأخرين');
        const totalRemaining = summaryCard(page, 'إجمالي المتبقي');
        await s.expect(totalStudents.locator('p').nth(1)).toHaveText(
          String(before.meta.totalStudents),
        );
        await s.expect(totalRemaining.locator('p').nth(1)).toHaveText(
          money(before.meta.totalRemaining),
        );
        await s.focusOn(totalRemaining);
        await s.hold(3400);

        s.mark('search');
        // The page fires one request per keystroke with no debounce (F-010), and
        // the overlapping responses re-render the table for several seconds. The
        // recording sets the whole term at once so the clip shows the result
        // instead of the bug; the finding keeps the keystroke measurements.
        const searchBox = page.getByPlaceholder('بحث بالاسم أو الهاتف...');
        await s.click(searchBox);
        await searchBox.fill(SEARCH_TERM);
        await s.hold(600);
        const row = page
          .locator('tbody tr')
          .filter({ has: page.getByRole('cell', { name: TARGET_NAME, exact: true }) });
        await s.expect(row).toHaveCount(1);
        const headers = await page.getByRole('columnheader').allInnerTexts();
        const col = (name) => headers.findIndex((header) => header.trim() === name);
        expect(col('المتبقي')).toBeGreaterThanOrEqual(0);
        const cell = (name) => row.locator('td').nth(col(name));

        // The row on screen is the student this scene prepared, by name.
        await s.expect(cell('اسم الطالب')).toHaveText(TARGET_NAME);
        await s.expect(cell('المجموعة')).toHaveText(before.row.groupName ?? '-');
        await s.expect(cell('هاتف ولي الأمر')).toHaveText(before.row.parentPhoneNumber ?? '-');
        await s.expect(cell('المستحق')).toHaveText(money(before.row.totalAmount));
        await s.expect(cell('المدفوع')).toHaveText(money(before.row.paidAmount));
        await s.expect(cell('المتبقي')).toHaveText(money(before.row.remainingAmount));
        await s.expect(cell('الحالة')).toHaveText(/غير مدفوع/);
        await s.focusOn(cell('المتبقي'));
        await s.hold(3000);

        s.mark('partial');
        await s.click(row.getByRole('button', { name: 'إضافة دفعة' }));
        await s.expect(page.getByRole('heading', { name: 'إضافة دفعة مالية' })).toBeVisible();
        await s.expect(page.getByText('المبلغ (ج.م)', { exact: true })).toBeVisible();
        await s.hold(2700);

        s.mark('amount');
        const amountInput = page.locator('form input[type="number"]').first();
        await expect
          .poll(async () => Number(await amountInput.inputValue()), { timeout: 20_000 })
          .toBe(Number(before.row.remainingAmount));
        await s.expect(
          page.getByText(`دفع المتبقي كامل (${before.row.remainingAmount} ج.م)`),
        ).toBeVisible();
        await s.hold(2400);
        await s.type(amountInput, String(partial));
        await s.expect(amountInput).toHaveValue(String(partial));
        await s.hold(2400);

        s.mark('remaining');
        await s.click(page.getByRole('button', { name: 'حفظ الدفعة', exact: true }));
        await s.expect(page.getByText('تم حفظ الدفعة بنجاح')).toBeVisible({ timeout: 20_000 });
        await s.expect(
          page.getByRole('heading', { name: 'إضافة دفعة مالية' }),
        ).toBeHidden();
        await expect
          .poll(async () => (await cell('المتبقي').innerText()).trim(), { timeout: 20_000 })
          .toBe(money(after));
        await s.expect(cell('الحالة')).toHaveText(/دفع جزء/);
        await s.focusOn(cell('المتبقي'));
        await s.hold(3600);
      },
    });

    // Post-verification through the API only: exactly the recorded part was
    // added for the recorded month and the screen showed the new remainder.
    const verify = await apiLogin('centerOwner');
    try {
      const monthPayments = (await paymentsFor(verify, TARGET_NAME)).filter(
        (payment) =>
          payment.studentId === targetId &&
          String(payment.billingPeriod ?? '').startsWith(ym),
      );
      expect(monthPayments).toHaveLength(1);
      expect(Number(monthPayments[0].amount)).toBe(partial);

      const list = await overduePage(verify, { month, year, search: TARGET_NAME });
      const row = (list.data ?? []).find((item) => item.studentId === targetId);
      expect(Number(row.remainingAmount)).toBe(after);
      // Exactly the recorded amount left the balance, nothing else.
      expect(beforeRemaining - Number(row.remainingAmount)).toBe(partial);
      expect(row.status).toBe(1);

      check.verified = {
        paymentId: monthPayments[0].id,
        amount: Number(monthPayments[0].amount),
        remainingAmount: Number(row.remainingAmount),
        delta: beforeRemaining - Number(row.remainingAmount),
        status: row.status,
      };

      // Remove the off-camera settlement now that the recorded payment exists.
      // Only these two ids are touched; the recorded 300 and every other
      // student's money stay exactly as they are.
      const removed = [];
      for (const payment of prepPayments) {
        const response = await verify.request.delete(
          `/api/V1/PaymentsDelete/${payment.id}`,
        );
        if (!response.ok()) {
          throw new Error(
            `Could not remove prep payment ${payment.id}: ` +
              `${response.status()} ${await response.text()}`,
          );
        }
        removed.push(payment.id);
      }

      const afterCleanup = await overduePage(verify, {
        month,
        year,
        search: TARGET_NAME,
      });
      const rowAfterCleanup = (afterCleanup.data ?? []).find(
        (item) => item.studentId === targetId,
      );
      expect(Number(rowAfterCleanup?.remainingAmount)).toBe(after);
      expect(
        (await paymentsFor(verify, TARGET_NAME)).filter(
          (payment) =>
            payment.studentId === targetId &&
            String(payment.billingPeriod ?? '').startsWith(ym),
        ),
      ).toHaveLength(1);

      dashboardAfter = await dashboardSummary(verify, { year, month });
      // The only difference from the pre-recording dashboard is the 300 the
      // clip recorded; the prior-month settlements left no trace.
      expect(dashboardAfter.monthlyRevenue).toBeCloseTo(
        dashboardBefore.monthlyRevenue + partial,
        2,
      );
      expect(dashboardAfter.netProfit).toBeCloseTo(
        dashboardBefore.netProfit + partial,
        2,
      );
      expect(dashboardAfter.monthlyExpenses).toBeCloseTo(
        dashboardBefore.monthlyExpenses,
        2,
      );
      expect(dashboardAfter.monthlyAssistantSalaries).toBeCloseTo(
        dashboardBefore.monthlyAssistantSalaries,
        2,
      );

      check.cleanup = {
        removedPayments: removed,
        remainingAmount: Number(rowAfterCleanup?.remainingAmount),
        monthlyPayments: 1,
      };
      check.dashboard.after = dashboardAfter;
    } finally {
      await verify.dispose();
    }
  }

  // -----------------------------------------------------------------------
  // Clip 2: where the money goes - expenses, net profit, monthly report.
  // -----------------------------------------------------------------------
  if (wants('scene05-reports')) {
    const reader = await apiLogin('centerOwner');
    let expenses;
    try {
      expenses = await expenseTotal(reader);
      // When clip 2 is recorded on its own, read the dashboard it is about to
      // show; with the full run this is the post-cleanup read from clip 1.
      if (!dashboardAfter) {
        dashboardAfter = await dashboardSummary(reader, { year, month });
        check.dashboard.after = dashboardAfter;
      }
    } finally {
      await reader.dispose();
    }

    await recordClip({
      browser,
      sceneId: '5',
      clipId: 'scene05-reports',
      role: 'centerOwner',
      startPath: '/expense',
      slowMo: 220,
      tailMs: 1200,
      steps: async (s) => {
        const { page } = s;

        await s.hold(700);

        s.mark('expenses');
        await s.expect(page.getByRole('heading', { name: 'المصروفات', exact: true })).toBeVisible();
        await s.expect(page.getByText(`${expenses} مصروف إجمالاً`, { exact: true })).toBeVisible();
        for (const header of ['الفئة', 'المبلغ', 'التاريخ']) {
          await s.expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
        }
        await s.expect(page.getByRole('button', { name: 'إضافة مصروف جديد' })).toBeVisible();
        await s.hold(3800);

        s.mark('net');
        await openNav(s, 'إحصائيات', '/adminDashboard');
        await s.scrollTo(page.getByText('الوضع المالي', { exact: true }));
        await s.expect(page.getByText('الوضع المالي', { exact: true })).toBeVisible();
        for (const title of [
          'إيرادات الشهر',
          'مصروفات الشهر',
          'مرتبات المساعدين',
          'صافي الربح',
        ]) {
          await s.expect(page.getByText(title, { exact: true })).toBeVisible();
        }

        // Wait for the dashboard to paint the server's post-payment revenue
        // before reading the four cards, so the assertions below compare real
        // numbers and not a loading placeholder.
        const revenueCard = moneyCard(page, 'إيرادات الشهر');
        await expect
          .poll(async () => parseMoney(await revenueCard.innerText()), {
            timeout: 20_000,
          })
          .toBe(dashboardAfter.monthlyRevenue);

        const revenue = parseMoney(await revenueCard.innerText());
        const costs = parseMoney(await moneyCard(page, 'مصروفات الشهر').innerText());
        const salaries = parseMoney(await moneyCard(page, 'مرتبات المساعدين').innerText());
        const net = parseMoney(await moneyCard(page, 'صافي الربح').innerText());

        // The card is read as the profit of the same month, so the four numbers
        // on screen must satisfy the same identity the dashboard uses.
        expect(Math.abs(net - (revenue - costs - salaries))).toBeLessThan(0.01);
        // …and they must be the server's post-payment numbers, not just any
        // four numbers that happen to add up.
        expect(revenue).toBeCloseTo(dashboardAfter.monthlyRevenue, 2);
        expect(costs).toBeCloseTo(dashboardAfter.monthlyExpenses, 2);
        expect(salaries).toBeCloseTo(dashboardAfter.monthlyAssistantSalaries, 2);
        expect(net).toBeCloseTo(dashboardAfter.netProfit, 2);
        check.dashboard.screen = { revenue, costs, salaries, net };
        await s.focusOn(moneyCard(page, 'صافي الربح'));
        await s.hold(3900);

        s.mark('report');
        await openNav(s, 'تقارير المركز', '/center-reports');
        await s.expect(page.getByRole('heading', { name: 'تقارير المركز' })).toBeVisible();
        await s.expect(page.getByText('القيود المالية للفترة', { exact: true })).toBeVisible();
        await s.expect(page.getByRole('button', { name: 'تصدير CSV' })).toBeVisible();
        await s.expect(page.getByRole('button', { name: 'طباعة', exact: true })).toBeVisible();

        const collected = parseMoney(await reportRow(page, 'مدفوعات الطلاب المحصّلة').innerText());
        const other = parseMoney(await reportRow(page, 'إيرادات أخرى').innerText());
        const expensesRow = parseMoney(await reportRow(page, 'المصاريف').innerText());
        const salariesRow = parseMoney(await reportRow(page, 'مصروفات المساعدين').innerText());
        const reportNet = parseMoney(await reportRow(page, 'الصافي').innerText());

        expect(Math.abs(reportNet - (collected + other - expensesRow - salariesRow)))
          .toBeLessThan(0.01);
        await s.hold(4000);

        s.mark('done');
        const netRow = page.locator('dl > div', {
          has: page.getByText('الصافي', { exact: true }),
        });
        await s.focusOn(netRow);
        await s.expect(netRow.locator('dd')).toHaveText(money(reportNet));
        await s.hold(3400);
      },
    });
  }

  fs.writeFileSync(CHECK_PATH, JSON.stringify(check, null, 2), 'utf8');
});
