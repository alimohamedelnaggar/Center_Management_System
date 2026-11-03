import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { apiLogin, getGroups } from '../support/api.js';
import { createStorageState } from '../support/auth-state.js';
import { artifactsRoot, frontendBase, viewport } from '../support/env.js';
import { recordClip, waitForShell } from '../support/scene.js';

// The scene tells one complete exam story on the seed data: a question bank,
// an electronic exam built from it, a student answering on his own account, the
// teacher grading the essay question, and the result reaching the student only
// after publishing. The exam itself is created through the API for every run so
// the clip can always start from a clean, known state; nothing is faked on
// screen and every number shown is read back from the same endpoints the pages
// call.
const BANK_NAME = 'بنك أسئلة الجبر';
const GROUP_NAME = 'الصف الثالث الإعدادي - أ';
const YEAR_NAME = '2026 / 2027';
const EXAM_NAME = 'اختبار تدريبي - الجبر';
const ESSAY_ANSWER = 'أحلل المعادلة إلى عاملين ثم أجد الجذرين';
const ESSAY_MARK = 2;
// 3 automatic marks + the essay mark above.
const FINAL_SCORE = 5;

const CHECK_PATH = path.join(artifactsRoot, 'scene-06-exam-check.json');
const LEAK_SHOT = path.join(artifactsRoot, 'scene-06-prepublish-exams.png');

const onlyClip = (process.env.MARKETING_CLIP ?? '').trim();
const wants = (clipId) => !onlyClip || onlyClip === clipId;

const willGrade = wants('scene06-grading');
const willResult = wants('scene06-result');

const number = (value) => Number(value ?? 0);

// The API compares the start time with DateTime.Now, so the exam is scheduled
// with the machine's wall clock (no timezone suffix) rather than a UTC string.
function localExamDate(minutesAgo = 1) {
  const date = new Date(Date.now() - minutesAgo * 60_000);
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

async function json(response, label) {
  if (!response.ok()) {
    throw new Error(`${label} failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

async function findBank(api) {
  const body = await json(
    await api.request.get('/api/V1/QuestionBank/Paginated', {
      params: { pageNumber: 1, pageSize: 50 },
    }),
    'Question bank list',
  );
  const bank = (body?.data?.data ?? []).find((item) => item.name === BANK_NAME);
  if (!bank) {
    throw new Error(
      `Scene 06 needs the seeded question bank "${BANK_NAME}". Reseed the ` +
        'marketing database first.',
    );
  }
  return bank;
}

async function bankQuestions(api, bankId) {
  const body = await json(
    await api.request.get(`/api/V1/QuestionBank/${bankId}/questions`),
    'Bank questions',
  );
  const questions = body?.data ?? [];
  if (questions.length === 0) {
    throw new Error(`Question bank ${bankId} has no questions.`);
  }
  return questions;
}

async function findYear(api) {
  const body = await json(
    await api.request.get('/api/V1/AcademicYear/List'),
    'Academic year list',
  );
  const year = (body?.data ?? []).find((item) => item.name === YEAR_NAME);
  if (!year) {
    throw new Error(`Scene 06 needs the academic year "${YEAR_NAME}".`);
  }
  return year;
}

async function findAllExams(api) {
  const body = await json(
    await api.request.get('/api/V1/QuestionExam/Paginated', {
      params: { pageNumber: 1, pageSize: 50, search: EXAM_NAME },
    }),
    'Exam list',
  );
  return (body?.data?.data ?? []).filter((item) => item.name === EXAM_NAME);
}

async function deleteExams(api, exams) {
  for (const exam of exams) {
    const response = await api.request.delete(`/api/V1/QuestionExam/${exam.id}`);
    if (!response.ok()) {
      throw new Error(
        `Deleting exam ${exam.id} failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
  return exams.length;
}

async function createExam(api, { group, year, questions }) {
  // The bank endpoint returns questions in storage order; the recorded exam
  // wants the true/false question first, then the MCQ, then the essay.
  const ordered = [...questions].sort((a, b) => a.type - b.type);
  const body = await json(
    await api.request.post('/api/V1/QuestionExam/Create', {
      data: {
        name: EXAM_NAME,
        groupId: group.id,
        academicYearId: year.id,
        mode: 2,
        examDate: localExamDate(),
        durationMinutes: 120,
        shuffleQuestions: false,
        shuffleOptions: false,
        questionIds: ordered.map((question) => question.id),
      },
    }),
    'Create exam',
  );
  if (!body?.succeeded || !body.data) {
    throw new Error(`Creating the scene 06 exam failed: ${body?.message ?? 'unknown'}`);
  }
  return body.data;
}

async function getExam(api, examId) {
  const body = await json(
    await api.request.get(`/api/V1/QuestionExam/${examId}`),
    'Exam detail',
  );
  return body?.data;
}

async function getResults(api, examId) {
  const body = await json(
    await api.request.get(`/api/V1/QuestionExam/${examId}/Results`),
    'Exam results',
  );
  return body?.data ?? [];
}

async function studentProfile(api) {
  const body = await json(
    await api.request.get('/api/V1/StudentPortal/Profile'),
    'Student profile',
  );
  return body?.data;
}

async function startAttempt(api, examId) {
  const body = await json(
    await api.request.post(`/api/V1/StudentPortal/Exams/${examId}/Start`),
    'Start attempt',
  );
  if (!body?.succeeded || !body.data?.attemptId) {
    throw new Error(`Starting the exam attempt failed: ${body?.message ?? 'unknown'}`);
  }
  return body.data;
}

async function submitAttempt(api, attemptId, answers) {
  const response = await api.request.post(
    `/api/V1/StudentPortal/Attempts/${attemptId}/Submit`,
    { data: answers },
  );
  if (response.status() === 400) {
    // A re-record can find the attempt already submitted; that is the state the
    // next clip needs anyway.
    return { alreadySubmitted: true };
  }
  const body = await json(response, 'Submit attempt');
  if (!body?.succeeded) {
    throw new Error(`Submitting the attempt failed: ${body?.message ?? 'unknown'}`);
  }
  return body.data;
}

// Seeds the exact attempt the student would have produced: correct answers on
// the two auto-graded questions and an essay answer that still needs a teacher.
async function seedAttempt(studentApi, examId, bankQuestionList, profile) {
  const attempt = await startAttempt(studentApi, examId);
  const answers = attempt.questions.map((question) => {
    const source = bankQuestionList.find(
      (item) => (item.text ?? '') === (question.text ?? ''),
    );
    if (!source) {
      throw new Error(`No bank question matches "${question.text}" on the attempt.`);
    }
    if (number(question.type) === 3) {
      return {
        questionId: question.id,
        selectedOptionId: null,
        essayAnswer: ESSAY_ANSWER,
      };
    }
    const correct = (source.options ?? []).find((option) => option.isCorrect);
    const option = (question.options ?? []).find(
      (item) => item.text === correct?.text,
    );
    if (!correct || !option) {
      throw new Error(`Could not resolve the correct option for "${question.text}".`);
    }
    return {
      questionId: question.id,
      selectedOptionId: option.id,
      essayAnswer: null,
    };
  });

  const result = await submitAttempt(studentApi, attempt.attemptId, answers);
  return {
    attemptId: attempt.attemptId,
    studentId: profile.studentId,
    autoScore: result?.score ?? null,
  };
}

async function attemptDetail(api, attemptId) {
  const body = await json(
    await api.request.get(`/api/V1/QuestionExam/Attempts/${attemptId}`),
    'Attempt detail',
  );
  return body?.data;
}

async function gradeEssay(api, attemptId, mark) {
  const detail = await attemptDetail(api, attemptId);
  const essay = (detail?.answers ?? []).find((answer) => number(answer.type) === 3);
  if (!essay) {
    throw new Error(`Attempt ${attemptId} has no essay answer to grade.`);
  }
  if (essay.isCorrect !== null && essay.isCorrect !== undefined) {
    return { alreadyGraded: true, score: detail.score };
  }
  const body = await json(
    await api.request.post(`/api/V1/QuestionExam/Attempts/${attemptId}/Grade`, {
      data: [{ answerId: essay.answerId, awardedMark: mark }],
    }),
    'Grade attempt',
  );
  if (!body?.succeeded) {
    throw new Error(`Grading the attempt failed: ${body?.message ?? 'unknown'}`);
  }
  return { alreadyGraded: false, score: (await attemptDetail(api, attemptId)).score };
}

async function publishExam(api, examId) {
  const body = await json(
    await api.request.post(
      `/api/V1/QuestionExam/${examId}/Publish?publish=true`,
    ),
    'Publish results',
  );
  if (!body?.succeeded) {
    throw new Error(`Publishing the results failed: ${body?.message ?? 'unknown'}`);
  }
}

// Used only when the grading clip is not recorded but the result clip is: the
// teacher's work has to exist before the student's screen can show it.
async function ensurePublished(teacherApi, examId, studentId) {
  const rows = await getResults(teacherApi, examId);
  const row = rows.find((item) => item.studentId === studentId);
  if (!row?.attemptId) {
    throw new Error(
      `No finished attempt for student ${studentId}; record the student clip first.`,
    );
  }
  if (row.status !== 'finished') {
    throw new Error(`The attempt is "${row.status}" instead of finished.`);
  }
  await gradeEssay(teacherApi, row.attemptId, ESSAY_MARK);
  const exam = await getExam(teacherApi, examId);
  if (!exam?.isResultsPublished) {
    await publishExam(teacherApi, examId);
  }
  const after = await getResults(teacherApi, examId);
  return after.find((item) => item.studentId === studentId);
}

// The same endpoint the student's "نتائجي" page calls. Used after the teacher
// publishes, so the before/after pair is an API fact, not only a screen read.
async function readStudentResult(api, examId) {
  const body = await json(
    await api.request.get('/api/V1/StudentPortal/Results'),
    'Student results',
  );
  return (body?.data ?? []).find((item) => item.examId === examId) ?? null;
}

// Runtime proof for the result-visibility rule: the results endpoint hides the
// score before publishing, and the student's exams page is checked too. A score
// shown there before publishing is a real finding, so it is captured as
// evidence instead of being hidden.
async function capturePrePublish(browser, examId) {
  const api = await apiLogin('student');
  const evidence = {
    at: new Date().toISOString(),
    results: null,
    examsPage: null,
    screenshot: null,
    leak: false,
  };
  try {
    const resultsBody = await json(
      await api.request.get('/api/V1/StudentPortal/Results'),
      'Student results',
    );
    const result = (resultsBody?.data ?? []).find(
      (item) => item.examId === examId,
    );
    evidence.results = result
      ? {
          score: result.score,
          totalMark: result.totalMark,
          isPublished: result.isPublished,
          hasPendingManualGrading: result.hasPendingManualGrading,
        }
      : null;

    const examsBody = await json(
      await api.request.get('/api/V1/StudentPortal/Exams'),
      'Student exams',
    );
    const examItem = (examsBody?.data ?? []).find(
      (item) => item.examId === examId,
    );
    evidence.examsPage = examItem
      ? {
          status: examItem.status,
          score: examItem.score,
          scoredTotalMark: examItem.scoredTotalMark,
          hasPendingManualGrading: examItem.hasPendingManualGrading,
        }
      : null;

    const statePath = path.join(artifactsRoot, 'scene-06-evidence-state.json');
    await createStorageState(browser, 'student', statePath);
    const context = await browser.newContext({
      viewport,
      screen: viewport,
      locale: 'ar-EG',
      timezoneId: 'Africa/Cairo',
      ignoreHTTPSErrors: true,
      storageState: statePath,
    });
    try {
      const page = await context.newPage();
      await page.goto(`${frontendBase}/student/exams`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForShell(page);
      const card = page
        .locator('div.rounded-xl')
        .filter({
          has: page.getByRole('heading', { name: EXAM_NAME, exact: true }),
        })
        .first();
      await card.waitFor({ state: 'visible', timeout: 30_000 });
      await page.screenshot({ path: LEAK_SHOT, fullPage: true });
      evidence.screenshot = path.relative(artifactsRoot, LEAK_SHOT);
    } finally {
      await context.close();
      fs.rmSync(statePath, { force: true });
    }

    evidence.leak =
      evidence.results?.isPublished === false &&
      evidence.results?.score === null &&
      evidence.examsPage?.score !== null &&
      evidence.examsPage?.score !== undefined;
    if (evidence.leak) {
      // eslint-disable-next-line no-console
      console.warn(
        '[scene06] F-009 reproduced: the student exams page shows the auto ' +
          `score (${evidence.examsPage.score}) while the results endpoint ` +
          'hides it before the teacher publishes.',
      );
    }
  } finally {
    await api.dispose();
  }
  return evidence;
}

test('scene 06 - bank, electronic exam, grading and published results', async ({
  browser,
}) => {
  const teacher = await apiLogin('teacher');
  const student = await apiLogin('student');
  let examId = null;

  try {
    // -----------------------------------------------------------------------
    // Preparation (never on camera): reset the exam this scene owns, create a
    // fresh one from the seeded bank, and read every value the recording is
    // going to assert.
    // -----------------------------------------------------------------------
    const bank = await findBank(teacher);
    const questions = await bankQuestions(teacher, bank.id);
    const year = await findYear(teacher);
    const groups = await getGroups(teacher);
    const group = groups.find((item) => item.name === GROUP_NAME);
    if (!group) {
      throw new Error(`Scene 06 needs the group "${GROUP_NAME}".`);
    }
    if (year.id !== bank.academicYearId) {
      throw new Error(
        `The bank year (${bank.academicYearId}) is not "${YEAR_NAME}" (${year.id}).`,
      );
    }

    const profile = await studentProfile(student);
    if (!profile?.studentId) {
      throw new Error('The student account is not linked to a student.');
    }
    if (!(profile.groups ?? []).includes(GROUP_NAME)) {
      throw new Error(
        `The student is not in "${GROUP_NAME}": ${JSON.stringify(profile.groups)}`,
      );
    }

    const removed = await deleteExams(teacher, await findAllExams(teacher));
    examId = await createExam(teacher, { group, year, questions });
    const exam = await getExam(teacher, examId);
    const row = (await findAllExams(teacher)).find((item) => item.id === examId);

    if (number(exam.mode) !== 2) throw new Error('The exam is not electronic.');
    if (number(exam.questionsCount) !== questions.length) {
      throw new Error('The exam does not contain the full bank.');
    }
    if (number(exam.totalMarks) !== 6) {
      throw new Error(`The exam total is ${exam.totalMarks} instead of 6.`);
    }
    if (!row || row.isResultsPublished) {
      throw new Error('The new exam is missing from the list or already published.');
    }

    const ordered = [...questions].sort((a, b) => a.type - b.type);
    const expectedTypes = [1, 2, 3];
    const actualTypes = (exam.questions ?? [])
      .sort((a, b) => a.order - b.order)
      .map((item) => number(item.type));
    if (JSON.stringify(actualTypes) !== JSON.stringify(expectedTypes)) {
      throw new Error(
        `The recorded questions are ordered ${actualTypes.join(',')} instead of 1,2,3.`,
      );
    }

    const check = {
      at: new Date().toISOString(),
      examId,
      removedExams: removed,
      exam: {
        name: exam.name,
        groupName: exam.groupName,
        academicYearName: exam.academicYearName,
        mode: exam.mode,
        durationMinutes: exam.durationMinutes,
        questionsCount: exam.questionsCount,
        totalMarks: exam.totalMarks,
        isResultsPublished: exam.isResultsPublished,
      },
      questions: ordered.map((item) => ({
        id: item.id,
        type: item.type,
        typeName: item.typeName,
        mark: item.mark,
      })),
      student: {
        studentId: profile.studentId,
        fullName: profile.fullName,
      },
      seededAttempt: null,
      beforePublish: null,
      published: null,
      clips: {},
    };

    // When the student clip is skipped, the attempt has to exist for the
    // grading and result clips. The UI path is still used whenever it records.
    if (!wants('scene06-student') && (willGrade || willResult)) {
      check.seededAttempt = await seedAttempt(
        student,
        examId,
        questions,
        profile,
      );
      const seededRow = (await getResults(teacher, examId)).find(
        (item) => item.studentId === profile.studentId,
      );
      if (seededRow?.status !== 'finished') {
        throw new Error('The seeded attempt did not reach the finished state.');
      }
      if (number(seededRow.score) !== 3) {
        throw new Error(
          `The seeded attempt scored ${seededRow.score} instead of the 3 ` +
            'expected from the two correct auto-graded answers.',
        );
      }
    }

    // -----------------------------------------------------------------------
    // Clip 1: the bank, a question type and mark, the exam form, the new row.
    // -----------------------------------------------------------------------
    if (wants('scene06-bank')) {
      await recordClip({
        browser,
        sceneId: '6',
        clipId: 'scene06-bank',
        role: 'teacher',
        startPath: '/question-bank',
        slowMo: 220,
        tailMs: 1200,
        steps: async (s) => {
          const { page } = s;

          await s.hold(700);

          s.mark('bank');
          await s.expect(
            page.getByRole('heading', { name: 'بنك الأسئلة', exact: true }),
          ).toBeVisible();
          const bankRow = page
            .locator('tbody tr')
            .filter({
              has: page.getByRole('button', { name: BANK_NAME, exact: true }),
            });
          await s.expect(bankRow).toHaveCount(1);
          const bankHeaders = await page.getByRole('columnheader').allInnerTexts();
          const bankCol = (name) =>
            bankHeaders.findIndex((header) => header.trim() === name);
          expect(bankCol('عدد الأسئلة')).toBeGreaterThanOrEqual(0);
          const bankCell = (name) => bankRow.locator('td').nth(bankCol(name));
          await s.expect(bankCell('اسم البنك')).toContainText(BANK_NAME);
          await s.expect(bankCell('السنة الدراسية')).toHaveText(YEAR_NAME);
          await s.expect(bankCell('عدد الأسئلة')).toHaveText(
            String(questions.length),
          );
          await s.focusOn(bankRow);
          await s.hold(3200);

          s.mark('questions');
          await s.click(
            bankRow.getByRole('button', { name: BANK_NAME, exact: true }),
          );
          await s.expect(
            page.getByRole('heading', { name: BANK_NAME, exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText(`${questions.length} سؤال`, { exact: true }),
          ).toBeVisible();
          for (const typeName of ['صح وغلط', 'اختيار من متعدد', 'مقالي']) {
            await s.expect(
              page.getByText(typeName, { exact: true }).first(),
            ).toBeVisible();
          }
          for (const mark of [1, 2, 3]) {
            await s.expect(
              page.getByText(`${mark} درجة`, { exact: true }).first(),
            ).toBeVisible();
          }
          await s.focusOn(
            page.getByText('صح وغلط', { exact: true }).last(),
          );
          await s.hold(3200);
          await s.expect(
            page.getByRole('button', { name: 'إغلاق', exact: true }),
          ).toBeVisible();
          await s.click(page.getByRole('button', { name: 'إغلاق', exact: true }));
          await s.expect(
            page.getByRole('heading', { name: BANK_NAME, exact: true }),
          ).toBeHidden();

          s.mark('exams');
          await s.click(
            page.locator('aside').getByRole('link', {
              name: 'الامتحانات',
              exact: true,
            }),
          );
          await page.waitForURL((url) => url.pathname === '/exams', {
            timeout: 30_000,
          });
          await s.hold(900);
          await s.expect(
            page.getByRole('heading', { name: 'الامتحانات', exact: true }),
          ).toBeVisible();
          await s.click(
            page.getByRole('button', { name: 'إنشاء امتحان', exact: true }),
          );
          await s.expect(
            page.getByRole('heading', { name: 'إنشاء امتحان جديد' }),
          ).toBeVisible();
          await s.click(
            page.getByRole('button', { name: 'إلكتروني', exact: true }),
          );
          await s.expect(
            page.getByText('تاريخ البداية', { exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText('ساعة البداية', { exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText('المدة (بالدقائق)', { exact: true }),
          ).toBeVisible();
          await s.expect(page.getByText(/وينتهي في/)).toBeVisible();
          await s.hold(3400);
          await s.click(
            page.getByRole('button', { name: 'إلغاء', exact: true }),
          );
          await s.expect(
            page.getByRole('heading', { name: 'إنشاء امتحان جديد' }),
          ).toBeHidden();

          s.mark('examRow');
          const examRow = page
            .locator('tbody tr')
            .filter({
              has: page.getByRole('cell', { name: exam.name, exact: true }),
            });
          await s.expect(examRow).toHaveCount(1);
          const examHeaders = await page.getByRole('columnheader').allInnerTexts();
          const examCol = (name) =>
            examHeaders.findIndex((header) => header.trim() === name);
          for (const header of ['اسم الامتحان', 'المجموعة', 'السنة', 'النوع', 'الأسئلة', 'الدرجة']) {
            expect(examCol(header)).toBeGreaterThanOrEqual(0);
          }
          const examCell = (name) => examRow.locator('td').nth(examCol(name));
          await s.expect(examCell('اسم الامتحان')).toContainText(exam.name);
          await s.expect(examCell('المجموعة')).toHaveText(exam.groupName);
          await s.expect(examCell('السنة')).toHaveText(exam.academicYearName);
          await s.expect(examCell('النوع')).toContainText('إلكتروني');
          await s.expect(examCell('النوع')).toContainText('بانتظار النشر');
          await s.expect(examCell('الأسئلة')).toHaveText(
            String(exam.questionsCount),
          );
          await s.expect(examCell('الدرجة')).toHaveText(String(exam.totalMarks));
          await s.focusOn(examRow);
          await s.hold(3400);
        },
      });
      check.clips.bank = 'recorded';
    }

    // -----------------------------------------------------------------------
    // Clip 2: the student starts the exam, answers, submits, and sees that the
    // result is not shown before the teacher publishes.
    // -----------------------------------------------------------------------
    if (wants('scene06-student')) {
      await recordClip({
        browser,
        sceneId: '6',
        clipId: 'scene06-student',
        role: 'student',
        startPath: '/student/exams',
        slowMo: 220,
        tailMs: 1200,
        steps: async (s) => {
          const { page } = s;

          await s.hold(700);

          s.mark('studentExam');
          await s.expect(
            page.getByRole('heading', { name: 'امتحاناتي', exact: true }),
          ).toBeVisible();
          const card = page
            .locator('div.rounded-xl')
            .filter({
              has: page.getByRole('heading', { name: exam.name, exact: true }),
            })
            .first();
          await s.expect(card).toHaveCount(1);
          await s.expect(card).toContainText(exam.groupName);
          await s.expect(card).toContainText('متاح الآن');
          await s.expect(card).toContainText(
            `المدة ${exam.durationMinutes} دقيقة`,
          );
          await s.expect(card).toContainText(
            `${exam.questionsCount} سؤال • الدرجة ${exam.totalMarks}`,
          );
          await s.expect(
            card.getByRole('button', { name: 'ابدأ الامتحان', exact: true }),
          ).toBeVisible();
          await s.focusOn(card);
          await s.hold(3200);

          s.mark('attempt');
          await s.click(
            card.getByRole('button', { name: 'ابدأ الامتحان', exact: true }),
          );
          await page.waitForURL(
            (url) => url.pathname.startsWith('/student/attempt/'),
            { timeout: 30_000 },
          );
          await s.expect(
            page.getByRole('heading', { name: exam.name, exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText('اقرأ قواعد الامتحان قبل البدء', { exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText(/الامتحان في وضع ملء الشاشة/),
          ).toBeVisible();
          await s.hold(3000);

          s.mark('answers');
          await s.click(
            page.getByRole('button', { name: 'بدء الامتحان', exact: true }),
          );
          await s.expect(
            page.getByText(
              `تمت الإجابة عن 0 من ${exam.questionsCount} سؤال`,
              { exact: true },
            ),
          ).toBeVisible();
          for (const item of ordered) {
            await s.expect(
              page.getByText(item.text, { exact: true }).first(),
            ).toBeVisible();
          }

          for (const item of ordered.filter((entry) => number(entry.type) !== 3)) {
            const correct = (item.options ?? []).find((option) => option.isCorrect);
            const option = page.getByText(correct.text, { exact: true }).first();
            await s.click(option);
            await s.expect(
              page
                .locator('label', { has: page.getByText(correct.text, { exact: true }) })
                .locator('input'),
            ).toBeChecked();
          }
          await s.expect(
            page.getByText(
              `تمت الإجابة عن 2 من ${exam.questionsCount} سؤال`,
              { exact: true },
            ),
          ).toBeVisible();
          await s.type(
            page.getByPlaceholder('اكتب إجابتك هنا...'),
            ESSAY_ANSWER,
          );
          await s.expect(
            page.getByPlaceholder('اكتب إجابتك هنا...'),
          ).toHaveValue(ESSAY_ANSWER);
          await s.expect(
            page.getByText(
              `تمت الإجابة عن ${exam.questionsCount} من ${exam.questionsCount} سؤال`,
              { exact: true },
            ),
          ).toBeVisible();
          await s.hold(2400);

          s.mark('submit');
          await s.click(
            page.getByRole('button', { name: 'تسليم', exact: true }).first(),
          );
          await s.expect(
            page.getByRole('heading', { name: 'تسليم الامتحان', exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText(
              `هل أنت متأكد من تسليم الامتحان؟ تمت الإجابة عن ` +
                `${exam.questionsCount} من ${exam.questionsCount} سؤال.`,
              { exact: true },
            ),
          ).toBeVisible();
          await s.hold(2800);
          await s.click(
            page.getByRole('button', { name: 'تسليم', exact: true }).last(),
          );
          await page.waitForURL((url) => url.pathname === '/student/results', {
            timeout: 30_000,
          });
          await s.expect(
            page.getByRole('heading', { name: 'نتائجي', exact: true }),
          ).toBeVisible();
          const resultRow = page
            .locator('tbody tr')
            .filter({
              has: page.getByRole('cell', { name: exam.name, exact: true }),
            })
            .first();
          await s.expect(resultRow).toHaveCount(1);
          await s.expect(resultRow.locator('td').nth(2)).toHaveText('—');
          await s.expect(resultRow.locator('td').nth(3)).toHaveText('—');
          await s.expect(resultRow.locator('td').nth(5)).toHaveText(
            'بانتظار النشر',
          );
          await s.expect(
            resultRow.getByRole('button', { name: 'مراجعة', exact: true }),
          ).toBeHidden();
          await s.hold(2400);
        },
      });
      check.clips.student = 'recorded';
    }

    // -----------------------------------------------------------------------
    // Pre-publish evidence, after the attempt exists and before anything is
    // published. It never changes the recording; it only records what the
    // running product actually returns.
    // -----------------------------------------------------------------------
    // Only meaningful once a submitted attempt exists. A clip-1-only re-record
    // has nothing to hide yet, so it must not fabricate a pre-publish state.
    if (check.seededAttempt || wants('scene06-student')) {
      const beforePublish = await capturePrePublish(browser, examId);
      check.beforePublish = beforePublish;
      expect(beforePublish.results?.isPublished).toBe(false);
      expect(beforePublish.results?.score).toBeNull();
    }

    // When the grading clip is skipped, the teacher's grading and publishing
    // are done through the API so the result clip still shows the real state.
    if (willResult && !willGrade) {
      check.published = await ensurePublished(teacher, examId, profile.studentId);
    }

    // -----------------------------------------------------------------------
    // Clip 3: the teacher sees the automatic 3 / 6, grades the essay, and
    // publishes the results.
    // -----------------------------------------------------------------------
    if (willGrade) {
      const beforeGrade = (await getResults(teacher, examId)).find(
        (item) => item.studentId === profile.studentId,
      );
      if (!beforeGrade?.attemptId || beforeGrade.status !== 'finished') {
        throw new Error('The teacher clip needs a finished attempt to grade.');
      }
      const resultsSummary = await getResults(teacher, examId);
      const finishedCount = resultsSummary.filter(
        (item) => item.status === 'finished',
      ).length;

      await recordClip({
        browser,
        sceneId: '6',
        clipId: 'scene06-grading',
        role: 'teacher',
        startPath: '/exams',
        slowMo: 220,
        tailMs: 1200,
        steps: async (s) => {
          const { page } = s;

          await s.hold(700);

          s.mark('results');
          const examRow = page
            .locator('tbody tr')
            .filter({
              has: page.getByRole('cell', { name: exam.name, exact: true }),
            });
          await s.expect(examRow).toHaveCount(1);
          await s.click(examRow.getByTitle('النتائج'));
          await s.expect(
            page.getByRole('heading', { name: 'نتائج الامتحان', exact: true }),
          ).toBeVisible();
          await s.expect(
            // The publish filter on the page also has an option with this text,
            // so the badge is matched inside the results modal.
            page
              .locator('span.rounded-full')
              .filter({ hasText: 'النتائج غير منشورة' })
              .first(),
          ).toBeVisible();
          const totalCell = page
            .locator('span', { hasText: 'إجمالي الطلاب:' })
            .first();
          const finishedCell = page
            .locator('span', { hasText: 'أنهوا الامتحان:' })
            .first();
          await s.expect(totalCell).toContainText(String(resultsSummary.length));
          await s.expect(finishedCell).toContainText(String(finishedCount));

          const studentRow = page
            .locator('table tbody tr')
            .filter({
              has: page.getByRole('cell', {
                name: profile.fullName,
                exact: true,
              }),
            })
            .first();
          await s.expect(studentRow).toHaveCount(1);
          await s.focusOn(studentRow);
          await s.expect(studentRow.locator('td').nth(3)).toContainText('3 / 6');
          await s.expect(studentRow.locator('td').nth(3)).toContainText(
            'بانتظار التصحيح',
          );
          await s.hold(3400);

          s.mark('grade');
          await s.click(
            studentRow.getByRole('button', {
              name: 'تصحيح المقالي',
              exact: true,
            }),
          );
          await s.expect(
            page.getByRole('heading', {
              name: 'تصحيح الإجابات المقالية',
              exact: true,
            }),
          ).toBeVisible();
          await s.expect(
            page.getByText(`${profile.fullName} — 3 / 6`, { exact: true }),
          ).toBeVisible();
          const essay = ordered.find((item) => number(item.type) === 3);
          // The card renders "#3" next to the question text in the same
          // paragraph, so the match is by substring on purpose.
          await s.expect(page.getByText(essay.text).first()).toBeVisible();
          await s.expect(page.getByText('إجابة الطالب', { exact: true })).toBeVisible();
          await s.expect(
            page.getByText(ESSAY_ANSWER, { exact: true }),
          ).toBeVisible();
          await s.expect(page.getByText('الدرجة:', { exact: true })).toBeVisible();
          await s.hold(3200);

          s.mark('essay');
          const markInput = page.locator('input[type="number"]');
          await s.expect(markInput).toHaveCount(1);
          await s.type(markInput, String(ESSAY_MARK));
          await s.expect(markInput).toHaveValue(String(ESSAY_MARK));
          await s.hold(2400);
          await s.click(
            page.getByRole('button', { name: 'حفظ التصحيح', exact: true }),
          );
          await s.expect(
            page.getByText('تم حفظ الدرجات', { exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByRole('heading', {
              name: 'تصحيح الإجابات المقالية',
              exact: true,
            }),
          ).toBeHidden();
          await s.expect(studentRow.locator('td').nth(3)).toContainText('5 / 6');
          await s.expect(studentRow).not.toContainText('بانتظار التصحيح');

          s.mark('publish');
          await s.click(
            page.getByRole('button', {
              name: 'نشر النتائج للطلاب',
              exact: true,
            }),
          );
          await s.expect(
            page.getByText('تم نشر النتائج للطلاب', { exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByText('النتائج منشورة للطلاب', { exact: true }),
          ).toBeVisible();
          await s.expect(
            page.getByRole('button', {
              name: 'إلغاء نشر النتائج',
              exact: true,
            }),
          ).toBeVisible();
          await s.hold(3200);
          await s.click(
            page.getByRole('button', { name: 'إغلاق', exact: true }).last(),
          );
        },
      });
      check.clips.grading = 'recorded';
      check.published = (await getResults(teacher, examId)).find(
        (item) => item.studentId === profile.studentId,
      );
    }

    // -----------------------------------------------------------------------
    // Clip 4: the student opens the result after publishing.
    // -----------------------------------------------------------------------
    if (willResult) {
      const publishedRow = (await getResults(teacher, examId)).find(
        (item) => item.studentId === profile.studentId,
      );
      if (!publishedRow || number(publishedRow.score) !== 5) {
        throw new Error(
          `The result clip needs a published score of 5, got ` +
            `${publishedRow?.score ?? 'none'}.`,
        );
      }
      const examState = await getExam(teacher, examId);
      if (!examState?.isResultsPublished) {
        throw new Error('The result clip needs published results.');
      }
      check.published = publishedRow;
      const percentage = Math.round(
        (number(publishedRow.score) / number(publishedRow.totalMark)) * 100,
      );

      await recordClip({
        browser,
        sceneId: '6',
        clipId: 'scene06-result',
        role: 'student',
        startPath: '/student/results',
        slowMo: 220,
        tailMs: 1200,
        steps: async (s) => {
          const { page } = s;

          await s.hold(700);

          s.mark('result');
          await s.expect(
            page.getByRole('heading', { name: 'نتائجي', exact: true }),
          ).toBeVisible();
          const row = page
            .locator('tbody tr')
            .filter({
              has: page.getByRole('cell', { name: exam.name, exact: true }),
            })
            .first();
          await s.expect(row).toHaveCount(1);
          await s.expect(row.locator('td').nth(2)).toHaveText('5 / 6');
          await s.expect(row.locator('td').nth(3)).toHaveText(`${percentage}%`);
          await s.expect(row.locator('td').nth(5)).toHaveText('مكتمل');
          await s.expect(
            row.getByRole('button', { name: 'مراجعة', exact: true }),
          ).toBeVisible();
          await s.focusOn(row);
          await s.hold(3600);
        },
      });
      check.clips.result = 'recorded';
    }

    // -----------------------------------------------------------------------
    // Same endpoint, after publishing: the score the student page shows must be
    // readable there too. Together with `beforePublish` this proves the result
    // was hidden before the teacher published and visible afterwards.
    // -----------------------------------------------------------------------
    if (willGrade || willResult) {
      const studentApi = await apiLogin('student');
      try {
        const publishedResult = await readStudentResult(studentApi, examId);
        check.afterPublish = publishedResult
          ? {
              score: publishedResult.score,
              totalMark: publishedResult.totalMark,
              isPublished: publishedResult.isPublished,
              hasPendingManualGrading: publishedResult.hasPendingManualGrading,
            }
          : null;
        expect(check.afterPublish?.isPublished).toBe(true);
        expect(number(check.afterPublish?.score)).toBe(FINAL_SCORE);
      } finally {
        await studentApi.dispose();
      }
    }

    for (const clipId of ['scene06-bank', 'scene06-student', 'scene06-grading', 'scene06-result']) {
      const manifestPath = path.join(
        artifactsRoot,
        'raw',
        clipId,
        'clip.json',
      );
      if (!fs.existsSync(manifestPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      check.clips[clipId] = {
        state: check.clips[clipId] ?? 'reused',
        durationMs: manifest.durationMs,
        steps: (manifest.steps ?? []).map((step) => step.id),
        consoleErrors: manifest.consoleErrors?.length ?? 0,
        pageErrors: manifest.pageErrors?.length ?? 0,
      };
    }

    fs.writeFileSync(CHECK_PATH, JSON.stringify(check, null, 2), 'utf8');
  } finally {
    // The exam is this scene's own data. Removing it keeps the next run (and
    // scene 07) on the seeded state; the raw videos are already recorded.
    if (examId) {
      try {
        const response = await teacher.request.delete(
          `/api/V1/QuestionExam/${examId}`,
        );
        if (!response.ok()) {
          // eslint-disable-next-line no-console
          console.warn(
            `[scene06] Exam cleanup returned ${response.status()}: ` +
              `${(await response.text()).slice(0, 200)}`,
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[scene06] Exam cleanup failed: ${error?.message ?? error}`);
      }
    }
    await teacher.dispose();
    await student.dispose();
  }
});
