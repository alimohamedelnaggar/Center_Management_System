import { test } from '@playwright/test';

import { recordClip } from '../support/scene.js';

test('scene 01 - overview dashboard', async ({ browser }) => {
  await recordClip({
    browser,
    sceneId: '1',
    clipId: 'scene01-overview',
    role: 'centerOwner',
    startPath: '/adminDashboard',
    slowMo: 250,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);
      s.mark('arrive');
      await s.expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
      await s.expect(page.getByText('نظرة شاملة على أداء السنتر')).toBeVisible();
      await s.hold(4200);

      s.mark('students');
      await s.expect(page.getByText('نظرة عامة على الطلاب')).toBeVisible();
      await s.expect(page.getByText('إجمالي الطلاب', { exact: true }).first()).toBeVisible();
      await s.hold(4400);

      s.mark('movement');
      await s.scrollTo(page.getByText('حركة الطلاب', { exact: true }));
      await s.expect(page.getByText('حركة الطلاب', { exact: true })).toBeVisible();
      await s.expect(page.getByText('طلاب جدد هذا الشهر')).toBeVisible();
      await s.expect(page.getByText('صافي نمو الطلاب')).toBeVisible();
      await s.hold(4400);

      s.mark('finance');
      await s.scrollTo(page.getByText('الوضع المالي', { exact: true }));
      await s.expect(page.getByText('الوضع المالي')).toBeVisible();
      await s.expect(page.getByText('إيرادات الشهر')).toBeVisible();
      await s.expect(page.getByText('صافي الربح')).toBeVisible();
      await s.hold(4400);

      s.mark('revenue');
      await s.scrollTo(page.getByText('الإيرادات مقابل المصروفات', { exact: true }));
      await s.expect(page.getByText('الإيرادات مقابل المصروفات')).toBeVisible();
      await s.hold(4400);

      s.mark('attendance');
      await s.scrollTo(page.getByText('نسبة الحضور', { exact: true }).first());
      await s.expect(page.getByRole('heading', { name: 'الحضور', exact: true }).first()).toBeVisible();
      await s.expect(page.getByText('نسبة الحضور', { exact: true }).first()).toBeVisible();
      await s.hold(4400);

      s.mark('groups');
      await s.scrollTo(page.getByText('أفضل المجموعات من حيث الحضور'));
      await s.expect(page.getByRole('heading', { name: 'المجموعات', exact: true })).toBeVisible();
      await s.expect(page.getByText('أفضل المجموعات من حيث الحضور')).toBeVisible();
      await s.hold(4400);

      s.mark('topGroup');
      // The list is ordered by attendance, so the first row is the point of the
      // caption: a real group with a real percentage.
      const bestRow = page.getByText(/طالب .*%/).first();
      await s.expect(bestRow).toBeVisible();
      await s.focusOn(bestRow);
      await s.hold(4400);

      s.mark('done');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await s.hold(900);
      await s.expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
      await s.hold(3000);
    },
  });
});
