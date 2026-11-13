/**
 * Phase 3 / batch 8 verification harness.
 *
 * Screens: the student portal (dashboard, exams, results, attendance, payments,
 * notes, notifications, profile) and the parent portal (children, per-child
 * detail, notifications).
 *
 * Run from the repository root:
 *   node docs/design/phase3-batch8-verify.mjs
 *
 * Optional narrowing (fast iterations):
 *   PHASE3B8_PAGES="student-dashboard,parent-child"
 *   PHASE3B8_VIEWPORTS="390,1280"
 *   PHASE3B8_THEMES="light"
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b8");
const CHROME_PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b8-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9474;
const APP_PORT = 5208;
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

const ALL_VIEWPORTS = VIEWPORTS.map((v) => v[0]);
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

const SUBSCRIPTION = {
  type: "Annual",
  state: "active",
  startDate: "2026-01-01T00:00:00",
  endDate: "2027-01-01T00:00:00",
  daysLeftInGrace: null,
};

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const STUDENT_PROFILE = {
  fullName: "أحمد محمود السيد",
  phone: "01012345678",
  parentPhoneNumber: "01098765432",
  subscriptionTypeName: "شهري",
  school: "مدرسة النور الثانوية",
  isActive: true,
  isPaid: true,
  groups: ["مجموعة أ", "مجموعة ب"],
  subscriptions: [
    {
      groupId: "g1",
      groupName: "مجموعة أ — الرياضيات المتقدمة",
      isActive: true,
      monthlyPrice: 400,
      sessionsPerMonth: 8,
      joinDate: "2026-09-01T00:00:00",
    },
    {
      groupId: "g2",
      groupName: "مجموعة ب",
      isActive: false,
      monthlyPrice: 350,
      sessionsPerMonth: 4,
      joinDate: "2026-02-01T00:00:00",
    },
  ],
};

const EXAMS = [
  {
    examId: "e1",
    name: "امتحان الرياضيات — الوحدة الأولى",
    groupName: "مجموعة أ",
    examDate: "2026-11-20T16:00:00",
    durationMinutes: 45,
    questionsCount: 12,
    totalMarks: 20,
    status: "upcoming",
    attemptId: null,
  },
  {
    examId: "e2",
    name: "اختبار العلوم الشهري",
    groupName: "مجموعة أ",
    examDate: "2026-11-13T09:00:00",
    durationMinutes: 30,
    questionsCount: 10,
    totalMarks: 15,
    status: "available",
    attemptId: null,
  },
  {
    examId: "e3",
    name: "امتحان اللغة العربية — النحو",
    groupName: "مجموعة ب",
    examDate: "2026-11-12T10:00:00",
    durationMinutes: 60,
    questionsCount: 18,
    totalMarks: 30,
    status: "inprogress",
    attemptId: "a9",
  },
  {
    examId: "e4",
    name: "امتحان الدراسات الاجتماعية",
    groupName: "مجموعة أ",
    examDate: "2026-11-01T10:00:00",
    durationMinutes: 40,
    questionsCount: 14,
    totalMarks: 20,
    status: "finished",
    attemptId: "a1",
    score: 17,
    scoredTotalMark: 20,
    hasPendingManualGrading: true,
  },
  {
    examId: "e5",
    name: "امتحان تجريبي قديم",
    groupName: "مجموعة ب",
    examDate: "2026-10-01T10:00:00",
    durationMinutes: 30,
    questionsCount: 8,
    totalMarks: 10,
    status: "expired",
    attemptId: null,
  },
];

const RESULTS = [
  {
    examId: "e4",
    examName: "امتحان الدراسات الاجتماعية",
    score: 17,
    totalMark: 20,
    isPublished: true,
    submittedAt: "2026-11-01T10:40:00",
    hasPendingManualGrading: false,
  },
  {
    examId: "e6",
    examName: "امتحان الرياضيات — الوحدة الثانية والتمارين الإضافية",
    score: 14,
    totalMark: 20,
    isPublished: true,
    submittedAt: "2026-10-20T11:10:00",
    hasPendingManualGrading: true,
  },
  {
    examId: "e7",
    examName: "اختبار العلوم",
    score: 0,
    totalMark: 15,
    isPublished: false,
    submittedAt: "2026-10-10T09:30:00",
    hasPendingManualGrading: false,
  },
  {
    examId: "e8",
    examName: "امتحان اللغة الإنجليزية",
    score: 9,
    totalMark: 20,
    isPublished: true,
    submittedAt: "2026-09-25T12:00:00",
    hasPendingManualGrading: false,
  },
];

const ATTENDANCE = {
  totalSessions: 12,
  presentCount: 7,
  absentCount: 2,
  lateCount: 2,
  excusedCount: 1,
  attendancePercentage: 66.7,
  records: [
    {
      attendanceDate: "2026-11-08",
      groupName: "مجموعة أ",
      dayOfWeek: "الأحد",
      startTime: "16:00",
      endTime: "18:00",
      status: 1,
      statusName: "حاضر",
      notes: null,
    },
    {
      attendanceDate: "2026-11-05",
      groupName: "مجموعة أ",
      dayOfWeek: "الخميس",
      startTime: "16:00",
      endTime: "18:00",
      status: 2,
      statusName: "غائب",
      notes: "غياب بدون إخطار مسبق",
    },
    {
      attendanceDate: "2026-11-01",
      groupName: "مجموعة ب",
      dayOfWeek: "الأحد",
      startTime: "10:00",
      endTime: "12:00",
      status: 3,
      statusName: "متأخر",
      notes: "تأخر 15 دقيقة",
    },
    {
      attendanceDate: "2026-10-28",
      groupName: "مجموعة أ",
      dayOfWeek: "الأربعاء",
      startTime: "16:00",
      endTime: "18:00",
      status: 4,
      statusName: "بعذر",
      notes: "عذر طبي موثق",
    },
  ],
};

const PAYMENTS = {
  totalPaid: 1050,
  totalDue: 350,
  paymentsCount: 3,
  payments: [
    {
      paymentId: "p1",
      paymentDate: "2026-11-01",
      groupName: "مجموعة أ",
      billingPeriod: "2026-11-01",
      totalAmount: 400,
      paidAmount: 200,
      remainingAmount: 200,
      status: 1,
      statusName: "جزئي",
      receivedByName: "أ. محمد علي",
    },
    {
      paymentId: "p2",
      paymentDate: "2026-10-01",
      groupName: "مجموعة أ",
      billingPeriod: "2026-10-01",
      totalAmount: 400,
      paidAmount: 400,
      remainingAmount: 0,
      status: 2,
      statusName: "مدفوع",
      receivedByName: "أ. محمد علي",
    },
    {
      paymentId: "p3",
      paymentDate: "2026-09-01",
      groupName: "مجموعة ب",
      billingPeriod: "2026-09-01",
      totalAmount: 450,
      paidAmount: 450,
      remainingAmount: 0,
      status: 4,
      statusName: "معفى",
      receivedByName: null,
    },
  ],
};

const NOTES = [
  {
    id: "n1",
    title: "مذكرة الرياضيات — التفاضل والتكامل",
    description:
      "ملزمة شاملة تغطي قوانين التفاضل والتكامل مع أمثلة محلولة وتمارين متنوعة على كل درس.",
    fileName: "math-notes.pdf",
    fileSize: 734003,
    createdAt: "2026-11-02T10:00:00",
    groupNames: ["مجموعة أ", "مجموعة ب"],
  },
  {
    id: "n2",
    title: "مراجعة العلوم النهائية",
    description: null,
    fileName: "science-final.pdf",
    fileSize: 512000,
    createdAt: "2026-10-21T10:00:00",
    groupNames: ["مجموعة أ"],
  },
  {
    id: "n3",
    title: "ملخص النحو",
    description: "قواعد الإعراب في صفحتين.",
    fileName: "grammar.pdf",
    fileSize: 120000,
    createdAt: "2026-10-05T10:00:00",
    groupNames: [],
  },
];

const NOTIFICATIONS = Array.from({ length: 12 }, (_, i) => ({
  id: `nt${i + 1}`,
  title:
    i === 0
      ? "تم نشر نتيجة امتحان الدراسات الاجتماعية"
      : i % 3 === 0
        ? "تذكير بموعد الحصة القادمة"
        : i % 3 === 1
          ? "تم إضافة مذكرة جديدة إلى مجموعتك"
          : "رسالة من إدارة المركز",
  body:
    i === 0
      ? "يمكنك الآن مراجعة درجتك وتفاصيل التصحيح من صفحة النتائج."
      : i % 3 === 0
        ? "حصة الغد تبدأ الساعة الرابعة عصرًا في قاعة المجموعة أ."
        : i % 3 === 1
          ? "مذكرة الرياضيات — التفاضل والتكامل متاحة الآن للتحميل."
          : "يرجى الالتزام بمواعيد الحضور والانصراف.",
  isRead: i > 4,
  createdAt: `2026-11-${String(12 - (i % 10)).padStart(2, "0")}T09:00:00`,
}));

const CHILDREN = [
  { studentId: "101", fullName: "سارة أحمد محمود", isActive: true },
  { studentId: "102", fullName: "يوسف أحمد محمود", isActive: true },
];

const CHILD_SUMMARY = {
  studentId: "101",
  fullName: "سارة أحمد محمود",
  isActive: true,
  groups: ["مجموعة أ"],
};

const CHILD_ATTENDANCE = {
  totalSessions: 8,
  presentCount: 5,
  absentCount: 1,
  lateCount: 1,
  excusedCount: 1,
  attendancePercentage: 75,
  records: [
    {
      attendanceDate: "2026-11-08",
      groupName: "مجموعة أ",
      dayOfWeek: "الأحد",
      startTime: "16:00",
      endTime: "18:00",
      statusName: "حاضر",
    },
    {
      attendanceDate: "2026-11-05",
      groupName: "مجموعة أ",
      dayOfWeek: "الخميس",
      startTime: "16:00",
      endTime: "18:00",
      statusName: "غائب",
    },
    {
      attendanceDate: "2026-11-01",
      groupName: "مجموعة أ",
      dayOfWeek: "الأحد",
      startTime: "16:00",
      endTime: "18:00",
      statusName: "متأخر",
    },
    {
      attendanceDate: "2026-10-28",
      groupName: "مجموعة أ",
      dayOfWeek: "الأربعاء",
      startTime: "16:00",
      endTime: "18:00",
      statusName: "بعذر",
    },
  ],
};

const CHILD_GRADES = {
  exams: [
    {
      examName: "اختبار الشهر في الرياضيات",
      examDate: "2026-11-01",
      components: [
        { componentName: "أعمال السنة", mark: 9, totalMarks: 10 },
        { componentName: "الامتحان التحريري", mark: 16, totalMarks: 20 },
      ],
    },
    {
      examName: "اختبار العلوم",
      examDate: "2026-10-15",
      components: [
        { componentName: "الشفوي", mark: 0, totalMarks: 5, isAbsent: true },
      ],
    },
  ],
};

const CHILD_EXAMS = {
  exams: [
    {
      examName: "امتحان الرياضيات الإلكتروني",
      submittedAt: "2026-11-02T10:00:00",
      score: 18,
      totalMark: 20,
      hasPendingManualGrading: false,
    },
    {
      examName: "امتحان العلوم الإلكتروني",
      submittedAt: "2026-10-20T10:00:00",
      score: 12,
      totalMark: 15,
      hasPendingManualGrading: true,
    },
  ],
};

const CHILD_PAYMENTS = {
  totalPaid: 700,
  totalDue: 100,
  payments: [
    {
      paymentDate: "2026-11-01",
      groupName: "مجموعة أ",
      billingPeriod: "2026-11-01",
      paidAmount: 300,
      remainingAmount: 100,
    },
    {
      paymentDate: "2026-10-01",
      groupName: "مجموعة أ",
      billingPeriod: "2026-10-01",
      paidAmount: 400,
      remainingAmount: 0,
    },
  ],
};

const PARENT_NOTIFICATIONS = Array.from({ length: 12 }, (_, i) => ({
  id: `pn${i + 1}`,
  title: i % 2 === 0 ? "غياب اليوم" : "تأخر عن الحصة",
  body:
    i % 2 === 0
      ? "سارة أحمد محمود غابت اليوم عن حصة مجموعة أ."
      : "سارة أحمد محمود تأخرت 10 دقائق عن بداية الحصة.",
  studentId: i % 3 === 2 ? "102" : "101",
  isRead: i > 3,
  createdAt: `2026-11-${String(12 - (i % 10)).padStart(2, "0")}T08:00:00`,
}));

/* ------------------------------------------------------------------ */
/* scenarios + pages                                                   */
/* ------------------------------------------------------------------ */

const SCENARIOS = {
  student: { role: "Student", centerAdmin: false, centerType: "MultiTeacher" },
  parent: { role: "Parent", centerAdmin: false, centerType: "MultiTeacher" },
};

const PAGES = [
  {
    key: "student-dashboard",
    path: "/student/dashboard",
    wait: '[data-testid="student-dashboard-page"]',
    scenario: "student",
    scope: "student-dashboard-page",
    shell: "student-shell",
    expect: "student-dashboard",
    statSelector: '[data-testid^="student-stat-"]',
    full: true,
  },
  {
    key: "student-exams",
    path: "/student/exams",
    wait: '[data-testid="student-exams-page"]',
    scenario: "student",
    scope: "student-exams-page",
    shell: "student-shell",
    expect: "student-exams",
    full: true,
  },
  {
    key: "student-results",
    path: "/student/results",
    wait: '[data-testid="student-results-page"]',
    scenario: "student",
    scope: "student-results-page",
    shell: "student-shell",
    expect: "student-results",
    full: true,
  },
  {
    key: "student-attendance",
    path: "/student/attendance",
    wait: '[data-testid="student-attendance-page"]',
    scenario: "student",
    scope: "student-attendance-page",
    shell: "student-shell",
    expect: "student-attendance",
    statSelector: '[data-testid^="student-attendance-"][data-testid$="-total"], [data-testid^="student-attendance-"][data-testid$="-present"], [data-testid^="student-attendance-"][data-testid$="-absent"], [data-testid^="student-attendance-"][data-testid$="-late"], [data-testid^="student-attendance-"][data-testid$="-excused"]',
    full: true,
  },
  {
    key: "student-payments",
    path: "/student/payments",
    wait: '[data-testid="student-payments-page"]',
    scenario: "student",
    scope: "student-payments-page",
    shell: "student-shell",
    expect: "student-payments",
    statSelector: '[data-testid="student-payments-paid"], [data-testid="student-payments-due"], [data-testid="student-payments-count"]',
    full: true,
  },
  {
    key: "student-notes",
    path: "/student/notes",
    wait: '[data-testid="student-notes-page"]',
    scenario: "student",
    scope: "student-notes-page",
    shell: "student-shell",
    expect: "student-notes",
    full: true,
  },
  {
    key: "student-notifications",
    path: "/student/notifications",
    wait: '[data-testid="student-notifications-page"]',
    scenario: "student",
    scope: "student-notifications-page",
    shell: "student-shell",
    expect: "student-notifications",
    full: true,
  },
  {
    key: "student-profile",
    path: "/student/profile",
    wait: '[data-testid="student-profile-page"]',
    scenario: "student",
    scope: "student-profile-page",
    shell: "student-shell",
    expect: "student-profile",
    full: true,
  },
  {
    key: "parent-dashboard",
    path: "/parent/dashboard",
    wait: '[data-testid="parent-dashboard-page"]',
    scenario: "parent",
    scope: "parent-dashboard-page",
    shell: "parent-shell",
    expect: "parent-dashboard",
    full: true,
  },
  {
    key: "parent-child",
    path: "/parent/children/101",
    wait: '[data-testid="parent-child-page"]',
    scenario: "parent",
    scope: "parent-child-page",
    shell: "parent-shell",
    expect: "parent-child",
    full: true,
  },
  {
    key: "parent-notifications",
    path: "/parent/notifications",
    wait: '[data-testid="parent-notifications-page"]',
    scenario: "parent",
    scope: "parent-notifications-page",
    shell: "parent-shell",
    expect: "parent-notifications",
    full: true,
  },
];

const list = (value, fallback) =>
  value
    ? String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

const RUN_PAGES = list(process.env.PHASE3B8_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B8_VIEWPORTS, ALL_VIEWPORTS);
const RUN_THEMES = list(process.env.PHASE3B8_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));

/* ------------------------------------------------------------------ */
/* fixtures (continued)                                                */
/* ------------------------------------------------------------------ */

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const ID_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

const NAMES = { Student: "أحمد محمود السيد", Parent: "أحمد محمود السيد" };

function makeJwt(scenario) {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    iat: Math.floor(Date.now() / 1000),
    [ROLE_CLAIM]: scenario.role,
    [ID_CLAIM]: scenario.role === "Student" ? "501" : "77",
    [NAME_CLAIM]: NAMES[scenario.role] ?? "مستخدم",
    PhoneNumber: scenario.role === "Parent" ? "01098765432" : "01012345678",
    is_center_admin: "false",
    pwd_change_required: "false",
    impersonation: "false",
  };
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

let SCENARIO = SCENARIOS.student;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.student;
};

const queryOf = (url) => {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams();
  }
};

const pick = (params, keys) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null && value !== "") return value;
  }
  return null;
};

function pageSlice(rows, url) {
  const params = queryOf(url);
  const pageNumber = Number(pick(params, ["pageNumber", "PageNumber"]) || 1);
  const pageSize = Number(pick(params, ["pageSize", "PageSize"]) || 10);
  const start = (pageNumber - 1) * pageSize;
  return {
    pageNumber,
    pageSize,
    slice: rows.slice(start, start + pageSize),
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    totalCount: rows.length,
  };
}

function paged(rows, url) {
  const page = pageSlice(rows, url);
  return ok({
    data: page.slice,
    currentPage: page.pageNumber,
    totalPages: page.totalPages,
    totalCount: page.totalCount,
  });
}

function fixtureFor(url) {
  const lower = url.toLowerCase();

  if (lower.includes("authentication/refresh-token")) {
    return {
      accessToken: makeJwt(SCENARIO),
      mustChangePassword: false,
      enabledModules: ALL_MODULES,
      subscription: SUBSCRIPTION,
    };
  }
  if (lower.includes("profile/getmyprofile")) {
    return ok({
      fullName: NAMES[SCENARIO.role],
      phoneNumber: SCENARIO.role === "Parent" ? "01098765432" : "01012345678",
      userName: SCENARIO.role === "Parent" ? "01098765432" : "01012345678",
      centerType: SCENARIO.centerType,
      enabledModules: ALL_MODULES,
      subscription: SUBSCRIPTION,
      subject: null,
      email: null,
      address: null,
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
  if (lower.includes("/studentportal/profile")) return ok(STUDENT_PROFILE);
  if (lower.includes("/studentportal/exams")) return ok(EXAMS);
  if (lower.includes("/studentportal/results")) return ok(RESULTS);
  if (lower.includes("/studentportal/attendance")) return ok(ATTENDANCE);
  if (lower.includes("/studentportal/payments")) return ok(PAYMENTS);
  if (lower.includes("/studentportal/notes")) return ok(NOTES);
  if (lower.includes("/studentportal/subscriptions")) {
    return ok(STUDENT_PROFILE.subscriptions);
  }
  if (lower.includes("/studentportal/notifications/unread-count")) {
    return ok(NOTIFICATIONS.filter((n) => !n.isRead).length);
  }
  if (/\/studentportal\/notifications\/[^/]+\/read$/.test(lower)) {
    return { succeeded: true, data: null };
  }
  if (lower.includes("/studentportal/notifications/read-all")) {
    return { succeeded: true, data: null, message: "تم تعليم كل الإشعارات كمقروءة" };
  }
  if (lower.includes("/studentportal/notifications")) {
    return paged(NOTIFICATIONS, url);
  }

  /* ---------- parent portal ---------- */
  if (lower.includes("/parentportal/children/999")) {
    return {
      __status: 404,
      __body: { succeeded: false, statusCode: 404, message: "غير موجود" },
    };
  }
  if (/\/parentportal\/children\/101\/attendance$/.test(lower)) {
    return ok(CHILD_ATTENDANCE);
  }
  if (/\/parentportal\/children\/101\/grades$/.test(lower)) return ok(CHILD_GRADES);
  if (/\/parentportal\/children\/101\/exams$/.test(lower)) return ok(CHILD_EXAMS);
  if (/\/parentportal\/children\/101\/payments$/.test(lower)) return ok(CHILD_PAYMENTS);
  if (/\/parentportal\/children\/101$/.test(lower)) return ok(CHILD_SUMMARY);
  if (/\/parentportal\/children\/[^/]+$/.test(lower)) {
    return {
      __status: 404,
      __body: { succeeded: false, statusCode: 404, message: "غير موجود" },
    };
  }
  if (lower.includes("/parentportal/children")) return ok(CHILDREN);
  if (lower.includes("/parentportal/notifications/unread-count")) {
    return ok(PARENT_NOTIFICATIONS.filter((n) => !n.isRead).length);
  }
  if (/\/parentportal\/notifications\/[^/]+\/read$/.test(lower)) {
    return { succeeded: true, data: null };
  }
  if (lower.includes("/parentportal/notifications/read-all")) {
    return { succeeded: true, data: null, message: "تم تعليم كل الإشعارات كمقروءة" };
  }
  if (lower.includes("/parentportal/notifications")) {
    return paged(PARENT_NOTIFICATIONS, url);
  }

  // Unrelated background calls (including SignalR negotiate) must never hit the
  // real network.
  return ok([]);
}

/* ------------------------------------------------------------------ */
/* in-page probe                                                       */
/* ------------------------------------------------------------------ */

const PROBE = String.raw`(() => {
  const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
  const textOf = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");
  const scope = window.__AUDIT_SCOPE__ || null;
  const root = scope ? testid(scope) : document;
  if (!root) return { missingScope: scope };

  const q = (sel) => [...root.querySelectorAll(sel)];
  const nav = document.querySelector(".mobile-bottom-nav");
  const navVisible = Boolean(nav) && getComputedStyle(nav).display !== "none";
  const navLinks = nav
    ? [...nav.querySelectorAll("a")].map((a) => ({
        label: textOf(a),
        current: a.getAttribute("aria-current"),
        h: Math.round(a.getBoundingClientRect().height),
        w: Math.round(a.getBoundingClientRect().width),
      }))
    : [];
  const more = nav ? nav.querySelector("button") : null;
  const statSelector = window.__STAT_SELECTOR__ || null;

  return {
    text: textOf(root).slice(0, 9000),
    heading: textOf(root.querySelector("h1")),
    table: Boolean(root.querySelector("table")),
    tableRows: root.querySelectorAll("tbody tr").length,
    cards: root.querySelectorAll('[data-testid$="-card"]').length,
    sections: root.querySelectorAll('[data-testid^="parent-child-section-"]').length,
    stats: statSelector ? document.querySelectorAll(statSelector).length : 0,
    links: q("a[href]").map((a) => a.getAttribute("href")).slice(0, 16),
    bottomNav: {
      present: navVisible,
      links: navLinks,
      more: Boolean(more),
      moreLabel: more ? more.getAttribute("aria-label") : null,
      moreActive: more ? more.getAttribute("data-active") === "true" : null,
      moreBox: more
        ? {
            w: Math.round(more.getBoundingClientRect().width),
            h: Math.round(more.getBoundingClientRect().height),
          }
        : null,
    },
    shellVisible: Boolean(document.querySelector('[data-testid="student-shell"], [data-testid="parent-shell"]')),
    drawerOpen: (() => {
      const drawer = document.getElementById("mobile-nav-drawer");
      return drawer ? drawer.getAttribute("data-open") === "true" : null;
    })(),
  };
})()`;

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
  await rm(CHROME_PROFILE, { recursive: true, force: true });
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
      `--user-data-dir=${CHROME_PROFILE}`,
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

        const fixture = fixtureFor(request.url);
        const status = fixture?.__status ?? 200;
        const payload = fixture?.__body ?? fixture;

        await client.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: status,
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

    const audit = async (scope) => {
      await setAuditScope(scope);
      return evaluate(AUDIT);
    };

    const probeFor = async (page) => {
      await setAuditScope(page.scope);
      await evaluate(
        `window.__STAT_SELECTOR__ = ${page.statSelector ? JSON.stringify(page.statSelector) : "null"}; true`,
      );
      return evaluate(PROBE);
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

    const runPage = async (page, viewport, theme) => {
      const [id, width, height] = viewport;
      setScenario(page.scenario);
      await navigate(page.path, theme, { width, height }, [page.wait]);
      await audit(page.scope);
      await sleep(200);
      const result = await audit(page.scope);
      const shell = page.shell ? await audit(page.shell) : null;
      const probe = await probeFor(page);
      await screenshot(`${page.key}-${id}-${theme}.png`, { full: page.full });
      return {
        page: page.key,
        id,
        width,
        height,
        theme,
        ...result,
        shell: shell
          ? {
              smallCount: shell.smallCount,
              small: shell.small,
              coveredCount: shell.coveredCount,
            }
          : null,
        probe,
      };
    };

    const runs = [];
    const failures = [];
    const probes = {};

    for (const page of pages) {
      const viewports = VIEWPORTS.filter(
        (v) => page.viewports === undefined || page.viewports.includes(v[0]),
      ).filter((v) => RUN_VIEWPORTS.includes(v[0]));

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
          if (run.overflowX > 1 && !page.ignorePageOverflow)
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
          if (run.shell?.smallCount)
            failures.push(
              `${tag}: ${run.shell.smallCount} shell tap target(s) under 44px (${run.shell.small
                .slice(0, 3)
                .map((s) => `${s.tag} ${s.w}x${s.h} ${s.text}`)
                .join(", ")})`,
            );
          if (run.shell?.coveredCount)
            failures.push(`${tag}: ${run.shell.coveredCount} covered shell control(s)`);

          const p = run.probe || {};
          const text = p.text || "";
          const isPhone = viewport[0] === "360" || viewport[0] === "390";

          if (!p.shellVisible) failures.push(`${tag}: portal shell is missing`);
          if (isPhone) {
            if (!p.bottomNav.present) failures.push(`${tag}: mobile bottom nav is missing`);
            const expected = page.scenario === "parent" ? 2 : 4;
            if (p.bottomNav.links.length !== expected)
              failures.push(
                `${tag}: ${p.bottomNav.links.length} bottom-nav links, expected ${expected}`,
              );
            const current = p.bottomNav.links.filter((l) => l.current === "page");
            const moreActive = p.bottomNav.moreActive === true;
            if (page.scenario === "student") {
              // The student nav has four primary links plus "more"; pages that
              // live behind "more" must highlight the more button instead.
              if (current.length > 1)
                failures.push(
                  `${tag}: ${current.length} bottom-nav items marked current`,
                );
              if (current.length === 0 && !moreActive)
                failures.push(
                  `${tag}: neither a bottom-nav link nor "more" marks the current page`,
                );
              if (current.length === 1 && moreActive)
                failures.push(
                  `${tag}: both a bottom-nav link and "more" mark the current page`,
                );
            } else if (current.length !== 1) {
              failures.push(
                `${tag}: ${current.length} bottom-nav items marked current`,
              );
            }
            p.bottomNav.links.forEach((link) => {
              if (link.h < 43.5 || link.w < 43.5)
                failures.push(`${tag}: bottom-nav link "${link.label}" is ${link.w}x${link.h}`);
            });
            if (page.scenario === "student") {
              if (!p.bottomNav.more)
                failures.push(`${tag}: bottom-nav "more" button is missing`);
              if (p.bottomNav.moreBox && p.bottomNav.moreBox.h < 43.5)
                failures.push(
                  `${tag}: bottom-nav more is ${p.bottomNav.moreBox.w}x${p.bottomNav.moreBox.h}`,
                );
            }
          } else if (p.bottomNav.present && viewport[0] !== "land-844") {
            failures.push(`${tag}: bottom nav is still visible at ${viewport[0]}px`);
          }

          if (page.expect === "student-dashboard") {
            if (!text.includes("أهلاً، أحمد محمود السيد"))
              failures.push(`${tag}: greeting is missing`);
            if (p.stats !== 4)
              failures.push(`${tag}: ${p.stats} dashboard stats, expected 4`);
            for (const label of [
              "امتحانات متاحة الآن",
              "متوسط النتائج المنشورة",
              "نسبة الحضور",
              "المتبقي من الرسوم",
              "تطور الأداء عبر الزمن",
              "امتحانات تنتظرك",
              "أحدث النتائج",
            ]) {
              if (!text.includes(label)) failures.push(`${tag}: "${label}" is missing`);
            }
            if (!text.includes("عرض الكل"))
              failures.push(`${tag}: section action link is missing`);
          }

          if (page.expect === "student-exams") {
            if (p.cards !== 5) failures.push(`${tag}: ${p.cards} exam cards, expected 5`);
            for (const label of [
              "لم يبدأ بعد",
              "متاح الآن",
              "قيد الحل",
              "تم التسليم",
              "انتهى",
            ]) {
              if (!text.includes(label)) failures.push(`${tag}: status "${label}" is missing`);
            }
            if (!text.includes("استكمال الامتحان"))
              failures.push(`${tag}: resume action is missing`);
            if (!text.includes("بانتظار تصحيح المقالي"))
              failures.push(`${tag}: pending-grading note is missing`);
          }

          if (page.expect === "student-results") {
            if (p.cards !== 4) failures.push(`${tag}: ${p.cards} result cards, expected 4`);
            if (!p.table) failures.push(`${tag}: desktop results table is missing`);
            if (p.tableRows !== 4)
              failures.push(`${tag}: ${p.tableRows} table rows, expected 4`);
            if (!text.includes("بانتظار النشر"))
              failures.push(`${tag}: unpublished status is missing`);
            if (!text.includes("بانتظار تصحيح المقالي"))
              failures.push(`${tag}: manual-grading status is missing`);
            if (!text.includes("مراجعة")) failures.push(`${tag}: review action is missing`);
          }

          if (page.expect === "student-attendance") {
            if (p.cards !== 4)
              failures.push(`${tag}: ${p.cards} attendance cards, expected 4`);
            if (p.stats !== 5)
              failures.push(`${tag}: ${p.stats} attendance stats, expected 5`);
            for (const label of ["حاضر", "غائب", "متأخر", "بعذر", "نسبة الحضور"]) {
              if (!text.includes(label)) failures.push(`${tag}: "${label}" is missing`);
            }
            if (!text.includes("66.7%"))
              failures.push(`${tag}: attendance rate is missing`);
            if (text.includes("0%"))
              failures.push(`${tag}: attendance rate rendered as 0%`);
            if (!p.table || p.tableRows !== 4)
              failures.push(`${tag}: attendance table is missing its rows`);
          }

          if (page.expect === "student-payments") {
            if (p.cards !== 3)
              failures.push(`${tag}: ${p.cards} payment cards, expected 3`);
            if (p.stats !== 3)
              failures.push(`${tag}: ${p.stats} payment stats, expected 3`);
            if (!p.table || p.tableRows !== 3)
              failures.push(`${tag}: payments table is missing its rows`);
            if (text.includes("المجموع المستلم"))
              failures.push(`${tag}: duplicated receiver column is still rendered`);
            if (text.includes("أ. محمد علي"))
              failures.push(`${tag}: receiver name still leaks into the table`);
            for (const label of ["إجمالي المدفوع", "المتبقي", "عدد الدفعات"]) {
              if (!text.includes(label)) failures.push(`${tag}: "${label}" is missing`);
            }
          }

          if (page.expect === "student-notes") {
            if (!text.includes("مذكرة الرياضيات — التفاضل والتكامل"))
              failures.push(`${tag}: first note is missing`);
            const downloads = (text.match(/تحميل/g) || []).length;
            if (downloads < 3)
              failures.push(`${tag}: ${downloads} download actions, expected 3`);
            if (!text.includes("717 KB")) failures.push(`${tag}: file size is missing`);
          }

          if (page.expect === "student-notifications") {
            if (!p.table && !text.includes("جديد"))
              failures.push(`${tag}: unread badge is missing`);
            if (!text.includes("تم نشر نتيجة امتحان الدراسات الاجتماعية"))
              failures.push(`${tag}: first notification is missing`);
            if (!text.includes("12"))
              failures.push(`${tag}: pagination total is missing`);
            if (!text.includes("تعليم الكل كمقروء"))
              failures.push(`${tag}: mark-all action is missing`);
          }

          if (page.expect === "student-profile") {
            if (!text.includes("أحمد محمود السيد"))
              failures.push(`${tag}: student name is missing`);
            for (const label of ["الهاتف", "هاتف ولي الأمر", "الاشتراك", "المدرسة"]) {
              if (!text.includes(label)) failures.push(`${tag}: "${label}" is missing`);
            }
            if (p.cards !== 2)
              failures.push(`${tag}: ${p.cards} subscription cards, expected 2`);
            if (!text.includes("غير مدفوع") && !text.includes("مدفوع"))
              failures.push(`${tag}: payment badge is missing`);
          }

          if (page.expect === "parent-dashboard") {
            if (p.cards !== 2)
              failures.push(`${tag}: ${p.cards} child cards, expected 2`);
            if (!text.includes("سارة أحمد محمود") || !text.includes("يوسف أحمد محمود"))
              failures.push(`${tag}: child names are missing`);
            if (!text.includes("أبنائي")) failures.push(`${tag}: heading is missing`);
          }

          if (page.expect === "parent-child") {
            if (!text.includes("سارة أحمد محمود"))
              failures.push(`${tag}: child name is missing`);
            if (p.sections !== 4)
              failures.push(`${tag}: ${p.sections} child sections, expected 4`);
            for (const label of [
              "الحضور والغياب",
              "الدرجات",
              "نتائج الاختبارات الإلكترونية",
              "المدفوعات",
              "ملخص الطالب",
            ]) {
              if (!text.includes(label)) failures.push(`${tag}: "${label}" is missing`);
            }
            for (const value of ["75%", "أعمال السنة", "18", "متبقي"]) {
              if (!text.includes(value)) failures.push(`${tag}: "${value}" is missing`);
            }
          }

          if (page.expect === "parent-notifications") {
            if (!text.includes("غياب اليوم"))
              failures.push(`${tag}: absence notification is missing`);
            if (!text.includes("12"))
              failures.push(`${tag}: pagination total is missing`);
            if (!text.includes("تعليم الكل كمقروء"))
              failures.push(`${tag}: mark-all action is missing`);
          }
        }
      }
    }

    /* ---------- live behaviour probes ---------- */

    const lastCall = (needle) =>
      [...apiLog].reverse().find((call) => call.url.toLowerCase().includes(needle));
    const hasPage = (key) => pages.some((p) => p.key === key);

    if (hasPage("student-results")) {
      setScenario("student");
      await navigate("/student/results", "light", { width: 390, height: 844 }, [
        '[data-testid="student-results-page"]',
      ]);
      const parity = await evaluate(`(() => {
        const cards = [...document.querySelectorAll('[data-testid="student-result-card"] h2')]
          .map((el) => el.textContent.replace(/\\s+/g, " ").trim());
        const rows = [...document.querySelectorAll("tbody tr td:nth-child(2)")]
          .map((el) => el.textContent.replace(/\\s+/g, " ").trim());
        return { cards, rows };
      })()`);
      probes.resultsParity = parity;
      if (parity.cards.length !== parity.rows.length)
        failures.push(
          `results probe: ${parity.cards.length} cards vs ${parity.rows.length} rows`,
        );
      parity.cards.forEach((name, index) => {
        if (!parity.rows[index]?.includes(name))
          failures.push(`results probe: row ${index + 1} does not match its card`);
      });
    }

    if (hasPage("student-notifications")) {
      setScenario("student");
      await navigate("/student/notifications", "light", { width: 390, height: 844 }, [
        '[data-testid="student-notifications-page"]',
      ]);
      await clickByText(null, "تعليم الكل كمقروء");
      await sleep(900);
      const call = lastCall("/studentportal/notifications/read-all");
      probes.studentMarkAll = { url: call?.url ?? null, method: call?.method ?? null };
      if (!call) failures.push(`student notifications probe: mark-all request was not sent`);
    }

    if (hasPage("student-dashboard")) {
      setScenario("student");
      await navigate("/student/dashboard", "light", { width: 390, height: 844 }, [
        '[data-testid="student-dashboard-page"]',
      ]);
      const beforeOpen = await evaluate(
        `(() => {
          const btn = document.querySelector('.mobile-bottom-nav button');
          if (!btn) return null;
          btn.click();
          return btn.getAttribute("aria-expanded");
        })()`,
      );
      await sleep(450);
      const drawer = await evaluate(`(() => {
        const el = document.getElementById("mobile-nav-drawer");
        if (!el) return null;
        return {
          open: el.getAttribute("data-open"),
          links: el.querySelectorAll("a[href]").length,
          label: el.getAttribute("aria-label"),
        };
      })()`);
      probes.studentDrawer = { beforeOpen, drawer };
      if (!drawer) failures.push(`student drawer probe: drawer is missing`);
      else {
        if (drawer.open !== "true")
          failures.push(`student drawer probe: the more button did not open the drawer`);
        if (drawer.links < 4)
          failures.push(`student drawer probe: only ${drawer.links} links`);
        if (drawer.label !== "القائمة الرئيسية")
          failures.push(`student drawer probe: label is "${drawer.label}"`);
      }
      // Close it again so the screenshot stays on the page.
      await clickSelector(".app-drawer a[href]");
      await sleep(600);
      const closed = await evaluate(
        `document.getElementById("mobile-nav-drawer")?.getAttribute("data-open")`,
      );
      probes.studentDrawer.closedAfterNavigate = closed;
      if (closed !== "false")
        failures.push(`student drawer probe: the drawer stayed open after navigating`);
    }

    if (hasPage("parent-child")) {
      setScenario("parent");
      await navigate("/parent/children/101", "light", { width: 390, height: 844 }, [
        '[data-testid="parent-child-page"]',
      ]);
      const ids = apiLog
        .filter((call) => /parentportal\/children\/\d+/i.test(call.url))
        .map((call) => call.url.replace(/^.*?\/ParentPortal\/Children\//i, "").split(/[/?]/)[0]);
      probes.parentChildRequests = [...new Set(ids)];
      if (ids.some((id) => id !== "101"))
        failures.push(`parent child probe: requested another child (${[...new Set(ids)].join(", ")})`);

      setScenario("parent");
      await navigate("/parent/children/999", "light", { width: 390, height: 844 }, [
        '[data-testid="parent-child-page"]',
      ]);
      await sleep(900);
      const unavailable = await evaluate(`(() => ({
        text: (document.querySelector('[data-testid="parent-child-page"]')?.innerText || "")
          .replace(/\\s+/g, " ").trim(),
        sections: document.querySelectorAll('[data-testid^="parent-child-section-"]').length,
      }))()`);
      probes.parentChildUnlinked = unavailable;
      if (!unavailable.text.includes("هذا الطالب غير مرتبط بحسابك"))
        failures.push(`parent child probe: the unlinked-child screen is missing`);
      if (unavailable.sections !== 0)
        failures.push(`parent child probe: an unlinked child still rendered its sections`);
    }

    if (hasPage("parent-notifications")) {
      setScenario("parent");
      await navigate("/parent/notifications", "light", { width: 390, height: 844 }, [
        '[data-testid="parent-notifications-page"]',
      ]);
      await clickSelector('[data-testid="parent-notifications-page"] li button');
      await sleep(900);
      const pathname = await evaluate("location.pathname");
      const read = lastCall("/parentportal/notifications/")?.url ?? null;
      probes.parentNotificationClick = { pathname, read };
      if (pathname !== "/parent/children/101")
        failures.push(`parent notifications probe: landed on "${pathname}"`);
      if (!read || !/\/read$/i.test(read.replace(/\?.*$/, "")))
        failures.push(`parent notifications probe: the notification was not marked read`);
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "student-dashboard", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "student-exams", sizes: [["390", 390, 844]] },
      { key: "student-results", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "student-attendance", sizes: [["390", 390, 844]] },
      { key: "student-payments", sizes: [["390", 390, 844]] },
      { key: "student-notes", sizes: [["390", 390, 844]] },
      { key: "student-notifications", sizes: [["390", 390, 844]] },
      { key: "student-profile", sizes: [["390", 390, 844]] },
      { key: "parent-dashboard", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "parent-child", sizes: [["390", 390, 844]] },
      { key: "parent-notifications", sizes: [["390", 390, 844]] },
    ].filter((t) => RUN_PAGES.includes(t.key));

    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;

      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(page.scenario);
          await navigate(page.path, theme, { width, height }, [page.wait]);
          await sleep(300);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const result = await audit(page.scope);
          textZoom.push({ page: target.key, id, width, height, theme, ...result });
          await screenshot(`${target.key}-${id}-${theme}-text200.png`);

          const tag = `text200 ${target.key} ${id} ${theme}`;
          if (result.missingScope) failures.push(`${tag}: scope missing`);
          if (result.overflowX > 1 && !page.ignorePageOverflow)
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
      { key: "student-dashboard" },
      { key: "student-results" },
      { key: "parent-child" },
    ].filter((t) => RUN_PAGES.includes(t.key));

    for (const target of zoomTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;

      for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
        const width = 1440;
        const height = 900;
        const zoomWidth = Math.round(width / 2);
        const zoomHeight = Math.round(height / 2);
        setScenario(page.scenario);
        await navigate(page.path, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 }, [
          page.wait,
        ]);
        await sleep(450);
        const result = await audit(page.scope);
        pageZoom.push({ page: target.key, id: "1440", width: zoomWidth, height: zoomHeight, theme, ...result });
        await screenshot(`${target.key}-1440-${theme}-zoom200.png`);

        const tag = `zoom200 ${target.key} ${theme}`;
        if (result.overflowX > 1 && !page.ignorePageOverflow)
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

    const consoleLeaks = consoleLog.filter(
      (entry) =>
        /password/i.test(entry.text) ||
        ["01098765432", "01012345678"].some((secret) => entry.text.includes(secret)),
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
      join(OUT, "batch8-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 8: بوابة الطالب وبوابة ولي الأمر", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: لوحة الطالب (بطاقات الإحصاء، مخطط الأداء، الامتحانات المتاحة، أحدث النتائج)، امتحاناتي بحالاتها الخمس، النتائج (بطاقات موبايل + جدول سطح مكتب)، الحضور بحالاته الأربع، المدفوعات بعد إزالة العمود المكرر، المذكرات والتحميل، الإشعارات، الملف الشخصي، ثم بوابة ولي الأمر: قائمة الأبناء، تفاصيل الابن بأقسامها الأربعة، والإشعارات.",
      "",
    );
    md.push(
      "الأدوار: Student لبوابة الطالب وParent لبوابة ولي الأمر. تُفحص كل شاشة على 360/390/768/1280/1920 وأفقيًا، فاتحًا وليليًا، مع تدقيق التمرير الأفقي وأهداف اللمس 44px ونص 14px والقطع والتراكب والتباين والخطوط المحلية، والشريط السفلي على الهاتف فقط.",
      "",
    );

    md.push("## بوابات الجودة", "");
    md.push("| البوابة | الأمر | النتيجة |");
    md.push("| --- | --- | --- |");
    md.push(
      `| اختبارات الوحدة | \`npx vitest run\` من \`Frontend/CenterManagement\` | ${process.env.PHASE3B8_VITEST || "—"} |`,
    );
    md.push(
      `| بناء الإنتاج | \`npm run build\` | ${process.env.PHASE3B8_BUILD || "—"} |`,
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
    if (consoleLeaks.length) {
      md.push("```json");
      md.push(JSON.stringify(consoleLeaks.slice(0, 10), null, 2));
      md.push("```", "");
    }

    md.push("## اللقطات", "");
    md.push(
      "`docs/design/shots/phase3b8/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة)، ولقطات تكبير النص والصفحة 200%.",
      "",
    );

    md.push("## حدود الفحص الآلي", "");
    md.push(
      "- **لا SQL Server حقيقي.** كل الشاشات تقرأ استجابات معترضة بـ fixtures؛ لم يُسجَّل حضور ولا دفعة ولا نتيجة على قاعدة بيانات فعلية.",
      "- **لا شبكة إنتاجية.** كل طلبات الـ API معترضة؛ لا قياس لزمن الاستجابة أو سلوك إعادة المحاولة.",
      "- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.",
      "- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.",
      "- **عزل ولي الأمر يُفحص بالطلبات.** يُتحقق من أن الصفحة لا تطلب إلا الطفل الموجود في المسار وأن الطفل غير المرتبط يعرض شاشة \"غير مرتبط\"؛ والعزل الحقيقي مضمون باختبارات الباك (`Parent_Sees_Only_Own_Children` وغيرها).",
      "- **الإشعارات الحيّة غير مقاسة.** SignalR معترض؛ لا يصل إشعار جديد أثناء التشغيل.",
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
    await writeFile(join(OUT, "batch8-verify.md"), md.join("\n"));

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
  if (probe.cards) return `cards · ${probe.cards}`;
  if (probe.table) return `table · ${probe.tableRows} rows`;
  if (probe.sections) return `sections · ${probe.sections}`;
  return "-";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
