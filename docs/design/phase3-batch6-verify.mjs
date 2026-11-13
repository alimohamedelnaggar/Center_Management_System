/**
 * Phase 3 - batch 6 (exams, question bank, study notes, student e-exam).
 *
 *   node phase3-batch6-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures that mirror the ASP.NET `Response<T>` envelopes, then
 * drives headless Chrome at every required viewport in light and dark:
 *
 *   /question-bank  -> cards + table + pagination, create dialog, bank questions
 *   /exams          -> cards + table + pagination, exam form, exam results
 *   /notes          -> cards + table + pagination, upload dialog, delete confirm
 *   /student/exams  -> the student exam cards
 *   /student/notes  -> the student note cards
 *   /student/results-> the results table and the review dialog
 *   /student/attempt/:id -> start rules, all three question types with images,
 *                     the single sticky timer/submit/violation header, the
 *                     violation log, and the local draft state.
 *
 * The attempt screen is treated as the sensitive screen: the timer and the
 * submit button must live in ONE sticky header (finding F-023), the fullscreen
 * warning shares that wrapper, every option is >= 44px, and the submit payload
 * keeps the original `{questionId, selectedOptionId, essayAnswer}` shape.
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no overlapping cards, AA contrast, RTL,
 * local fonts, no placeholder text, then 200% text zoom and 200% page zoom.
 * Screenshots go to docs/design/shots/phase3b6/ and the report to
 * docs/design/phase3/batch6-verify.md|json.
 *
 * Narrow a run with:
 *   PHASE3B6_PAGES=exams PHASE3B6_VIEWPORTS=390 PHASE3B6_THEMES=dark
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b6");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b6-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9472;
const APP_PORT = 5206;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const ORIGIN = BASE;

const VIEWPORTS = [
  ["360", 360, 800],
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1280", 1280, 800],
  ["1920", 1920, 1080],
  ["land-844", 844, 390],
];

// Extra sizes for the e-exam sticky-header measurement only (phone with the
// on-screen keyboard open). Not part of the default matrix; opt in with
// PHASE3B6_VIEWPORTS=kb-390.
const KEYBOARD_VIEWPORTS = [
  ["kb-360", 360, 400],
  ["kb-390", 390, 400],
];
const KNOWN_VIEWPORTS = [...VIEWPORTS, ...KEYBOARD_VIEWPORTS];

const ALL_VIEWPORTS = VIEWPORTS.map((v) => v[0]);
// Attempt screens also accept the keyboard-open sizes when explicitly requested.
const ATTEMPT_VIEWPORTS = [
  ...ALL_VIEWPORTS,
  ...KEYBOARD_VIEWPORTS.map((v) => v[0]),
];
const THEMES = ["light", "dark"];

const ALL_MODULES = [
  "attendance",
  "grades",
  "payments",
  "accounting",
  "center_reports",
  "whatsapp",
  "student_portal",
  "parent_portal",
  "question_bank",
  "online_exams",
  "study_notes",
];

const GROUPS = [
  { id: "g1", name: "مجموعة أ" },
  { id: "g2", name: "مجموعة ب" },
];

const YEARS = [
  { id: "y1", name: "الصف الأول الثانوي" },
  { id: "y2", name: "الصف الثاني الثانوي" },
];

const BANK_NAMES = [
  "بنك الرياضيات",
  "بنك العلوم",
  "بنك اللغة العربية",
  "بنك الفيزياء",
  "بنك الكيمياء",
  "بنك الأحياء",
  "بنك التاريخ",
  "بنك الجغرافيا",
  "بنك الفلسفة",
  "بنك اللغة الإنجليزية",
  "بنك الحاسب الآلي",
  "بنك التربية الدينية",
];

const BANKS = BANK_NAMES.map((name, index) => ({
  id: `b${index + 1}`,
  name,
  academicYearName: YEARS[index % YEARS.length].name,
  questionsCount: 4 + index,
}));

const EXAM_NAMES = [
  "امتحان الرياضيات",
  "امتحان العلوم",
  "امتحان اللغة العربية",
  "امتحان الفيزياء",
  "امتحان الكيمياء",
  "امتحان الأحياء",
  "امتحان التاريخ",
  "امتحان الجغرافيا",
  "امتحان الفلسفة",
  "امتحان اللغة الإنجليزية",
  "امتحان الحاسب الآلي",
  "امتحان التربية الدينية",
];

const EXAMS = EXAM_NAMES.map((name, index) => ({
  id: `e${index + 1}`,
  name,
  groupId: GROUPS[index % GROUPS.length].id,
  groupName: GROUPS[index % GROUPS.length].name,
  academicYearId: YEARS[index % YEARS.length].id,
  academicYearName: YEARS[index % YEARS.length].name,
  mode: index % 2 === 0 ? 2 : 1,
  modeName: index % 2 === 0 ? "إلكتروني" : "ورقي",
  examDate: `2026-11-${String(10 + index).padStart(2, "0")}T09:00:00`,
  durationMinutes: 60,
  questionsCount: 8 + index,
  totalMarks: 20,
  isResultsPublished: index === 1,
}));

const NOTES = BANK_NAMES.map((name, index) => ({
  id: `n${index + 1}`,
  title: `مذكرة ${name.replace("بنك ", "")}`,
  description: "شرح ومراجعة نهائية",
  groupNames: [GROUPS[index % GROUPS.length].name],
  fileName: `note-${index + 1}.pdf`,
  fileSize: 2048 + index * 512,
  createdAt: `2026-11-${String(1 + index).padStart(2, "0")}T10:00:00`,
}));

const BANK_QUESTIONS = [
  {
    id: "bq1",
    type: 1,
    typeName: "صح وغلط",
    text: "الشمس نجم.",
    imageName: null,
    mark: 2,
    options: [
      { id: "bqo1", text: "صح", isCorrect: true },
      { id: "bqo2", text: "غلط", isCorrect: false },
    ],
  },
  {
    id: "bq2",
    type: 2,
    typeName: "اختر من متعدد",
    text: "ما أكبر كوكب في المجموعة الشمسية؟",
    imageName: "bank-question.png",
    mark: 2,
    options: [
      { id: "bqo3", text: "عطارد", isCorrect: false },
      { id: "bqo4", text: "المشتري", isCorrect: true },
      { id: "bqo5", text: "زحل", isCorrect: false },
      { id: "bqo6", text: "الأرض", isCorrect: false },
    ],
  },
];

const EXAM_RESULTS = [
  {
    studentId: "s1",
    studentName: "أحمد محمود",
    status: "finished",
    score: 18,
    totalMark: 20,
    hasPendingManualGrading: true,
    attemptId: "attempt-9",
    violationCount: 2,
    violations: [
      { type: "copy", label: "محاولة نسخ", count: 1, lastAt: "2026-11-01T10:00:00" },
      { type: "tab-switch", label: "مغادرة نافذة الامتحان", count: 1, lastAt: "2026-11-01T10:02:00" },
    ],
  },
  {
    studentId: "s2",
    studentName: "منى حسن",
    status: "inprogress",
    score: null,
    totalMark: 20,
    hasPendingManualGrading: false,
    attemptId: null,
    violationCount: 0,
    violations: [],
  },
];

const ATTEMPT = {
  examName: "امتحان العلوم",
  totalMark: 10,
  remainingSeconds: 720,
  violationCount: 0,
  questions: [
    {
      id: "q1",
      type: 1,
      typeName: "صح وغلط",
      text: "الشمس نجم.",
      imageName: null,
      mark: 2,
      options: [
        { id: "o1", text: "صح", isCorrect: true },
        { id: "o2", text: "غلط", isCorrect: false },
      ],
    },
    {
      id: "q2",
      type: 2,
      typeName: "اختر من متعدد",
      text: "ما أكبر كوكب في المجموعة الشمسية؟",
      imageName: "q2.png",
      mark: 2,
      options: [
        { id: "o3", text: "عطارد", isCorrect: false },
        { id: "o4", text: "المشتري", isCorrect: true },
        { id: "o5", text: "زحل", isCorrect: false },
        { id: "o6", text: "الأرض", isCorrect: false },
      ],
    },
    {
      id: "q3",
      type: 3,
      typeName: "مقالي",
      text: "اكتب تعريفًا موجزًا للطاقة.",
      imageName: "q3.png",
      mark: 6,
      options: [],
    },
  ],
};

const STUDENT_EXAMS = [
  {
    examId: "se1",
    name: "امتحان الرياضيات",
    groupName: "مجموعة أ",
    status: "available",
    examDate: "2026-11-20T09:00:00",
    durationMinutes: 60,
    questionsCount: 10,
    totalMarks: 20,
  },
  {
    examId: "se2",
    name: "امتحان العلوم",
    groupName: "مجموعة أ",
    status: "inprogress",
    attemptId: "attempt-2",
    examDate: "2026-11-18T09:00:00",
    durationMinutes: 45,
    questionsCount: 8,
    totalMarks: 20,
  },
  {
    examId: "se3",
    name: "امتحان اللغة العربية",
    groupName: "مجموعة ب",
    status: "finished",
    score: 17,
    scoredTotalMark: 20,
    hasPendingManualGrading: true,
    examDate: "2026-11-01T09:00:00",
    durationMinutes: 60,
    questionsCount: 10,
    totalMarks: 20,
  },
];

const STUDENT_NOTES = [
  {
    id: "sn1",
    title: "مذكرة النحو",
    description: "شرح كامل",
    groupName: "مجموعة أ",
    fileName: "grammar.pdf",
    fileSize: 2048,
    createdAt: "2026-11-01T10:00:00",
  },
  {
    id: "sn2",
    title: "مذكرة البلاغة",
    description: "مراجعة نهائية",
    groupName: "مجموعة ب",
    fileName: "rhetoric.pdf",
    fileSize: 4096,
    createdAt: "2026-11-02T10:00:00",
  },
];

const STUDENT_RESULTS = [
  {
    examId: "e1",
    examName: "امتحان الرياضيات",
    score: 18,
    totalMark: 20,
    isPublished: true,
    hasPendingManualGrading: false,
    submittedAt: "2026-11-01T10:00:00",
  },
  {
    examId: "e2",
    examName: "امتحان العلوم",
    score: 0,
    totalMark: 20,
    isPublished: false,
    hasPendingManualGrading: false,
    submittedAt: "2026-11-02T10:00:00",
  },
];

const PREVIEW = {
  examId: "e1",
  examName: "امتحان الرياضيات",
  score: 18,
  totalMark: 20,
  submittedAt: "2026-11-01T10:00:00",
  hasPendingManualGrading: true,
  questions: [
    {
      id: "pq1",
      order: 1,
      type: 1,
      typeName: "صح وغلط",
      text: "الشمس نجم.",
      imageName: null,
      mark: 2,
      awardedMark: 2,
      isCorrect: true,
      selectedOptionId: "po1",
      essayAnswer: null,
      options: [
        { id: "po1", text: "صح", isCorrect: true },
        { id: "po2", text: "غلط", isCorrect: false },
      ],
    },
    {
      id: "pq2",
      order: 2,
      type: 2,
      typeName: "اختر من متعدد",
      text: "ما أكبر كوكب في المجموعة الشمسية؟",
      imageName: "preview-question.png",
      mark: 2,
      awardedMark: 0,
      isCorrect: false,
      selectedOptionId: "po3",
      essayAnswer: null,
      options: [
        { id: "po3", text: "عطارد", isCorrect: false },
        { id: "po4", text: "المشتري", isCorrect: true },
        { id: "po5", text: "زحل", isCorrect: false },
        { id: "po6", text: "الأرض", isCorrect: false },
      ],
    },
    {
      id: "pq3",
      order: 3,
      type: 3,
      typeName: "مقالي",
      text: "اكتب تعريفًا موجزًا للطاقة.",
      imageName: null,
      mark: 6,
      awardedMark: 4,
      isCorrect: false,
      selectedOptionId: null,
      essayAnswer: "الطاقة هي القدرة على بذل شغل.",
      options: [],
    },
  ],
};

const SCENARIOS = {
  admin: { data: "full", role: "Teacher", centerAdmin: true, centerType: "SoloTeacher" },
  student: { data: "full", role: "Student", centerAdmin: false, centerType: "SoloTeacher" },
};

const PAGES = [
  {
    key: "question-bank",
    path: "/question-bank",
    wait: '[data-testid="question-bank-page"]',
    scenario: "admin",
    scope: "question-bank-page",
    expect: "question-bank",
    viewports: ALL_VIEWPORTS,
    full: true,
  },
  {
    key: "exams",
    path: "/exams",
    wait: '[data-testid="exams-page"]',
    scenario: "admin",
    scope: "exams-page",
    expect: "exams",
    viewports: ALL_VIEWPORTS,
    full: true,
  },
  {
    key: "study-notes",
    path: "/notes",
    wait: '[data-testid="study-notes-page"]',
    scenario: "admin",
    scope: "study-notes-page",
    expect: "study-notes",
    viewports: ALL_VIEWPORTS,
    full: true,
  },
  {
    key: "student-exams",
    path: "/student/exams",
    wait: '[data-testid="student-exams-page"]',
    scenario: "student",
    scope: "student-exams-page",
    expect: "student-exams",
    viewports: ALL_VIEWPORTS,
    full: true,
  },
  {
    key: "student-notes",
    path: "/student/notes",
    wait: '[data-testid="student-notes-page"]',
    scenario: "student",
    scope: "student-notes-page",
    expect: "student-notes",
    viewports: ALL_VIEWPORTS,
    full: true,
  },
  {
    key: "student-results",
    path: "/student/results",
    wait: '[data-testid="student-results-page"]',
    scenario: "student",
    scope: "student-results-page",
    expect: "student-results",
    viewports: ALL_VIEWPORTS,
    full: true,
  },
  {
    key: "attempt-start",
    path: "/student/attempt/attempt-1",
    wait: '[data-testid="student-exam-start"]',
    scenario: "student",
    scope: "student-exam-start",
    expect: "attempt-start",
    viewports: ATTEMPT_VIEWPORTS,
    full: true,
  },
  {
    key: "attempt",
    path: "/student/attempt/attempt-1",
    wait: '[data-testid="student-exam-start"]',
    action: "attempt-start",
    expectWait: '[data-testid="student-exam-attempt"]',
    scenario: "student",
    scope: "student-exam-attempt",
    expect: "attempt",
    viewports: ATTEMPT_VIEWPORTS,
    full: true,
  },
  {
    key: "attempt-dismiss",
    path: "/student/attempt/attempt-1",
    wait: '[data-testid="student-exam-start"]',
    action: "attempt-dismiss",
    expectWait: '[data-testid="student-exam-attempt"]',
    scenario: "student",
    scope: "student-exam-attempt",
    expect: "attempt-dismiss",
    viewports: ["360", "390"],
    full: true,
    extra: true,
  },
  {
    key: "attempt-violations",
    path: "/student/attempt/attempt-1",
    wait: '[data-testid="student-exam-start"]',
    action: "attempt-violations",
    expectWait: '[data-testid="violation-log"]',
    scenario: "student",
    scope: "violation-log",
    expect: "attempt-violations",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "question-bank-modal",
    path: "/question-bank",
    wait: '[data-testid="question-bank-page"]',
    action: "open-bank-modal",
    expectWait: '[data-testid="question-bank-modal"]',
    scenario: "admin",
    scope: "question-bank-modal",
    expect: "bank-modal",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "bank-questions",
    path: "/question-bank",
    wait: '[data-testid="question-bank-page"]',
    action: "open-bank-questions",
    expectWait: '[data-testid="bank-questions-modal"]',
    scenario: "admin",
    scope: "bank-questions-modal",
    expect: "bank-questions",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "exam-form",
    path: "/exams",
    wait: '[data-testid="exams-page"]',
    action: "open-exam-form",
    expectWait: '[data-testid="exam-form-modal"]',
    scenario: "admin",
    scope: "exam-form-modal",
    expect: "exam-form",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "exam-results",
    path: "/exams",
    wait: '[data-testid="exams-page"]',
    action: "open-exam-results",
    expectWait: '[data-testid="exam-results-modal"]',
    scenario: "admin",
    scope: "exam-results-modal",
    expect: "exam-results",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "study-note-modal",
    path: "/notes",
    wait: '[data-testid="study-notes-page"]',
    action: "open-note-modal",
    expectWait: '[data-testid="study-note-modal"]',
    scenario: "admin",
    scope: "study-note-modal",
    expect: "note-modal",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "confirm-modal",
    path: "/question-bank",
    wait: '[data-testid="question-bank-page"]',
    action: "open-delete",
    expectWait: '[data-testid="confirm-modal"]',
    scenario: "admin",
    scope: "confirm-modal",
    expect: "confirm-modal",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
  {
    key: "student-exam-preview",
    path: "/student/results",
    wait: '[data-testid="student-results-page"]',
    action: "open-preview",
    expectWait: '[data-testid="student-exam-preview"]',
    scenario: "student",
    scope: "student-exam-preview",
    expect: "preview",
    viewports: ALL_VIEWPORTS,
    full: false,
  },
];

/* Optional narrowing for fast iterations. */
const list = (value, fallback) => {
  const picked = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return picked.length ? picked : fallback;
};

const RUN_PAGES = list(
  process.env.PHASE3B6_PAGES,
  PAGES.filter((p) => !p.extra).map((p) => p.key),
);
const RUN_VIEWPORTS = list(process.env.PHASE3B6_VIEWPORTS, ALL_VIEWPORTS);
const RUN_THEMES = list(process.env.PHASE3B6_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const b64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const ID_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function makeJwt(scenario) {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    iat: Math.floor(Date.now() / 1000),
    [ROLE_CLAIM]: scenario.role ?? "Teacher",
    [ID_CLAIM]: "43",
    [NAME_CLAIM]: "أ. سارة عبد الله",
    PhoneNumber: "01000000000",
    is_center_admin: scenario.centerAdmin ? "true" : "false",
    pwd_change_required: "false",
    impersonation: "false",
  };
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

let SCENARIO = SCENARIOS.admin;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.admin;
};

const queryOf = (url) => {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams();
  }
};

function pagedFixture(rows, url) {
  const params = queryOf(url);
  const pageNumber = Number(params.get("pageNumber") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  const start = (pageNumber - 1) * pageSize;
  return {
    succeeded: true,
    data: {
      data: rows.slice(start, start + pageSize),
      totalCount: rows.length,
      currentPage: pageNumber,
      totalPages: Math.ceil(rows.length / pageSize),
      pageSize,
    },
  };
}

const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function fixtureFor(url) {
  const lower = url.toLowerCase();

  if (lower.includes("authentication/refresh-token")) {
    return {
      accessToken: makeJwt(SCENARIO),
      mustChangePassword: false,
      enabledModules: ALL_MODULES,
      subscription: null,
    };
  }
  if (lower.includes("profile/getmyprofile")) {
    return ok({
      centerType: SCENARIO.centerType,
      subject: null,
      email: "owner@example.com",
      enabledModules: ALL_MODULES,
      subscription: null,
    });
  }
  if (lower.includes("center/mycenter")) {
    return ok({
      id: 1,
      name: "مركز النور التعليمي",
      logoUrl: null,
      themeColor: "#4F46E5",
      type: SCENARIO.centerType,
    });
  }

  /* ---------- student portal ---------- */
  if (lower.includes("/studentportal/profile")) {
    return ok({
      fullName: "سارة أحمد",
      groups: ["مجموعة أ"],
      studentCode: "ST-1042",
    });
  }
  if (lower.includes("/studentportal/notifications/unread-count")) {
    return ok(2);
  }
  if (lower.includes("/studentportal/notifications")) {
    return ok([]);
  }
  if (/\/studentportal\/exams\/[^/]+\/preview/.test(lower)) {
    return ok(PREVIEW);
  }
  if (/\/studentportal\/exams\/[^/]+\/start/.test(lower)) {
    return ok({ attemptId: "attempt-1" });
  }
  if (lower.includes("/studentportal/exams")) {
    return ok(STUDENT_EXAMS);
  }
  if (lower.includes("/studentportal/notes")) {
    return ok(STUDENT_NOTES);
  }
  if (/\/studentportal\/attempts\/[^/]+\/violation/.test(lower)) {
    return { succeeded: true, message: "تم تسجيل المخالفة" };
  }
  if (/\/studentportal\/attempts\/[^/]+\/submit/.test(lower)) {
    return { succeeded: true, message: "تم تسليم الامتحان بنجاح" };
  }
  if (/\/studentportal\/attempts\/[^/]+/.test(lower)) {
    return ok(ATTEMPT);
  }
  if (lower.includes("/studentportal/results")) {
    return ok(STUDENT_RESULTS);
  }
  if (lower.includes("/studentportal/subscriptions")) return ok([]);
  if (lower.includes("/studentportal/attendance")) return ok([]);
  if (lower.includes("/studentportal/payments")) return ok([]);

  /* ---------- question bank / exams / notes ---------- */
  if (lower.includes("/academicyear/list")) {
    return ok(YEARS);
  }
  if (lower.includes("/group/get-all") || lower.includes("/group/paginated")) {
    return ok(GROUPS);
  }
  if (lower.includes("/questionbank/paginated")) {
    return pagedFixture(BANKS, url);
  }
  if (/\/questionbank\/[^/]+\/questions/.test(lower)) {
    return ok(BANK_QUESTIONS);
  }
  if (lower.includes("/questionexam/paginated")) {
    return pagedFixture(EXAMS, url);
  }
  if (/\/questionexam\/[^/]+\/results/.test(lower)) {
    return ok(EXAM_RESULTS);
  }
  if (/\/questionexam\/[^/]+\/publish/.test(lower)) {
    return { succeeded: true, message: "تم تحديث حالة النشر" };
  }
  if (lower.includes("/studynote/paginated")) {
    return pagedFixture(NOTES, url);
  }

  // Unrelated background calls (including SignalR negotiate) must never hit the
  // real network.
  return ok([]);
}

/* ------------------------------------------------------------------ */
/* CDP                                                                 */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(url, onEvent) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    if (msg.method) {
      try {
        onEvent?.(msg);
      } catch {
        /* event handlers must never break the harness */
      }
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  return {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function waitForHttp(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* keep waiting */
    }
    await sleep(250);
  }
  return false;
}

async function main() {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(SHOTS, { recursive: true });

  const server = spawn(
    process.platform === "win32" ? "cmd.exe" : "npm",
    process.platform === "win32"
      ? ["/c", "npm", "run", "dev", "--", "--port", String(APP_PORT), "--strictPort"]
      : ["run", "dev", "--", "--port", String(APP_PORT), "--strictPort"],
    { cwd: FRONTEND, stdio: ["ignore", "pipe", "pipe"] },
  );
  let serverLog = "";
  server.stdout.on("data", (d) => {
    serverLog += d.toString();
  });
  server.stderr.on("data", (d) => {
    serverLog += d.toString();
  });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--force-device-scale-factor=1",
      "--use-fake-ui-for-media-stream",
      `--user-data-dir=${PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let client;
  try {
    if (!(await waitForHttp(`${BASE}/`))) {
      throw new Error(`Vite dev server did not start on ${APP_PORT}\n${serverLog.slice(-2000)}`);
    }

    let version;
    for (let i = 0; i < 80; i += 1) {
      try {
        version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!version) throw new Error("Chrome did not expose a debugging port");

    const created = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
    ).json();

    const apiLog = [];
    const consoleLog = [];

    const onEvent = async (msg) => {
      if (msg.method === "Runtime.consoleAPICalled") {
        try {
          consoleLog.push({
            type: msg.params.type,
            text: msg.params.args
              .map((arg) => arg.value ?? arg.description ?? "")
              .join(" "),
          });
        } catch {
          /* ignore malformed console events */
        }
        return;
      }
      if (msg.method !== "Fetch.requestPaused") return;
      const { requestId, request } = msg.params;
      apiLog.push({
        method: request.method,
        url: request.url,
        body: request.postData ?? null,
        at: Date.now(),
      });

      const cors = [
        { name: "Access-Control-Allow-Origin", value: ORIGIN },
        { name: "Access-Control-Allow-Credentials", value: "true" },
        {
          name: "Access-Control-Allow-Methods",
          value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        },
        {
          name: "Access-Control-Allow-Headers",
          value:
            "authorization,content-type,accept,origin,x-requested-with,x-signalr-user-agent",
        },
        { name: "Access-Control-Expose-Headers", value: "content-type" },
        { name: "Vary", value: "Origin" },
      ];

      try {
        if (request.method === "OPTIONS") {
          await client.send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 204,
            responseHeaders: cors,
          });
          return;
        }

        // Question images must stay real images: returning JSON here would
        // break every <img> in the exam screen.
        if (/\/images\/questions\//i.test(request.url)) {
          await client.send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 200,
            responseHeaders: [...cors, { name: "Content-Type", value: "image/png" }],
            body: PNG_1PX,
          });
          return;
        }

        const payload = fixtureFor(request.url);

        await client.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [
            ...cors,
            { name: "Content-Type", value: "application/json; charset=utf-8" },
          ],
          body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        });
      } catch {
        try {
          await client.send("Fetch.continueRequest", { requestId });
        } catch {
          /* page may have navigated away */
        }
      }
    };

    client = connect(created.webSocketDebuggerUrl, (msg) => {
      onEvent(msg).catch(() => {});
    });
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Fetch.enable", {
      patterns: [{ urlPattern: "*runasp.net*", requestStage: "Request" }],
    });

    const evaluate = async (expression, awaitPromise = false) => {
      const res = await client.send("Runtime.evaluate", {
        expression,
        awaitPromise,
        returnByValue: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || "evaluate failed");
      }
      return res.result.value;
    };

    let themeScript = null;
    const setTheme = async (theme) => {
      if (themeScript) {
        await client
          .send("Page.removeScriptToEvaluateOnNewDocument", { identifier: themeScript })
          .catch(() => {});
        themeScript = null;
      }
      const { identifier } = await client.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `try { localStorage.setItem("cm-theme", ${JSON.stringify(theme)}); } catch (e) {}`,
      });
      themeScript = identifier;
    };

    const waitForSelector = async (selector, timeout = 15000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return true;
        await sleep(100);
      }
      return false;
    };

    const waitForSwap = async () => {
      for (let i = 0; i < 150; i += 1) {
        const swapped = await evaluate(
          "typeof window.__navToken === 'undefined' && document.readyState === 'complete'",
        );
        if (swapped) return true;
        await sleep(100);
      }
      return false;
    };

    const navigate = async (path, theme, metrics, waits = []) => {
      await setTheme(theme);
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: metrics.width,
        height: metrics.height,
        screenWidth: metrics.width,
        screenHeight: metrics.height,
        deviceScaleFactor: metrics.dsf ?? 1,
        mobile: false,
      });
      await evaluate("window.__navToken = true; true");
      await client.send("Page.navigate", { url: `${BASE}${path}` });
      await waitForSwap();
      for (const selector of waits) {
        await waitForSelector(selector);
      }
      await evaluate("document.fonts.ready.then(() => true)", true);
      await sleep(650);

      const expectedDark = theme === "dark";
      const isDark = await evaluate(
        "document.documentElement.classList.contains('dark')",
      );
      if (isDark !== expectedDark) {
        await evaluate(
          `window.__navToken = true; localStorage.setItem("cm-theme", ${JSON.stringify(theme)}); location.reload();`,
        );
        await waitForSwap();
        for (const selector of waits) {
          await waitForSelector(selector);
        }
        await evaluate("document.fonts.ready.then(() => true)", true);
        await sleep(650);
      }
    };

    const setAuditScope = async (scope) => {
      await evaluate(
        `window.__AUDIT_SCOPE__ = ${scope ? JSON.stringify(scope) : "null"}; true`,
      );
    };

    /* ---- page interactions ---------------------------------------- */

    const clickSelector = async (selector) => {
      const clicked = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) {
        const where = await evaluate(`(() => ({
          href: location.href,
          text: (document.body.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 120),
        }))()`);
        throw new Error(`missing ${selector} at ${where.href} :: ${where.text}`);
      }
    };

    const clickByText = async (rootSelector, text) => {
      const clicked = await evaluate(`(() => {
        const root = ${rootSelector ? `document.querySelector(${JSON.stringify(rootSelector)})` : "document.body"};
        if (!root) return false;
        const wanted = ${JSON.stringify(text)};
        const el = [...root.querySelectorAll("button, a[href], [role='button'], [role='tab'], [role='menuitem']")]
          .find((node) => {
            if (node.getBoundingClientRect().width <= 1) return false;
            return (node.textContent || "").replace(/\\s+/g, " ").trim().includes(wanted);
          });
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`missing button with text "${text}"`);
    };

    const clickFirstVisibleByLabel = async (prefix) => {
      const clicked = await evaluate(`(() => {
        const wanted = ${JSON.stringify(prefix)};
        const el = [...document.querySelectorAll("button[aria-label]")].find((node) => {
          const r = node.getBoundingClientRect();
          if (r.width <= 1 || r.height <= 1) return false;
          return (node.getAttribute("aria-label") || "").startsWith(wanted);
        });
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`missing visible control labelled "${prefix}"`);
    };

    const clickPageNumber = async (n) => {
      let clicked = false;
      for (let attempt = 0; attempt < 40 && !clicked; attempt += 1) {
        clicked = await evaluate(`(() => {
          const nav = document.querySelector('nav[aria-label="ترقيم الصفحات"]');
          if (!nav) return false;
          const el = [...nav.querySelectorAll("button")].find(
            (node) => (node.textContent || "").trim() === ${JSON.stringify(String(n))},
          );
          if (!el) return false;
          el.click();
          return true;
        })()`);
        if (!clicked) await sleep(250);
      }
      if (!clicked) {
        const diag = await evaluate(`(() => {
          const nav = document.querySelector('nav[aria-label="ترقيم الصفحات"]');
          return {
            href: location.href,
            nav: Boolean(nav),
            buttons: nav ? [...nav.querySelectorAll("button")].map((b) => (b.textContent || "").trim()) : [],
            navText: nav ? (nav.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 200) : null,
            rows: document.querySelectorAll("tbody tr").length,
            loading: (document.body.innerText || "").includes("جاري التحميل"),
            text: (document.body.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 300),
            apiCalls: (window.__apiLog || []).slice(-8),
          };
        })()`);
        throw new Error(`missing pagination page ${n} :: ${JSON.stringify(diag)}`);
      }
      await sleep(250);
    };

    const dispatchCopy = async () => {
      await evaluate(`(() => {
        const event = new Event("copy", { bubbles: true, cancelable: true });
        document.dispatchEvent(event);
        return true;
      })()`);
    };

    const applyAction = async (page) => {
      if (!page.action) return;

      if (page.action === "attempt-start") {
        await clickByText(null, "بدء الامتحان");
      } else if (page.action === "attempt-dismiss") {
        await clickByText(null, "بدء الامتحان");
        await waitForSelector('[data-testid="student-exam-attempt"]', 12000);
        await sleep(400);
        const dismissed = await evaluate(`(() => {
          const el = document.querySelector('[data-testid="exam-fullscreen-dismiss"]');
          if (!el) return false;
          el.click();
          return true;
        })()`);
        if (!dismissed) throw new Error("missing fullscreen dismiss control");
        await sleep(400);
      } else if (page.action === "attempt-violations") {
        await clickByText(null, "بدء الامتحان");
        await waitForSelector('[data-testid="student-exam-attempt"]', 12000);
        await sleep(400);
        await dispatchCopy();
        await sleep(700);
        await clickSelector('[data-testid="exam-violation-count"]');
      } else if (page.action === "open-bank-modal") {
        await clickByText(null, "إضافة بنك جديد");
      } else if (page.action === "open-bank-questions") {
        await clickFirstVisibleByLabel("عرض أسئلة ");
      } else if (page.action === "open-exam-form") {
        await clickByText(null, "إنشاء امتحان");
      } else if (page.action === "open-exam-results") {
        await clickFirstVisibleByLabel("نتائج ");
      } else if (page.action === "open-note-modal") {
        await clickByText(null, "إضافة مذكرة");
      } else if (page.action === "open-delete") {
        await clickFirstVisibleByLabel("حذف ");
      } else if (page.action === "open-preview") {
        await clickByText(null, "مراجعة");
      }

      if (page.expectWait) await waitForSelector(page.expectWait, 12000);
      await sleep(page.action === "attempt-start" ? 900 : 500);
    };

    const audit = async (scope) => {
      await setAuditScope(scope);
      return evaluate(AUDIT);
    };

    const screenshot = async (name, { full = false } = {}) => {
      const params = { format: "png", fromSurface: true };
      if (full) {
        const metrics = await client.send("Page.getLayoutMetrics");
        const size = metrics.cssContentSize || metrics.contentSize;
        const width = Math.max(1, Math.ceil(size.width));
        const height = Math.max(1, Math.ceil(size.height));
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width, height, scale: 1 };
      }
      const { data } = await client.send("Page.captureScreenshot", params);
      await writeFile(join(SHOTS, name), Buffer.from(data, "base64"));
    };

    const probeFor = async (page) => {
      await setAuditScope(page.scope);
      return evaluate(`(() => {
        const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
        const textOf = (el) => (el ? (el.textContent || "").replace(/\\s+/g, " ").trim() : "");
        const root = window.__AUDIT_SCOPE__ ? testid(window.__AUDIT_SCOPE__) : document;
        if (!root) return { missingScope: window.__AUDIT_SCOPE__ };
        const q = (sel) => [...root.querySelectorAll(sel)];
        const labels = (sel) => q(sel).map((el) => el.getAttribute("aria-label")).filter(Boolean);
        const rows = (sel) => (root.querySelector(sel) ? root.querySelector(sel).querySelectorAll("tbody tr, li").length : 0);
        const classes = (sel) => (root.querySelector(sel)?.className || "");
        const close = root.querySelector('button[aria-label="إغلاق"]');
        const panel =
          close?.closest('[class*="max-h-[calc(100dvh-2rem)]"]') ??
          close?.parentElement ??
          null;
        const styleOf = (el) => (el ? String(el.className) : "");
        const nav = root.querySelector('nav[aria-label="ترقيم الصفحات"]');
        const cards = (id) => testid(id);
        const header = testid("exam-header");
        const sticky = header?.closest(".sticky") ?? null;
        const questions = q('[data-testid="exam-question"]');
        const optionLabels = q('[data-question-type="1"] label, [data-question-type="2"] label');
        const dialog = root.querySelector("form") ?? panel;
        return {
          text: textOf(root).slice(0, 7000),
          heading: textOf(root.querySelector("h1")),
          startRules: q("li").length,
          cardsCount: root.querySelectorAll('[data-testid$="-cards"] > li').length,
          table: Boolean(root.querySelector("table")),
          tableRows: root.querySelectorAll("tbody tr").length,
          tableHeadings: q("th").map(textOf),
          navText: textOf(nav),
          navOutsideCards: nav && root.querySelector('[data-testid$="-cards"]')
            ? !root.querySelector('[data-testid$="-cards"]').contains(nav)
            : null,
          actionLabels: labels("button[aria-label]"),
          filterLabels: labels("input[aria-label], select[aria-label]"),
          smallButtons: q("button").filter((b) => {
            const r = b.getBoundingClientRect();
            return r.width > 1 && r.height > 1 && (r.width < 43.5 || r.height < 43.5);
          }).map((b) => ({ label: b.getAttribute("aria-label") || textOf(b).slice(0, 20), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) })),
          modal: close
            ? {
                closeClass: String(close.className),
                closeLabel: close.getAttribute("aria-label"),
                panelClass: String(panel?.className || ""),
                title: textOf(root.querySelector("h2, h3")).slice(0, 160),
                formClass: styleOf(dialog),
                inputs: q("input").map((el) => ({ type: el.type, cls: String(el.className), value: el.value })),
                selects: q("select").map((el) => ({ cls: String(el.className), value: el.value })),
                textareaClass: styleOf(root.querySelector("textarea")),
                buttons: q("button").map((el) => ({ label: el.getAttribute("aria-label") || "", text: textOf(el).slice(0, 30), cls: String(el.className) })),
              }
            : null,
          attempt: header
            ? {
                stickyCount: document.querySelectorAll(".sticky.top-0").length,
                stickyHeight: sticky ? Math.round(sticky.getBoundingClientRect().height) : 0,
                stickyRatio: sticky
                  ? Math.round((sticky.getBoundingClientRect().height / window.innerHeight) * 1000) / 10
                  : 0,
                warningHeight: testid("exam-fullscreen-warning")
                  ? Math.round(testid("exam-fullscreen-warning").getBoundingClientRect().height)
                  : 0,
                viewportHeight: window.innerHeight,
                stickyClass: String(sticky?.className || ""),
                warningPresent: Boolean(testid("exam-fullscreen-warning")),
                warningInsideSticky: Boolean(testid("exam-fullscreen-warning") && sticky?.contains(testid("exam-fullscreen-warning"))),
                inlineFullscreen: Boolean(testid("exam-fullscreen-inline")),
                offlineNote: Boolean(testid("exam-offline-note")),
                headerHasTimer: Boolean(header.contains(testid("exam-timer"))),
                headerHasSubmit: Boolean(header.contains(testid("exam-submit"))),
                timer: textOf(testid("exam-timer")),
                submit: textOf(testid("exam-submit")),
                violationCount: textOf(testid("exam-violation-count")),
                draftState: textOf(testid("exam-draft-state")),
                questionTypes: questions.map((el) => el.dataset.questionType),
                questionTexts: questions.map((el) => textOf(el).slice(0, 80)),
                images: q('[data-testid="exam-question"] img').map((el) => el.getAttribute("src")),
                optionCount: optionLabels.length,
                optionMinHeights: optionLabels.map((el) => Math.round(el.getBoundingClientRect().height)),
                hasTextarea: Boolean(root.querySelector("textarea")),
                startRules: q("li").length,
              }
            : null,
          log: testid("violation-log")
            ? {
                text: textOf(testid("violation-log")).slice(0, 1200),
                items: q('[data-testid="violation-log-list"] li').length,
              }
            : null,
          errors: [],
        };
      })()`);
    };

    const runPage = async (page, viewport, theme) => {
      const [id, width, height] = viewport;
      setScenario(page.scenario);
      await navigate(page.path, theme, { width, height }, [page.wait]);
      await applyAction(page);
      await audit(page.scope);
      await sleep(200);
      const result = await audit(page.scope);
      const probe = await probeFor(page);
      await screenshot(`${page.key}-${id}-${theme}.png`, { full: page.full });
      return {
        page: page.key,
        id,
        width,
        height,
        theme,
        ...result,
        probe,
      };
    };

    const runs = [];
    const failures = [];
    const probes = {};

    for (const page of pages) {
      const viewports = KNOWN_VIEWPORTS.filter((v) => page.viewports.includes(v[0])).filter(
        (v) => RUN_VIEWPORTS.includes(v[0]),
      );
      for (const viewport of viewports) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          let run;
          const tag = `${page.key} ${viewport[0]} ${theme}`;
          try {
            run = await runPage(page, viewport, theme);
          } catch (error) {
            failures.push(`${tag}: ${error.message}`);
            continue;
          }
          runs.push(run);

          if (run.missingScope) {
            failures.push(`${tag}: audit scope "${run.missingScope}" is not on stage`);
            continue;
          }
          if (run.overflowX > 1)
            failures.push(`${tag}: horizontal page scroll ${run.overflowX}px`);
          if (run.outsideCount)
            failures.push(
              `${tag}: ${run.outsideCount} element(s) outside the viewport (${run.outside
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls}`)
                .join(", ")})`,
            );
          if (run.smallCount)
            failures.push(
              `${tag}: ${run.smallCount} tap target(s) under 44px (${run.small
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.w}x${s.h} ${s.text}`)
                .join(", ")})`,
            );
          if (run.primaryCount)
            failures.push(
              `${tag}: ${run.primaryCount} primary text node(s) under 14px (${run.primary
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.fs}px ${s.text}`)
                .join(", ")})`,
            );
          if (run.clippedCount)
            failures.push(
              `${tag}: ${run.clippedCount} clipped text box(es) (${run.clipped
                .slice(0, 3)
                .map((s) => `${s.tag}.${s.cls} ${s.axis}+${s.by}px`)
                .join(", ")})`,
            );
          if (run.coveredCount)
            failures.push(`${tag}: ${run.coveredCount} covered interactive control(s)`);
          if (run.overlapCount)
            failures.push(`${tag}: ${run.overlapCount} overlapping card/section pair(s)`);
          if (run.dir !== "rtl") failures.push(`${tag}: document direction is not rtl`);
          if (!run.fonts.tajawal) failures.push(`${tag}: Tajawal not loaded`);
          if (!run.fonts.manrope) failures.push(`${tag}: Manrope not loaded`);
          if (run.contrastLow.length)
            failures.push(
              `${tag}: ${run.contrastLow.length} contrast failure(s) (${run.contrastLow
                .slice(0, 3)
                .map((c) => `${c.ratio}:1 ${c.fs}px "${c.text}"`)
                .join(", ")})`,
            );
          if (run.badText.length)
            failures.push(`${tag}: placeholder text (${run.badText.join(", ")})`);

          const p = run.probe || {};
          const text = p.text || "";

          if (page.expect === "question-bank") {
            if (!text.includes("بنك الأسئلة")) failures.push(`${tag}: question bank heading is missing`);
            if (!p.cardsCount) failures.push(`${tag}: question bank cards are missing`);
            if (!p.table) failures.push(`${tag}: question bank table is missing`);
            if (p.tableRows !== 10) failures.push(`${tag}: ${p.tableRows} bank rows, expected 10`);
            if (!text.includes("بنك الرياضيات")) failures.push(`${tag}: first bank is missing`);
            if (!text.includes("الصف الأول الثانوي")) failures.push(`${tag}: academic year is missing`);
            if (!p.navText.includes("12")) failures.push(`${tag}: pagination total is missing`);
            if (p.navOutsideCards !== true) failures.push(`${tag}: pagination is inside the cards`);
            for (const label of ["بحث باسم البنك", "السنة الدراسية"]) {
              if (!(p.filterLabels || []).includes(label))
                failures.push(`${tag}: filter "${label}" is missing`);
            }
            if (!(p.actionLabels || []).some((l) => l.startsWith("عرض أسئلة ")))
              failures.push(`${tag}: questions action is missing`);
          }

          if (page.expect === "exams") {
            if (!text.includes("الامتحانات")) failures.push(`${tag}: exams heading is missing`);
            if (!p.cardsCount) failures.push(`${tag}: exam cards are missing`);
            if (!p.table) failures.push(`${tag}: exam table is missing`);
            if (p.tableRows !== 10) failures.push(`${tag}: ${p.tableRows} exam rows, expected 10`);
            if (!text.includes("امتحان الرياضيات")) failures.push(`${tag}: first exam is missing`);
            if (!text.includes("إلكتروني")) failures.push(`${tag}: exam mode is missing`);
            if (!p.navText.includes("12")) failures.push(`${tag}: pagination total is missing`);
            if (p.navOutsideCards !== true) failures.push(`${tag}: pagination is inside the cards`);
            for (const label of [
              "بحث باسم الامتحان",
              "المجموعة",
              "السنة الدراسية",
              "نوع الامتحان",
              "حالة النشر",
              "من تاريخ",
              "إلى تاريخ",
            ]) {
              if (!(p.filterLabels || []).includes(label))
                failures.push(`${tag}: filter "${label}" is missing`);
            }
            if (!(p.actionLabels || []).some((l) => l.startsWith("نتائج ")))
              failures.push(`${tag}: results action is missing`);
          }

          if (page.expect === "study-notes") {
            if (!text.includes("المذكرات")) failures.push(`${tag}: notes heading is missing`);
            if (!p.cardsCount) failures.push(`${tag}: note cards are missing`);
            if (!p.table) failures.push(`${tag}: note table is missing`);
            if (p.tableRows !== 10) failures.push(`${tag}: ${p.tableRows} note rows, expected 10`);
            if (!text.includes("مذكرة الرياضيات")) failures.push(`${tag}: first note is missing`);
            if (!p.navText.includes("12")) failures.push(`${tag}: pagination total is missing`);
            if (p.navOutsideCards !== true) failures.push(`${tag}: pagination is inside the cards`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("تحميل ")))
              failures.push(`${tag}: download action is missing`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("حذف ")))
              failures.push(`${tag}: delete action is missing`);
          }

          if (page.expect === "student-exams") {
            if (!text.includes("امتحاناتي")) failures.push(`${tag}: student exams heading is missing`);
            if (!text.includes("امتحان الرياضيات")) failures.push(`${tag}: available exam is missing`);
            if (!text.includes("استكمال الامتحان")) failures.push(`${tag}: resume action is missing`);
            if (!text.includes("عرض النتائج")) failures.push(`${tag}: results action is missing`);
            if (!text.includes("15 دقيقة") && !text.includes("المدة 45 دقيقة"))
              failures.push(`${tag}: exam duration is missing`);
          }

          if (page.expect === "student-notes") {
            if (!text.includes("المذكرات")) failures.push(`${tag}: student notes heading is missing`);
            if (!text.includes("مذكرة النحو")) failures.push(`${tag}: first student note is missing`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("تحميل ")))
              failures.push(`${tag}: download action is missing`);
          }

          if (page.expect === "student-results") {
            if (!text.includes("نتائجي")) failures.push(`${tag}: results heading is missing`);
            if (!text.includes("امتحان الرياضيات")) failures.push(`${tag}: result row is missing`);
            if (!text.includes("بانتظار النشر")) failures.push(`${tag}: unpublished status is missing`);
            if (!p.tableRows) failures.push(`${tag}: results table is empty`);
            if (!text.includes("مراجعة")) failures.push(`${tag}: review action is missing`);
          }

          if (page.expect === "attempt-start") {
            if (!text.includes("امتحان العلوم")) failures.push(`${tag}: exam name is missing`);
            if (!text.includes("بدء الامتحان")) failures.push(`${tag}: start button is missing`);
            if (!text.includes("قواعد الامتحان")) failures.push(`${tag}: rules heading is missing`);
            if ((p.startRules ?? 0) < 3) failures.push(`${tag}: exam rules are missing`);
          }

          if (page.expect === "attempt") {
            const a = p.attempt;
            if (a) {
              probes.attemptHeader = probes.attemptHeader || {};
              probes.attemptHeader[`${viewport[0]} ${theme}`] = {
                viewportHeight: a.viewportHeight,
                stickyHeight: a.stickyHeight,
                ratio: a.stickyRatio,
                warningPresent: a.warningPresent,
                warningHeight: a.warningHeight,
                inlineFullscreen: a.inlineFullscreen,
              };
            }
            if (!a) {
              failures.push(`${tag}: exam attempt header is missing`);
            } else {
              if (a.stickyCount !== 1)
                failures.push(`${tag}: ${a.stickyCount} sticky top-0 wrappers (F-023 expects 1)`);
              if (!a.warningPresent && !a.inlineFullscreen)
                failures.push(`${tag}: fullscreen indicator is missing`);
              if (a.warningPresent && !a.warningInsideSticky)
                failures.push(`${tag}: fullscreen warning is outside the sticky header`);
              if (a.viewportHeight < 520 && a.stickyRatio > 20)
                failures.push(
                  `${tag}: sticky header is ${a.stickyRatio}% of the ${a.viewportHeight}px viewport (limit 20%)`,
                );
              if (!a.headerHasTimer) failures.push(`${tag}: timer is outside the header`);
              if (!a.headerHasSubmit) failures.push(`${tag}: submit is outside the header`);
              if (!/^(12:00|11:5\d)$/.test(a.timer)) failures.push(`${tag}: timer is "${a.timer}"`);
              if (!a.submit.includes("تسليم")) failures.push(`${tag}: submit button text is missing`);
              if (!text.includes("الشمس نجم.")) failures.push(`${tag}: true/false question is missing`);
              if (!text.includes("ما أكبر كوكب")) failures.push(`${tag}: multiple choice is missing`);
              if (!text.includes("اكتب تعريفًا")) failures.push(`${tag}: essay question is missing`);
              if (!a.hasTextarea) failures.push(`${tag}: essay textarea is missing`);
              if (JSON.stringify(a.questionTypes) !== JSON.stringify(["1", "2", "3"]))
                failures.push(`${tag}: question types are ${JSON.stringify(a.questionTypes)}`);
              if (a.images.length !== 2)
                failures.push(`${tag}: ${a.images.length} question images, expected 2`);
              if (a.optionCount !== 6)
                failures.push(`${tag}: ${a.optionCount} option labels, expected 6`);
              if (a.optionMinHeights.some((h) => h < 43.5))
                failures.push(`${tag}: option targets ${JSON.stringify(a.optionMinHeights)} under 44px`);
              if (a.violationCount !== "0")
                failures.push(`${tag}: violation count starts at "${a.violationCount}"`);
              if (!a.draftState) failures.push(`${tag}: draft state is missing`);
            }
          }

          if (page.expect === "attempt-violations") {
            if (!p.log) {
              failures.push(`${tag}: violation log did not open`);
            } else {
              if (p.log.items !== 1) failures.push(`${tag}: ${p.log.items} violation rows, expected 1`);
              if (!p.log.text.includes("محاولة نسخ"))
                failures.push(`${tag}: copied violation label is missing`);
              if (!p.log.text.includes("إجمالي المخالفات"))
                failures.push(`${tag}: violation total is missing`);
            }
          }

          if (page.expect === "bank-modal") {
            if (!p.modal) {
              failures.push(`${tag}: question bank dialog is missing`);
            } else {
              if (!p.modal.panelClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: question bank dialog is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: dialog close button is not 44px`);
              if (!text.includes("إضافة بنك")) failures.push(`${tag}: dialog title is missing`);
            }
          }

          if (page.expect === "bank-questions") {
            if (!p.modal) {
              failures.push(`${tag}: bank questions dialog is missing`);
            } else {
              if (!p.modal.panelClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: bank questions dialog is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: bank questions close is not 44px`);
              if (!text.includes("بنك الرياضيات")) failures.push(`${tag}: bank name is missing`);
              if (!text.includes("2 سؤال")) failures.push(`${tag}: question count is missing`);
              if (!text.includes("الشمس نجم.")) failures.push(`${tag}: first question is missing`);
              if (!text.includes("المشتري")) failures.push(`${tag}: options are missing`);
            }
          }

          if (page.expect === "exam-form") {
            if (!p.modal) {
              failures.push(`${tag}: exam form dialog is missing`);
            } else {
              if (!p.modal.panelClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: exam form is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: exam form close is not 44px`);
              if (!text.includes("إنشاء امتحان")) failures.push(`${tag}: exam form title is missing`);
              if (!text.includes("اسم الامتحان")) failures.push(`${tag}: exam name field is missing`);
              if (!text.includes("المجموعة")) failures.push(`${tag}: group field is missing`);
            }
          }

          if (page.expect === "exam-results") {
            if (!p.modal) {
              failures.push(`${tag}: exam results dialog is missing`);
            } else {
              if (!p.modal.panelClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: exam results dialog is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: exam results close is not 44px`);
              if (!text.includes("نتائج الامتحان")) failures.push(`${tag}: results title is missing`);
              if (!text.includes("أحمد محمود")) failures.push(`${tag}: student row is missing`);
              if (!text.includes("18")) failures.push(`${tag}: score is missing`);
              if (!text.includes("عليهم مخالفات")) failures.push(`${tag}: violation summary is missing`);
            }
          }

          if (page.expect === "note-modal") {
            if (!p.modal) {
              failures.push(`${tag}: note dialog is missing`);
            } else {
              if (!p.modal.formClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: note dialog is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: note dialog close is not 44px`);
              if (!text.includes("إضافة مذكرة")) failures.push(`${tag}: note dialog title is missing`);
              if (!text.includes("الرجاء إرفاق ملف المذكرة") && !text.includes("الملف"))
                failures.push(`${tag}: file field is missing`);
            }
          }

          if (page.expect === "confirm-modal") {
            if (!p.modal) {
              failures.push(`${tag}: confirm dialog is missing`);
            } else {
              if (!p.modal.panelClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: confirm dialog is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: confirm close is not 44px`);
              if (!text.includes("بنك الرياضيات")) failures.push(`${tag}: delete target is missing`);
              if (!text.includes("هل أنت متأكد")) failures.push(`${tag}: confirm message is missing`);
            }
          }

          if (page.expect === "preview") {
            if (!p.modal) {
              failures.push(`${tag}: preview dialog is missing`);
            } else {
              if (!p.modal.panelClass.includes("max-h-[calc(100dvh-2rem)]"))
                failures.push(`${tag}: preview dialog is not viewport-capped`);
              if (!p.modal.closeClass.includes("h-11"))
                failures.push(`${tag}: preview close is not 44px`);
              if (!text.includes("مراجعة الامتحان")) failures.push(`${tag}: preview title is missing`);
              if (!text.includes("18 / 20")) failures.push(`${tag}: preview score is missing`);
              if (!text.includes("الطاقة هي القدرة")) failures.push(`${tag}: essay answer is missing`);
              if (!text.includes("الشمس نجم.")) failures.push(`${tag}: first preview question is missing`);
            }
          }
        }
      }
    }

    /* ---------- live behaviour probes ---------- */

    const lastCall = (needle) =>
      [...apiLog].reverse().find((call) => call.url.toLowerCase().includes(needle));
    const hasPage = (key) => pages.some((p) => p.key === key);

    if (hasPage("question-bank")) {
    setScenario("admin");
    await navigate("/question-bank", "light", { width: 1280, height: 800 }, [
      '[data-testid="question-bank-page"]',
    ]);
    const bankOne = await probeFor(PAGES.find((p) => p.key === "question-bank"));
    await clickPageNumber(2);
    await sleep(1000);
    const bankTwo = await probeFor(PAGES.find((p) => p.key === "question-bank"));
    const bankCall = lastCall("/questionbank/paginated");
    probes.questionBankPagination = {
      before: bankOne.tableRows,
      after: bankTwo.tableRows,
      pageTwoUrl: bankCall?.url ?? null,
      firstAfter: (bankTwo.text.match(/بنك الحاسب الآلي|بنك التربية الدينية/) || [])[0] ?? null,
    };
    if (bankOne.tableRows !== 10 || bankTwo.tableRows !== 2)
      failures.push(`bank probe: rows ${bankOne.tableRows} -> ${bankTwo.tableRows}, expected 10 -> 2`);
    if (!/pageNumber=2/.test(bankCall?.url || ""))
      failures.push(`bank probe: page 2 request was not sent`);
    }

    if (hasPage("exams")) {
    setScenario("admin");
    await navigate("/exams", "light", { width: 1280, height: 800 }, [
      '[data-testid="exams-page"]',
    ]);
    const examOne = await probeFor(PAGES.find((p) => p.key === "exams"));
    await clickPageNumber(2);
    await sleep(1000);
    const examTwo = await probeFor(PAGES.find((p) => p.key === "exams"));
    const examCall = lastCall("/questionexam/paginated");
    probes.examPagination = {
      before: examOne.tableRows,
      after: examTwo.tableRows,
      pageTwoUrl: examCall?.url ?? null,
    };
    if (examOne.tableRows !== 10 || examTwo.tableRows !== 2)
      failures.push(`exam probe: rows ${examOne.tableRows} -> ${examTwo.tableRows}, expected 10 -> 2`);
    if (!/pageNumber=2/.test(examCall?.url || ""))
      failures.push(`exam probe: page 2 request was not sent`);
    }

    if (hasPage("study-notes")) {
    setScenario("admin");
    await navigate("/notes", "light", { width: 1280, height: 800 }, [
      '[data-testid="study-notes-page"]',
    ]);
    const notesOne = await probeFor(PAGES.find((p) => p.key === "study-notes"));
    await clickPageNumber(2);
    await sleep(1200);
    const notesTwo = await probeFor(PAGES.find((p) => p.key === "study-notes"));
    const notesCall = lastCall("/studynote/paginated");
    probes.notesPagination = {
      before: notesOne.tableRows,
      after: notesTwo.tableRows,
      pageTwoUrl: notesCall?.url ?? null,
    };
    if (notesOne.tableRows !== 10 || notesTwo.tableRows !== 2)
      failures.push(`notes probe: rows ${notesOne.tableRows} -> ${notesTwo.tableRows}, expected 10 -> 2`);
    if (!/pageNumber=2/.test(notesCall?.url || ""))
      failures.push(`notes probe: page 2 request was not sent`);
    }

    if (hasPage("attempt")) {
    setScenario("student");
    await navigate("/student/attempt/attempt-1", "light", { width: 1280, height: 800 }, [
      '[data-testid="student-exam-start"]',
    ]);
    await clickByText(null, "بدء الامتحان");
    await waitForSelector('[data-testid="student-exam-attempt"]', 15000);
    await sleep(900);

    await evaluate(`(() => {
      const radio = document.querySelector('input[name="question-q1"]');
      if (radio) radio.click();
      const essay = document.querySelector('[data-question-type="3"] textarea');
      if (essay) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(essay, "إجابة تجريبية");
        essay.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return true;
    })()`);
    await sleep(1400);

    const draftKey = "exam-draft:attempt-1";
    const draft = await evaluate(`(() => {
      const raw = localStorage.getItem(${JSON.stringify(draftKey)});
      const state = document.querySelector('[data-testid="exam-draft-state"]');
      return { raw, state: state ? state.textContent.trim() : null };
    })()`);
    const parsedDraft = draft.raw ? JSON.parse(draft.raw) : null;
    probes.attemptDraft = {
      state: draft.state,
      hasDraft: Boolean(draft.raw),
      trueFalse: parsedDraft?.answers?.q1?.selectedOptionId ?? null,
      essay: parsedDraft?.answers?.q3?.essayAnswer ?? null,
    };
    if (!draft.raw) failures.push(`attempt probe: no local draft was written`);
    if (parsedDraft?.answers?.q1?.selectedOptionId !== "o1")
      failures.push(`attempt probe: true/false answer was not drafted`);
    if (parsedDraft?.answers?.q3?.essayAnswer !== "إجابة تجريبية")
      failures.push(`attempt probe: essay answer was not drafted`);
    if (!String(draft.state || "").includes("حفظ تلقائي"))
      failures.push(`attempt probe: saved state is "${draft.state}"`);

    await evaluate(`(() => { window.dispatchEvent(new Event("offline")); return true; })()`);
    await sleep(600);
    const offline = await evaluate(`(() => {
      const state = document.querySelector('[data-testid="exam-draft-state"]');
      const note = document.querySelector('[data-testid="exam-offline-note"]');
      return {
        state: state ? state.textContent.trim() : null,
        draft: Boolean(localStorage.getItem(${JSON.stringify(draftKey)})),
        note: Boolean(note),
        noteText: note ? note.textContent.replace(/\\s+/g, " ").trim() : null,
      };
    })()`);
    probes.attemptOffline = offline;
    if (!String(offline.state || "").includes("غير متصل"))
      failures.push(`attempt probe: offline state is "${offline.state}"`);
    if (!offline.note)
      failures.push(`attempt probe: the offline note is missing`);
    if (!offline.draft) failures.push(`attempt probe: the local draft was lost offline`);

    await clickSelector('[data-testid="exam-submit"]');
    await waitForSelector('[data-testid="confirm-modal"]', 10000);
    await sleep(400);
    await clickByText('[data-testid="confirm-modal"]', "تسليم");
    await sleep(1200);

    const submitCall = lastCall("/submit");
    let submitBody = null;
    try {
      submitBody = submitCall?.body ? JSON.parse(submitCall.body) : null;
    } catch {
      submitBody = submitCall?.body ?? null;
    }
    const afterSubmit = await evaluate(`(() => ({
      path: location.pathname,
      draft: Boolean(localStorage.getItem(${JSON.stringify(draftKey)})),
      results: Boolean(document.querySelector('[data-testid="student-results-page"]')),
    }))()`);
    probes.attemptSubmit = { url: submitCall?.url ?? null, body: submitBody, ...afterSubmit };
    if (!submitCall) failures.push(`attempt probe: submit request was not sent`);
    if (!Array.isArray(submitBody) || submitBody.length !== 3)
      failures.push(`attempt probe: submit payload has ${Array.isArray(submitBody) ? submitBody.length : "no"} answers`);
    else {
      const first = submitBody[0] || {};
      const last = submitBody[2] || {};
      if (first.questionId !== "q1" || first.selectedOptionId !== "o1" || first.essayAnswer !== null)
        failures.push(`attempt probe: true/false payload is ${JSON.stringify(first)}`);
      if (last.questionId !== "q3" || last.selectedOptionId !== null || last.essayAnswer !== "إجابة تجريبية")
        failures.push(`attempt probe: essay payload is ${JSON.stringify(last)}`);
    }
    if (afterSubmit.draft) failures.push(`attempt probe: draft survived submit`);
    if (afterSubmit.path !== "/student/results")
      failures.push(`attempt probe: landed on ${afterSubmit.path}, expected /student/results`);
    }

    if (hasPage("attempt-violations")) {
    setScenario("student");
    await navigate("/student/attempt/attempt-1", "light", { width: 1280, height: 800 }, [
      '[data-testid="student-exam-start"]',
    ]);
    await clickByText(null, "بدء الامتحان");
    await waitForSelector('[data-testid="student-exam-attempt"]', 15000);
    await sleep(500);
    await dispatchCopy();
    await sleep(900);
    const violationCall = lastCall("/violation");
    const violationState = await evaluate(`(() => {
      const count = document.querySelector('[data-testid="exam-violation-count"]');
      const log = document.querySelector('[data-testid="violation-log"]');
      return {
        count: count ? count.textContent.trim() : null,
        logOpen: Boolean(log),
        logText: log ? log.textContent.replace(/\\s+/g, " ").trim().slice(0, 400) : null,
      };
    })()`);
    probes.attemptViolation = {
      url: violationCall?.url ?? null,
      body: violationCall?.body ?? null,
      ...violationState,
    };
    if (!violationCall) failures.push(`violation probe: report request was not sent`);
    if (violationState.count !== "1")
      failures.push(`violation probe: counter is "${violationState.count}"`);
    await clickSelector('[data-testid="exam-violation-count"]');
    await waitForSelector('[data-testid="violation-log"]', 10000);
    await sleep(400);
    const violationLog = await evaluate(`(() => {
      const log = document.querySelector('[data-testid="violation-log"]');
      return log ? log.textContent.replace(/\\s+/g, " ").trim().slice(0, 700) : null;
    })()`);
    probes.attemptViolationLog = violationLog;
    if (!String(violationLog || "").includes("محاولة نسخ"))
      failures.push(`violation probe: log does not list the copied violation`);
    }

    if (hasPage("student-exam-preview")) {
    setScenario("student");
    await navigate("/student/results", "light", { width: 1280, height: 800 }, [
      '[data-testid="student-results-page"]',
    ]);
    await clickByText(null, "مراجعة");
    await waitForSelector('[data-testid="student-exam-preview"]', 10000);
    await sleep(600);
    const preview = await evaluate(`(() => {
      const root = document.querySelector('[data-testid="student-exam-preview"]');
      const text = root ? root.textContent.replace(/\\s+/g, " ").trim() : "";
      return {
        open: Boolean(root),
        text: text.slice(0, 1200),
        score: (text.match(/18\\s*\\/\\s*20/) || [])[0] ?? null,
        essay: text.includes("الطاقة هي القدرة"),
        images: root ? root.querySelectorAll("img").length : 0,
      };
    })()`);
    probes.studentPreview = preview;
    if (!preview.open) failures.push(`preview probe: dialog did not open`);
    if (!preview.score) failures.push(`preview probe: score 18 / 20 is missing`);
    if (!preview.essay) failures.push(`preview probe: the essay answer is missing`);
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "question-bank", scenario: "admin", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "exams", scenario: "admin", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "study-notes", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "student-exams", scenario: "student", sizes: [["390", 390, 844]] },
      { key: "student-notes", scenario: "student", sizes: [["390", 390, 844]] },
      { key: "student-results", scenario: "student", sizes: [["390", 390, 844]] },
      { key: "attempt-start", scenario: "student", sizes: [["390", 390, 844]] },
      { key: "attempt", scenario: "student", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "attempt-violations", scenario: "student", sizes: [["390", 390, 844]] },
      { key: "question-bank-modal", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "bank-questions", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "exam-form", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "exam-results", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "study-note-modal", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "confirm-modal", scenario: "admin", sizes: [["390", 390, 844]] },
      { key: "student-exam-preview", scenario: "student", sizes: [["390", 390, 844]] },
    ].filter((t) => RUN_PAGES.includes(t.key));
    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;
      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(target.scenario);
          await navigate(page.path, theme, { width, height }, [page.wait]);
          try {
            await applyAction(page);
          } catch (error) {
            failures.push(`text200 ${target.key} ${id} ${theme}: ${error.message}`);
            continue;
          }
          await sleep(300);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const result = await audit(page.scope);
          const wide =
            result.overflowX > 1
              ? await evaluate(`(() => {
                  const scope = document.querySelector('[data-testid="${page.scope}"]');
                  if (!scope) return [];
                  window.__wideInfo = (() => {
                    const info = (sel) => {
                      const el = document.querySelector(sel);
                      if (!el) return null;
                      const r = el.getBoundingClientRect();
                      return {
                        sel,
                        cls: String(el.className).slice(0, 60),
                        left: Math.round(r.left),
                        right: Math.round(r.right),
                        w: Math.round(r.width),
                        cw: el.clientWidth,
                        sw: el.scrollWidth,
                        ovx: getComputedStyle(el).overflowX,
                      };
                    };
                    return {
                      scrollX: Math.round(window.scrollX),
                      innerWidth: window.innerWidth,
                      docClientWidth: document.documentElement.clientWidth,
                      matches768: matchMedia("(min-width: 768px)").matches,
                      matches48em: matchMedia("(min-width: 48em)").matches,
                      asideClass: document.querySelector(".app-sidebar")?.className ?? null,
                      dir: getComputedStyle(document.documentElement).direction,
                      de: info("html"),
                      body: info("body"),
                      shell: info(".app-shell"),
                      main: info(".app-main"),
                      outlet: info(".app-main > *:last-child"),
                      shellChildren: [...document.querySelectorAll(".app-shell > *")].map(
                        (el) => {
                          const r = el.getBoundingClientRect();
                          const cs = getComputedStyle(el);
                          return {
                            tag: el.tagName,
                            id: el.id,
                            cls: String(el.className).slice(0, 50),
                            display: cs.display,
                            position: cs.position,
                            flex: cs.flex,
                            left: Math.round(r.left),
                            right: Math.round(r.right),
                            w: Math.round(r.width),
                          };
                        },
                      ),
                    };
                  })();
                  return [...scope.querySelectorAll("*")]
                    .map((el) => {
                      const r = el.getBoundingClientRect();
                      return {
                        tag: el.tagName,
                        cls: String(el.className).slice(0, 70),
                        left: Math.round(r.left),
                        right: Math.round(r.right),
                        w: Math.round(r.width),
                        text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 20),
                      };
                    })
                    .filter(
                      (el) =>
                        el.right > window.innerWidth + 1 ||
                        el.left < -1 ||
                        el.w > window.innerWidth + 1,
                    )
                    .slice(0, 12);
                })()`)
              : null;
          const wideInfo = wide ? await evaluate("window.__wideInfo") : null;
          textZoom.push({ page: target.key, id, width, height, theme, ...result, wide, wideInfo });
          await screenshot(`${target.key}-${id}-${theme}-text200.png`);

          const tag = `text200 ${target.key} ${id} ${theme}`;
          if (result.missingScope) failures.push(`${tag}: scope missing`);
          if (result.overflowX > 1)
            failures.push(`${tag}: horizontal page scroll ${result.overflowX}px`);
          if (result.outsideCount)
            failures.push(`${tag}: ${result.outsideCount} element(s) outside the viewport`);
          if (result.clippedCount)
            failures.push(`${tag}: ${result.clippedCount} clipped text box(es)`);
          if (result.coveredCount)
            failures.push(`${tag}: ${result.coveredCount} covered control(s)`);
          if (result.overlapCount)
            failures.push(`${tag}: ${result.overlapCount} overlapping pair(s)`);
          if (result.primaryCount)
            failures.push(`${tag}: ${result.primaryCount} primary text node(s) under 14px`);
          if (result.smallCount)
            failures.push(`${tag}: ${result.smallCount} tap target(s) under 44px`);
        }
      }
    }

    /* ---------- 200% page zoom ---------- */
    const pageZoom = [];
    const zoomTargets = [
      { key: "question-bank", scenario: "admin" },
      { key: "exams", scenario: "admin" },
      { key: "study-notes", scenario: "admin" },
      { key: "student-exams", scenario: "student" },
      { key: "attempt", scenario: "student" },
    ].filter((t) => RUN_PAGES.includes(t.key));
    for (const target of zoomTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;
      for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
        const width = 1440;
        const height = 900;
        const zoomWidth = Math.round(width / 2);
        const zoomHeight = Math.round(height / 2);
        setScenario(target.scenario);
        await navigate(page.path, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 }, [
          page.wait,
        ]);
        try {
          await applyAction(page);
        } catch (error) {
          failures.push(`zoom200 ${target.key} ${theme}: ${error.message}`);
          continue;
        }
        await sleep(450);
        const result = await audit(page.scope);
        pageZoom.push({
          page: target.key,
          id: "1440",
          width: zoomWidth,
          height: zoomHeight,
          theme,
          ...result,
        });
        await screenshot(`${target.key}-1440-${theme}-zoom200.png`);

        const tag = `zoom200 ${target.key} ${theme}`;
        if (result.overflowX > 1)
          failures.push(`${tag}: horizontal page scroll ${result.overflowX}px`);
        if (result.outsideCount)
          failures.push(`${tag}: ${result.outsideCount} element(s) outside the viewport`);
        if (result.clippedCount)
          failures.push(`${tag}: ${result.clippedCount} clipped text box(es)`);
        if (result.coveredCount)
          failures.push(`${tag}: ${result.coveredCount} covered control(s)`);
        if (result.overlapCount)
          failures.push(`${tag}: ${result.overlapCount} overlapping pair(s)`);
        if (result.primaryCount)
          failures.push(`${tag}: ${result.primaryCount} primary text node(s) under 14px`);
        if (result.smallCount)
          failures.push(`${tag}: ${result.smallCount} tap target(s) under 44px`);
      }
    }

    /* ---------- aggregate ---------- */
    const byPage = {};
    runs.forEach((r) => {
      byPage[r.page] ??= [];
      byPage[r.page].push({
        id: r.id,
        width: r.width,
        height: r.height,
        theme: r.theme,
        overflowX: r.overflowX,
        outside: r.outsideCount,
        small: r.smallCount,
        primary: r.primaryCount,
        clipped: r.clippedCount,
        covered: r.coveredCount,
        overlap: r.overlapCount,
        contrast: r.contrastMin,
        state: stateLabel(r.probe),
      });
    });

    const apiSummary = {};
    apiLog.forEach((call) => {
      const key = call.url
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/[?].*$/, "")
        .slice(0, 80);
      apiSummary[key] = (apiSummary[key] || 0) + 1;
    });

    const consoleLeaks = consoleLog.filter((entry) =>
      /password|Pt-[A-Za-z0-9]{6}/i.test(entry.text),
    );

    const summary = {
      generated: new Date().toISOString(),
      viewports: VIEWPORTS.length,
      pages: pages.map((p) => p.key),
      runs: runs.length + textZoom.length + pageZoom.length,
      baseRuns: runs.length,
      textZoom: textZoom.length,
      pageZoom: pageZoom.length,
      failures,
      byPage,
      apiCalls: Object.keys(apiSummary).length,
      apiSummary,
      console: { entries: consoleLog.length, leaks: consoleLeaks.length },
    };

    await writeFile(
      join(OUT, "batch6-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 6: الامتحانات وبنك الأسئلة والمذكرات", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: بنك الأسئلة (بطاقات + جدول + ترقيم)، الامتحانات (بطاقات + جدول + ترقيم)، المذكرات (بطاقات + جدول + ترقيم)، بوابات الطالب (الامتحانات/المذكرات/النتائج)، شاشة بدء الامتحان، شاشة الامتحان الإلكتروني بكل أنواع الأسئلة والصور، سجل المخالفات، نوافذ بنك الأسئلة وأسئلته وإنشاء الامتحان ونتائجه وإضافة المذكرة وتأكيد الحذف ومراجعة الامتحان.",
      "",
    );
    md.push(
      "الدور: Teacher لشاشات الإدارة، وStudent لبوابة الطالب. شاشة الامتحان تُفحص كشاشة حساسة: التوقيت والتسليم وعداد المخالفات داخل رأس لاصق واحد (F-023)، وتحذير ملء الشاشة داخل نفس الغلاف، وكل خيار ≥44px، والمسودة تُحفظ محليًا وتُعاد كتابتها عند انقطاع الاتصال، وشكل حمولة التسليم `{questionId, selectedOptionId, essayAnswer}` كما هو.",
      "",
    );

    md.push("## بوابات الجودة", "");
    md.push("| البوابة | الأمر | النتيجة |");
    md.push("| --- | --- | --- |");
    md.push(
      `| اختبارات الوحدة | \`npx vitest run\` من \`Frontend/CenterManagement\` | ${process.env.PHASE3B6_VITEST || "—"} |`,
    );
    md.push(
      `| بناء الإنتاج | \`npm run build\` | ${process.env.PHASE3B6_BUILD || "—"} |`,
    );
    md.push("");

    const table = (pageKey) => {
      const page = PAGES.find((p) => p.key === pageKey);
      md.push(`## ${pageKey} — ${page.expect}`, "");
      md.push(
        "| المقاس | الوضع | تمرير أفقي | خارج الشاشة | أهداف <44 | نص <14 | نص مقطوع | تغطية | تراكب | أقل تباين | الحالة |",
      );
      md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
      runs
        .filter((r) => r.page === pageKey)
        .forEach((r) => {
          md.push(
            `| ${r.id} (${r.width}×${r.height}) | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.contrastMin ?? "-"}:1 | ${stateLabel(r.probe)} |`,
          );
        });
      md.push("");
    };

    pages.forEach((p) => table(p.key));

    md.push("## سلوك العناصر", "");
    md.push("```json");
    md.push(JSON.stringify(probes, null, 2));
    md.push("```", "");

    md.push("## تكبير النص 200%", "");
    md.push(
      "| الحالة | المقاس | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |",
    );
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    textZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.id} | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");

    md.push("## تكبير الصفحة 200% (عرض CSS نصف العرض)", "");
    md.push(
      "| الحالة | عرض CSS | الوضع | تمرير أفقي | خارج الشاشة | نص مقطوع | تغطية | تراكب | نص <14 | لمس <44 |",
    );
    md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    pageZoom.forEach((r) => {
      md.push(
        `| ${r.page} | ${r.width}px | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.clippedCount} | ${r.coveredCount} | ${r.overlapCount} | ${r.primaryCount} | ${r.smallCount} |`,
      );
    });
    md.push("");

    md.push("## طلبات الـ API المعترضة", "");
    md.push(`إجمالي المسارات المختلفة: ${summary.apiCalls}`, "");
    md.push("```json");
    md.push(JSON.stringify(apiSummary, null, 2));
    md.push("```", "");
    md.push("## وحدة التحكم", "");
    md.push(
      `سجلت ${summary.console.entries} رسالة، والتسريبات الحساسة ${summary.console.leaks}.`,
      "",
    );

    md.push("## اللقطات", "");
    md.push(
      "`docs/design/shots/phase3b6/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم وشاشة الامتحان، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.",
      "",
    );

    md.push("## حدود الفحص الآلي", "");
    md.push(
      "- **لا SQL Server حقيقي.** الشاشات هنا تقرأ استجابات معترضة بـ fixtures؛ لم يُشغَّل تسليم امتحان أو حفظ سؤال فعلي على قاعدة بيانات، ومنطق التصحيح/النشر/المخالفات في الباك إند لم يُعد قياسه في هذه الدفعة.",
      "- **لا طباعة ورقية.** لا تُطبع أوراق الامتحانات في هذه الدفعة؛ لم تُقس هوامش الطابعة أو أحجام الورق.",
      "- **لا شبكة/زمن استجابة إنتاجي.** كل طلبات الـ API معترضة؛ محاكاة انقطاع الاتصال هي حدث `offline` في المتصفح، لا انقطاع شبكة حقيقي.",
      "- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.",
      "- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.",
      "- **لا تغطية لمنطق التصحيح.** هذه الدفعة عرض بصري فقط؛ صحة الدرجات والتصحيح اليدوي والمخالفات تُغطى باختبارات الوحدة/الباك إند وليست ضمن هذا الفحص.",
      "",
    );

    if (failures.length) {
      md.push("## الإخفاقات", "");
      failures.forEach((f) => md.push(`- ${f}`));
    } else {
      md.push(
        "لا إخفاقات: كل الحالات سليمة في كل مقاس ووضع، بلا تمرير أفقي أو قطع أو تراكب، كل هدف لمس ≥44px، النص الأساسي ≥14px، الخطوط محلية، التباين AA، والتكبير 200% سليم.",
        "",
      );
    }
    await writeFile(join(OUT, "batch6-verify.md"), md.join("\n"));

    if (failures.length) process.exitCode = 1;
    console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
    failures.slice(0, 120).forEach((f) => console.log(" - " + f));
    console.log(
      JSON.stringify(
        {
          runs: summary.runs,
          baseRuns: summary.baseRuns,
          textZoom: summary.textZoom,
          pageZoom: summary.pageZoom,
          byPage: Object.fromEntries(
            Object.entries(byPage).map(([k, v]) => [k, v.length]),
          ),
          probes,
        },
        null,
        2,
      ),
    );
  } finally {
    client?.close();
    chrome.kill();
    try {
      spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      server.kill();
    }
  }
}

function stateLabel(probe) {
  if (!probe) return "-";
  if (probe.attempt) return `attempt · ${probe.attempt.questionTypes.join(",")}`;
  if (probe.log) return `violations · ${probe.log.items}`;
  if (probe.modal) return `dialog · ${probe.modal.title || probe.modal.closeLabel}`;
  if (probe.table) return `table · ${probe.tableRows} rows`;
  return "-";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

