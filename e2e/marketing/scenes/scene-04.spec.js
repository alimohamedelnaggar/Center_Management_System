import { test } from '@playwright/test';

import { recordClip } from '../support/scene.js';

const GROUP_NAME = 'الصف الثالث الإعدادي - أ';

// Re-recording one clip of the scene (for example after a slow cold load of a
// page) must not force the other clips to run again: the manual sheet marks
// every student present, so the scanner clip only works once per seeded day.
// MARKETING_CLIP=scene04-qr re-records exactly that clip.
const onlyClip = (process.env.MARKETING_CLIP ?? '').trim();
const wants = (clipId) => !onlyClip || onlyClip === clipId;

test('scene 04 - QR cards, scanner and the manual sheet', async ({ browser }) => {
  let studentCode = '';

  // ---------------------------------------------------------------------
  // Clip 1: the printable QR cards. Printing is intercepted on purpose: the
  // video must show the print layout, never the operating system's dialog.
  // ---------------------------------------------------------------------
  if (wants('scene04-qr'))
  await recordClip({
    browser,
    sceneId: '4',
    clipId: 'scene04-qr',
    role: 'assistant',
    startPath: '/qr-cards',
    slowMo: 250,
    tailMs: 1000,
    steps: async (s) => {
      const { page } = s;
      const firstCard = page.locator('.qr-card').first();

      await firstCard.waitFor({ state: 'visible', timeout: 45_000 });
      await s.hold(700);

      s.mark('qrOverview');
      await s.expect(page.getByText('كروت حضور الطلاب')).toBeVisible();
      await s.expect(firstCard).toBeVisible();
      await s.expect(firstCard.locator('img').first()).toBeVisible();

      // The code used later on the scanner belongs to a card that is visible
      // here. The last card on the first page is used because the scanner clip
      // needs a student with no attendance yet for the running session; the
      // first student in the list is normally the one already recorded.
      const scanCard = page.locator('.qr-card').last();
      await s.expect(scanCard).toBeVisible();
      await s.scrollTo(scanCard);
      const cardText = await scanCard.innerText();
      const match = cardText.match(/[A-Z]{2,}-\d+/);
      s.expect(match, 'the scanned card must show a readable student code').not.toBeNull();
      studentCode = match[0];
      await s.expect(scanCard.getByText(studentCode, { exact: true })).toBeVisible();
      await s.hold(3200);

      s.mark('qrPrint');
      // Replace window.print before the click: the product still calls it, the
      // operator never sees a native dialog.
      await page.evaluate(() => {
        window.__printCalls = 0;
        window.print = () => {
          window.__printCalls += 1;
        };
      });
      await s.click(page.getByRole('button', { name: 'طباعة الكل' }));
      await s.hold(400);

      const printCalls = await page.evaluate(() => window.__printCalls);
      s.expect(printCalls, 'the cards must ask the browser to print').toBe(1);

      // Show the real print stylesheet for a moment, then return to screen.
      await page.emulateMedia({ media: 'print' });
      await s.expect(page.locator('.qr-no-print').first()).toBeHidden();
      await s.expect(page.locator('.qr-card').first()).toBeVisible();
      await s.hold(2600);
      await page.emulateMedia({ media: 'screen' });
      await s.hold(1200);
    },
  });

  // ---------------------------------------------------------------------
  // Clip 2: the scanner. The first scan records attendance, the second one
  // with the same code must be reported as already recorded.
  // ---------------------------------------------------------------------
  if (wants('scene04-scanner'))
  await recordClip({
    browser,
    sceneId: '4',
    clipId: 'scene04-scanner',
    role: 'assistant',
    startPath: '/scanner',
    slowMo: 250,
    tailMs: 1000,
    steps: async (s) => {
      const { page } = s;

      await s.hold(700);

      s.mark('scanOpen');
      await s.expect(page.getByRole('heading', { name: 'ماسح الحضور' })).toBeVisible();
      await s.expect(page.getByText('الحصة الحالية')).toBeVisible();

      // The page auto-selects the running session; only touch the select when
      // it somehow arrived empty, so the recorded frame stays stable.
      const sessionSelect = page.locator('select').first();
      if (await sessionSelect.isVisible().catch(() => false)) {
        if (!(await sessionSelect.inputValue())) {
          const options = await sessionSelect.locator('option').allInnerTexts();
          const own = options.findIndex((label) => label.includes(GROUP_NAME));
          if (own > 0) {
            await sessionSelect.selectOption({ index: own });
            await s.hold(600);
          }
        }
      }

      const openButton = page.getByRole('button', { name: /فتح الكاميرا|مفيش حصة شغالة/ });
      await s.expect(openButton).toBeVisible();
      await s.click(openButton);

      const dialog = page.getByRole('dialog');
      await s.expect(dialog).toBeVisible();
      await s.click(dialog.getByRole('button', { name: 'سكانر', exact: true }));

      const codeInput = page.locator('#scanner-code-input');
      await s.expect(codeInput).toBeVisible();
      await s.hold(900);

      s.mark('scanOk');
      await s.expect(codeInput).toBeEnabled();
      await s.type(codeInput, studentCode, { delay: 80 });
      await codeInput.press('Enter');
      // The result card carries the student code, the name and the message.
      // The status chip is "حاضر" (or "متأخر" when the running session started
      // long ago), so the assertion accepts either and never invents a state.
      await s.expect(dialog.getByText(studentCode, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
      await s.expect(dialog.getByText(/تم تسجيل حضور/).first()).toBeVisible();
      await s.expect(dialog.getByText(/^(حاضر|متأخر)$/).first()).toBeVisible();
      await s.hold(2600);

      s.mark('scanDup');
      await s.expect(codeInput).toBeEnabled();
      await s.type(codeInput, studentCode, { delay: 80 });
      await codeInput.press('Enter');
      await s.expect(dialog.getByText(/متسجل حضوره بالفعل/).first()).toBeVisible({
        timeout: 20_000,
      });
      await s.expect(dialog.getByText('مسجل مسبقاً', { exact: true }).first()).toBeVisible();
      await s.hold(3200);

      await s.click(dialog.getByRole('button', { name: 'إغلاق' }));
      await s.hold(600);
    },
  });

  // ---------------------------------------------------------------------
  // Clip 3: the manual sheet, including the correction path.
  // ---------------------------------------------------------------------
  const studentCard = (page) => page.locator('div.relative.p-4.rounded-2xl').first();

  if (wants('scene04-attendance'))
  await recordClip({
    browser,
    sceneId: '4',
    clipId: 'scene04-attendance',
    role: 'assistant',
    startPath: '/attendance',
    slowMo: 250,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;
      const card = studentCard(page);
      await card.waitFor({ state: 'visible', timeout: 45_000 });

      const saveButton = page.getByRole('button', { name: 'حفظ الحضور' });
      const approvedBadge = page.getByText('تم اعتماد الحضور');
      const editButton = page.getByRole('button', { name: 'تعديل الحضور' });
      const closedButton = page.getByRole('button', { name: 'محفوظ ومغلق' });
      const presentChip = page.getByText('حاضر ✓', { exact: true }).first();

      await s.hold(700);

      s.mark('overview');
      await s.expect(page.getByRole('heading', { name: 'تسجيل حضور الحصة' })).toBeVisible();
      await s.expect(saveButton).toBeVisible();
      await s.expect(presentChip).toBeVisible();
      // The search field is a real input (F-007 is fixed), so the sheet is
      // operable by name as well as by card.
      await s.expect(page.getByPlaceholder('ابحث باسم الطالب أو الهاتف...')).toBeVisible();
      await s.hold(4000);

      s.mark('absent');
      await s.expect(card).toBeVisible();
      await s.expect(card.getByText('حاضر ✓', { exact: true })).toBeVisible();
      await s.click(card);
      await s.expect(card.getByText('غائب', { exact: true })).toBeVisible();
      await s.expect(page.getByText('غياب: 1').first()).toBeVisible();
      await s.hold(2200);

      s.mark('save');
      await s.click(saveButton);
      await s.expect(page.getByText('تم حفظ سجل الحضور والغياب بنجاح')).toBeVisible();
      await s.expect(approvedBadge).toBeVisible();
      await s.expect(closedButton).toBeVisible();
      await s.expect(closedButton).toBeDisabled();
      await s.hold(2400);

      s.mark('saved');
      await s.focusOn(approvedBadge);
      await s.expect(approvedBadge).toBeVisible();
      await s.expect(closedButton).toBeDisabled();
      await s.hold(2400);

      s.mark('edit');
      await s.click(editButton);
      await s.expect(approvedBadge).toBeHidden();
      await s.expect(saveButton).toBeVisible();
      await s.hold(2200);

      s.mark('restore');
      await s.expect(card.getByText('غائب', { exact: true })).toBeVisible();
      await s.click(card);
      await s.expect(card.getByText('حاضر ✓', { exact: true })).toBeVisible();
      await s.expect(page.getByText('غياب: 0').first()).toBeVisible();
      await s.hold(2200);

      s.mark('resave');
      await s.click(saveButton);
      await s.expect(page.getByText('تم حفظ سجل الحضور والغياب بنجاح')).toBeVisible();
      await s.expect(approvedBadge).toBeVisible();
      await s.expect(closedButton).toBeDisabled();
      await s.hold(2400);

      s.mark('done');
      await s.focusOn(approvedBadge);
      await s.expect(approvedBadge).toBeVisible();
      await s.expect(page.getByText('حاضر:', { exact: false }).first()).toBeVisible();
      await s.hold(2400);
    },
  });
});
