import { test } from '@playwright/test';

import { frontendBase } from '../support/env.js';
import { hideNovemberPanels, hidePanelContaining, novemberNodes } from '../support/november.js';
import { recordClip } from '../support/scene.js';

test('scene 10 - the closing recap and the login screen', async ({ browser }) => {
  await recordClip({
    browser,
    sceneId: '10',
    clipId: 'scene10-closing',
    role: 'centerOwner',
    startPath: '/adminDashboard',
    slowMo: 180,
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
      expect(await novemberNodes(page), 'the closing dashboard shows no November').toEqual(
        [],
      );
    },
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('recap');
      await s.expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
      await s.expect(page.locator('select').first()).toHaveValue('10');
      const students = page
        .locator('section')
        .filter({ has: page.getByText('نظرة عامة على الطلاب', { exact: true }) });
      await s.expect(students).toContainText('إجمالي الطلاب');
      await s.expect(students).toContainText('139');
      const money = page
        .locator('div.rounded-2xl')
        .filter({ hasText: 'إيرادات الشهر' })
        .first();
      await s.expect(money).toContainText('62,000 ج.م');
      const attendance = page
        .locator('div.rounded-2xl')
        .filter({ hasText: 'حضور شهر أكتوبر 2026' })
        .first();
      await s.expect(attendance).toContainText('نسبة الحضور');
      await s.expect(attendance).toContainText('87.8%');
      await s.expect(attendance).toContainText('723');
      await s.expect(attendance).toContainText('100');
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3800);

      s.mark('one');
      const finance = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'الوضع المالي' }) });
      await s.scrollTo(finance);
      await s.expect(finance).toBeVisible();
      await s.expect(finance).toContainText('62,000 ج.م');
      await s.expect(finance).toContainText('31,150 ج.م');
      await s.hold(3700);

      s.mark('browser');
      // The login screen carries a "forgot password" placeholder that is not a
      // real feature yet. It is removed before the document is painted, so no
      // recorded frame advertises it; the rest of the real login screen stays.
      await page.addInitScript(() => {
        const hide = () => {
          for (const button of document.querySelectorAll('button')) {
            if (button.textContent.trim() === 'نسيت كلمة المرور؟') {
              button.style.display = 'none';
            }
          }
        };
        document.addEventListener('DOMContentLoaded', hide);
        new MutationObserver(hide).observe(document, {
          childList: true,
          subtree: true,
        });
      });
      await page.goto(`${frontendBase}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/login');
      await s.expect(page.getByRole('heading', { name: 'مرحباً بعودتك' })).toBeVisible();
      await s.expect(page.getByText('سجل الدخول لإدارة السنتر', { exact: true })).toBeVisible();
      await s.expect(page.getByLabel('رقم الهاتف')).toBeVisible();
      await s.expect(page.getByLabel('كلمة المرور', { exact: true })).toBeVisible();
      await s.expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible();
      s.expect(
        await page.getByText('نسيت كلمة المرور؟').isVisible(),
        'the not-yet-available password reset is not shown',
      ).toBe(false);
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3500);

      s.mark('start');
      const submit = page.getByRole('button', { name: 'تسجيل الدخول' });
      await s.expect(submit).toBeEnabled();
      await s.focusOn(submit);
      await s.hold(3400);

      s.mark('end');
      const brand = page.locator('aside').first();
      await s.expect(brand).toBeVisible();
      await s.expect(brand).toContainText('منصّتك الذكية لإدارة السنتر');
      for (const highlight of ['حضور بالـ QR', 'تتبّع مالي', 'امتحانات أونلاين']) {
        await s.expect(
          brand.getByText(highlight, { exact: true }),
          `the login panel highlights "${highlight}"`,
        ).toBeVisible();
      }
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3900);
    },
  });
});
