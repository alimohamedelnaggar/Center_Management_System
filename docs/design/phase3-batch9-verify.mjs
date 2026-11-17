/**
 * Phase 3 / batch 9 verification harness.
 *
 * Screens: center reports (multi + solo), teacher report tabs, student reports
 * (table/cards/full modal/empty), assistants (F-036 regression), student and
 * parent notifications (page + header bell), print and CSV exports.
 *
 * Run from the repository root:
 *   node docs/design/phase3-batch9-verify.mjs
 *
 * Optional narrowing (fast iterations):
 *   PHASE3B9_PAGES="center-reports,student-bell"
 *   PHASE3B9_VIEWPORTS="390,1280"
 *   PHASE3B9_THEMES="light"
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b9");
const CHROME_PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b9-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9475;
const APP_PORT = 5209;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const ORIGIN = BASE;

const VIEWPORTS = [
  ["360", 360, 800],
  ["390", 390, 844],
  ["768", 768, 1024],
  ["1024", 1024, 768],
  ["1280", 1280, 800],
  ["1440", 1440, 900],
  ["1920", 1920, 1080],
  ["2560", 2560, 1440],
  ["land-844", 844, 390],
  ["land-640", 640, 360],
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

const LONG_TEACHER = "أ. سارة إبراهيم عبد الرحمن — مدرسة اللغة العربية والتفسير";
const LONG_GROUP = "مجموعة الصف الثالث الثانوي — الرياضيات المتقدمة والمراجعة النهائية";

const CENTER_OVERVIEW = {
  role: "CenterOwner",
  centerType: "MultiTeacher",
  soloTeacherSubject: null,
  from: "2026-10-01",
  to: "2026-12-01",
  billingPeriod: "2026-11-01",
  totals: { activeStudents: 12345, teachers: 234, assistants: 56, groups: 789 },
  finance: {
    studentPaymentsCollected: 1234567890,
    otherIncomes: 987654321,
    expenses: 456789123,
    assistantSalaries: 123456789,
    net: 1644068899,
  },
  teachers: [
    {
      teacherId: "t1",
      teacherName: LONG_TEACHER,
      groupsCount: 12,
      studentsCount: 345,
      collectedInRange: 456789.5,
      totalSessions: 1234,
      presentCount: 1100,
      absentCount: 54,
      lateCount: 60,
      excusedCount: 20,
      attendanceRate: 89.1,
    },
    {
      teacherId: "t2",
      teacherName: "أ. محمد عبد الرحمن",
      groupsCount: 8,
      studentsCount: 210,
      collectedInRange: 123456.75,
      totalSessions: 800,
      presentCount: 700,
      absentCount: 50,
      lateCount: 30,
      excusedCount: 20,
      attendanceRate: 87.5,
    },
  ],
  groups: [
    {
      groupId: "g1",
      groupName: LONG_GROUP,
      teacherName: LONG_TEACHER,
      studentsCount: 345,
      presentCount: 1100,
      absentCount: 54,
      lateCount: 60,
      excusedCount: 20,
      attendanceRate: 89.1,
      expected: 1234567.5,
      collected: 1000000.25,
      outstanding: 234567.25,
    },
    {
      groupId: "g2",
      groupName: "مراجعة ليلة الامتحان",
      teacherName: "أ. محمد عبد الرحمن",
      studentsCount: 210,
      presentCount: 700,
      absentCount: 50,
      lateCount: 30,
      excusedCount: 20,
      attendanceRate: 87.5,
      expected: 987654.5,
      collected: 800000,
      outstanding: 187654.5,
    },
  ],
  trend: [
    { month: "2026-06", year: 2026, income: 1200000, expenses: 400000 },
    { month: "2026-07", year: 2026, income: 1350000, expenses: 420000 },
    { month: "2026-08", year: 2026, income: 900000, expenses: 390000 },
    { month: "2026-09", year: 2026, income: 1500000, expenses: 500000 },
    { month: "2026-10", year: 2026, income: 1750000, expenses: 550000 },
    { month: "2026-11", year: 2026, income: 1900000, expenses: 600000 },
  ],
};

const SOLO_OVERVIEW = {
  ...CENTER_OVERVIEW,
  role: "Teacher",
  centerType: "SoloTeacher",
  soloTeacherSubject: "الرياضيات",
  teachers: [],
};

const OVERVIEW = {
  role: "Teacher",
  year: 2026,
  month: 11,
  studentsCount: 12345,
  activeStudentsCount: 11000,
  inactiveStudentsCount: 1345,
  groupsCount: 234,
  teachersCount: 56,
  assistantsCount: 12,
  sessionsCount: 45678,
  presentCount: 40000,
  absentCount: 2000,
  lateCount: 2500,
  excusedCount: 1178,
  totalCount: 45678,
  attendancePercentage: 87.6,
  monthlyRevenue: 1234567890,
  monthlyExpenses: 456789123,
  netProfit: 777778767,
  monthlyAssistantSalaries: 123456789,
};

const TEACHERS = [
  {
    id: "t1",
    fullName: LONG_TEACHER,
    phoneNumber: "01000000004",
    subject: "اللغة العربية",
    groups: [{ id: "g1", name: LONG_GROUP }],
  },
  {
    id: "t2",
    fullName: "أ. محمد عبد الرحمن",
    phoneNumber: "01000000003",
    subject: "الرياضيات",
    groups: [{ id: "g2", name: "مراجعة ليلة الامتحان" }],
  },
];

const GROUPS = [
  {
    id: "g1",
    name: LONG_GROUP,
    totalStudentsCount: 345,
    sessionsPerMonth: 12,
    monthlyPrice: 2500,
  },
  {
    id: "g2",
    name: "مراجعة ليلة الامتحان",
    totalStudentsCount: 210,
    sessionsPerMonth: 8,
    monthlyPrice: 1800,
  },
];

const STUDENTS = [
  {
    id: "s1",
    fullName: "أحمد محمود السيد عبد الرحمن — اسم طويل جدًا لاختبار الكروت",
    groupName: LONG_GROUP,
    subscriptionType: 2,
  },
  { id: "s2", fullName: "سارة إبراهيم", groupName: "مراجعة ليلة الامتحان", subscriptionType: 1 },
  { id: "s3", fullName: "يوسف أحمد محمود", groupName: LONG_GROUP, subscriptionType: 2 },
  { id: "s4", fullName: "مريم عبد الله", groupName: "مراجعة ليلة الامتحان", subscriptionType: 1 },
  { id: "s5", fullName: "عمر محمد", groupName: LONG_GROUP, subscriptionType: 2 },
  { id: "s6", fullName: "فاطمة حسن", groupName: LONG_GROUP, subscriptionType: 1 },
  { id: "s7", fullName: "خالد علي", groupName: "مراجعة ليلة الامتحان", subscriptionType: 2 },
];

const GROUP_HISTORY = [
  { groupId: "g1", groupName: LONG_GROUP, joinDate: "2026-09-01T00:00:00", leftAt: null },
  { groupId: "g2", groupName: "مراجعة ليلة الامتحان", joinDate: "2026-06-01T00:00:00", leftAt: "2026-08-01T00:00:00" },
];

const ATTENDANCE_REPORT = {
  studentName: "أحمد محمود السيد",
  totalSessions: 1234,
  presentCount: 1100,
  absentCount: 54,
  lateCount: 60,
  excusedCount: 20,
  attendancePercentage: 89.1,
  records: [
    { attendanceDate: "2026-11-08", groupName: LONG_GROUP, dayOfWeek: "الأحد", startTime: "16:00", endTime: "18:00", statusName: "حاضر" },
    { attendanceDate: "2026-11-05", groupName: LONG_GROUP, dayOfWeek: "الخميس", startTime: "16:00", endTime: "18:00", statusName: "غائب", notes: "غياب بدون إخطار مسبق" },
    { attendanceDate: "2026-11-01", groupName: "مراجعة ليلة الامتحان", dayOfWeek: "الأحد", startTime: "10:00", endTime: "12:00", statusName: "متأخر", notes: "تأخر 15 دقيقة" },
    { attendanceDate: "2026-10-28", groupName: LONG_GROUP, dayOfWeek: "الأربعاء", startTime: "16:00", endTime: "18:00", statusName: "بعذر", notes: "عذر طبي موثق" },
  ],
};

const FINANCIAL_REPORT = [
  {
    id: "p1",
    amount: 2500,
    totalAmount: 2500,
    remainingAmount: 0,
    paymentDate: "2026-11-01",
    groupName: LONG_GROUP,
    billingPeriod: "2026-11-01",
    statusName: "مدفوع",
  },
  {
    id: "p2",
    amount: 1250,
    totalAmount: 2500,
    remainingAmount: 1250,
    paymentDate: "2026-10-01",
    groupName: LONG_GROUP,
    billingPeriod: "2026-10-01",
    statusName: "جزئي",
  },
];

const GRADES_REPORT = {
  studentName: "أحمد محمود السيد",
  totalObtainedMarks: 85,
  totalMarks: 100,
  percentage: 85,
  exams: [
    {
      examName: "امتحان الرياضيات — الوحدة الثانية والتمارين الإضافية",
      examDate: "2026-11-01",
      obtainedMarks: 18,
      totalMarks: 20,
      percentage: 90,
      isLowGrade: false,
      isParentContacted: false,
    },
    {
      examName: "اختبار اللغة العربية",
      examDate: "2026-10-15",
      obtainedMarks: 12,
      totalMarks: 20,
      percentage: 60,
      isLowGrade: true,
      isParentContacted: true,
      parentContactedAt: "2026-10-16T10:00:00",
    },
  ],
};

const ASSISTANTS = [
  { id: "a1", fullName: "أ. مساعد طويل الاسم جدًا للتأكد من عدم قص النص في الجدول", phoneNumber: "01000000005", salary: 3000, isActive: true },
  { id: "a2", fullName: "أ. مساعد ثانٍ", phoneNumber: "01000000007", salary: 2500, isActive: true },
];

const STUDENT_NOTIFICATIONS = Array.from({ length: 12 }, (_, i) => ({
  id: `sn${i + 1}`,
  title:
    i === 0
      ? "تم نشر نتيجة امتحان الدراسات الاجتماعية — إعلان طويل جدًا لاختبار العرض"
      : i % 3 === 0
        ? "تذكير بموعد الحصة القادمة"
        : i % 3 === 1
          ? "تم إضافة مذكرة جديدة إلى مجموعتك"
          : "رسالة من إدارة المركز",
  body:
    i % 3 === 0
      ? "حصة الغد تبدأ الساعة الرابعة عصرًا في قاعة المجموعة أ."
      : i % 3 === 1
        ? "مذكرة الرياضيات — التفاضل والتكامل متاحة الآن للتحميل."
        : "يرجى الالتزام بمواعيد الحضور والانصراف.",
  isRead: i > 4,
  createdAt: `2026-11-${String(12 - (i % 10)).padStart(2, "0")}T09:00:00`,
}));

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
  owner: { role: "CenterOwner", centerAdmin: true, centerType: "MultiTeacher", name: "مدير مركز النور التعليمي", phone: "01000000002", subject: null },
  solo: { role: "Teacher", centerAdmin: true, centerType: "SoloTeacher", name: "أ. سارة إبراهيم", phone: "01000000003", subject: "الرياضيات" },
  teacher: { role: "Teacher", centerAdmin: false, centerType: "MultiTeacher", name: "أ. محمد عبد الرحمن", phone: "01000000003", subject: "الرياضيات" },
  teacherEmpty: { role: "Teacher", centerAdmin: false, centerType: "MultiTeacher", name: "أ. محمد عبد الرحمن", phone: "01000000003", subject: "الرياضيات", emptyStudents: true },
  assistant: { role: "Assistant", centerAdmin: false, centerType: "MultiTeacher", name: "أ. مساعد", phone: "01000000005", subject: null },
  student: { role: "Student", centerAdmin: false, centerType: "MultiTeacher", name: "أحمد محمود السيد", phone: "01110000001", subject: null },
  parent: { role: "Parent", centerAdmin: false, centerType: "MultiTeacher", name: "ولي أمر الطالب", phone: "01000000006", subject: null },
};

const PAGES = [
  {
    key: "center-reports",
    path: "/center-reports",
    wait: '[data-testid="center-reports-page"]',
    scenario: "owner",
    scope: "center-reports-page",
    shell: "app-shell",
    expect: "center-reports",
    statSelector: '[data-testid="center-reports-page"] .tabular-nums',
    full: true,
  },
  {
    key: "center-reports-solo",
    path: "/center-reports",
    wait: '[data-testid="center-reports-page"]',
    scenario: "solo",
    scope: "center-reports-page",
    expect: "center-reports-solo",
    full: true,
  },
  {
    key: "reports-overview",
    path: "/reports",
    wait: '[data-testid="reports-page"]',
    scenario: "teacher",
    scope: "reports-overview-page",
    expect: "reports-overview",
    statSelector: '[data-testid="reports-stat-card"]',
    full: true,
  },
  {
    key: "reports-groups",
    path: "/reports",
    wait: '[data-testid="reports-page"]',
    action: "tab-groups",
    expectWait: '[data-testid="reports-groups-page"]',
    scenario: "teacher",
    scope: "reports-groups-page",
    expect: "reports-groups",
    full: true,
  },
  {
    key: "reports-students",
    path: "/student-reports",
    wait: '[data-testid="reports-students-page"]',
    scenario: "teacher",
    scope: "reports-students-page",
    expect: "reports-students",
    full: true,
  },
  {
    key: "reports-students-empty",
    path: "/student-reports",
    wait: '[data-testid="reports-students-page"]',
    scenario: "teacherEmpty",
    scope: "reports-students-page",
    expect: "reports-students-empty",
  },
  {
    key: "report-full",
    path: "/student-reports",
    wait: '[data-testid="reports-students-page"]',
    action: "open-full-report",
    expectWait: '[data-testid="report-details-modal"]',
    scenario: "teacher",
    scope: "report-details-modal",
    expect: "report-full",
    viewports: ["360", "390", "768", "1024", "1280", "1440"],
  },
  {
    key: "assistants",
    path: "/assistants",
    wait: '[data-testid="assistants-page"]',
    scenario: "owner",
    scope: "assistants-page",
    expect: "assistants",
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
    key: "parent-notifications",
    path: "/parent/notifications",
    wait: '[data-testid="parent-notifications-page"]',
    scenario: "parent",
    scope: "parent-notifications-page",
    shell: "parent-shell",
    expect: "parent-notifications",
    full: true,
  },
  {
    key: "student-bell",
    path: "/student/dashboard",
    wait: '[data-testid="student-dashboard-page"]',
    action: "open-bell",
    expectWait: '[data-testid="notification-panel"]',
    scenario: "student",
    scope: "notification-panel",
    expect: "student-bell",
  },
  {
    key: "parent-bell",
    path: "/parent/dashboard",
    wait: '[data-testid="parent-dashboard-page"]',
    action: "open-bell",
    expectWait: '[data-testid="notification-panel"]',
    scenario: "parent",
    scope: "notification-panel",
    expect: "parent-bell",
  },
];

const list = (value, fallback) =>
  value
    ? String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

const RUN_PAGES = list(process.env.PHASE3B9_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B9_VIEWPORTS, ALL_VIEWPORTS);
const RUN_THEMES = list(process.env.PHASE3B9_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));

/* ------------------------------------------------------------------ */
/* fixture helpers                                                     */
/* ------------------------------------------------------------------ */

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
const ID_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function makeJwt(scenario) {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    iat: Math.floor(Date.now() / 1000),
    [ROLE_CLAIM]: scenario.role,
    [ID_CLAIM]: scenario.role === "Student" ? "501" : "77",
    [NAME_CLAIM]: scenario.name,
    PhoneNumber: scenario.phone,
    is_center_admin: String(scenario.centerAdmin),
    pwd_change_required: "false",
    impersonation: "false",
  };
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

let SCENARIO = SCENARIOS.owner;
let markAllCalls = 0;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.owner;
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
  const pageNumber = Number(pick(params, ["pageNumber", "PageNumber", "pageIndex"]) || 1);
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

function paged(rows, url, extra = {}) {
  const page = pageSlice(rows, url);
  return ok({
    data: page.slice,
    currentPage: page.pageNumber,
    pageIndex: page.pageNumber,
    totalPages: page.totalPages,
    totalCount: page.totalCount,
    pageSize: page.pageSize,
    hasPreviousPage: page.pageNumber > 1,
    hasNextPage: page.pageNumber < page.totalPages,
    ...extra,
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
      fullName: SCENARIO.name,
      phoneNumber: SCENARIO.phone,
      userName: SCENARIO.phone,
      centerType: SCENARIO.centerType,
      enabledModules: ALL_MODULES,
      subscription: SUBSCRIPTION,
      subject: SCENARIO.subject,
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

  /* ---------- reports ---------- */
  if (lower.includes("/reports/center-overview")) {
    return ok(SCENARIO.centerType === "SoloTeacher" ? SOLO_OVERVIEW : CENTER_OVERVIEW);
  }
  if (lower.includes("/reports/overview")) return ok(OVERVIEW);
  if (lower.includes("/teacher/paginated")) return paged(TEACHERS, url);
  if (lower.includes("/group/paginated")) return ok(GROUPS);
  if (lower.includes("/group/get-all")) return ok(GROUPS);
  if (lower.includes("/student/paginated")) {
    return ok({
      items: SCENARIO.emptyStudents ? [] : STUDENTS,
      pageIndex: pageSlice(STUDENTS, url).pageNumber,
      pageSize: 7,
      totalCount: SCENARIO.emptyStudents ? 0 : STUDENTS.length,
      totalPages: SCENARIO.emptyStudents ? 0 : 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  }
  if (lower.includes("/assistant/paginated")) return paged(ASSISTANTS, url);
  if (lower.includes("/payments/get-attendance-report")) return ok(ATTENDANCE_REPORT);
  if (lower.includes("/payments/get-grade-report")) return ok(GRADES_REPORT);
  if (lower.includes("/payments/student-groups-history")) return ok(GROUP_HISTORY);
  if (lower.includes("student-financial-report")) return ok(FINANCIAL_REPORT);

  /* ---------- notifications ---------- */
  if (lower.includes("/studentportal/notifications/unread-count")) {
    return ok(markAllCalls > 0 ? 0 : 120);
  }
  if (lower.includes("/parentportal/notifications/unread-count")) {
    return ok(markAllCalls > 0 ? 0 : 120);
  }
  if (lower.includes("/studentportal/notifications/read-all") || lower.includes("/parentportal/notifications/read-all")) {
    markAllCalls += 1;
    return { succeeded: true, data: null, message: "تم تعليم كل الإشعارات كمقروءة" };
  }
  if (/\/studentportal\/notifications\/[^/]+\/read$/.test(lower)) {
    return { succeeded: true, data: null };
  }
  if (/\/parentportal\/notifications\/[^/]+\/read$/.test(lower)) {
    return { succeeded: true, data: null };
  }
  if (lower.includes("/studentportal/notifications")) {
    return paged(STUDENT_NOTIFICATIONS, url, { totalCount: 120, totalPages: 12 });
  }
  if (lower.includes("/parentportal/notifications")) {
    return paged(PARENT_NOTIFICATIONS, url, { totalCount: 120, totalPages: 12 });
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
  const selector = window.__STAT_SELECTOR__ || null;
  const dialog = root.getAttribute("role") === "dialog" ? root : document.querySelector('[data-testid="report-details-modal"]');
  const printButton = dialog
    ? [...dialog.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").includes("طباعة") ||
        (b.textContent || "").includes("طباعة"))
    : null;
  const scrollRegions = q("[data-scroll-region]").map((el) => ({
    label: el.getAttribute("aria-label") || "",
    client: Math.round(el.clientWidth),
    scroll: Math.round(el.scrollWidth),
    overflowX: getComputedStyle(el).overflowX,
    tabIndex: el.getAttribute("tabindex"),
  }));
  const ticks = q(".recharts-cartesian-axis-tick-value, .recharts-cartesian-axis-tick tspan");
  const counts = {
    teacherRows: q('[data-testid="center-teacher-row"]').length,
    groupRows: q('[data-testid="center-group-row"]').length,
    teacherTable: q('table[aria-label="جدول المدرسين"]').length,
    groupTable: q('table[aria-label="جدول المجموعات"]').length,
    statCards: selector ? document.querySelectorAll(selector).length : 0,
    reportTables: dialog ? dialog.querySelectorAll("table").length : 0,
    dialogs: document.querySelectorAll('[role="dialog"][data-testid]').length,
    scrollHints: q(".no-print").length,
    inputs: q("input, select").length,
    unread: testid("notification-unread-count") ? textOf(testid("notification-unread-count")) : null,
  };
  return {
    text: textOf(root).slice(0, 9000),
    heading: textOf(root.querySelector("h1") || root.querySelector("h2")),
    table: Boolean(root.querySelector("table")),
    tableRows: root.querySelectorAll("tbody tr").length,
    stats: counts.statCards,
    counts,
    scrollRegions,
    dialog: dialog ? {
      role: dialog.getAttribute("role"),
      modal: dialog.getAttribute("aria-modal"),
      labelledby: dialog.getAttribute("aria-labelledby"),
      printButton: printButton
        ? { w: Math.round(printButton.getBoundingClientRect().width), h: Math.round(printButton.getBoundingClientRect().height) }
        : null,
    } : null,
    chart: {
      ticks: ticks.length,
      minTickFont: ticks.length
        ? Math.min(...ticks.map((el) => parseFloat(getComputedStyle(el).fontSize) || 0))
        : null,
      labels: ticks.slice(0, 12).map((el) => textOf(el)),
      svg: q(".recharts-surface").length,
    },
    bell: {
      expanded: testid("notification-bell-button")?.getAttribute("aria-expanded") ?? null,
      panel: Boolean(testid("notification-panel")),
      markAll: Boolean(testid("notification-mark-all")),
      count: counts.unread,
    },
    shell: {
      app: Boolean(document.querySelector(".app-shell")),
      student: Boolean(document.querySelector('[data-testid="student-shell"]')),
      parent: Boolean(document.querySelector('[data-testid="parent-shell"]')),
    },
    dir: document.documentElement.dir,
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

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  await rm(CHROME_PROFILE, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(SHOTS, { recursive: true });

  const server = spawn(
    process.platform === "win32" ? "cmd.exe" : "npm",
    process.platform === "win32"
      ? ["/c", "npm", "run", "dev", "--", "--port", String(APP_PORT), "--strictPort"]
      : ["run", "dev", "--", "--port", String(APP_PORT), "--strictPort"],
    {
      cwd: FRONTEND,
      stdio: ["ignore", "pipe", "pipe"],
      // The checked-in .env points at 7093. Force the intercepted fixture host.
      env: {
        ...process.env,
        VITE_API_BASE_URL: "https://center-system.runasp.net/Api/V1",
        VITE_HUB_API_URL: "https://center-system.runasp.net/",
      },
    },
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
    const pageErrors = [];

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
      if (msg.method === "Runtime.exceptionThrown") {
        try {
          pageErrors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text ?? "error");
        } catch {
          /* ignore */
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

    // Capture the exact Blob bytes that handleExportCsv writes (BOM included).
    const captureScript = await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: String.raw`
        window.__CSV_CAPTURE__ = { blobs: [], downloads: [] };
        try {
          const originalCreate = URL.createObjectURL.bind(URL);
          URL.createObjectURL = function (blob) {
            window.__CSV_CAPTURE__.blobs.push(blob);
            return originalCreate(blob);
          };
          const originalClick = HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click = function () {
            if (this.download) {
              window.__CSV_CAPTURE__.downloads.push({ download: this.download, href: String(this.href) });
            }
            return originalClick.call(this);
          };
        } catch (e) {}
        try { localStorage.setItem("cm-theme", "light"); } catch (e) {}
      `,
    });

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

    const clickFirstVisible = async (selector) => {
      const clicked = await evaluate(`(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
          .find((node) => {
            const r = node.getBoundingClientRect();
            return r.width > 1 && r.height > 1 && getComputedStyle(node).visibility !== "hidden";
          });
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`no visible ${selector}`);
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

    const applyAction = async (page) => {
      if (!page.action) return;
      if (page.action === "tab-groups") {
        await clickSelector('[data-testid="reports-tab-groups"]');
      } else if (page.action === "open-full-report") {
        let opened = false;
        for (const sel of ['[aria-label="تقرير كامل"]', '[aria-label="التقرير الشامل للطالب"]']) {
          try {
            await clickFirstVisible(sel);
            opened = true;
            break;
          } catch {
            /* try the other viewport's label */
          }
        }
        // Mobile cards use their visible Arabic label instead of aria-label.
        // The desktop icon buttons keep the longer aria-label, so accept both.
        if (!opened) {
          for (const label of ["تقرير كامل", "التقرير الشامل للطالب"]) {
            try {
              await clickByText('[data-testid="reports-students-page"]', label);
              opened = true;
              break;
            } catch {
              /* try the other viewport's label */
            }
          }
        }
        if (!opened) throw new Error("full report button was not found");
      } else if (page.action === "open-bell") {
        await clickFirstVisible('[data-testid="notification-bell-button"]');
      }
      if (page.expectWait) await waitForSelector(page.expectWait);
      await sleep(500);
    };

    const navigate = async (path, theme, metrics, waits = [], page = null) => {
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
      if (page) await applyAction(page);
    };

    const preparePage = async (page, theme, metrics) => {
      await navigate(page.path, theme, metrics, [page.wait], page);
      if (page.action) await waitForSelector(page.expectWait);
    };

    const setAuditScope = async (scope) => {
      await evaluate(
        `window.__AUDIT_SCOPE__ = ${scope ? JSON.stringify(scope) : "null"}; true`,
      );
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
      await preparePage(page, theme, { width, height });
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

          if (page.expect === "center-reports" || page.expect === "center-reports-solo") {
            for (const label of ["الإجماليات", "القيود المالية للفترة", "بالمجموعات", "الإيرادات مقابل المصروفات (آخر 6 أشهر)"]) {
              if (!text.includes(label)) failures.push(`${tag}: "${label}" is missing`);
            }
            if (p.counts?.groupRows !== 2)
              failures.push(`${tag}: ${p.counts?.groupRows} group rows, expected 2`);
            if (page.expect === "center-reports") {
              if (!text.includes("بالمدرسون") || p.counts?.teacherRows !== 2)
                failures.push(`${tag}: teacher breakdown is missing`);
            } else {
              if (text.includes("بالمدرسون") || p.counts?.teacherRows !== 0)
                failures.push(`${tag}: solo report must not show the teacher breakdown`);
              if (!text.includes("الرياضيات")) failures.push(`${tag}: solo subject is missing`);
            }
            if (p.chart?.ticks < 2)
              failures.push(`${tag}: chart axis labels are missing`);
            if (p.chart?.minTickFont !== null && p.chart?.minTickFont < 12)
              failures.push(`${tag}: chart tick font ${p.chart.minTickFont}px < 12px`);
            // At wide viewports the 900px tables fit, so require the scroll
            // container itself (keyboard reachable, overflow-x:auto) rather
            // than actual scrolling; overflow is asserted by the global audit.
            const groupRegion = p.scrollRegions?.find(
              (r) => r.label === "جدول المجموعات",
            );
            if (
              !groupRegion ||
              groupRegion.overflowX !== "auto" ||
              groupRegion.tabIndex !== "0"
            ) {
              failures.push(
                `${tag}: group table is not in a keyboard-accessible scroll container`,
              );
            }
            if (page.expect === "center-reports") {
              const teacherRegion = p.scrollRegions?.find(
                (r) => r.label === "جدول المدرسين",
              );
              if (
                !teacherRegion ||
                teacherRegion.overflowX !== "auto" ||
                teacherRegion.tabIndex !== "0"
              ) {
                failures.push(
                  `${tag}: teacher table is not in a keyboard-accessible scroll container`,
                );
              }
            }
          }

          if (page.expect === "reports-overview") {
            if (p.stats < 10) failures.push(`${tag}: ${p.stats} overview stat cards, expected >=10`);
            if (!text.includes("12345") && !text.includes("12,345"))
              failures.push(`${tag}: large student count is missing`);
          }

          if (page.expect === "reports-groups") {
            if (p.tableRows !== 2) failures.push(`${tag}: ${p.tableRows} group rows, expected 2`);
          }

          if (page.expect === "reports-students") {
            if (!text.includes("أحمد محمود السيد")) failures.push(`${tag}: first student is missing`);
            if (!text.includes("تقرير كامل")) failures.push(`${tag}: full report action is missing`);
          }

          if (page.expect === "reports-students-empty") {
            if (!text.includes("لا يوجد طلاب")) failures.push(`${tag}: empty state is missing`);
          }

          if (page.expect === "report-full") {
            if (p.dialog?.role !== "dialog" || p.dialog?.modal !== "true")
              failures.push(`${tag}: full report dialog semantics are wrong`);
            if (p.dialog?.printButton && (p.dialog.printButton.w < 43.5 || p.dialog.printButton.h < 43.5))
              failures.push(`${tag}: report print button is ${p.dialog.printButton.w}x${p.dialog.printButton.h}`);
            if (p.counts?.reportTables !== 3)
              failures.push(`${tag}: ${p.counts?.reportTables} report tables, expected 3`);
          }

          if (page.expect === "assistants") {
            if (!text.includes("أ. مساعد طويل الاسم")) failures.push(`${tag}: assistant row is missing`);
          }

          if (page.expect === "student-notifications" || page.expect === "parent-notifications") {
            if (!text.includes("تعليم الكل كمقروء"))
              failures.push(`${tag}: mark-all action is missing`);
            if (!text.includes("120")) failures.push(`${tag}: pagination total is missing`);
          }

          if (page.expect === "student-bell" || page.expect === "parent-bell") {
            if (!p.bell?.panel || !p.bell?.markAll)
              failures.push(`${tag}: notification panel controls are missing`);
            if (p.bell?.count !== "99+")
              failures.push(`${tag}: unread badge is "${p.bell?.count}", expected "99+"`);
          }
        }
      }
    }

    /* ---------- live behaviour probes ---------- */

    const lastCall = (needle) =>
      [...apiLog].reverse().find((call) => call.url.toLowerCase().includes(needle));
    const hasPage = (key) => pages.some((p) => p.key === key);

    if (hasPage("center-reports")) {
      setScenario("owner");
      await navigate("/center-reports", "light", { width: 390, height: 844 }, [
        '[data-testid="center-reports-page"]',
      ]);
      await clickByText('[data-testid="center-reports-page"]', "تصدير CSV");
      await sleep(500);
      const csv = await evaluate(`(async () => {
        const capture = window.__CSV_CAPTURE__ || { blobs: [], downloads: [] };
        if (!capture.blobs.length) return { blobs: 0 };
        const buffer = await capture.blobs[capture.blobs.length - 1].arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer).slice(0, 3));
        const text = await capture.blobs[capture.blobs.length - 1].text();
        return {
          blobs: capture.blobs.length,
          bytes,
          download: capture.downloads[capture.downloads.length - 1]?.download ?? null,
          text: text.replace(/\uFEFF/, ""),
        };
      })()`, true);
      probes.csvExport = {
        blobs: csv.blobs,
        bytes: csv.bytes,
        download: csv.download,
        header: csv.text?.split("\n").slice(0, 3),
        hasTeacherRows: csv.text?.includes("سارة إبراهيم"),
        hasGroupRows: csv.text?.includes("الصف الثالث الثانوي"),
      };
      if (csv.blobs !== 1) failures.push("CSV probe: no blob was created");
      if (JSON.stringify(csv.bytes) !== JSON.stringify([239, 187, 191]))
        failures.push(`CSV probe: BOM bytes are ${JSON.stringify(csv.bytes)}`);
      if (!/تقارير_المركز_.*\.csv$/.test(csv.download || ""))
        failures.push(`CSV probe: download name is "${csv.download}"`);
      if (!probes.csvExport.hasTeacherRows || !probes.csvExport.hasGroupRows)
        failures.push("CSV probe: report rows are missing from the export");

      // Printing: add the same body class the beforeprint handler adds, then
      // emulate the print medium. The DOM itself stays untouched.
      await evaluate('document.body.classList.add("center-reports-printing"); true');
      await client.send("Emulation.setEmulatedMedia", { media: "print" });
      await sleep(250);
      const printed = await evaluate(`(() => {
        const aside = document.querySelector("aside");
        const hidden = [...document.querySelectorAll(".no-print")];
        const area = document.querySelector(".print-area");
        const table =
          document.querySelector('.print-area [aria-label="جدول المجموعات"] table') ||
          document.querySelector(".print-area table");
        const cell = table?.querySelector("th, td");
        return {
          asideDisplay: aside ? getComputedStyle(aside).display : "missing",
          noPrint: hidden.length,
          noPrintHidden: hidden.every((el) => getComputedStyle(el).display === "none"),
          printArea: Boolean(area),
          printAreaMinWidth: area ? getComputedStyle(area).minWidth : null,
          tableDisplay: table ? getComputedStyle(table).display : "missing",
          tableMinWidth: table ? getComputedStyle(table).minWidth : null,
          tableCellFont: cell ? getComputedStyle(cell).fontSize : null,
        };
      })()`);
      probes.print = printed;
      await screenshot("center-reports-390-light-print.png", { full: true });
      await client.send("Emulation.setEmulatedMedia", { media: "screen" });
      await evaluate('document.body.classList.remove("center-reports-printing"); true');
      if (printed.asideDisplay !== "none" && printed.asideDisplay !== "missing")
        failures.push(`print probe: aside is still ${printed.asideDisplay}`);
      if (!printed.noPrintHidden)
        failures.push("print probe: screen-only controls are still visible");
      if (!printed.printArea || printed.tableDisplay === "missing" || printed.tableDisplay === "none")
        failures.push("print probe: the report table is not printable");
      if (printed.tableMinWidth !== "0px")
        failures.push(`print probe: table min-width is ${printed.tableMinWidth}`);
      if (printed.tableCellFont !== "11px")
        failures.push(`print probe: table cell font is ${printed.tableCellFont}`);
    }

    if (hasPage("reports-overview")) {
      setScenario("teacher");
      await navigate("/reports", "light", { width: 390, height: 844 }, [
        '[data-testid="reports-page"]',
      ]);
      const before = apiLog.length;
      await clickSelector('[data-testid="reports-tab-groups"]');
      await sleep(600);
      probes.tabSwitch = {
        groupsPage: await evaluate('!!document.querySelector(\'[data-testid="reports-groups-page"]\')'),
        requests: apiLog.slice(before).map((c) => c.url.split("?")[0]),
      };
      if (!probes.tabSwitch.groupsPage)
        failures.push("tabs probe: switching to the groups tab failed");
    }

    if (hasPage("report-full")) {
      setScenario("teacher");
      await navigate("/student-reports", "light", { width: 390, height: 844 }, [
        '[data-testid="reports-students-page"]',
      ]);
      await applyAction(PAGES.find((p) => p.key === "report-full"));
      const modal = await evaluate(`(() => {
        const el = document.querySelector('[data-testid="report-details-modal"]');
        if (!el) return null;
        const print = [...el.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").includes("طباعة"));
        const tables = [...el.querySelectorAll("table")];
        return {
          role: el.getAttribute("role"),
          modal: el.getAttribute("aria-modal"),
          labelledby: el.getAttribute("aria-labelledby"),
          printButton: print
            ? { w: Math.round(print.getBoundingClientRect().width), h: Math.round(print.getBoundingClientRect().height) }
            : null,
          tables: tables.length,
          scrollRegions: el.querySelectorAll("[data-scroll-region]").length,
          hasAllSections: ["الحضور", "المالية", "الامتحانات"].every((s) => (el.textContent || "").includes(s)),
        };
      })()`);
      probes.fullReport = modal;
      if (!modal || modal.role !== "dialog" || modal.modal !== "true")
        failures.push("full report probe: dialog semantics are wrong");
      if (modal?.printButton && modal.printButton.w < 43.5)
        failures.push(`full report probe: print button width is ${modal.printButton.w}px`);
      if (modal?.tables !== 3) failures.push(`full report probe: ${modal.tables} tables`);
      await screenshot("report-full-390-light-probe.png", { full: false });
    }

    if (hasPage("student-notifications")) {
      setScenario("student");
      await navigate("/student/notifications", "light", { width: 390, height: 844 }, [
        '[data-testid="student-notifications-page"]',
      ]);
      const before = markAllCalls;
      await clickByText('[data-testid="student-notifications-page"]', "تعليم الكل كمقروء");
      await sleep(700);
      const call = lastCall("/studentportal/notifications/read-all");
      probes.studentMarkAll = {
        url: call?.url ?? null,
        method: call?.method ?? null,
        called: markAllCalls > before,
      };
      if (!call || call.method !== "POST")
        failures.push("student notifications probe: mark-all POST was not sent");
    }

    if (hasPage("parent-notifications")) {
      setScenario("parent");
      await navigate("/parent/notifications", "light", { width: 390, height: 844 }, [
        '[data-testid="parent-notifications-page"]',
      ]);
      const before = markAllCalls;
      await clickByText('[data-testid="parent-notifications-page"]', "تعليم الكل كمقروء");
      await sleep(700);
      const call = lastCall("/parentportal/notifications/read-all");
      probes.parentMarkAll = {
        url: call?.url ?? null,
        method: call?.method ?? null,
        called: markAllCalls > before,
      };
      if (!call || call.method !== "POST")
        failures.push("parent notifications probe: mark-all POST was not sent");
    }

    if (hasPage("student-bell")) {
      setScenario("student");
      await navigate("/student/dashboard", "light", { width: 390, height: 844 }, [
        '[data-testid="student-dashboard-page"]',
      ]);
      await clickFirstVisible('[data-testid="notification-bell-button"]');
      await waitForSelector('[data-testid="notification-panel"]');
      const before = markAllCalls;
      await clickSelector('[data-testid="notification-mark-all"]');
      await sleep(700);
      const call = lastCall("/studentportal/notifications/read-all");
      probes.studentBell = {
        expandedBeforeClick: true,
        markAll: call ? { url: call.url, method: call.method } : null,
        called: markAllCalls > before,
      };
      if (!call) failures.push("student bell probe: mark-all request was not sent");
      // Escape must close the panel.
      await evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true');
      await sleep(250);
      probes.studentBell.closedByEscape = await evaluate(
        '!document.querySelector(\'[data-testid="notification-panel"]\')',
      );
    }

    if (hasPage("assistants")) {
      setScenario("assistant");
      await navigate("/reports", "light", { width: 390, height: 844 }, [
        '[data-testid="reports-page"]',
      ]).catch(() => {});
      await sleep(500);
      probes.assistantGuard = { path: await evaluate("location.pathname") };
      if (probes.assistantGuard.path === "/reports")
        failures.push("assistant guard probe: /reports stayed reachable by an assistant");
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "center-reports", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "center-reports-solo", sizes: [["390", 390, 844]] },
      { key: "reports-overview", sizes: [["390", 390, 844]] },
      { key: "reports-groups", sizes: [["390", 390, 844]] },
      { key: "reports-students", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "report-full", sizes: [["390", 390, 844]] },
      { key: "assistants", sizes: [["390", 390, 844]] },
      { key: "student-notifications", sizes: [["390", 390, 844]] },
      { key: "parent-notifications", sizes: [["390", 390, 844]] },
      { key: "student-bell", sizes: [["390", 390, 844]] },
      { key: "parent-bell", sizes: [["390", 390, 844]] },
    ].filter((t) => RUN_PAGES.includes(t.key));

    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;

      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(page.scenario);
          await preparePage(page, theme, { width, height });
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
      { key: "center-reports" },
      { key: "reports-students" },
      { key: "report-full" },
      { key: "student-notifications" },
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
        await preparePage(page, theme, { width: zoomWidth, height: zoomHeight, dsf: 2 });
        await sleep(450);
        const result = await audit(page.scope);
        pageZoom.push({ page: target.key, id: "1440", width: zoomWidth, height: zoomHeight, theme, ...result });
        await screenshot(`${target.key}-1440-${theme}-zoom200.png`);

        const tag = `zoom200 ${target.key} ${theme}`;
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
        /password|01000000002|01000000003|01000000005|01000000006|01110000001/i.test(entry.text),
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
      pageErrors: pageErrors.length,
    };

    await writeFile(
      join(OUT, "batch9-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom, consoleLog, pageErrors }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 9: التقارير والإشعارات والطباعة/CSV", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: تقارير المركز (multi/solo) بالإجماليات والقيود المالية والاتجاه الشهري وتقرير كل مدرس وكل مجموعة، تبويبات التقارير (الملخص والمجموعات)، تقارير الطلاب (كروت موبايل + جدول + مودال التقرير الكامل + حالة الفراغ)، قائمة المساعدين (انحدار F-036)، الإشعارات (صفحة الطالب وولي الأمر + جرس كل منهما)، ثم فحص CSV والطباعة.",
      "",
    );
    md.push(
      "الأدوار: CenterOwner وTeacher (سolo ومتعدد) وAssistant وStudent وParent. تُفحص كل شاشة على 360/390/768/1024/1280/1440/1920/2560 وأفقيًا 844×390 و640×360، فاتحًا وليليًا، مع تدقيق التمرير الأفقي وأهداف اللمس 44px ونص 14px والقطع والتراكب والتباين والخطوط المحلية.",
      "",
    );

    md.push("## بوابات الجودة", "");
    md.push("| البوابة | الأمر | النتيجة |");
    md.push("| --- | --- | --- |");
    md.push(
      `| اختبارات الوحدة | \`npx vitest run\` من \`Frontend/CenterManagement\` | ${process.env.PHASE3B9_VITEST || "—"} |`,
    );
    md.push(
      `| بناء الإنتاج | \`npm run build\` | ${process.env.PHASE3B9_BUILD || "—"} |`,
    );
    md.push(
      `| اختبارات الباك | \`dotnet test --no-build\` | ${process.env.PHASE3B9_DOTNET || "—"} |`,
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
      `سجلت ${summary.console.entries} رسالة، والتسريبات الحساسة ${summary.console.leaks}، واستثناءات الصفحة ${summary.pageErrors}.`,
      "",
    );
    if (consoleLeaks.length) {
      md.push("```json");
      md.push(JSON.stringify(consoleLeaks.slice(0, 10), null, 2));
      md.push("```", "");
    }

    md.push("## اللقطات", "");
    md.push(
      "`docs/design/shots/phase3b9/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة)، ولقطات تكبير النص والصفحة 200% ولقطة الطباعة.",
      "",
    );

    md.push("## حدود الفحص الآلي", "");
    md.push(
      "- **لا SQL Server حقيقي.** كل الشاشات تقرأ استجابات معترضة بـ fixtures؛ الأرقام الكبيرة والأسماء الطويلة وحالة الفراغ اصطناعية لاختبار العرض.",
      "- **لا شبكة إنتاجية.** كل طلبات الـ API معترضة؛ لا قياس لزمن الاستجابة أو سلوك إعادة المحاولة الحقيقي.",
      "- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.",
      "- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.",
      "- **لا طابعة حقيقية.** الطباعة مُحاكاة بـ `Emulation.setEmulatedMedia` مع إضافة صنف الجسم الذي يضيفه حدث `beforeprint`؛ يُفحص إخفاء الهيكل وثبات جدول التقرير، لا شكل الورقة الفعلي.",
      "- **CSV مُختبَر بالبايتات.** يُعترض `Blob` قبل الإرسال ويُفحص ترويسة UTF-8 BOM ومحتواه؛ لا يُفتح الملف في Excel فعليًا.",
      "- **الإشعارات الحيّة غير مقاسة.** SignalR معترض؛ لا يصل إشعار جديد أثناء التشغيل، ويُكتفى بالتحقق من طلبات التعليم كمقروء.",
      "- **تبويب المدرسين في `/reports` غير قابل للوصول بالأدوار المتاحة** (CenterOwner يُعاد توجيهه إلى `/center-reports`)؛ يُغطّى باختبار وحدة فقط.",
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
    await writeFile(join(OUT, "batch9-verify.md"), md.join("\n"));

    if (failures.length) process.exitCode = 1;
    console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
    failures.slice(0, 160).forEach((f) => console.log(" - " + f));
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
  if (probe.dialog) return `dialog · ${probe.counts?.reportTables ?? 0} tables`;
  if (probe.counts?.teacherRows) return `teachers · ${probe.counts.teacherRows}`;
  if (probe.counts?.groupRows) return `groups · ${probe.counts.groupRows}`;
  if (probe.bell?.panel) return `bell · ${probe.bell.count}`;
  if (probe.table) return `table · ${probe.tableRows} rows`;
  if (probe.stats) return `stats · ${probe.stats}`;
  return "-";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
