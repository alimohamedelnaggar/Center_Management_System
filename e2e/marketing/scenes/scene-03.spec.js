import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import XLSX from 'xlsx';

import { apiLogin, deleteStudentsByName, findStudentsByPhone } from '../support/api.js';
import { artifactsRoot, ensureDir, repoRoot } from '../support/env.js';
import { recordClip } from '../support/scene.js';

const GROUP_NAME = 'الصف الثالث الإعدادي - أ';
const SEEDED_DUPLICATE_PHONE = '01155500005';
const SEEDED_DUPLICATE_NAME = 'أحمد وليد إبراهيم';

// Every run imports fresh phone numbers: a soft-deleted student keeps its login
// (the phone is the username), so re-using a phone can never create a new user.
// Names stay stable so a previous run's rows can be removed before recording.
const VALID_ONE = 'يوسف عماد فتحي';
const VALID_TWO = 'ملك هشام رمضان';
const DUPLICATE_IN_FILE = 'كريم أشرف سامي';
const ERROR_PHONE = 'نور الدين مصطفى';
const CLEANUP_NAMES = [VALID_ONE, VALID_TWO, DUPLICATE_IN_FILE, ERROR_PHONE];

const FINDING_ID = 'F-008';
const FINDINGS_PATH = path.join(repoRoot, 'docs', 'e2e-findings.md');
const CHECK_PATH = path.join(artifactsRoot, 'scene-03-import-check.json');

function buildImportWorkbook() {
  const stamp = String(Date.now());
  const digits = (offset) =>
    String((Number(stamp.slice(-8)) + offset) % 100000000).padStart(8, '0');

  const phones = {
    studentOne: `011${digits(0)}`,
    studentTwo: `011${digits(1)}`,
    studentThree: `011${digits(2)}`,
    parentOne: `012${digits(3)}`,
    parentTwo: `012${digits(4)}`,
    parentDuplicateDb: `012${digits(5)}`,
    parentDuplicateFile: `012${digits(6)}`,
    parentErrorPhone: `012${digits(7)}`,
    parentErrorName: `012${digits(8)}`,
  };

  const rows = [
    // 2 rows that must be created.
    [VALID_ONE, phones.studentOne, phones.parentOne, GROUP_NAME, 'شهر', '', '', ''],
    [VALID_TWO, phones.studentTwo, phones.parentTwo, GROUP_NAME, 'شهر', '', '', ''],
    // A phone that already exists in the center (seeded student).
    [
      SEEDED_DUPLICATE_NAME,
      SEEDED_DUPLICATE_PHONE,
      phones.parentDuplicateDb,
      GROUP_NAME,
      'شهر',
      '',
      '',
      '',
    ],
    // The same phone as row 1, duplicated inside the file.
    [
      DUPLICATE_IN_FILE,
      phones.studentOne,
      phones.parentDuplicateFile,
      GROUP_NAME,
      'شهر',
      '',
      '',
      '',
    ],
    // Invalid student phone.
    [ERROR_PHONE, '12345', phones.parentErrorPhone, GROUP_NAME, 'شهر', '', '', ''],
    // Missing name, everything else valid.
    ['', phones.studentThree, phones.parentErrorName, GROUP_NAME, 'شهر', '', '', ''],
  ];

  const sheet = XLSX.utils.aoa_to_sheet([
    [
      'الاسم الكامل',
      'رقم الهاتف',
      'رقم هاتف ولي الأمر',
      'اسم المجموعة',
      'نوع الاشتراك (شهر/حصة)',
      'سعر مخصص',
      'المدرسة',
      'ملاحظات',
    ],
    ...rows,
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'الطلاب');

  const dir = ensureDir(path.join(artifactsRoot, 'imports'));
  const filePath = path.join(dir, 'طلاب_جدد.xlsx');
  XLSX.writeFile(workbook, filePath);
  return { filePath, fileName: path.basename(filePath), phones, rows: rows.length };
}

function recordCheck(check) {
  fs.writeFileSync(CHECK_PATH, JSON.stringify(check, null, 2), 'utf8');

  const previewOk = check.preview.valid + check.preview.duplicate + check.preview.error ===
    check.preview.total;
  const commitOk = check.commit.created + check.commit.updated + check.commit.skipped +
    check.commit.failed === check.rows;

  if (previewOk && commitOk) return;
  if (fs.existsSync(FINDINGS_PATH) &&
      fs.readFileSync(FINDINGS_PATH, 'utf8').includes(`## ${FINDING_ID}`)) {
    return;
  }

  const entry = `
---

## ${FINDING_ID} — The import result cards do not add up to the number of imported rows

**Severity:** Low (the four cards are read as a breakdown of the file, but one number goes missing)

**Found:** recorded on ${new Date().toISOString().slice(0, 10)} while filming scene 03 against the
marketing database, with a generated six-row workbook.

**Symptom**

The wizard shows a card per outcome, and the cards are read as a breakdown of the file:

\`\`\`json
${JSON.stringify(check, null, 2)}
\`\`\`

Preview cards: \`${check.preview.valid} + ${check.preview.duplicate} + ${check.preview.error}\` =
\`${check.preview.valid + check.preview.duplicate + check.preview.error}\` against
\`total = ${check.preview.total}\`.

Commit cards: \`${check.commit.created} + ${check.commit.updated} + ${check.commit.skipped} + ${check.commit.failed}\` =
\`${check.commit.created + check.commit.updated + check.commit.skipped + check.commit.failed}\` against
\`${check.rows} rows\`.

**Impact on the video**

Nothing is hidden: the scene shows the real cards for as long as every other screen, and no caption
talks about the totals, so the video makes no claim that the numbers add up. The finding is logged
for the product owner.

**Status: OPEN — logged while recording, not fixed.** The scene keeps the real numbers.
`;

  fs.appendFileSync(FINDINGS_PATH, entry, 'utf8');
  // eslint-disable-next-line no-console
  console.warn(`[scene03] card totals do not add up; logged ${FINDING_ID} in docs/e2e-findings.md`);
}

test('scene 03 - import students from an Excel file', async ({ browser }) => {
  // Preparation outside the recording: the same file is imported on every run,
  // so rows created by an earlier run are removed through the product API.
  const cleanup = await apiLogin('centerOwner');
  try {
    for (const name of CLEANUP_NAMES) {
      await deleteStudentsByName(cleanup, name);
    }
    const seeded = await findStudentsByPhone(cleanup, SEEDED_DUPLICATE_PHONE);
    if (!seeded.some((student) => student.fullName === SEEDED_DUPLICATE_NAME)) {
      throw new Error(
        `Scene 03 needs the seeded student ${SEEDED_DUPLICATE_NAME} (${SEEDED_DUPLICATE_PHONE}) ` +
          'as the duplicate-in-center row. Reseed the marketing database first.',
      );
    }
  } finally {
    await cleanup.dispose();
  }

  const { filePath, fileName, phones, rows } = buildImportWorkbook();
  const counts = { preview: null, commit: null };

  await recordClip({
    browser,
    sceneId: '3',
    clipId: 'scene03-import',
    // `/dashboard` (the students page) is Assistant/Teacher only, so the import
    // is recorded as the teacher who owns the target group. Preparation and the
    // post-check still use the center owner, who sees the whole center.
    role: 'teacher',
    startPath: '/dashboard',
    slowMo: 220,
    tailMs: 1200,
    steps: async (s) => {
      const { page } = s;
      // The wizard is a full-screen overlay; the students table behind it also
      // has a "الحالة" column, so preview assertions stay inside the overlay.
      const wizard = page.locator('div.fixed.inset-0.z-50').last();

      // ------------------------------------------------------------------
      // The students list the import feeds into.
      // ------------------------------------------------------------------
      s.mark('students');
      await s.expect(page.getByRole('heading', { name: 'الطلاب', exact: true })).toBeVisible();
      await s.expect(
        page.getByText('إدارة الطلاب والمجموعات والحضور وبيانات التواصل.').first(),
      ).toBeVisible();
      await s.hold(4000);

      // ------------------------------------------------------------------
      // Open the wizard.
      // ------------------------------------------------------------------
      s.mark('open');
      await s.click(page.getByRole('button', { name: 'استيراد من Excel', exact: true }));
      await s.expect(
        page.getByRole('heading', { name: 'معالج استيراد الطلاب من Excel' }),
      ).toBeVisible();
      await s.expect(page.getByText('الخطوة 1 من 4: رفع الملف')).toBeVisible();
      await s.hold(3300);

      // ------------------------------------------------------------------
      // Download the official template (a real HTTP response with a real file).
      // ------------------------------------------------------------------
      s.mark('template');
      const [templateResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/Student/Import/Template') &&
            response.request().method() === 'GET',
          { timeout: 30_000 },
        ),
        s.click(page.getByRole('button', { name: 'تنزيل قالب Excel', exact: true })),
      ]);
      expect(templateResponse.status()).toBe(200);
      expect(templateResponse.headers()['content-type']).toContain('spreadsheet');
      await s.expect(page.getByText('صيغة الملف المطلوبة: .xlsx فقط', { exact: false }))
        .toBeVisible();
      await s.hold(3100);

      // ------------------------------------------------------------------
      // Upload the generated file and let the product preview it.
      // ------------------------------------------------------------------
      s.mark('upload');
      await s.focusOn(page.getByRole('button', { name: 'اختيار ملف', exact: true }));
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await s.expect(page.getByText(fileName, { exact: true })).toBeVisible();
      await s.hold(2300);
      await s.click(page.getByRole('button', { name: 'متابعة', exact: true }));
      await s.expect(page.getByTestId('summary-total')).toBeVisible({ timeout: 60_000 });

      // ------------------------------------------------------------------
      // Read the preview numbers exactly as they are on screen.
      // ------------------------------------------------------------------
      s.mark('preview');
      counts.preview = {
        total: Number(await page.getByTestId('summary-total').innerText()),
        valid: Number(await page.getByTestId('summary-valid').innerText()),
        duplicate: Number(await page.getByTestId('summary-duplicate').innerText()),
        error: Number(await page.getByTestId('summary-error').innerText()),
      };
      expect(counts.preview.total).toBe(rows);
      expect(counts.preview.valid).toBe(2);
      expect(counts.preview.duplicate).toBe(2);
      expect(counts.preview.error).toBe(2);
      await s.expect(wizard.getByRole('columnheader', { name: 'الحالة' })).toBeVisible();
      await s.expect(wizard.getByRole('columnheader', { name: 'رسالة الخطأ' })).toBeVisible();
      await s.hold(3500);

      // ------------------------------------------------------------------
      // Duplicate rows.
      // ------------------------------------------------------------------
      s.mark('duplicates');
      await s.expect(page.getByRole('cell', { name: 'مكرر', exact: true })).toHaveCount(2);
      await s.focusOn(page.getByRole('cell', { name: 'مكرر', exact: true }).first());
      await s.hold(3300);

      // ------------------------------------------------------------------
      // Valid rows.
      // ------------------------------------------------------------------
      s.mark('valid');
      await s.expect(page.getByRole('cell', { name: 'صالح', exact: true })).toHaveCount(2);
      await s.focusOn(page.getByRole('cell', { name: VALID_ONE, exact: true }));
      await s.hold(3300);

      // ------------------------------------------------------------------
      // Error rows: the two messages the backend produced for this file.
      // ------------------------------------------------------------------
      s.mark('errors');
      await s.expect(page.getByRole('cell', { name: 'خطأ', exact: true })).toHaveCount(2);
      const phoneError = page.getByRole('cell', { name: 'رقم الهاتف غير صالح', exact: true });
      await s.expect(phoneError).toHaveCount(1);
      await s.expect(
        page.getByRole('cell', { name: 'الاسم الكامل مطلوب', exact: true }),
      ).toHaveCount(1);
      await s.focusOn(phoneError);
      await s.hold(3400);

      // ------------------------------------------------------------------
      // Options: the default is to skip the duplicate that already exists.
      // ------------------------------------------------------------------
      s.mark('options');
      await s.click(page.getByRole('button', { name: 'متابعة', exact: true }));
      await s.expect(page.getByRole('heading', { name: 'خيارات الاستيراد' })).toBeVisible();
      await s.expect(page.getByRole('radio', { name: 'تخطي (افتراضي)' })).toBeChecked();
      await s.expect(page.getByRole('heading', { name: 'ملخص ما سيحدث' })).toBeVisible();
      await s.hold(3000);

      // ------------------------------------------------------------------
      // Commit.
      // ------------------------------------------------------------------
      s.mark('commit');
      await s.hold(2300);
      await s.click(page.getByRole('button', { name: 'تأكيد الاستيراد', exact: true }));
      await s.expect(page.getByText('مضاف', { exact: true })).toBeVisible({ timeout: 90_000 });

      // ------------------------------------------------------------------
      // Result: the four real outcome cards.
      // ------------------------------------------------------------------
      s.mark('result');
      const resultCards = await page.locator('p.text-2xl.font-bold').allInnerTexts();
      expect(resultCards).toEqual(['2', '0', '1', '3']);
      counts.commit = {
        created: Number(resultCards[0]),
        updated: Number(resultCards[1]),
        skipped: Number(resultCards[2]),
        failed: Number(resultCards[3]),
      };
      for (const label of ['مضاف', 'محدّث', 'متخطّى', 'فاشل']) {
        await s.expect(page.getByText(label, { exact: true })).toBeVisible();
      }
      await s.expect(
        page.getByRole('button', { name: 'تنزيل تقرير الأخطاء (Excel)', exact: true }),
      ).toBeVisible();
      await s.expect(
        page.getByRole('button', { name: 'تصدير بيانات الدخول (Excel/PDF)', exact: true }),
      ).toBeVisible();
      await s.hold(5300);

      // ------------------------------------------------------------------
      // Close the wizard and prove the students are really in the list.
      // ------------------------------------------------------------------
      s.mark('done');
      await s.click(page.getByRole('button', { name: 'إغلاق', exact: true }).last());
      await s.expect(
        page.getByRole('heading', { name: 'معالج استيراد الطلاب من Excel' }),
      ).toBeHidden();
      await s.type(
        page.getByPlaceholder('ابحث باسم الطالب أو رقم الهاتف...'),
        VALID_ONE,
      );
      await s.expect(page.getByText(VALID_ONE, { exact: true }).first()).toBeVisible();
      await s.expect(
        page.getByRole('cell', { name: phones.studentOne, exact: true }),
      ).toBeVisible();
      await s.hold(4200);
    },
  });

  recordCheck({
    at: new Date().toISOString(),
    file: fileName,
    rows,
    preview: counts.preview,
    commit: counts.commit,
  });

  // Post-verification through the product API: both valid rows exist with the
  // imported phone and group, and the three rejected rows were not created.
  const verify = await apiLogin('centerOwner');
  try {
    const one = await findStudentsByPhone(verify, phones.studentOne);
    const two = await findStudentsByPhone(verify, phones.studentTwo);
    expect(one.map((student) => student.fullName)).toEqual([VALID_ONE]);
    expect(one[0].groupName).toBe(GROUP_NAME);
    expect(two.map((student) => student.fullName)).toEqual([VALID_TWO]);
    expect(two[0].groupName).toBe(GROUP_NAME);
    expect(await findStudentsByPhone(verify, phones.studentThree)).toHaveLength(0);
  } finally {
    await verify.dispose();
  }
});
