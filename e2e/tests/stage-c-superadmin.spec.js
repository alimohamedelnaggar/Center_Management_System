import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { accounts, staffPassword } from './support/accounts.js';
import {
  chapter,
  clickSidebarLink,
  clickWithCursor,
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
 * Stage C — part 1 of 7: SuperAdmin (SA-01 … SA-13).
 *
 * One continuous recording. Every chapter gets an Arabic lower-third, a
 * screenshot, a wall-clock mark and a minimum duration from PLAN. `finish()`
 * pads to the plan instead of shortening; overruns are recorded and reported.
 *
 * Real product behaviour only. No request is mocked, no token is injected and
 * no UI is changed for the recording.
 */

const ARTIFACT_DIR = path.resolve('artifacts', 'stage-c-superadmin');

const NEW_SA_PASSWORD = 'E2e!Pass#2026A';
const NEW_OWNER_PASSWORD = 'Owner!Pass#2026';

const CENTER_A = 'مركز الاختبار الإداري';
const CENTER_A_EDITED = 'مركز الاختبار الإداري (معدل)';
const CENTER_B = 'مركز المدرس التجريبي';
const OWNER_A_PHONE = '01000000021';
const OWNER_B_PHONE = '01000000023';

// Planned start = sum of the previous planned durations.
const PLAN = [
  {
    id: 'SA-01',
    title: 'مدخل المنصة',
    subtitle: 'تسجيل دخول مدير المنصة والتحقق من القائمة الجانبية',
    plannedMs: 60_000,
  },
  {
    id: 'SA-02',
    title: 'قائمة المراكز',
    subtitle: 'عرض المراكز، البحث، تصفية الحالة، والتحقق من الأعداد',
    plannedMs: 150_000,
  },
  {
    id: 'SA-03',
    title: 'إنشاء مركز جديد',
    subtitle: 'الحقول الإلزامية أولاً، ثم إنشاء مركز ومالك حقيقي',
    plannedMs: 150_000,
  },
  {
    id: 'SA-04',
    title: 'إنشاء مدرس فردي',
    subtitle: 'مركز مدرس فردي وزر الترقية الظاهر له فقط',
    plannedMs: 120_000,
  },
  {
    id: 'SA-05',
    title: 'تعديل وحالة وترقية وحذف',
    subtitle: 'تعديل الاسم، الإيقاف/التفعيل، الترقية، والحذف بالإلغاء والتأكيد',
    plannedMs: 150_000,
  },
  {
    id: 'SA-06',
    title: 'الانتحال كمالك المركز',
    subtitle: 'دخول كالمالك، القائمة الجانبية، ومنع صفحات المنصة',
    plannedMs: 120_000,
  },
  {
    id: 'SA-07',
    title: 'الوحدات المقفلة وفترة السماح',
    subtitle: 'مركز محدود الوحدات ومركز في فترة السماح',
    plannedMs: 120_000,
  },
  {
    id: 'SA-08',
    title: 'إدارة الاشتراكات',
    subtitle: 'البحث، التجديد، وتعديل الخطة وتاريخ النهاية',
    plannedMs: 150_000,
  },
  {
    id: 'SA-09',
    title: 'إحصائيات المنصة',
    subtitle: 'كل بطاقة مقابل القيمة الفعلية بعد عمليات الجولة',
    plannedMs: 90_000,
  },
  {
    id: 'SA-10',
    title: 'سجل المراجعة',
    subtitle: 'الترجمة الفعلية، البحث، التصفية، والترقيم',
    plannedMs: 120_000,
  },
  {
    id: 'SA-11',
    title: 'الملف الشخصي',
    subtitle: 'بطاقة للقراءة فقط وتغيير كلمة المرور',
    plannedMs: 120_000,
  },
  {
    id: 'SA-12',
    title: 'كلمة المرور الإجبارية',
    subtitle: 'إعادة تعيين كلمة المرور ثم تغييرها عند أول دخول',
    plannedMs: 120_000,
  },
  {
    id: 'SA-13',
    title: 'حدود الدور والجوال',
    subtitle: 'لوحة التحكم، 404، ولقطة 390×844',
    plannedMs: 90_000,
  },
];

const centerRow = (page, name) =>
  page
    .locator('tbody tr')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first();

const dialog = (page, heading) =>
  page
    .locator('div.fixed.inset-0')
    .filter({ has: page.getByRole('heading', { name: heading }) })
    .last();

const field = (scope, label) =>
  scope
    .locator('label')
    .filter({ hasText: label })
    .first()
    .locator('..')
    .locator('input, select, textarea')
    .first();

const toast = (page, text) =>
  page.getByText(text, { exact: true }).last();

// Backend messages add suffixes such as "بنجاح"; match them without pretending
// the exact wording is fixed.
const toastLike = (page, pattern) => page.getByText(pattern).last();

async function goto(page, url, { overlay = true } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  if (overlay) await installTourOverlay(page);
  await hold(page, 700);
}

/**
 * In-app navigation with no document reload.
 *
 * The impersonation access token lives only in memory: a full page load falls
 * back to the refresh cookie, which still belongs to the SuperAdmin, so a
 * `goto()` would silently end the impersonation. Pushing a history entry and
 * firing `popstate` is the same thing the browser does on Back/Forward, so the
 * router re-renders in place and the impersonation stays active.
 */
async function spaGoto(page, url) {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(
      new PopStateEvent('popstate', { state: window.history.state }),
    );
  }, url);
  await hold(page, 900);
}

async function expectPath(page, expected) {
  await page.waitForURL((url) => url.pathname === expected, {
    timeout: 45_000,
  });
}

test('Stage C — SuperAdmin (SA-01 … SA-13)', async ({ page }, testInfo) => {
  test.setTimeout(55 * 60 * 1000);

  const t0 = Date.now();
  const pageErrors = [];
  const failed5xx = [];
  const signInStatuses = [];
  const counters = {
    createWithOwner: 0,
    centerEdit: 0,
    profilePasswordPut: 0,
    resetPassword: 0,
  };

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (request.method() === 'POST' && url.includes('/Center/CreateWithOwner')) {
      counters.createWithOwner += 1;
    }
    if (request.method() === 'PUT' && url.includes('/Center/Edit')) {
      counters.centerEdit += 1;
    }
    if (request.method() === 'PUT' && url.includes('/Profile/ChangePassword')) {
      counters.profilePasswordPut += 1;
    }
    if (request.method() === 'POST' && url.includes('/User/Reset-Password')) {
      counters.resetPassword += 1;
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/Authentication/SignIn')) {
      signInStatuses.push(response.status());
    }
    if (response.status() >= 500 && url.includes('/api/')) {
      failed5xx.push(`${response.status()} ${url}`);
    }
  });

  const marks = [];
  let baseStart = null;

  async function begin(index, extraHold = 0) {
    const plan = PLAN[index];
    const startedAt = Date.now();
    if (baseStart === null) baseStart = startedAt;
    if (extraHold > 0) await hold(page, extraHold);
    await chapter(page, {
      chapter: `${plan.id} — ${plan.title}`,
      title: plan.title,
      subtitle: plan.subtitle,
      progress: Math.round(((index + 1) / PLAN.length) * 100),
      holdMs: 900,
    });
    marks.push({
      index,
      id: plan.id,
      title: plan.title,
      subtitle: plan.subtitle,
      plannedMs: plan.plannedMs,
      startMs: startedAt - baseStart,
      startedAt,
    });
    await page.screenshot({
      path: testInfo.outputPath(`${plan.id}.png`),
      fullPage: false,
    });
  }

  async function finish(index) {
    const targetEnd = PLAN.slice(0, index + 1).reduce(
      (sum, plan) => sum + plan.plannedMs,
      0,
    );
    const elapsed = Date.now() - marks[index].startedAt;
    const overrunMs = Math.max(
      0,
      elapsed - (targetEnd - marks[index].startMs),
    );
    const remaining = marks[index].plannedMs - elapsed;
    if (remaining > 0) await hold(page, remaining);
    marks[index].durationMs = Date.now() - marks[index].startedAt;
    marks[index].overrunMs = overrunMs;
    marks[index].targetEndMs = targetEnd;
    if (overrunMs > 2_000) {
      console.log(
        `[SA timing] ${marks[index].id} overran by ${Math.round(overrunMs / 1000)}s`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // SA-01 — sign in as SuperAdmin
  // -------------------------------------------------------------------------
  await openLogin(page);
  await begin(0);

  await signInWithTour(page, 'superAdmin', { expectedPath: '/centers' });
  await page.getByRole('heading', { name: 'إدارة المراكز' }).waitFor();
  await expect(page.locator('aside nav a')).toHaveCount(5);
  await expect(page.locator('aside a[href="/centers"]')).toBeVisible();
  await expect(page.locator('aside a[href="/subscriptions"]')).toBeVisible();
  await expect(page.locator('aside a[href="/platform"]')).toBeVisible();
  await expect(page.locator('aside a[href="/audit-log"]')).toBeVisible();
  await expect(page.locator('aside a[href="/profile"]')).toBeVisible();
  await expect(page.locator('aside a[href="/teachers"]')).toHaveCount(0);
  await focusOn(page, page.locator('aside nav a').first());
  await hold(page, 2_500);

  await finish(0);

  // -------------------------------------------------------------------------
  // SA-02 — centers list, search, status filter, counts
  // -------------------------------------------------------------------------
  await begin(1);

  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(4, { timeout: 20_000 });

  for (const name of [
    'مركز النور',
    'مركز المدرس الفردي',
    'مركز الفجر التعليمي',
    'مركز الأمل',
  ]) {
    await expect(centerRow(page, name)).toBeVisible();
  }

  const primaryRow = centerRow(page, 'مركز النور');
  await focusOn(page, primaryRow);
  await expect(primaryRow.locator('td').nth(3)).toHaveText('مركز');
  await expect(primaryRow.locator('td').nth(4)).toHaveText('2');
  // F-002: the centers list reports one student login, not the 15 student
  // records the dashboard shows. Recorded, not reconciled.
  await expect(primaryRow.locator('td').nth(5)).toHaveText('1');
  await expect(primaryRow.locator('td').nth(6)).toContainText('نشط');

  // No pager: 4 rows with pageSize 10.
  await expect(page.getByText(/صفحة \d+ من/)).toHaveCount(0);

  const search = page.getByPlaceholder('بحث بالاسم أو الهاتف...');
  await typeInto(page, search, 'النور');
  await expect(rows).toHaveCount(1, { timeout: 20_000 });
  await expect(centerRow(page, 'مركز النور')).toBeVisible();

  await typeInto(page, search, '');
  await expect(rows).toHaveCount(4, { timeout: 20_000 });

  const statusFilter = page.locator('select').first();
  await statusFilter.selectOption('Suspended');
  await expect(page.getByText('لا توجد مراكز بعد')).toBeVisible({
    timeout: 20_000,
  });
  await hold(page, 1_200);
  await statusFilter.selectOption('');
  await expect(rows).toHaveCount(4, { timeout: 20_000 });
  await hold(page, 2_000);

  await finish(1);

  // -------------------------------------------------------------------------
  // SA-03 — create a multi-teacher center, with a real negative validation
  // -------------------------------------------------------------------------
  await begin(2);

  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'مركز جديد', exact: true }),
  );
  const createModal = dialog(page, 'إضافة مدرس جديد');
  await expect(createModal).toBeVisible();

  const requestsBeforeInvalid = counters.createWithOwner;
  await clickWithCursor(
    page,
    createModal.getByRole('button', {
      name: 'إنشاء الحساب والمركز',
      exact: true,
    }),
  );
  await expect(toast(page, 'يرجى إدخال اسم المدرس!')).toBeVisible({
    timeout: 15_000,
  });
  expect(counters.createWithOwner).toBe(requestsBeforeInvalid);
  await expect(createModal).toBeVisible();
  await hold(page, 1_800);

  await expect(field(createModal, 'نوع الحساب *')).toHaveValue('CenterOwner');
  await typeInto(page, field(createModal, 'اسم المدرس *'), 'أ. مالك الاختبار');
  await typeInto(
    page,
    field(createModal, 'رقم الهاتف (اسم الدخول) *'),
    OWNER_A_PHONE,
  );
  await typeInto(
    page,
    field(createModal, 'كلمة المرور (اختياري)'),
    staffPassword,
  );
  await typeInto(page, field(createModal, 'اسم المركز *'), CENTER_A);
  await typeInto(page, field(createModal, 'هاتف المركز'), '01000000022');
  await typeInto(page, field(createModal, 'العنوان'), '١٢ شارع الاختبار - القاهرة');
  await typeInto(page, field(createModal, 'السعر'), '5000');
  await typeInto(page, field(createModal, 'المدفوع'), '5000');
  await hold(page, 1_200);

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Center/CreateWithOwner') &&
      response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await clickWithCursor(
    page,
    createModal.getByRole('button', {
      name: 'إنشاء الحساب والمركز',
      exact: true,
    }),
  );
  expect((await createResponse).status()).toBe(200);
  await expect(toast(page, 'تم إنشاء الحساب والمركز بنجاح')).toBeVisible({
    timeout: 30_000,
  });

  const createdPasswordModal = dialog(page, 'تم إنشاء الحساب');
  await expect(createdPasswordModal).toBeVisible();
  const createdValues = createdPasswordModal.locator('b[dir="ltr"]');
  await expect(createdValues).toHaveCount(2);
  await expect(createdValues.first()).toHaveText(OWNER_A_PHONE);
  const generatedPassword = (await createdValues.nth(1).textContent()).trim();
  expect(generatedPassword.length).toBeGreaterThanOrEqual(8);
  await clickWithCursor(
    page,
    createdPasswordModal.getByRole('button', { name: 'تم', exact: true }),
  );

  await expect(rows).toHaveCount(5, { timeout: 30_000 });
  const createdRow = centerRow(page, CENTER_A);
  await expect(createdRow).toBeVisible();
  await expect(createdRow.locator('td').nth(2)).toContainText(OWNER_A_PHONE);
  await expect(createdRow.locator('td').nth(3)).toHaveText('مركز');
  await expect(createdRow.locator('td').nth(6)).toContainText('نشط');
  await focusOn(page, createdRow);
  await hold(page, 2_500);

  await finish(2);

  // -------------------------------------------------------------------------
  // SA-04 — create a solo teacher center
  // -------------------------------------------------------------------------
  await begin(3);

  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'مدرس فردي', exact: true }),
  );
  const soloModal = dialog(page, 'إضافة مدرس جديد');
  await expect(soloModal).toBeVisible();
  await expect(field(soloModal, 'نوع الحساب *')).toHaveValue('Teacher');

  await typeInto(page, field(soloModal, 'اسم المدرس *'), 'أ. كريم الاختبار');
  await typeInto(page, field(soloModal, 'المادة الدراسية *'), 'الرياضيات');
  await typeInto(
    page,
    field(soloModal, 'رقم الهاتف (اسم الدخول) *'),
    OWNER_B_PHONE,
  );
  await typeInto(
    page,
    field(soloModal, 'كلمة المرور (اختياري)'),
    staffPassword,
  );
  await typeInto(page, field(soloModal, 'اسم المركز *'), CENTER_B);
  await typeInto(page, field(soloModal, 'السعر'), '3000');
  await typeInto(page, field(soloModal, 'المدفوع'), '3000');
  await hold(page, 1_000);

  const soloResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Center/CreateWithOwner') &&
      response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await clickWithCursor(
    page,
    soloModal.getByRole('button', {
      name: 'إنشاء الحساب والمركز',
      exact: true,
    }),
  );
  expect((await soloResponse).status()).toBe(200);
  await expect(toast(page, 'تم إنشاء الحساب والمركز بنجاح')).toBeVisible({
    timeout: 30_000,
  });
  const soloPasswordModal = dialog(page, 'تم إنشاء الحساب');
  await expect(soloPasswordModal).toBeVisible();
  await clickWithCursor(
    page,
    soloPasswordModal.getByRole('button', { name: 'تم', exact: true }),
  );

  await expect(rows).toHaveCount(6, { timeout: 30_000 });
  const soloRow = centerRow(page, CENTER_B);
  await expect(soloRow).toBeVisible();
  await expect(soloRow.locator('td').nth(2)).toContainText(OWNER_B_PHONE);
  await expect(soloRow.locator('td').nth(3)).toHaveText('مدرس فردي');
  await expect(
    soloRow.getByRole('button', { name: 'ترقية', exact: true }),
  ).toBeVisible();
  // Both the seeded solo center and the one just created are solo right now.
  await expect(
    page.locator('tbody tr button', { hasText: 'ترقية' }),
  ).toHaveCount(2);
  await focusOn(page, soloRow);
  await hold(page, 2_500);

  await finish(3);

  // -------------------------------------------------------------------------
  // SA-05 — edit, status cancel/confirm, upgrade cancel/confirm, delete
  // -------------------------------------------------------------------------
  await begin(4);

  // Edit: cancel, validation, then a saved change that survives a reload.
  await clickWithCursor(
    page,
    centerRow(page, CENTER_A).locator('button[title="تعديل"]'),
  );
  let editModal = dialog(page, 'تعديل المركز والاشتراك');
  await expect(editModal).toBeVisible();

  const requestsBeforeBadEdit = counters.centerEdit;
  await field(editModal, 'اسم المركز').fill('');
  await clickWithCursor(
    page,
    editModal.getByRole('button', { name: 'حفظ التغييرات', exact: true }),
  );
  await expect(toast(page, 'اسم المركز مطلوب')).toBeVisible({
    timeout: 15_000,
  });
  expect(counters.centerEdit).toBe(requestsBeforeBadEdit);
  await hold(page, 1_500);

  await field(editModal, 'اسم المركز').fill(CENTER_A_EDITED);
  await clickWithCursor(
    page,
    editModal.getByRole('button', { name: 'إلغاء', exact: true }),
  );
  await expect(editModal).toBeHidden();
  await expect(centerRow(page, CENTER_A)).toBeVisible();
  await hold(page, 1_200);

  await clickWithCursor(
    page,
    centerRow(page, CENTER_A).locator('button[title="تعديل"]'),
  );
  editModal = dialog(page, 'تعديل المركز والاشتراك');
  await expect(editModal).toBeVisible();
  await field(editModal, 'اسم المركز').fill(CENTER_A_EDITED);
  const editResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Center/Edit') &&
      response.request().method() === 'PUT',
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    editModal.getByRole('button', { name: 'حفظ التغييرات', exact: true }),
  );
  expect((await editResponse).status()).toBe(200);
  await expect(toast(page, 'تم تحديث المركز بنجاح')).toBeVisible({
    timeout: 20_000,
  });
  await expect(centerRow(page, CENTER_A_EDITED)).toBeVisible({
    timeout: 20_000,
  });

  await goto(page, '/centers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  await expect(centerRow(page, CENTER_A_EDITED)).toBeVisible();
  await expect(centerRow(page, CENTER_A)).toHaveCount(0);
  await hold(page, 1_500);

  // Status: cancel keeps the badge, confirm flips it both ways.
  let targetRow = centerRow(page, CENTER_A_EDITED);
  await clickWithCursor(page, targetRow.locator('button[title="إيقاف"]'));
  let confirmDialog = dialog(page, 'إيقاف المركز');
  await expect(confirmDialog).toBeVisible();
  await clickWithCursor(
    page,
    confirmDialog.getByRole('button', { name: 'إلغاء', exact: true }),
  );
  await expect(confirmDialog).toBeHidden();
  await expect(targetRow.locator('td').nth(6)).toContainText('نشط');
  await hold(page, 1_200);

  await clickWithCursor(page, targetRow.locator('button[title="إيقاف"]'));
  confirmDialog = dialog(page, 'إيقاف المركز');
  await clickWithCursor(
    page,
    confirmDialog.getByRole('button', { name: 'إيقاف', exact: true }),
  );
  await expect(toastLike(page, 'تم إيقاف المركز بنجاح')).toBeVisible({
    timeout: 20_000,
  });
  await expect(targetRow.locator('td').nth(6)).toContainText('موقوف', {
    timeout: 20_000,
  });
  await expect(targetRow.locator('button[title="تفعيل"]')).toBeVisible();
  await hold(page, 1_200);

  await clickWithCursor(page, targetRow.locator('button[title="تفعيل"]'));
  confirmDialog = dialog(page, 'تفعيل المركز');
  await clickWithCursor(
    page,
    confirmDialog.getByRole('button', { name: 'تفعيل', exact: true }),
  );
  await expect(toastLike(page, 'تم تفعيل المركز بنجاح')).toBeVisible({
    timeout: 20_000,
  });
  await expect(targetRow.locator('td').nth(6)).toContainText('نشط', {
    timeout: 20_000,
  });
  await hold(page, 1_200);

  // Upgrade: cancel first, then confirm; the button disappears afterwards.
  let soloRowNow = centerRow(page, CENTER_B);
  await clickWithCursor(
    page,
    soloRowNow.getByRole('button', { name: 'ترقية', exact: true }),
  );
  let upgradeDialog = dialog(page, 'ترقية إلى متعدد المدرسين');
  await expect(upgradeDialog).toBeVisible();
  await clickWithCursor(
    page,
    upgradeDialog.getByRole('button', { name: 'إلغاء', exact: true }),
  );
  await expect(upgradeDialog).toBeHidden();
  await expect(soloRowNow.locator('td').nth(3)).toHaveText('مدرس فردي');
  await expect(
    soloRowNow.getByRole('button', { name: 'ترقية', exact: true }),
  ).toBeVisible();
  await hold(page, 1_200);

  await clickWithCursor(
    page,
    soloRowNow.getByRole('button', { name: 'ترقية', exact: true }),
  );
  upgradeDialog = dialog(page, 'ترقية إلى متعدد المدرسين');
  await clickWithCursor(
    page,
    upgradeDialog.getByRole('button', { name: 'ترقية', exact: true }),
  );
  await expect(toastLike(page, 'تم ترقية حسابك ليتيح إضافة مدرسين')).toBeVisible(
    {
      timeout: 20_000,
    },
  );
  await expect(soloRowNow.locator('td').nth(3)).toHaveText('مركز', {
    timeout: 20_000,
  });
  await expect(
    soloRowNow.getByRole('button', { name: 'ترقية', exact: true }),
  ).toHaveCount(0);
  await hold(page, 1_500);

  // Delete: cancel keeps the row, confirm removes it (6 → 5).
  targetRow = centerRow(page, CENTER_A_EDITED);
  await clickWithCursor(page, targetRow.locator('button[title="حذف"]'));
  let deleteDialog = dialog(page, 'حذف المركز');
  await expect(deleteDialog).toBeVisible();
  await clickWithCursor(
    page,
    deleteDialog.getByRole('button', { name: 'إلغاء', exact: true }),
  );
  await expect(deleteDialog).toBeHidden();
  await expect(targetRow).toBeVisible();
  await expect(rows).toHaveCount(6);
  await hold(page, 1_200);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Center/') &&
      response.request().method() === 'DELETE',
    { timeout: 45_000 },
  );
  await clickWithCursor(page, targetRow.locator('button[title="حذف"]'));
  deleteDialog = dialog(page, 'حذف المركز');
  await clickWithCursor(
    page,
    deleteDialog.getByRole('button', { name: 'حذف', exact: true }),
  );
  expect((await deleteResponse).status()).toBe(200);
  await expect(toastLike(page, 'تم حذف المركز بنجاح')).toBeVisible({
    timeout: 20_000,
  });
  await expect(centerRow(page, CENTER_A_EDITED)).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(rows).toHaveCount(5, { timeout: 20_000 });
  await hold(page, 2_000);

  await finish(4);

  // -------------------------------------------------------------------------
  // SA-06 — impersonate the primary owner, then prove role isolation
  // -------------------------------------------------------------------------
  await begin(5);

  await clickWithCursor(
    page,
    centerRow(page, 'مركز النور').getByRole('button', {
      name: 'دخول كالمالك',
      exact: true,
    }),
  );
  await page.waitForURL((url) => url.pathname === '/teachers', {
    timeout: 60_000,
  });
  const impersonationBanner = page.locator('div.bg-amber-100').first();
  await expect(impersonationBanner).toBeVisible({ timeout: 30_000 });
  await expect(impersonationBanner).toContainText('أنت تتصفّح الآن كـ');
  await expect(impersonationBanner).toContainText('أ. حسناء عبد الله');
  await expect(page.getByRole('heading', { name: 'إدارة المدرسين' })).toBeVisible();
  await expect(page.locator('aside nav a')).toHaveCount(13);
  await expect(page.locator('aside a[href="/teachers"]')).toBeVisible();
  await expect(page.locator('aside a[href="/centers"]')).toHaveCount(0);
  await focusOn(page, impersonationBanner);
  await hold(page, 2_500);

  // A SuperAdmin route while impersonating: role guard denies it.
  await spaGoto(page, '/centers');
  await expectPath(page, '/teachers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'إدارة المدرسين' })).toBeVisible();
  await hold(page, 1_500);

  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'إنهاء الانتحال', exact: true }),
  );
  await expectPath(page, '/centers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  await expect(page.locator('div.bg-amber-100')).toHaveCount(0);
  await expect(page.locator('aside nav a')).toHaveCount(5);
  await hold(page, 2_000);

  await finish(5);

  // -------------------------------------------------------------------------
  // SA-07 — limited modules and the grace state, via impersonation
  // -------------------------------------------------------------------------
  await begin(6);

  await clickWithCursor(
    page,
    centerRow(page, 'مركز الأمل').getByRole('button', {
      name: 'دخول كالمالك',
      exact: true,
    }),
  );
  await page.waitForURL((url) => url.pathname === '/teachers', {
    timeout: 60_000,
  });
  await expect(page.locator('div.bg-amber-100').first()).toContainText(
    'أ. رامي نبيل',
  );
  await hold(page, 1_200);

  const locked = async (url, moduleLabel) => {
    await spaGoto(page, url);
    await expect(
      page.getByRole('heading', { name: 'غير مشترك في هذه الوحدة' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`الوحدة: ${moduleLabel}`)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'تواصل مع الإدارة' }),
    ).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
    await hold(page, 1_800);
  };

  await locked('/center-reports', 'تقارير المركز');
  await locked('/finance', 'الحسابات والمصروفات');
  await locked('/bulk-parent-accounts', 'بوابة ولي الأمر');

  // Out of scope: the platform pages are not reachable while impersonating.
  await spaGoto(page, '/centers');
  await expectPath(page, '/teachers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toHaveCount(0);
  await spaGoto(page, '/platform');
  await expectPath(page, '/teachers');
  await expect(page.getByRole('heading', { name: 'إحصائيات المنصة' })).toHaveCount(0);
  await hold(page, 1_200);

  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'إنهاء الانتحال', exact: true }),
  );
  await expectPath(page, '/centers');

  // Grace centre: banner + my-subscription still loads.
  await clickWithCursor(
    page,
    centerRow(page, 'مركز الفجر التعليمي').getByRole('button', {
      name: 'دخول كالمالك',
      exact: true,
    }),
  );
  await page.waitForURL((url) => url.pathname === '/teachers', {
    timeout: 60_000,
  });
  await expect(page.locator('div.bg-amber-100').first()).toContainText(
    'أ. هدى كامل',
  );
  await expect(page.getByText(/انتهى اشتراكك وأنت في فترة السماح/)).toBeVisible();
  await expect(page.getByText(/يتبقى 2 يوم/).first()).toBeVisible();
  await hold(page, 2_000);

  await spaGoto(page, '/my-subscription');
  await expect(page.getByRole('heading', { name: 'اشتراكي' })).toBeVisible();
  await expect(page.getByText('فترة سماح', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/أنت في فترة السماح — يتبقى 2 يوم قبل إيقاف الخدمة/),
  ).toBeVisible();
  await hold(page, 2_000);

  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'إنهاء الانتحال', exact: true }),
  );
  await expectPath(page, '/centers');
  await hold(page, 1_500);

  await finish(6);

  // -------------------------------------------------------------------------
  // SA-08 — subscriptions: search, renew (cancel + submit), edit and reload
  // -------------------------------------------------------------------------
  await begin(7);

  await clickSidebarLink(page, '/subscriptions');
  await expect(page.getByRole('heading', { name: 'الاشتراكات' })).toBeVisible();
  const subscriptionRows = page.locator('tbody tr');
  await expect(subscriptionRows).toHaveCount(5, { timeout: 20_000 });

  const subscriptionSearch = page.getByPlaceholder('بحث بالاسم أو الهاتف...');
  await typeInto(page, subscriptionSearch, 'النور');
  await expect(subscriptionRows).toHaveCount(1, { timeout: 20_000 });
  await typeInto(page, subscriptionSearch, '');
  await expect(subscriptionRows).toHaveCount(5, { timeout: 20_000 });

  const graceRow = subscriptionRows
    .filter({ has: page.getByText('مركز الفجر التعليمي', { exact: true }) })
    .first();
  await focusOn(page, graceRow);
  await clickWithCursor(
    page,
    graceRow.getByRole('button', { name: 'تجديد', exact: true }),
  );
  let renewModal = dialog(page, /تجديد الاشتراك/);
  await expect(renewModal).toBeVisible();
  await expect(renewModal).toContainText('هذا المركز في فترة سماح/منتهٍ');
  await clickWithCursor(
    page,
    renewModal.getByRole('button', { name: 'إلغاء', exact: true }),
  );
  await expect(renewModal).toBeHidden();
  await expect(graceRow).toContainText('فترة سماح');
  await hold(page, 1_500);

  await clickWithCursor(
    page,
    graceRow.getByRole('button', { name: 'تجديد', exact: true }),
  );
  renewModal = dialog(page, /تجديد الاشتراك/);
  await expect(renewModal).toBeVisible();
  const renewResponse = page.waitForResponse(
    (response) =>
      response.url().toLowerCase().includes('/subscription/renew') &&
      response.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    renewModal.getByRole('button', { name: 'تجديد', exact: true }),
  );
  expect((await renewResponse).status()).toBe(200);
  // No confirmation dialog: the success toast is the only gate.
  await expect(toast(page, 'تم تجديد الاشتراك بنجاح')).toBeVisible({
    timeout: 25_000,
  });
  await expect(graceRow).toContainText('نشط', { timeout: 25_000 });
  // Renewal moved the row out of grace, so the renew action disappears.
  await expect(
    graceRow.getByRole('button', { name: 'تجديد', exact: true }),
  ).toHaveCount(0, { timeout: 20_000 });
  await hold(page, 2_000);

  // Edit the primary subscription: plan name + end date, then reload.
  const primarySubscriptionRow = subscriptionRows
    .filter({ has: page.getByText('مركز النور', { exact: true }) })
    .first();
  await clickWithCursor(
    page,
    primarySubscriptionRow.getByRole('button', {
      name: 'الاشتراك والوحدات',
      exact: true,
    }),
  );
  const subscriptionEdit = dialog(page, /تعديل الاشتراك والوحدات/);
  await expect(subscriptionEdit).toBeVisible();
  await expect(field(subscriptionEdit, 'نوع الاشتراك')).toBeVisible({
    timeout: 30_000,
  });
  await typeInto(
    page,
    field(subscriptionEdit, 'اسم الخطة (لللعرض)'),
    'سنوي 2027',
  );
  // The date input sends local midnight; the list renders the stored UTC
  // instant as YYYY-MM-DD, so on this UTC+2 machine 2027-12-31 is shown as
  // 2027-12-30. Compute the label in the page's timezone (Africa/Cairo)
  // instead of assuming the input string or the host clock.
  const requestedEndDate = '2027-12-31';
  const expectedEndLabel = await page.evaluate((value) => {
    const iso = new Date(`${value}T00:00:00`).toISOString();
    return iso.slice(0, 10);
  }, requestedEndDate);
  await field(subscriptionEdit, 'تاريخ النهاية').fill(requestedEndDate);
  await hold(page, 1_500);

  const subscriptionUpdateResponse = page.waitForResponse(
    (response) =>
      response.url().toLowerCase().includes('/subscription/') &&
      ['PUT', 'POST'].includes(response.request().method()),
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    subscriptionEdit.getByRole('button', { name: 'حفظ', exact: true }),
  );
  expect([200, 201, 204]).toContain((await subscriptionUpdateResponse).status());
  await expect(
    toast(page, 'تم حفظ الاشتراك والوحدات بنجاح'),
  ).toBeVisible({ timeout: 30_000 });
  await expect(subscriptionEdit).toBeHidden({ timeout: 30_000 });
  await expect(primarySubscriptionRow).toContainText(expectedEndLabel, {
    timeout: 25_000,
  });

  await goto(page, '/subscriptions');
  await expect(page.getByRole('heading', { name: 'الاشتراكات' })).toBeVisible();
  await expect(subscriptionRows).toHaveCount(5, { timeout: 20_000 });
  const primaryAfterReload = subscriptionRows
    .filter({ has: page.getByText('مركز النور', { exact: true }) })
    .first();
  await expect(primaryAfterReload).toContainText(expectedEndLabel);
  await expect(primaryAfterReload).toContainText('سنوي 2027');
  await hold(page, 2_000);

  await finish(7);

  // -------------------------------------------------------------------------
  // SA-09 — platform statistics against the known seed + tour state
  // -------------------------------------------------------------------------
  await begin(8);

  await clickSidebarLink(page, '/platform');
  await expect(
    page.getByRole('heading', { name: 'إحصائيات المنصة' }),
  ).toBeVisible();

  const expectedStats = [
    ['إجمالي المراكز', 5],
    ['مراكز نشطة', 5],
    ['مراكز موقوفة', 0],
    ['مراكز مدرّس فردي', 1],
    ['مراكز متعددة المدرسين', 4],
    ['مواقع هذا الشهر', 5],
    ['اشتراكات فعّالة', 5],
    ['إجمالي المستخدمين', 14],
    ['أصحاب المراكز', 4],
    ['المدرسون', 6],
    ['المساعدون', 1],
    ['الطلاب', 1],
    ['إجمالي المجموعات', 7],
    ['مراكز في فترة السماح', 0],
  ];

  for (const [label, value] of expectedStats) {
    const card = page
      .locator('div.rounded-2xl')
      .filter({ has: page.getByText(label, { exact: true }) })
      .first();
    await expect(card).toBeVisible();
    await expect(card.locator('p').first()).toHaveText(String(value));
    await focusOn(page, card, { scroll: true });
    await hold(page, 350);
  }

  await expect(page.getByText('اشتراك سنوي', { exact: true })).toBeVisible();
  const revenueCard = page
    .locator('div.rounded-2xl')
    .filter({ has: page.getByText('إيراد الشهر الحالي', { exact: true }) })
    .first();
  await expect(revenueCard).toBeVisible();
  const revenueText = (await revenueCard.locator('p').first().textContent()).trim();
  expect(revenueText).not.toBe('');
  expect(revenueText).not.toBe('0');
  await focusOn(page, revenueCard);
  await hold(page, 2_000);

  await finish(8);

  // -------------------------------------------------------------------------
  // SA-10 — audit log: real labels, raw labels, search, filter, pager
  // -------------------------------------------------------------------------
  await begin(9);

  await clickSidebarLink(page, '/audit-log');
  await expect(page.getByRole('heading', { name: 'سجل المراجعة' })).toBeVisible();
  const auditRows = page.locator('tbody tr');
  await expect(auditRows).toHaveCount(20, { timeout: 30_000 });

  // The pager proves real server-side paging: 20 rows per page, more than one
  // page in total.
  const pagerText = page.getByText(/صفحة \d+ من \d+/).first();
  await expect(pagerText).toContainText('صفحة 1 من');
  const totalBefore = Number(
    (await page.getByText(/إجمالي \d+/).first().textContent()).match(/إجمالي (\d+)/)[1],
  );
  expect(totalBefore).toBeGreaterThan(20);

  // F-004: only three actions have Arabic labels. Search for a raw one and
  // show the untranslated identifier exactly as the table renders it.
  const auditSearch = page.getByPlaceholder('بحث في الأحداث...');
  await typeInto(page, auditSearch, 'PlatformStatisticsViewed');
  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'بحث', exact: true }),
  );
  await expect(auditRows).toHaveCount(1, { timeout: 30_000 });
  const rawActionCell = page.locator('tbody tr td:nth-child(3)').first();
  await expect(rawActionCell).toHaveText('PlatformStatisticsViewed');
  await hold(page, 2_000);

  await typeInto(page, auditSearch, '');
  await expect(auditRows).toHaveCount(20, { timeout: 30_000 });

  // Exactly two centers were onboarded in this tour, and both are labelled.
  const actionFilter = page.locator('select').first();
  await actionFilter.selectOption('OnboardCenter');
  await expect(auditRows).toHaveCount(2, { timeout: 30_000 });
  const onboardCells = page.locator('tbody tr td:nth-child(3)');
  await expect(onboardCells).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    await expect(onboardCells.nth(index)).toHaveText('إنشاء مركز');
  }
  await hold(page, 2_000);

  // The other two translated actions: three impersonation starts and ends.
  await actionFilter.selectOption('Impersonate');
  await expect(auditRows).toHaveCount(3, { timeout: 30_000 });
  const startCells = page.locator('tbody tr td:nth-child(3)');
  await expect(startCells).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(startCells.nth(index)).toHaveText('بدء انتحال');
  }
  await hold(page, 1_500);

  await actionFilter.selectOption('ImpersonationEnd');
  await expect(auditRows).toHaveCount(3, { timeout: 30_000 });
  const endCells = page.locator('tbody tr td:nth-child(3)');
  await expect(endCells).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(endCells.nth(index)).toHaveText('إنهاء انتحال');
  }
  await hold(page, 1_500);

  await actionFilter.selectOption('');
  await expect(pagerText).toBeVisible({ timeout: 30_000 });
  await expect(pagerText).toContainText('صفحة 1 من');
  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'التالي', exact: true }),
  );
  await expect(page.getByText(/صفحة 2 من/)).toBeVisible({ timeout: 30_000 });
  await hold(page, 1_200);
  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'السابق', exact: true }),
  );
  await expect(page.getByText(/صفحة 1 من/)).toBeVisible({ timeout: 30_000 });
  await hold(page, 1_500);

  await finish(9);

  // -------------------------------------------------------------------------
  // SA-11 — read-only profile + password change (mismatch, then success)
  // -------------------------------------------------------------------------
  await begin(10);

  await clickSidebarLink(page, '/profile');
  await expect(page.getByRole('heading', { name: 'الملف الشخصي' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'بيانات الحساب' })).toBeVisible();
  await expect(page.getByText('01000000001', { exact: true })).toBeVisible();
  await expect(page.getByText('مشرف المنصة', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /تعديل/ })).toHaveCount(0);
  await hold(page, 2_000);

  const currentPassword = page.locator('input[name="currentPassword"]');
  const newPassword = page.locator('input[name="newPassword"]');
  const confirmPassword = page.locator('input[name="confirmPassword"]');
  const passwordSubmit = page.getByRole('button', {
    name: 'تغيير كلمة المرور',
    exact: true,
  });

  await typeInto(page, currentPassword, staffPassword);
  await typeInto(page, newPassword, NEW_SA_PASSWORD);
  await typeInto(page, confirmPassword, `${NEW_SA_PASSWORD}x`);

  const putsBeforeMismatch = counters.profilePasswordPut;
  await clickWithCursor(page, passwordSubmit);
  await expect(
    page.getByText('كلمتا المرور غير متطابقتين', { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  expect(counters.profilePasswordPut).toBe(putsBeforeMismatch);
  await hold(page, 2_000);

  await typeInto(page, confirmPassword, NEW_SA_PASSWORD);
  const passwordResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Profile/ChangePassword') &&
      response.request().method() === 'PUT',
    { timeout: 45_000 },
  );
  await clickWithCursor(page, passwordSubmit);
  expect((await passwordResponse).status()).toBe(200);
  await expect(
    page.getByText('تم تغيير كلمة المرور بنجاح', { exact: true }),
  ).toBeVisible({ timeout: 25_000 });
  accounts.superAdmin.password = NEW_SA_PASSWORD;
  await hold(page, 2_500);

  await finish(10);

  // -------------------------------------------------------------------------
  // SA-12 — reset an owner password, forced change, then both credentials
  // -------------------------------------------------------------------------
  await begin(11);

  await clickSidebarLink(page, '/centers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  const resetRow = centerRow(page, 'مركز النور');
  await clickWithCursor(
    page,
    resetRow.locator('button[title="إعادة تعيين كلمة المرور"]'),
  );
  const resetDialog = dialog(page, 'إعادة تعيين كلمة المرور');
  await expect(resetDialog).toBeVisible();
  const resetResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/User/Reset-Password') &&
      response.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    resetDialog.getByRole('button', { name: 'إعادة التعيين', exact: true }),
  );
  expect((await resetResponse).status()).toBe(200);
  await expect(
    toast(page, 'تم إعادة تعيين كلمة المرور وسيُطلب تغييرها عند الدخول'),
  ).toBeVisible({ timeout: 25_000 });

  const temporaryModal = dialog(page, 'كلمة مرور مؤقتة');
  await expect(temporaryModal).toBeVisible();
  const temporaryValues = temporaryModal.locator('b[dir="ltr"]');
  await expect(temporaryValues).toHaveCount(2);
  await expect(temporaryValues.first()).toHaveText('01000000002');
  const temporaryPassword = (await temporaryValues.nth(1).textContent()).trim();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(8);
  await clickWithCursor(
    page,
    temporaryModal.getByRole('button', { name: 'تم', exact: true }),
  );
  await hold(page, 1_500);

  await signOutWithTour(page);
  await expect(page).toHaveURL(/\/login$/);

  // First sign-in with the temporary password: forced change, no shell.
  await typeInto(page, page.locator('#login-phone'), '01000000002');
  await typeInto(page, page.locator('#login-password'), temporaryPassword);
  const forcedSignIn = page.waitForResponse(
    (response) =>
      response.url().includes('/Authentication/SignIn') &&
      response.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    page.locator('button[type="submit"]').first(),
  );
  expect((await forcedSignIn).status()).toBe(200);
  await page.waitForURL((url) => url.pathname === '/force-password', {
    timeout: 60_000,
  });
  await installTourOverlay(page);
  await expect(
    page.getByRole('heading', { name: 'تغيير كلمة المرور' }),
  ).toBeVisible();
  await expect(page.locator('aside')).toHaveCount(0);
  await hold(page, 1_800);

  // The forced page cannot be bypassed by a direct URL.
  await goto(page, '/centers');
  await page.waitForURL((url) => url.pathname === '/force-password', {
    timeout: 45_000,
  });
  await expect(
    page.getByRole('heading', { name: 'تغيير كلمة المرور' }),
  ).toBeVisible();
  await expect(page.locator('aside')).toHaveCount(0);
  await hold(page, 1_500);

  const forcedCurrent = page.locator('input[autocomplete="current-password"]');
  const forcedNew = page.locator('input[autocomplete="new-password"]').first();
  const forcedConfirm = page.locator('input[autocomplete="new-password"]').nth(1);
  await typeInto(page, forcedCurrent, temporaryPassword);
  await typeInto(page, forcedNew, NEW_OWNER_PASSWORD);
  await typeInto(page, forcedConfirm, `${NEW_OWNER_PASSWORD}x`);

  const putsBeforeForcedMismatch = counters.profilePasswordPut;
  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'حفظ كلمة المرور', exact: true }),
  );
  await expect(
    toast(page, 'كلمتا المرور غير متطابقتين'),
  ).toBeVisible({ timeout: 15_000 });
  expect(counters.profilePasswordPut).toBe(putsBeforeForcedMismatch);
  await hold(page, 1_500);

  await typeInto(page, forcedConfirm, NEW_OWNER_PASSWORD);
  const forcedChangeResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Profile/ChangePassword') &&
      response.request().method() === 'PUT',
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    page.getByRole('button', { name: 'حفظ كلمة المرور', exact: true }),
  );
  expect((await forcedChangeResponse).status()).toBe(200);
  await expect(
    toast(page, 'تم تغيير كلمة المرور بنجاح'),
  ).toBeVisible({ timeout: 25_000 });
  await page.waitForURL((url) => url.pathname === '/teachers', {
    timeout: 60_000,
  });
  await installTourOverlay(page);
  await expect(page.getByRole('heading', { name: 'إدارة المدرسين' })).toBeVisible();
  accounts.centerOwner.password = NEW_OWNER_PASSWORD;
  await hold(page, 2_000);

  // The temporary password is rejected; the new one works.
  await signOutWithTour(page);
  await typeInto(page, page.locator('#login-phone'), '01000000002');
  await typeInto(page, page.locator('#login-password'), temporaryPassword);
  const rejectedSignIn = page.waitForResponse(
    (response) =>
      response.url().includes('/Authentication/SignIn') &&
      response.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await clickWithCursor(
    page,
    page.locator('button[type="submit"]').first(),
  );
  expect((await rejectedSignIn).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('تعذّر تسجيل الدخول');
  await expect(page).toHaveURL(/\/login$/);
  await hold(page, 1_500);

  await signInWithTour(page, 'centerOwner', { expectedPath: '/teachers' });
  await expect(page.getByRole('heading', { name: 'إدارة المدرسين' })).toBeVisible();
  await hold(page, 1_500);

  await signOutWithTour(page);
  await signInWithTour(page, 'superAdmin', { expectedPath: '/centers' });
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  await hold(page, 2_000);

  await finish(11);

  // -------------------------------------------------------------------------
  // SA-13 — role guards, 404, and the real 390×844 mobile layout
  // -------------------------------------------------------------------------
  await begin(12);

  await goto(page, '/dashboard');
  await expectPath(page, '/centers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'الطلاب' })).toHaveCount(0);
  await hold(page, 1_500);

  await goto(page, '/admin');
  await expectPath(page, '/centers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  await hold(page, 1_200);

  await goto(page, '/nope');
  await expect(
    page.getByRole('heading', { name: 'الصفحة غير موجودة!' }),
  ).toBeVisible();
  await expect(page.getByText(/الرابط الذي تحاول الوصول إليه/)).toBeVisible();
  await expect(page.locator('aside')).toHaveCount(0);
  await hold(page, 2_000);

  await goto(page, '/centers');
  await expect(page.getByRole('heading', { name: 'إدارة المراكز' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await hold(page, 1_500);
  await installTourOverlay(page);

  const aside = page.locator('aside');
  const asideBox = await aside.boundingBox();
  expect(asideBox.width).toBeGreaterThanOrEqual(63);
  expect(asideBox.width).toBeLessThanOrEqual(65);
  await expect(page.locator('aside nav a span').first()).toBeHidden();
  await expect(page.locator('button[aria-label*="القائمة"]')).toHaveCount(0);
  await expect(page.locator('table')).toBeVisible();

  const tableScroller = await page.locator('table').locator('xpath=..').evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    overflowX: getComputedStyle(el).overflowX,
  }));
  expect(tableScroller.overflowX).toBe('auto');
  expect(tableScroller.scrollWidth).toBeGreaterThan(tableScroller.clientWidth);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'mobile-centers-390x844.png'),
    fullPage: false,
  });
  await page.screenshot({
    path: testInfo.outputPath('SA-13-mobile-390x844.png'),
    fullPage: false,
  });
  await hold(page, 2_500);

  await page.setViewportSize({ width: 1280, height: 720 });
  await hold(page, 1_000);
  const desktopAside = await page.locator('aside').boundingBox();
  expect(desktopAside.width).toBeGreaterThanOrEqual(255);
  expect(desktopAside.width).toBeLessThanOrEqual(257);
  await hold(page, 1_000);

  await finish(12);

  // -------------------------------------------------------------------------
  // Part manifest + run-level assertions
  // -------------------------------------------------------------------------
  const totalMs = Date.now() - baseStart;
  const videoTotalMs = Date.now() - t0;
  const manifest = {
    part: 1,
    role: 'SuperAdmin',
    roleLabel: 'مدير المنصة',
    recordedAt: new Date().toISOString(),
    videoStartEpochMs: t0,
    firstChapterLeadInMs: baseStart - t0,
    totalMs,
    videoTotalMs,
    chapters: marks.map((mark) => ({
      id: mark.id,
      title: mark.title,
      subtitle: mark.subtitle,
      startMs: mark.startMs,
      durationMs: mark.durationMs,
      plannedMs: mark.plannedMs,
      overrunMs: mark.overrunMs,
    })),
  };
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'chapters.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'run-notes.json'),
    `${JSON.stringify(
      { signInStatuses, failed5xx, pageErrors, counters },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    `[SA] chapters=${marks.length} total=${Math.round(totalMs / 1000)}s video=${Math.round(
      videoTotalMs / 1000,
    )}s overruns=${marks.filter((mark) => mark.overrunMs > 0).length}`,
  );

  expect(marks).toHaveLength(PLAN.length);
  for (const mark of marks) {
    expect(mark.durationMs).toBeGreaterThanOrEqual(55_000);
    expect(mark.durationMs).toBeLessThanOrEqual(245_000);
  }
  expect(totalMs).toBeGreaterThanOrEqual(25 * 60 * 1000);
  expect(totalMs).toBeLessThan(4 * 60 * 60 * 1000);
  expect(signInStatuses.filter((status) => status === 200).length).toBeGreaterThanOrEqual(4);
  expect(signInStatuses).toContain(401);
  expect(failed5xx).toEqual([]);
  expect(pageErrors).toEqual([]);
});
