import fs from 'node:fs';

import { test } from '@playwright/test';

import { hideNovemberPanels, hidePanelContaining, novemberNodes } from '../support/november.js';
import { recordClip } from '../support/scene.js';

const SECTION = (page, title) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

const leadingNumber = (text) => {
  const match = String(text).match(/\d+/);
  return match ? Number(match[0]) : NaN;
};

const MONEY = [
  ['إيرادات الشهر', '62,000 ج.م'],
  ['مصروفات الشهر', '24,350 ج.م'],
  ['مرتبات المساعدين', '6,500 ج.م'],
  ['صافي الربح', '31,150 ج.م'],
];

const REPORT_TOTALS = [
  ['الطلاب النشطون', 139],
  ['المدرسون', 8],
  ['المساعدون', 2],
  ['المجموعات', 6],
];

const REPORT_FINANCE = [
  ['مدفوعات الطلاب المحصّلة', '60,250 ج.م'],
  ['إيرادات أخرى', '1,750 ج.م'],
  ['المصاريف', '24,350 ج.م'],
  ['مصروفات المساعدين', '6,500 ج.م'],
  ['الصافي', '31,150 ج.م'],
];

test('scene 08 - the dashboard and the October center report', async ({ browser }) => {
  // -------------------------------------------------------------------
  // Clip 1: October pinned on the dashboard. Everything that could show a
  // November axis label is hidden before the first recorded frame, and the
  // empty "this week" attendance card is removed because the fixture has no
  // data for that week and the clip does not talk about it.
  // -------------------------------------------------------------------
  await recordClip({
    browser,
    sceneId: '8',
    clipId: 'scene08-dashboard',
    role: 'centerOwner',
    startPath: '/adminDashboard',
    slowMo: 220,
    tailMs: 1500,
    beforeStart: async ({ page, expect }) => {
      await page.locator('select').first().selectOption('10');
      await expect(
        page.getByText('إحصائيات الطلاب لشهر أكتوبر 2026', { exact: true }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('62,000 ج.م', { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await hideNovemberPanels(page);
      await hidePanelContaining(page, 'لا توجد بيانات حضور متاحة للأسبوع الحالي');
      expect(await novemberNodes(page), 'the pinned dashboard shows no November').toEqual([]);
    },
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('dashboard');
      await s.expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
      await s.expect(page.getByText('نظرة شاملة على أداء السنتر')).toBeVisible();
      await s.expect(page.locator('select').first()).toHaveValue('10');
      await s.expect(
        page.getByText('إحصائيات الطلاب لشهر أكتوبر 2026', { exact: true }),
      ).toBeVisible();
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3200);

      s.mark('money');
      const finance = SECTION(page, 'الوضع المالي');
      await s.expect(finance).toBeVisible();
      for (const [label, value] of MONEY) {
        const card = finance.locator('div.rounded-2xl').filter({ hasText: label }).first();
        await s.expect(card).toContainText(label);
        await s.expect(card).toContainText(value);
      }
      // The two numbers the closing scene repeats must be the ones on screen.
      await s.expect(finance.getByText('62,000 ج.م', { exact: true })).toBeVisible();
      await s.expect(finance.getByText('31,150 ج.م', { exact: true })).toBeVisible();
      await s.hold(3600);
    },
  });

  // -------------------------------------------------------------------
  // Clip 2: the center report for the same October. The three month inputs
  // are pinned before the clip starts, so a November month never reaches a
  // recorded frame.
  // -------------------------------------------------------------------
  await recordClip({
    browser,
    sceneId: '8',
    clipId: 'scene08-reports',
    role: 'centerOwner',
    startPath: '/center-reports',
    slowMo: 220,
    tailMs: 1500,
    beforeStart: async ({ page, expect }) => {
      const months = page.locator('input[type="month"]');
      await expect(months).toHaveCount(3);
      for (let index = 0; index < 3; index += 1) {
        await months.nth(index).fill('2026-10');
      }
      await expect(page.getByText('60,250 ج.م', { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText('139', { exact: true }).first()).toBeVisible({
        timeout: 30_000,
      });
      expect(await novemberNodes(page), 'the October report shows no November').toEqual([]);
    },
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('reports');
      await s.expect(page.getByRole('heading', { name: 'تقارير المركز' })).toBeVisible();
      const months = page.locator('input[type="month"]');
      for (let index = 0; index < 3; index += 1) {
        await s.expect(months.nth(index)).toHaveValue('2026-10');
      }
      await s.expect(page.getByRole('heading', { name: 'الإجماليات' })).toBeVisible({
        timeout: 30_000,
      });
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3300);

      s.mark('totals');
      const totals = SECTION(page, 'الإجماليات');
      await s.scrollTo(totals);
      for (const [label, value] of REPORT_TOTALS) {
        const card = totals.locator('div.rounded-xl').filter({ hasText: label }).first();
        await s.expect(card, `the "${label}" card is on screen`).toBeVisible();
        s.expect(
          leadingNumber(await card.innerText()),
          `the "${label}" card shows ${value}`,
        ).toBe(value);
      }
      await s.hold(3600);

      s.mark('finance');
      const finance = SECTION(page, 'القيود المالية للفترة');
      await s.scrollTo(finance);
      await s.expect(finance).toBeVisible();
      for (const [label, value] of REPORT_FINANCE) {
        const row = finance.locator('dl > div').filter({ hasText: label }).first();
        await s.expect(row.locator('dd'), `the "${label}" row shows ${value}`).toHaveText(
          value,
        );
      }
      await s.hold(3700);

      s.mark('export');
      const exportButton = page.getByRole('button', { name: 'تصدير CSV' });
      await s.scrollTo(exportButton);
      await s.expect(exportButton).toBeEnabled();
      const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
      await s.click(exportButton);
      const download = await downloadPromise;
      const fileName = download.suggestedFilename();
      s.expect(fileName, 'the exported file is a CSV').toMatch(/\.csv$/);
      const downloadPath = await download.path();
      if (!downloadPath) {
        throw new Error('The CSV download produced no local file.');
      }
      const csv = fs.readFileSync(downloadPath, 'utf8');
      s.expect(csv, 'the CSV carries the report totals').toContain('الإجماليات');
      s.expect(csv, 'the CSV carries the net line').toContain('الصافي');
      s.expect(csv, 'the CSV carries October money').toContain('60250.00');
      await s.hold(3400);

      s.mark('print');
      await page.evaluate(() => {
        window.__printCalls = 0;
        window.print = () => {
          window.__printCalls += 1;
        };
      });
      await s.click(page.getByRole('button', { name: 'طباعة', exact: true }));
      await s.hold(500);
      s.expect(await page.evaluate(() => window.__printCalls), 'print is requested').toBe(1);

      // A real browser fires beforeprint and then applies the print media.
      // Both are reproduced so the recorded frame is the product's print
      // stylesheet, never the operating system's dialog.
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.emulateMedia({ media: 'print' });
      await s.expect(page.locator('body')).toHaveClass(/center-reports-printing/);
      await s.expect(page.locator('.print-area')).toBeVisible();
      await s.expect(page.locator('.no-print').first()).toBeHidden();
      await s.expect(page.locator('aside').first()).toBeHidden();
      await s.hold(3000);

      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await s.expect(page.locator('body')).not.toHaveClass(/center-reports-printing/);
      await s.hold(700);

      s.mark('dark');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await s.hold(700);
      await s.click(page.getByRole('button', { name: 'التبديل إلى الوضع الليلي' }));
      await s.expect(page.locator('html')).toHaveClass(/dark/);
      await s.expect(page.getByRole('heading', { name: 'تقارير المركز' })).toBeVisible();
      await s.hold(3200);

      s.mark('done');
      await s.click(page.getByRole('button', { name: 'التبديل إلى الوضع النهاري' }));
      await s.expect(page.locator('html')).not.toHaveClass(/dark/);
      await s.expect(page.getByRole('heading', { name: 'الإجماليات' })).toBeVisible();
      await s.hold(3300);
    },
  });
});
