import { test } from '@playwright/test';

import { hideNovemberPanels, novemberNodes } from '../support/november.js';
import { recordClip } from '../support/scene.js';

const PLATFORM_CARDS = [
  ['إجمالي المراكز', 4],
  ['مراكز نشطة', 4],
  ['مراكز موقوفة', 0],
  ['مراكز مدرّس فردي', 1],
  ['مراكز متعددة المدرسين', 3],
  ['مواقع هذا الشهر', 0],
];

const TEACHER_PAGES = [
  'الرئيسية',
  'الحضور',
  'ماسح الحضور',
  'بطاقات الطلاب',
  'تقارير الطلاب',
  'الدرجات',
  'بنك الأسئلة',
  'الامتحانات',
  'الملاحظات',
  'الإيرادات',
  'المتأخرين',
  'التقارير',
  'مجموعاتي',
  'ملفي الشخصي',
];

const leadingNumber = (text) => {
  const match = String(text).match(/\d+/);
  return match ? Number(match[0]) : NaN;
};

const normalizeArabic = (text) => String(text).replace(/\u200f/g, '');

test('scene 09 - centers, platform, one teacher scope and the audit log', async ({
  browser,
}) => {
  // -------------------------------------------------------------------
  // Clip 1: the SuperAdmin centers list. The actions column is left alone and
  // never used - no impersonation is performed anywhere in this scene.
  // -------------------------------------------------------------------
  await recordClip({
    browser,
    sceneId: '9',
    clipId: 'scene09-centers',
    role: 'superAdmin',
    startPath: '/centers',
    slowMo: 200,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('centers');
      await s.expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
      const rows = page.locator('tbody tr');
      await s.expect(rows).toHaveCount(4);
      const names = await rows.locator('td:nth-child(2)').allInnerTexts();
      s.expect(names, 'the four centers are on screen').toEqual([
        'مركز الأمل',
        'مركز الفجر',
        'مركز المعلم الفردي',
        'مركز النور التعليمي',
      ]);
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3500);

      s.mark('status');
      await s.expect(page.locator('th').filter({ hasText: 'الحالة' })).toBeVisible();
      const statuses = await rows.locator('td:nth-child(7)').allInnerTexts();
      s.expect(statuses, 'every center shows its status').toEqual([
        'نشط',
        'نشط',
        'نشط',
        'نشط',
      ]);
      // The action column exists, but the session never switches: the browser
      // is still on the platform's own centers page.
      s.expect(new URL(page.url()).pathname, 'no impersonation was started').toBe(
        '/centers',
      );
      await s.hold(3600);
    },
  });

  // -------------------------------------------------------------------
  // Clip 2: platform totals. The revenue-by-month card is hidden before the
  // clip because its axis labels are generated from the calendar and end in
  // "نوفمبر"; the six totals claimed on camera are the visible ones.
  // -------------------------------------------------------------------
  await recordClip({
    browser,
    sceneId: '9',
    clipId: 'scene09-platform',
    role: 'superAdmin',
    startPath: '/platform',
    slowMo: 200,
    tailMs: 1200,
    beforeStart: async ({ page, expect }) => {
      const firstCard = page
        .locator('div.rounded-2xl')
        .filter({ hasText: 'إجمالي المراكز' })
        .first();
      await expect(firstCard).toBeVisible({ timeout: 30_000 });
      await expect(firstCard).toContainText('4', { timeout: 30_000 });
      await hideNovemberPanels(page);
      expect(await novemberNodes(page), 'the platform totals show no November').toEqual(
        [],
      );
    },
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('platform');
      await s.expect(page.getByRole('heading', { name: 'إحصائيات المنصة' })).toBeVisible();
      for (const [label, value] of PLATFORM_CARDS) {
        const card = page
          .locator('div.rounded-2xl')
          .filter({ hasText: label })
          .first();
        await s.expect(card, `the "${label}" card is on screen`).toBeVisible();
        s.expect(
          leadingNumber(await card.innerText()),
          `the "${label}" card shows ${value}`,
        ).toBe(value);
      }
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3800);
    },
  });

  // -------------------------------------------------------------------
  // Clip 3: the same product as a teacher. The group selector has exactly one
  // real group, every student row belongs to it, and the sidebar only offers
  // the pages a teacher is allowed to open.
  // -------------------------------------------------------------------
  await recordClip({
    browser,
    sceneId: '9',
    clipId: 'scene09-teacher',
    role: 'teacher',
    startPath: '/dashboard',
    slowMo: 200,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('teacher');
      await s.expect(page.getByRole('heading', { name: 'الطلاب' })).toBeVisible();
      const groupSelect = page.locator('select').first();
      const options = await groupSelect.locator('option').allInnerTexts();
      s.expect(options, 'the teacher is scoped to one group').toEqual([
        'كل المجموعات',
        'الصف الثالث الإعدادي - أ',
      ]);
      await s.expect(groupSelect.locator('option')).toHaveCount(2);
      const rows = page.locator('tbody tr');
      await s.expect(rows.first()).toContainText('أحمد وليد إبراهيم');
      const groups = await rows.locator('td:nth-child(4)').allInnerTexts();
      s.expect(
        [...new Set(groups)],
        'every visible student belongs to the teacher group',
      ).toEqual(['الصف الثالث الإعدادي - أ']);
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3700);

      s.mark('pages');
      const navLabels = await page.locator('aside a').allInnerTexts();
      s.expect(navLabels, 'the teacher sidebar is the teacher permission set').toEqual(
        TEACHER_PAGES,
      );
      for (const label of TEACHER_PAGES) {
        await s.expect(
          page.locator('aside a').filter({ hasText: label }).first(),
          `"${label}" is offered to the teacher`,
        ).toBeVisible();
      }
      for (const forbidden of ['المصروفات', 'إدارة المدرسين', 'الاشتراكات']) {
        s.expect(
          await page.locator('aside').getByText(forbidden, { exact: true }).count(),
          `"${forbidden}" is not offered to the teacher`,
        ).toBe(0);
      }
      await s.hold(3600);
    },
  });

  // -------------------------------------------------------------------
  // Clip 4: the platform audit log. Six real actions, newest first, with the
  // most recent one dated in October.
  // -------------------------------------------------------------------
  await recordClip({
    browser,
    sceneId: '9',
    clipId: 'scene09-audit',
    role: 'superAdmin',
    startPath: '/audit-log',
    slowMo: 200,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('audit');
      await s.expect(page.getByRole('heading', { name: 'سجل المراجعة' })).toBeVisible();
      await s.expect(page.locator('th')).toHaveCount(5);
      const rows = page.locator('tbody tr');
      await s.expect(rows).toHaveCount(6);
      const first = normalizeArabic(await rows.first().innerText());
      s.expect(first, 'the newest entry is dated in October').toContain(
        '٢٨/١٠/٢٠٢٦',
      );
      s.expect(first, 'the newest entry is the statistics view').toContain(
        'PlatformStatisticsViewed',
      );
      s.expect(first, 'the entry describes the action').toContain(
        'اطلاع على إحصائيات المنصة',
      );
      s.expect(await novemberNodes(page), 'no November label is visible').toEqual([]);
      await s.hold(3700);

      s.mark('done');
      await s.expect(page.getByRole('heading', { name: 'سجل المراجعة' })).toBeVisible();
      await s.expect(rows).toHaveCount(6);
      const events = await rows.locator('td:nth-child(3)').allInnerTexts();
      s.expect(events, 'the log keeps the platform actions').toEqual([
        'PlatformStatisticsViewed',
        'ModulesUpdated',
        'CenterCreated',
        'CenterCreated',
        'SubscriptionRenewed',
        'CenterCreated',
      ]);
      await s.hold(3300);
    },
  });
});
