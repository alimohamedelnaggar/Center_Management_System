import { test } from '@playwright/test';

import { apiLogin, deleteStudentsByPhone, findStudentsByPhone } from '../support/api.js';
import { recordClip } from '../support/scene.js';

const STUDENT_NAME = 'ريم ممدوح عبد الرحمن';
const STUDENT_PHONE = '01155990002';
const PARENT_PHONE = '01255990002';
const GROUP_NAME = 'الصف الثالث الإعدادي - أ';

test('scene 02 - add a student and open the student card', async ({ browser }) => {
  // Preparation outside the recording: the clip must create this exact student
  // every time, so any leftover copy of it is removed through the product API.
  const cleanup = await apiLogin('centerOwner');
  try {
    await deleteStudentsByPhone(cleanup, STUDENT_PHONE);
  } finally {
    await cleanup.dispose();
  }

  await recordClip({
    browser,
    sceneId: '2',
    clipId: 'scene02-add-student',
    role: 'assistant',
    startPath: '/dashboard',
    slowMo: 250,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);
      s.mark('overview');
      // The list itself is the proof for the caption: a real table of students
      // with phones, groups and subscription type.
      await s.expect(page.getByRole('heading', { name: 'الطلاب', exact: true })).toBeVisible();
      await s.expect(page.getByRole('columnheader', { name: 'رقم الهاتف' })).toBeVisible();
      const firstStudentRow = page.locator('tbody tr').first();
      await s.expect(firstStudentRow).toBeVisible();
      await s.expect(firstStudentRow.getByText(/01\d{9}/).first()).toBeVisible();
      await s.hold(3300);

      s.mark('openAdd');
      const addButton = page.getByRole('button', { name: 'إضافة طالب', exact: true });
      await s.click(addButton);
      await s.expect(page.getByRole('heading', { name: 'إضافة طالب جديد' })).toBeVisible();
      await s.hold(1300);

      s.mark('name');
      const nameInput = page.getByPlaceholder('أدخل اسم الطالب رباعي...');
      await s.type(nameInput, STUDENT_NAME, { delay: 65 });
      await s.expect(nameInput).toHaveValue(STUDENT_NAME);
      await s.hold(1200);

      s.mark('phones');
      const phoneInputs = page.getByPlaceholder('01xxxxxxxxx');
      await s.type(phoneInputs.first(), STUDENT_PHONE, { delay: 60 });
      await s.type(phoneInputs.nth(1), PARENT_PHONE, { delay: 60 });
      await s.expect(phoneInputs.first()).toHaveValue(STUDENT_PHONE);
      await s.hold(900);

      s.mark('group');
      const modal = page.locator('form');
      const groupSelect = modal.locator('select');
      await s.focusOn(groupSelect);
      await groupSelect.selectOption({ label: GROUP_NAME });
      await s.expect(groupSelect).toHaveValue(/.+/);
      await s.hold(900);

      // Show both subscription choices so the caption covers the real control,
      // then leave the form on the monthly option just like a normal add.
      const perSession = modal.locator('input[type="radio"][value="1"]');
      const monthly = modal.locator('input[type="radio"][value="2"]');
      await s.click(perSession);
      await s.hold(700);
      await s.click(monthly);
      await s.expect(monthly).toBeChecked();
      await s.hold(700);

      s.mark('save');
      await s.click(modal.getByRole('button', { name: 'إضافة الطالب', exact: true }));
      await s.expect(page.getByText('تم إضافة الطالب بنجاح')).toBeVisible();
      await s.expect(page.getByRole('heading', { name: 'إضافة طالب جديد' })).toBeHidden();
      await s.hold(1400);

      s.mark('search');
      const searchInput = page.getByPlaceholder('ابحث باسم الطالب أو رقم الهاتف...');
      await s.type(searchInput, 'ريم ممدوح', { delay: 90 });
      await s.hold(1600);

      s.mark('found');
      const table = page.getByRole('table');
      const studentCell = table.getByText(STUDENT_NAME, { exact: true });
      await s.expect(studentCell).toBeVisible();
      await s.expect(table.getByText(STUDENT_PHONE, { exact: true })).toBeVisible();
      await s.expect(page.getByText(/عرض 1 إلى 1 من أصل 1/)).toBeVisible();
      await s.hold(3700);

      s.mark('actions');
      const rowMenu = page
        .getByRole('button', { name: `Actions for ${STUDENT_NAME}` })
        .first();
      await s.click(rowMenu);
      await s.expect(page.getByRole('menuitem', { name: 'عرض الطالب' })).toBeVisible();
      await s.expect(page.getByRole('menuitem', { name: 'تعديل الطالب' })).toBeVisible();
      await s.hold(1700);

      s.mark('view');
      await s.click(page.getByRole('menuitem', { name: 'عرض الطالب' }));
      const studentCard = page.locator('div.fixed.inset-0.z-50').last();
      await s.expect(studentCard.getByRole('heading', { name: 'بيانات الطالب' })).toBeVisible();
      await s.expect(studentCard.getByText(PARENT_PHONE, { exact: true })).toBeVisible();
      await s.expect(studentCard.getByText(GROUP_NAME, { exact: true })).toBeVisible();
      await s.hold(1600);

      s.mark('done');
      await s.hold(3200);
    },
  });

  // The clip is only valid if the student it shows really exists now.
  const verify = await apiLogin('centerOwner');
  try {
    const students = await findStudentsByPhone(verify, STUDENT_PHONE);
    if (students.length !== 1) {
      throw new Error(
        `Scene 02 expected exactly one student with phone ${STUDENT_PHONE}, ` +
          `found ${students.length}.`,
      );
    }
    if (students[0].fullName !== STUDENT_NAME) {
      throw new Error(
        `Scene 02 created "${students[0].fullName}" instead of "${STUDENT_NAME}".`,
      );
    }
  } finally {
    await verify.dispose();
  }
});

