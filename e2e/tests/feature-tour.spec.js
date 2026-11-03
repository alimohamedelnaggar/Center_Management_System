import { test, expect } from '@playwright/test';
import {
  chapter,
  clearFocus,
  clickSidebarLink,
  focusOn,
  hold,
  installTourOverlay,
  openLogin,
  signInWithTour,
  signOutWithTour,
  typeInto,
} from './support/tour.js';

test.describe.configure({ mode: 'serial' });

/**
 * Stage B preview only:
 *   intro, SuperAdmin 1-2, CenterOwner 9-10, Student 30.
 * The tour is intentionally short enough to review the video shape before the
 * full 35-chapter production pass is approved.
 */
test('Arabic feature tour — Stage B preview', async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);

  const signInStatuses = [];
  const pageErrors = [];
  const failedResponses = [];

  page.on('response', (response) => {
    if (response.url().includes('/Authentication/SignIn')) {
      signInStatuses.push(response.status());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  // ------------------------------------------------------------------
  // Intro — the real login screen
  // ------------------------------------------------------------------
  await openLogin(page);
  await chapter(page, {
    chapter: 'مقدمة',
    title: 'نظام إدارة السنتر',
    subtitle: 'جولة عربية سريعة في أدوار المنصة',
    progress: 4,
    holdMs: 1_000,
  });

  await expect(
    page.getByRole('heading', { name: 'مرحباً بعودتك' }),
  ).toBeVisible();
  await expect(page.locator('#login-phone')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'تسجيل الدخول' }),
  ).toBeVisible();

  await focusOn(page, page.getByRole('heading', { name: 'مرحباً بعودتك' }));
  await hold(page, 1_000);
  await focusOn(page, page.locator('#login-phone'));
  await hold(page, 700);
  await focusOn(page, page.getByRole('button', { name: 'تسجيل الدخول' }));
  await hold(page, 800);

  await page.screenshot({
    path: testInfo.outputPath('chapter-00-intro.png'),
  });

  // ------------------------------------------------------------------
  // SuperAdmin 1 — centers
  // ------------------------------------------------------------------
  await signInWithTour(page, 'superAdmin', {
    beforeSubmit: async () => {
      await chapter(page, {
        chapter: 'الفصل 1 · مدير المنصة',
        title: 'إدارة المراكز',
        subtitle: 'كل المراكز وحالتها واشتراكاتها في مكان واحد',
        progress: 18,
        holdMs: 650,
      });
    },
  });

  await page.waitForURL((url) => url.pathname === '/centers', {
    timeout: 60_000,
  });
  await installTourOverlay(page);
  await expect(
    page.getByRole('heading', { name: 'إدارة المراكز' }),
  ).toBeVisible();

  const centersTable = page.locator('table').first();
  await expect(centersTable).toBeVisible();
  await expect(centersTable.locator('tbody tr')).toHaveCount(4);

  const primaryRow = centersTable
    .locator('tbody tr')
    .filter({ hasText: 'مركز النور' })
    .first();
  await expect(primaryRow).toBeVisible();
  // The /centers list counts linked student *user accounts* (one in the E2E
  // seed), while the center dashboard counts the 15 student records. Assert
  // the row identity/status here and assert 15 on the dashboard chapter.
  await expect(primaryRow).toContainText('أ. حسناء عبد الله');
  await expect(primaryRow).toContainText('نشط');

  await focusOn(page, primaryRow);
  await hold(page, 1_000);

  const centersSearch = page
    .locator('input[placeholder="بحث بالاسم أو الهاتف..."]')
    .first();
  await typeInto(page, centersSearch, 'النور');
  await expect(centersTable.locator('tbody tr')).toHaveCount(1);
  await expect(centersTable.locator('tbody tr').first()).toContainText(
    'مركز النور',
  );
  await hold(page, 850);

  await focusOn(page, centersSearch);
  await centersSearch.fill('');
  await expect(centersTable.locator('tbody tr')).toHaveCount(4);
  await focusOn(page, page.getByRole('button', { name: /مركز جديد/ }));
  await hold(page, 1_000);

  await page.screenshot({
    path: testInfo.outputPath('chapter-01-centers.png'),
  });

  // ------------------------------------------------------------------
  // SuperAdmin 2 — subscriptions
  // ------------------------------------------------------------------
  await chapter(page, {
    chapter: 'الفصل 2 · مدير المنصة',
    title: 'الاشتراكات والوحدات',
    subtitle: 'الخطة والفترة والوحدات المفعّلة لكل مركز',
    progress: 34,
    holdMs: 850,
  });

  await clickSidebarLink(page, '/subscriptions');
  await expect(
    page.getByRole('heading', { name: 'الاشتراكات' }),
  ).toBeVisible();

  const subscriptionsTable = page.locator('table').first();
  await expect(subscriptionsTable.locator('tbody tr')).toHaveCount(4);
  await expect(
    subscriptionsTable.getByText('الوحدات', { exact: true }),
  ).toBeVisible();
  await expect(
    subscriptionsTable.getByText('المدفوع / السعر', { exact: true }),
  ).toBeVisible();
  await expect(
    subscriptionsTable.getByRole('button', { name: /الاشتراك والوحدات/ }),
  ).toHaveCount(4);

  await focusOn(page, subscriptionsTable.locator('tbody tr').first());
  await hold(page, 1_000);
  await focusOn(
    page,
    subscriptionsTable
      .getByRole('button', { name: /الاشتراك والوحدات/ })
      .first(),
  );
  await hold(page, 1_000);

  await page.screenshot({
    path: testInfo.outputPath('chapter-02-subscriptions.png'),
  });

  // ------------------------------------------------------------------
  // CenterOwner 9 — dashboard
  // ------------------------------------------------------------------
  await chapter(page, {
    chapter: 'الفصل 9 · صاحب المركز',
    title: 'لوحة تحكم المركز',
    subtitle: 'مؤشرات الطلاب والحركة الشهرية في لمحة',
    progress: 58,
    holdMs: 900,
  });

  await signOutWithTour(page);
  await signInWithTour(page, 'centerOwner');
  await expect(page.locator('a[href="/adminDashboard"]')).toBeVisible({
    timeout: 45_000,
  });

  await clickSidebarLink(page, '/adminDashboard');
  await expect(
    page.getByRole('heading', { name: 'لوحة التحكم' }),
  ).toBeVisible();
  await expect(
    page.getByText('نظرة عامة على الطلاب', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText('إجمالي الطلاب', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  const totalStudentsCard = page
    .getByText('إجمالي الطلاب', { exact: true })
    .locator('..');
  await expect(totalStudentsCard).toContainText('15');
  await expect(
    page.getByRole('heading', { name: 'حركة الطلاب', exact: true }),
  ).toBeVisible();

  await focusOn(page, totalStudentsCard);
  await hold(page, 1_100);
  await focusOn(
    page,
    page.getByRole('heading', { name: 'حركة الطلاب', exact: true }),
  );
  await hold(page, 1_000);

  await page.screenshot({
    path: testInfo.outputPath('chapter-09-admin-dashboard.png'),
  });

  // ------------------------------------------------------------------
  // CenterOwner 10 — teachers
  // ------------------------------------------------------------------
  await chapter(page, {
    chapter: 'الفصل 10 · صاحب المركز',
    title: 'إدارة المدرسين',
    subtitle: 'فريق المركز وبياناته الأكاديمية',
    progress: 74,
    holdMs: 850,
  });

  await clickSidebarLink(page, '/teachers');
  await expect(
    page.getByRole('heading', { name: 'إدارة المدرسين' }),
  ).toBeVisible();

  const teachersTable = page.locator('table').first();
  await expect(teachersTable.locator('tbody tr')).toHaveCount(2);
  await expect(
    teachersTable.getByText('أ. محمد عبد الرحمن', { exact: true }),
  ).toBeVisible();
  await expect(
    teachersTable.getByText('أ. سارة إبراهيم', { exact: true }),
  ).toBeVisible();

  await focusOn(page, teachersTable.locator('tbody tr').first());
  await hold(page, 950);

  const teachersSearch = page
    .locator('input[placeholder="بحث بالاسم أو الهاتف..."]')
    .first();
  await typeInto(page, teachersSearch, 'سارة');
  await expect(teachersTable.locator('tbody tr')).toHaveCount(1);
  await expect(teachersTable.locator('tbody tr').first()).toContainText(
    'أ. سارة إبراهيم',
  );
  await hold(page, 750);

  await focusOn(page, teachersSearch);
  await teachersSearch.fill('');
  await expect(teachersTable.locator('tbody tr')).toHaveCount(2);
  await focusOn(page, page.getByRole('button', { name: /إضافة مدرس/ }));
  await hold(page, 950);

  await page.screenshot({
    path: testInfo.outputPath('chapter-10-teachers.png'),
  });

  // ------------------------------------------------------------------
  // Student 30 — student portal
  // ------------------------------------------------------------------
  await chapter(page, {
    chapter: 'الفصل 30 · الطالب',
    title: 'تجربة الطالب',
    subtitle: 'الحضور والنتائج والامتحانات من حساب الطالب',
    progress: 92,
    holdMs: 900,
  });

  await signOutWithTour(page);
  await signInWithTour(page, 'student');
  await page.waitForURL((url) => url.pathname === '/student/dashboard', {
    timeout: 60_000,
  });
  await installTourOverlay(page);

  await expect(
    page.getByRole('heading', { name: /أهلاً، يوسف أحمد محمود/ }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText('نسبة الحضور', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('المتبقي من الرسوم', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'تطور الأداء عبر الزمن' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'امتحانات تنتظرك' }),
  ).toBeVisible();

  await focusOn(page, page.getByText('نسبة الحضور', { exact: true }));
  await hold(page, 1_000);
  await focusOn(
    page,
    page.getByRole('heading', { name: 'تطور الأداء عبر الزمن' }),
  );
  await hold(page, 1_000);
  await focusOn(
    page,
    page.getByRole('heading', { name: 'امتحانات تنتظرك' }),
  );
  await hold(page, 1_100);

  await page.screenshot({
    path: testInfo.outputPath('chapter-30-student.png'),
  });

  // ------------------------------------------------------------------
  // Close
  // ------------------------------------------------------------------
  await clearFocus(page);
  await chapter(page, {
    chapter: 'نهاية المعاينة',
    title: 'شكراً لمتابعتك',
    subtitle: 'نسخة مراجعة للمرحلة ب — بانتظار ملاحظاتك قبل اعتماد الفيديو النهائي',
    progress: 100,
    holdMs: 1_300,
  });
  await hold(page, 3_000);

  // Real quality assertions, not only screenshots.
  await hold(page, 500);
  expect(signInStatuses).toEqual([200, 200, 200]);
  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  expect(failedResponses, failedResponses.join('\n')).toEqual([]);

  const videoPath = await page.video()?.path();
  if (videoPath) {
    console.log(`VIDEO_PATH=${videoPath}`);
  }
});
