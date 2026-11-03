import { test } from '@playwright/test';

import { apiLogin } from '../support/api.js';
import { alignNotificationsToOctober, deleteNotifications } from '../support/db.js';
import { recordClip } from '../support/scene.js';

// The phone frame approved for this scene. The product is recorded at a real
// phone viewport instead of being drawn inside a fake device: every frame is a
// genuine browser rendering of the student/parent portal.
const PHONE = { width: 420, height: 900 };

// The marketing fixture is dated in October. The recorded absence is recorded
// against the Friday session of that month, and the machine clock is never used
// as a date: it is already November, and no screen of this scene may show a
// November date.
const ATTENDANCE_DATE = '2026-10-30';
const SESSION_ID = '3e9732de-d644-46df-b7ec-236486352c4e';
const EXAM_ID = 'e43e2f33-d724-4f87-b438-926bc9cf9430';
const EXAM_NAME = 'اختبار شهري - الأعداد والجبر';
const EXPIRED_EXAM_NAME = 'اختبار الجبر الإلكتروني';

const RESULT_LINK = 'aside a[title="النتائج"]';
const ATTENDANCE_LINK = 'aside a[title="الحضور والغياب"]';
const PAYMENTS_LINK = 'aside a[title="المدفوعات"]';

const jwtName = (token) => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
};

const bodyOf = async (promise) => {
  const response = await promise;
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok()) {
    throw new Error(`API ${response.url()} failed: ${response.status()} ${text}`);
  }
  return body;
};

// A cell is only allowed in a caption when it is completely inside the phone
// frame; scrolling a wide RTL table can otherwise leave half a value off-screen.
const inFrame = async (locator, viewport) => {
  const box = await locator.boundingBox();
  if (!box) return false;
  return (
    box.x >= -0.5 &&
    box.y >= -0.5 &&
    box.x + box.width <= viewport.width + 0.5 &&
    box.y + box.height <= viewport.height + 0.5
  );
};

test('scene 07 - the student and parent portals on a phone', async ({ browser }) => {
  // -------------------------------------------------------------------
  // Preparation outside the recording.
  //  * the published exam is what the student sees first, and the clip then
  //    unpublishes it on camera to prove the result is hidden until publish;
  //  * the Friday session of 2026-10-30 is reset to present, so the absence
  //    sent later is a genuine status change;
  //  * notifications left by an earlier preparation run are removed, so the
  //    bell only shows October rows.
  // -------------------------------------------------------------------
  const assistant = await apiLogin('assistant');
  const teacher = await apiLogin('teacher');
  const student = await apiLogin('student');
  const parent = await apiLogin('parent');

  let childId = '';
  let childName = '';

  {
    childName = jwtName(student.token);
    const children = (await bodyOf(parent.request.get('/api/V1/ParentPortal/Children')))?.data ?? [];
    const child = children.find((item) => item.fullName === childName);
    if (!child) {
      throw new Error(
        `The student session "${childName}" is not linked to the parent account.`,
      );
    }
    childId = child.studentId;

    const results = (await bodyOf(student.request.get('/api/V1/StudentPortal/Results')))?.data ?? [];
    const examResult = results.find((item) => item.examId === EXAM_ID);
    if (!examResult) {
      throw new Error('Scene 07 needs the finished monthly exam in the student results.');
    }
    if (!examResult.isPublished) {
      await bodyOf(
        teacher.request.post(`/api/V1/QuestionExam/${EXAM_ID}/Publish?publish=true`),
      );
    }

    await bodyOf(
      assistant.request.post('/api/V1/Attendance/Create', {
        data: {
          sessionId: SESSION_ID,
          attendanceDate: ATTENDANCE_DATE,
          attendances: [{ studentId: childId, status: 1 }],
        },
      }),
    );

    const notifications =
      (await bodyOf(
        parent.request.get('/api/V1/ParentPortal/Notifications', {
          params: { pageNumber: 1, pageSize: 50 },
        }),
      ))?.data?.data ?? [];
    const stale = notifications.filter(
      (item) =>
        item.title === 'تحديث الحضور' ||
        new Date(item.createdAt).getTime() >= new Date('2026-11-01T00:00:00').getTime(),
    );
    deleteNotifications(stale.map((item) => item.id));
    alignNotificationsToOctober();
  }

  let notifyDone = false;

  try {
    // -----------------------------------------------------------------
    // Clip 1: the student portal.
    // -----------------------------------------------------------------
    await recordClip({
      browser,
      sceneId: '7',
      clipId: 'scene07-student',
      role: 'student',
      startPath: '/student/exams',
      viewport: PHONE,
      slowMo: 150,
      tailMs: 900,
      steps: async (s) => {
        const { page } = s;

        await s.hold(700);

        s.mark('exams');
        await s.expect(page.getByRole('heading', { name: 'امتحاناتي' })).toBeVisible();
        await s.expect(page.getByText(EXAM_NAME, { exact: true })).toBeVisible();
        await s.expect(page.getByText('تم التسليم', { exact: true })).toBeVisible();
        await s.expect(page.getByText('الدرجة: 3 / 3', { exact: true })).toBeVisible();
        await s.expect(page.getByText(EXPIRED_EXAM_NAME, { exact: true })).toBeVisible();
        await s.expect(page.getByText('انتهى وقت هذا الامتحان', { exact: true })).toBeVisible();
        await s.hold(3800);

        // The score is unpublished through the teacher API while the student is
        // still on the exams screen, so the results page is loaded in its real
        // "not published" state.
        s.mark('pending');
        await bodyOf(
          teacher.request.post(`/api/V1/QuestionExam/${EXAM_ID}/Publish?publish=false`),
        );
        await s.click(page.locator(RESULT_LINK));
        await page.waitForURL('**/student/results');
        await s.expect(page.getByRole('heading', { name: 'نتائجي' })).toBeVisible();

        const row = page.locator('tbody tr').first();
        await s.expect(row).toContainText(EXAM_NAME);
        await s.expect(row.locator('td').nth(2)).toHaveText('—');
        await s.expect(row.locator('td').nth(5)).toHaveText('بانتظار النشر');
        s.expect(
          await row.getByRole('button', { name: 'مراجعة' }).count(),
          'an unpublished result offers no review action',
        ).toBe(0);

        const hidden = (await bodyOf(student.request.get('/api/V1/StudentPortal/Results')))
          ?.data ?? [];
        const hiddenRow = hidden.find((item) => item.examId === EXAM_ID);
        s.expect(hiddenRow?.isPublished, 'the API hides the score before publish').toBe(false);
        s.expect(hiddenRow?.score, 'the API returns no score before publish').toBeNull();

        await row.locator('td').nth(3).scrollIntoViewIfNeeded();
        await row.locator('td').nth(5).scrollIntoViewIfNeeded();
        await s.hold(250);
        s.expect(
          await inFrame(row.locator('td').nth(3), PHONE),
          'the percentage cell is inside the phone frame',
        ).toBeTruthy();
        s.expect(
          await inFrame(row.locator('td').nth(5), PHONE),
          'the status cell is inside the phone frame',
        ).toBeTruthy();
        await s.hold(3700);

        s.mark('result');
        await bodyOf(
          teacher.request.post(`/api/V1/QuestionExam/${EXAM_ID}/Publish?publish=true`),
        );
        await s.click(page.getByRole('button', { name: 'تحديث', exact: true }));
        await s.expect(row.locator('td').nth(2)).toHaveText('3 / 3', { timeout: 15_000 });
        await s.expect(row.getByText('100%', { exact: true })).toBeVisible();
        await s.expect(row.getByText('مكتمل', { exact: true })).toBeVisible();
        await s.expect(row.getByRole('button', { name: 'مراجعة' })).toHaveCount(1);

        const shown = (await bodyOf(student.request.get('/api/V1/StudentPortal/Results')))
          ?.data ?? [];
        const shownRow = shown.find((item) => item.examId === EXAM_ID);
        s.expect(shownRow?.isPublished, 'the API publishes the score').toBe(true);
        s.expect(shownRow?.score, 'the API exposes the real score after publish').toBe(3);

        await row.locator('td').nth(2).scrollIntoViewIfNeeded();
        await s.hold(250);
        for (const [index, label] of [
          [2, 'the score cell'],
          [3, 'the percentage cell'],
          [5, 'the status cell'],
        ]) {
          s.expect(
            await inFrame(row.locator('td').nth(index), PHONE),
            `${label} is inside the phone frame`,
          ).toBeTruthy();
        }
        await s.hold(3700);

        s.mark('attendance');
        await s.click(page.locator(ATTENDANCE_LINK));
        await page.waitForURL('**/student/attendance');
        await s.expect(
          page.getByRole('heading', { name: 'الحضور والغياب', exact: true }),
        ).toBeVisible();
        await s.expect(page.getByText('إجمالي الحصص', { exact: true })).toBeVisible();
        await s.expect(page.getByText('نسبة الحضور', { exact: true })).toBeVisible();
        await s.expect(page.getByText('حاضر', { exact: true }).first()).toBeVisible();
        await s.expect(page.getByText(/أكتوبر ٢٠٢٦/).first()).toBeVisible();
        await s.hold(3700);

        s.mark('fees');
        await s.click(page.locator(PAYMENTS_LINK));
        await page.waitForURL('**/student/payments');
        await s.expect(page.getByRole('heading', { name: 'المدفوعات' })).toBeVisible();
        await s.expect(page.getByText('إجمالي المدفوع', { exact: true })).toBeVisible();
        await s.expect(page.getByText('المتبقي', { exact: true }).first()).toBeVisible();
        await s.expect(page.getByText('عدد الدفعات', { exact: true })).toBeVisible();
        await s.expect(page.locator('tbody tr').first()).toBeVisible();
        await s.hold(3700);
      },
    });

    // -----------------------------------------------------------------
    // Clip 2: the parent portal, including a live absence notification.
    // -----------------------------------------------------------------
    await recordClip({
      browser,
      sceneId: '7',
      clipId: 'scene07-parent',
      role: 'parent',
      startPath: '/parent/dashboard',
      viewport: PHONE,
      slowMo: 150,
      tailMs: 900,
      steps: async (s) => {
        const { page } = s;

        await s.hold(700);

        s.mark('children');
        await s.expect(page.getByRole('heading', { name: 'أبنائي' })).toBeVisible();
        await s.expect(
          page.getByText('الطلاب المرتبطون بحسابك في المركز', { exact: true }),
        ).toBeVisible();
        const childLink = page.locator(`a[href="/parent/children/${childId}"]`);
        await s.expect(childLink).toBeVisible();
        await s.expect(childLink).toContainText(childName);
        await s.expect(page.getByText('مريم خالد عبد العزيز', { exact: true })).toBeVisible();
        await s.hold(3700);

        s.mark('childAttendance');
        await s.click(childLink);
        await page.waitForURL(`**/parent/children/${childId}`);
        await s.expect(
          page.getByRole('heading', { name: childName, exact: true }),
        ).toBeVisible();
        const attendanceSection = page
          .locator('section')
          .filter({ has: page.getByRole('heading', { name: 'الحضور والغياب', exact: true }) });
        await s.scrollTo(attendanceSection);
        await s.expect(attendanceSection).toBeVisible();
        await s.expect(
          attendanceSection.getByText('إجمالي الحصص', { exact: true }),
        ).toBeVisible();
        await s.expect(
          attendanceSection.getByText('نسبة الحضور', { exact: true }),
        ).toBeVisible();
        const presentRow = attendanceSection.locator('li').first();
        await s.expect(presentRow).toContainText('30/10/2026');
        await s.expect(presentRow).toContainText('حاضر');
        await s.hold(3800);

        s.mark('childGrades');
        const gradesSection = page
          .locator('section')
          .filter({ has: page.getByRole('heading', { name: 'الدرجات', exact: true }) });
        await s.scrollTo(gradesSection);
        await s.expect(gradesSection).toBeVisible();
        await s.expect(
          gradesSection.getByText('امتحان أكتوبر - الجبر', { exact: true }),
        ).toBeVisible();
        await s.expect(gradesSection.getByText('تسميع:', { exact: true })).toBeVisible();
        await s.expect(gradesSection.getByText('امتحان:', { exact: true })).toBeVisible();
        await s.expect(gradesSection.getByText('9', { exact: true }).first()).toBeVisible();
        await s.expect(gradesSection.getByText('18', { exact: true }).first()).toBeVisible();
        await s.hold(3800);

        s.mark('childPayments');
        const paymentsSection = page
          .locator('section')
          .filter({ has: page.getByRole('heading', { name: 'المدفوعات', exact: true }) });
        await s.scrollTo(paymentsSection);
        await s.expect(paymentsSection).toBeVisible();
        await s.expect(paymentsSection.getByText('المدفوع', { exact: true })).toBeVisible();
        await s.expect(paymentsSection.getByText('المتبقي', { exact: true })).toBeVisible();
        await s.expect(paymentsSection.locator('li').first()).toContainText('550 ج.م');
        await s.hold(3600);

        // A real attendance change from the staff API. The parent portal is
        // subscribed to the product's SignalR hub, so the toast, the unread
        // badge and the bell list all come from the live notification. The two
        // rows produced by publish + absence are moved onto the recorded Friday
        // so the scene stays in October even though the machine clock is not.
        // Return to the children list before the live notification arrives, so
        // clicking it lands on the child page through the router and mounts it
        // fresh: the absence row is read from the API after the change, not
        // left over from the payments screen.
        await page.goBack();
        await s.expect(page.getByRole('heading', { name: 'أبنائي' })).toBeVisible();
        await s.hold(600);

        s.mark('notify');
        await bodyOf(
          assistant.request.post('/api/V1/Attendance/Create', {
            data: {
              sessionId: SESSION_ID,
              attendanceDate: ATTENDANCE_DATE,
              attendances: [{ studentId: childId, status: 2 }],
            },
          }),
        );
        notifyDone = true;
        alignNotificationsToOctober();

        await s.expect(
          page.getByText('تحديث الحضور', { exact: true }).first(),
        ).toBeVisible({ timeout: 20_000 });

        await s.hold(1000);
        await s.click(page.getByRole('button', { name: 'الإشعارات' }));
        const panel = page.locator('div.absolute.z-40');
        await s.expect(panel).toBeVisible();
        await s.expect(panel.getByText('تحديث الحضور', { exact: true })).toBeVisible();
        const panelText = (await panel.innerText()).replace(/\u200f/g, '');
        s.expect(panelText, 'the bell shows the recorded absence').toContain(
          `تم تسجيل الغياب للطالب ${childName}`,
        );
        s.expect(panelText, 'the notification carries the October date').toContain(
          '2026/10/30',
        );
        s.expect(panelText, 'the formatted notification date is in October').toContain(
          '٣٠/١٠/٢٠٢٦',
        );
        s.expect(panelText, 'no November date is shown').not.toContain('نوفمبر');
        await s.hold(3400);

        s.mark('done');
        await s.click(
          panel.locator('button').filter({ hasText: 'تحديث الحضور' }).first(),
        );
        await page.waitForURL(`**/parent/children/${childId}`);
        const absenceSection = page
          .locator('section')
          .filter({ has: page.getByRole('heading', { name: 'الحضور والغياب', exact: true }) });
        await s.scrollTo(absenceSection);
        const absenceRow = absenceSection.locator('li').first();
        await s.expect(absenceRow).toContainText('30/10/2026');
        await s.expect(absenceRow).toContainText('غائب');
        await s.hold(3400);
      },
    });
  } finally {
    await assistant.dispose();
    await teacher.dispose();
    await student.dispose();
    await parent.dispose();
  }

  // The clip claims a notification was delivered, so prove the notification
  // row exists for the parent and the child after the recording.
  const verify = await apiLogin('parent');
  try {
    const items =
      (await bodyOf(
        verify.request.get('/api/V1/ParentPortal/Notifications', {
          params: { pageNumber: 1, pageSize: 50 },
        }),
      ))?.data?.data ?? [];
    if (notifyDone) {
      const found = items.some(
        (item) =>
          item.studentId === childId &&
          typeof item.body === 'string' &&
          item.body.includes(`تم تسجيل الغياب للطالب ${childName}`),
      );
      if (!found) {
        throw new Error(
          'Scene 07 recorded an absence notification but the parent list does not contain it.',
        );
      }
    }
  } finally {
    await verify.dispose();
  }
});
