/**
 * Phase 3 - batch 5 (finance screens) automated checks.
 *
 *   node phase3-batch5-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures that mirror the ASP.NET `Response<T>` envelopes, then
 * drives headless Chrome at every required viewport in light and dark:
 *
 *   /finance   -> payments tab (cards + table + pagination), students tab
 *                 ("الحسابات": subscription statuses), the add-payment dialog,
 *                 and the screen-only receipt
 *   /overdue   -> cards + table, totals, statuses, prefilled payment dialog
 *   /income    -> revenue table, filters and the empty state
 *   /expense   -> expenses table and filters
 *
 * The receipt is checked structurally: the fixed 80mm `#receipt-print-root`
 * must stay exactly as it was (white paper, black ink, <= 80mm wide, receipt
 * number, period, amount) while only the screen toolbar around it is themed.
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no overlapping cards, RTL, local fonts, WCAG
 * AA, the expected state is on stage, the payment/overdue/receipt data, the
 * prefilled dialog values, plus 200% text and page zoom.
 * Writes phase3/batch5-verify.json + .md and screenshots into shots/phase3b5/.
 *
 * Narrow for a fast iteration:
 *   PHASE3B5_PAGES=finance-payments PHASE3B5_VIEWPORTS=390 PHASE3B5_THEMES=dark
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b5");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b5-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9471;
const APP_PORT = 5205;
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
  { id: "g1", name: "مجموعة الصف الثالث الثانوي", monthlyPrice: 300 },
  { id: "g2", name: "مجموعة الصف الثاني الثانوي", monthlyPrice: 250 },
];

const PAYMENT_NAMES = [
  "أحمد محمود",
  "منى حسن",
  "يوسف علي",
  "سارة سمير",
  "خالد إبراهيم",
  "ليلى مصطفى",
  "عمر صلاح",
  "نور الهدى",
  "حسام الدين",
  "هدير عادل",
  "طارق فؤاد",
  "مي أشرف",
];

const PAYMENTS = PAYMENT_NAMES.map((studentName, index) => {
  const monthly = index % 3 !== 1;
  return {
    paymentId: `p${index + 1}`,
    studentId: `s${index + 1}`,
    studentName,
    groupId: index % 2 === 0 ? "g1" : "g2",
    groupName: index % 2 === 0 ? "مجموعة الصف الثالث الثانوي" : "مجموعة الصف الثاني الثانوي",
    subscriptionType: monthly ? 2 : 1,
    amount: monthly ? 300 + index * 10 : 150,
    paymentDate: `2026-11-${String((index % 9) + 1).padStart(2, "0")}`,
    receivedByName: "سارة عبد الله",
    ...(monthly
      ? { billingPeriod: `2026-11-${String((index % 9) + 1).padStart(2, "0")}` }
      : { sessionName: `حصة ${index + 1}` }),
  };
});

const STUDENTS_FINANCE = [
  {
    studentId: "s1",
    studentName: "أحمد محمود",
    groupId: "g1",
    groupName: "مجموعة الصف الثالث الثانوي",
    subscriptionType: 2,
    paidAmount: 0,
    remainingAmount: 300,
    lastPaymentAmount: 0,
    lastPaymentDate: null,
    isPaidAlways: false,
  },
  {
    studentId: "s2",
    studentName: "منى حسن",
    groupId: "g2",
    groupName: "مجموعة الصف الثاني الثانوي",
    subscriptionType: 2,
    paidAmount: 100,
    remainingAmount: 200,
    lastPaymentAmount: 100,
    lastPaymentDate: "2026-11-01",
    isPaidAlways: false,
  },
  {
    studentId: "s3",
    studentName: "سعيد حسن",
    groupId: "g1",
    groupName: "مجموعة الصف الثالث الثانوي",
    subscriptionType: 2,
    paidAmount: 300,
    remainingAmount: 0,
    lastPaymentAmount: 300,
    lastPaymentDate: "2026-11-02",
    isPaidAlways: false,
  },
  {
    studentId: "s4",
    studentName: "ليلى إبراهيم",
    groupId: "g2",
    groupName: "مجموعة الصف الثاني الثانوي",
    subscriptionType: 2,
    joinedAfterBillingPeriod: true,
    joinDate: "2026-11-05",
    paidAmount: 0,
    remainingAmount: 0,
    lastPaymentAmount: 0,
    lastPaymentDate: null,
    isPaidAlways: false,
  },
  {
    studentId: "s5",
    studentName: "خالد إبراهيم",
    groupId: "g1",
    groupName: "مجموعة الصف الثالث الثانوي",
    subscriptionType: 1,
    paidAmount: 150,
    remainingAmount: 0,
    lastPaymentAmount: 150,
    lastPaymentDate: "2026-11-03",
    isPaidAlways: false,
  },
];

const OVERDUE_ROWS = [
  {
    studentId: "s1",
    groupId: "g1",
    studentName: "أحمد محمود",
    groupName: "مجموعة الصف الثالث الثانوي",
    teacherName: "أ. محمد عبد الله",
    parentPhoneNumber: "01012345678",
    totalAmount: 300,
    paidAmount: 0,
    remainingAmount: 300,
    status: 0,
    lastPaymentDate: null,
  },
  {
    studentId: "s2",
    groupId: "g1",
    studentName: "منى حسن عبد الرحمن السيد الطويل جداً للاختبار",
    groupName: "مجموعة الصف الثالث الثانوي - علمي علوم",
    teacherName: "أ. محمد عبد الله",
    parentPhoneNumber: "01098765432",
    totalAmount: 250,
    paidAmount: 100,
    remainingAmount: 150,
    status: 1,
    lastPaymentDate: "2026-10-05",
  },
  {
    studentId: "s3",
    groupId: "g2",
    studentName: "يوسف علي",
    groupName: "مجموعة الصف الثاني الثانوي",
    teacherName: "أ. هدى سالم",
    parentPhoneNumber: "01055551234",
    totalAmount: 300,
    paidAmount: 0,
    remainingAmount: 300,
    status: 0,
    lastPaymentDate: null,
  },
];

const OVERDUE_META = {
  totalStudents: 3,
  totalDue: 850,
  totalPaid: 100,
  totalRemaining: 750,
};

const STUDENT_PAYMENT_INFO = {
  subscriptionType: 2,
  hasDiscount: true,
  discountAmount: 50,
  groupMonthlyPrice: 300,
  monthlyPrice: 250,
  attendedSessions: 3,
  sessionsPerMonth: 4,
  calculationText: "250 × 3 من 4 حصص",
  totalAmount: 187.5,
  previouslyPaid: 100,
  remainingAmount: 87.5,
  receivedByName: "سارة عبد الله",
};

const RECEIPT = {
  receiptNumber: 42,
  centerName: "مركز النور التعليمي",
  centerPhone: "01000000000",
  centerAddress: "١٢ شارع الجمهورية، القاهرة",
  studentName: "أحمد محمود",
  groupName: "مجموعة الصف الثالث الثانوي",
  teacherName: "أ. محمد عبد الله",
  subscriptionType: 2,
  billingMonth: 11,
  billingYear: 2026,
  amount: 300,
  paymentDate: "2026-11-01T10:00:00",
  receivedByName: "سارة عبد الله",
};

const INCOME_ROWS = [
  {
    id: "i1",
    name: "اشتراك أحمد",
    categoryName: "اشتراكات",
    amount: 300,
    incomeDate: "2026-11-01",
    notes: "دفعة شهر نوفمبر",
  },
  {
    id: "i2",
    name: "اشتراك منى",
    categoryName: "اشتراكات",
    amount: 250,
    incomeDate: "2026-11-02",
    notes: "",
  },
  {
    id: "i3",
    name: "بيع كتب",
    categoryName: "أخرى",
    amount: 120.5,
    incomeDate: "2026-11-03",
    notes: "كتاب الرياضيات",
  },
];

const EXPENSE_ROWS = [
  {
    id: "e1",
    name: "إيجار القاعة",
    categoryName: "إيجار",
    amount: 1500,
    expenseDate: "2026-11-01",
    notes: "إيجار نوفمبر",
  },
  {
    id: "e2",
    name: "كهرباء",
    categoryName: "مرافق",
    amount: 320.75,
    expenseDate: "2026-11-03",
    notes: "",
  },
];

const SESSION_ROWS = [
  { id: "sess1", dayOfWeek: 6, startTime: "17:00:00", endTime: "19:00:00", sessionPrice: 40 },
];

const GROUP_STUDENTS = [
  { studentId: "s1", studentName: "أحمد محمود", status: 1 },
  { studentId: "s2", studentName: "منى حسن", status: 1 },
];

const SCENARIOS = {
  finance: {
    data: "finance",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
  financeEmpty: {
    data: "empty",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
  overdue: {
    data: "overdue",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "MultiTeacher",
  },
  overdueEmpty: {
    data: "empty",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "MultiTeacher",
  },
  incomes: {
    data: "incomes",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
  expenses: {
    data: "expenses",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
};

const PAGES = [
  {
    key: "finance-payments",
    path: "/finance",
    wait: '[data-testid="payments-cards"]',
    scenario: "finance",
    scope: "finance-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "finance-payments",
    full: true,
  },
  {
    key: "finance-students",
    path: "/finance",
    wait: '[data-testid="payments-cards"]',
    scenario: "finance",
    action: "finance-students",
    expectWait: '[data-testid="students-cards"]',
    scope: "finance-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "finance-students",
    full: true,
  },
  {
    key: "finance-receipt",
    path: "/finance",
    wait: '[data-testid="payments-cards"]',
    scenario: "finance",
    action: "finance-receipt",
    expectWait: "#receipt-print-root",
    scope: "receipt-modal",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "finance-receipt",
    full: false,
  },
  {
    key: "finance-payment-modal",
    path: "/finance",
    wait: '[data-testid="payments-cards"]',
    scenario: "finance",
    action: "finance-payment-modal",
    expectWait: '[data-testid="payment-modal"]',
    scope: "payment-modal",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "finance-payment-modal",
    full: false,
  },
  {
    key: "finance-empty",
    path: "/finance",
    wait: '[data-testid="finance-page"]',
    scenario: "financeEmpty",
    scope: "finance-page",
    viewports: ["360", "390", "1280", "1920"],
    expect: "finance-empty",
    full: true,
  },
  {
    key: "overdue",
    path: "/overdue",
    wait: '[data-testid="overdue-cards"]',
    scenario: "overdue",
    scope: "overdue-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "overdue",
    full: true,
  },
  {
    key: "overdue-payment",
    path: "/overdue",
    wait: '[data-testid="overdue-cards"]',
    scenario: "overdue",
    action: "overdue-payment",
    expectWait: '[data-testid="payment-modal"]',
    scope: "payment-modal",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "overdue-payment",
    full: false,
  },
  {
    key: "overdue-empty",
    path: "/overdue",
    wait: '[data-testid="overdue-page"]',
    scenario: "overdueEmpty",
    scope: "overdue-page",
    viewports: ["360", "390", "1280", "1920"],
    expect: "overdue-empty",
    full: true,
  },
  {
    key: "incomes",
    path: "/income",
    wait: '[data-testid="incomes-page"]',
    scenario: "incomes",
    scope: "incomes-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "incomes",
    full: true,
  },
  {
    key: "expenses",
    path: "/expense",
    wait: '[data-testid="expenses-page"]',
    scenario: "expenses",
    scope: "expenses-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "expenses",
    full: true,
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

const RUN_PAGES = list(process.env.PHASE3B5_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B5_VIEWPORTS, VIEWPORTS.map((v) => v[0]));
const RUN_THEMES = list(process.env.PHASE3B5_THEMES, THEMES);
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
    [ROLE_CLAIM]: scenario.role ?? "CenterOwner",
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

let SCENARIO = SCENARIOS.finance;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.finance;
};

const queryOf = (url) => {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams();
  }
};

const pageOf = (rows) => {
  const size = 10;
  return {
    items: rows.slice(0, size),
    totalCount: rows.length,
    pageNumber: 1,
    pageSize: size,
    totalPages: Math.ceil(rows.length / size),
  };
};

function paymentsFixture(url) {
  const params = queryOf(url);
  const pageNumber = Number(params.get("pageNumber") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  const start = (pageNumber - 1) * pageSize;
  return {
    succeeded: true,
    data: {
      items: PAYMENTS.slice(start, start + pageSize),
      totalCount: PAYMENTS.length,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(PAYMENTS.length / pageSize),
    },
  };
}

function studentsFixture(url) {
  const params = queryOf(url);
  const pageNumber = Number(params.get("pageNumber") || 1);
  const pageSize = Number(params.get("pageSize") || 10);
  const start = (pageNumber - 1) * pageSize;
  return {
    succeeded: true,
    data: {
      items: STUDENTS_FINANCE.slice(start, start + pageSize),
      totalCount: STUDENTS_FINANCE.length,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(STUDENTS_FINANCE.length / pageSize),
    },
  };
}

function fixtureFor(url) {
  const lower = url.toLowerCase();
  const empty = SCENARIO.data === "empty";

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

  /* ---------- shared ---------- */
  if (lower.includes("/group/get-all") || lower.includes("/group/paginated")) {
    return ok(GROUPS);
  }
  if (lower.includes("/teacher/paginated")) {
    return ok([
      { id: "t1", fullName: "أ. محمد عبد الله" },
      { id: "t2", fullName: "أ. هدى سالم" },
    ]);
  }
  if (lower.includes("/sessionrolesrole-by-group/")) return SESSION_ROWS;
  if (lower.includes("/attendance/student-attendence")) {
    return ok({
      items: GROUP_STUDENTS,
      totalCount: GROUP_STUDENTS.length,
      pageIndex: 1,
      pageSize: 200,
      totalPages: 1,
    });
  }
  if (lower.includes("/messagetemplate/list")) {
    return ok([
      {
        key: "feesReminder",
        body: "مرحباً {student}، المتبقي {amount} لشهر {month}.\nمع تحيات {center}",
      },
    ]);
  }

  /* ---------- finance ---------- */
  if (lower.includes("student-payment-info/")) {
    return ok(STUDENT_PAYMENT_INFO);
  }
  if (lower.includes("/payments/overdue-students")) {
    return empty
      ? {
          data: [],
          meta: { totalStudents: 0, totalDue: 0, totalPaid: 0, totalRemaining: 0 },
          totalCount: 0,
          totalPages: 0,
        }
      : {
          data: OVERDUE_ROWS,
          meta: OVERDUE_META,
          totalCount: OVERDUE_ROWS.length,
          totalPages: 1,
        };
  }
  if (lower.includes("/payments/students-finance")) {
    return empty ? ok(pageOf([])) : studentsFixture(url);
  }
  if (lower.includes("/payments/paginated")) {
    return empty ? ok(pageOf([])) : paymentsFixture(url);
  }
  if (lower.includes("/payments/getall")) {
    return ok(empty ? [] : PAYMENTS);
  }
  if (/\/payments\/[^/]+\/receipt/.test(lower)) {
    return ok(RECEIPT);
  }
  if (lower.includes("/payments/create") || lower.includes("/payments/edit")) {
    return { succeeded: true, message: "تم حفظ الدفعة", data: "p1" };
  }
  if (lower.includes("/paymentsdelete/")) return ok(true);

  /* ---------- incomes ---------- */
  if (lower.includes("/incomecategory/get-all")) {
    return ok([
      { id: "ic1", name: "اشتراكات" },
      { id: "ic2", name: "أخرى" },
    ]);
  }
  if (lower.includes("/income/paginated")) {
    return {
      succeeded: true,
      data: {
        data: INCOME_ROWS,
        totalCount: INCOME_ROWS.length,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
      },
    };
  }

  /* ---------- expenses ---------- */
  if (lower.includes("/expensecategory/get-all")) {
    return ok([
      { id: "ec1", name: "إيجار" },
      { id: "ec2", name: "مرافق" },
    ]);
  }
  if (lower.includes("/expense/paginated")) {
    return {
      succeeded: true,
      data: {
        data: EXPENSE_ROWS,
        totalCount: EXPENSE_ROWS.length,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
      },
    };
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

    const clickFirstVisibleButton = async (text, rootSelector = null) => {
      const clicked = await evaluate(`(() => {
        const root = ${rootSelector ? `document.querySelector(${JSON.stringify(rootSelector)})` : "document.body"};
        if (!root) return false;
        const wanted = ${JSON.stringify(text)};
        const el = [...root.querySelectorAll("button, [role='button']")]
          .find((node) => {
            const r = node.getBoundingClientRect();
            if (r.width <= 1 || r.height <= 1) return false;
            return (node.textContent || "").replace(/\\s+/g, " ").trim().includes(wanted);
          });
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`missing visible button with text "${text}"`);
    };

    const applyAction = async (page) => {
      if (!page.action) return;

      if (page.action === "finance-students") {
        await clickByText('[role="tablist"]', "حالة دفع الطلاب");
      } else if (page.action === "finance-receipt") {
        await clickSelector('button[aria-label^="Print receipt for"]');
      } else if (page.action === "finance-payment-modal") {
        await clickByText(null, "إضافة دفعة جديدة");
      } else if (page.action === "overdue-payment") {
        await clickFirstVisibleButton("إضافة دفعة");
      }

      if (page.expectWait) await waitForSelector(page.expectWait, 12000);
      await sleep(page.action === "overdue-payment" ? 1500 : 500);
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
        const rowCount = (sel) => (root.querySelector(sel) ? root.querySelector(sel).querySelectorAll("tbody tr, li").length : 0);
        const selects = {};
        q("select").forEach((el) => {
          const key = el.id || el.getAttribute("aria-label") || "select";
          selects[key] = el.value;
        });
        const inputs = {};
        q("input").forEach((el) => {
          const key = el.id || el.getAttribute("aria-label") || el.type;
          inputs[key] = el.value;
        });
        const printRoot = document.querySelector("#receipt-print-root");
        const printStyle = printRoot ? getComputedStyle(printRoot) : null;
        const printBox = printRoot ? printRoot.getBoundingClientRect() : null;
        const dialog = testid("payment-modal");
        const activeTab = root.querySelector('[role="tab"][aria-selected="true"]');
        return {
          text: textOf(root).slice(0, 6000),
          heading: textOf(root.querySelector("h1")),
          tabs: q('[role="tab"]').map(textOf),
          activeTab: textOf(activeTab),
          filterLabels: labels("input[aria-label], select[aria-label]"),
          cards: Boolean(testid("payments-cards")),
          table: Boolean(testid("payments-table")),
          studentsCards: Boolean(testid("students-cards")),
          studentsTable: Boolean(testid("students-table")),
          overdueCards: Boolean(testid("overdue-cards")),
          overdueTable: Boolean(testid("overdue-table")),
          paymentRows: rowCount('[data-testid="payments-table"]'),
          studentRows: rowCount('[data-testid="students-table"]'),
          overdueRows: rowCount('[data-testid="overdue-table"]'),
          pagination: textOf(testid("finance-pagination")),
          actionLabels: labels("button[aria-label]"),
          tableHeadings: q("th").map(textOf),
          stats: q('[data-testid^="stat-"]').map(textOf),
          statusPills: q("span").map(textOf).filter((t) => ["شهري","بالحصة","تم الدفع","دفع جزء","غير مدفوع","لم يكن مشتركًا","دفع بالحصة"].includes(t)),
          print: printRoot
            ? {
                text: textOf(printRoot).slice(0, 1200),
                className: printRoot.className,
                width: Math.round(printBox.width),
                background: printStyle.backgroundColor,
                color: printStyle.color,
                printClass: document.body.classList.contains("receipt-printing"),
                toolbarPrint: Boolean([...document.querySelectorAll("button")].find((b) => textOf(b) === "طباعة")),
                toolbarClose: Boolean([...document.querySelectorAll("button")].find((b) => textOf(b) === "إغلاق")),
              }
            : null,
          dialog: dialog
            ? {
                title: textOf(dialog.querySelector("h2")),
                body: Boolean(testid("payment-modal-body")),
                footer: Boolean(testid("payment-modal-footer")),
                selects,
                inputs,
                submitDisabled: testid("payment-submit")?.disabled ?? null,
                bodyScrolls:
                  (testid("payment-modal-body")?.scrollHeight ?? 0) >
                  (testid("payment-modal-body")?.clientHeight ?? 0) + 1,
                fullText: textOf(dialog).slice(0, 3000),
              }
            : null,
          empty:
            (textOf(root).includes("لا توجد مدفوعات تطابق خيارات الفلترة الحالية") && "payments") ||
            (textOf(root).includes("لا توجد نتائج تطابق خيارات الفلترة الحالية") && "students") ||
            (textOf(root).includes("لا يوجد طلاب متأخرون مطابقون للفلترة الحالية") && "overdue") ||
            null,
          incomesTotal: (textOf(root).match(/\\d+\\s*إيراد إجمالاً/) || [])[0] ?? "",
          expensesTotal: (textOf(root).match(/\\d+\\s*مصروف إجمالاً/) || [])[0] ?? "",
          tableRows: q("tbody tr").length,
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
    const notes = [];
    const probes = {};

    for (const page of pages) {
      const viewports = VIEWPORTS.filter((v) => page.viewports.includes(v[0])).filter(
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

          if (page.expect === "finance-payments") {
            if (!text.includes("إدارة المالية والاشتراكات"))
              failures.push(`${tag}: finance heading is missing`);
            if (!p.cards) failures.push(`${tag}: payments cards are missing`);
            if (!p.table) failures.push(`${tag}: payments table is missing`);
            if (p.paymentRows !== 10)
              failures.push(`${tag}: ${p.paymentRows} payment rows, expected 10`);
            if (!text.includes("أحمد محمود")) failures.push(`${tag}: first payment is missing`);
            if (!text.includes("300 ج.م")) failures.push(`${tag}: payment amount is missing`);
            if (p.statusPills.includes("شهري") === false)
              failures.push(`${tag}: monthly subscription pill is missing`);
            if (p.statusPills.includes("بالحصة") === false)
              failures.push(`${tag}: per-session pill is missing`);
            if (!p.pagination.includes("12"))
              failures.push(`${tag}: pagination total is missing`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("Print receipt for")))
              failures.push(`${tag}: receipt action is missing`);
            for (const label of ["بحث باسم الطالب", "المجموعة", "نوع الاشتراك", "الشهر", "السنة"]) {
              if (!(p.filterLabels || []).includes(label))
                failures.push(`${tag}: filter "${label}" is missing`);
            }
          }

          if (page.expect === "finance-students") {
            if (!text.includes("حالة دفع الطلاب")) failures.push(`${tag}: students tab label is missing`);
            if (!p.studentsCards) failures.push(`${tag}: students cards are missing`);
            if (!p.studentsTable) failures.push(`${tag}: students table is missing`);
            if (p.studentRows !== 5)
              failures.push(`${tag}: ${p.studentRows} student rows, expected 5`);
            for (const label of ["تم الدفع", "دفع جزء", "غير مدفوع", "لم يكن مشتركًا", "دفع بالحصة"]) {
              if (!p.statusPills.includes(label))
                failures.push(`${tag}: subscription status "${label}" is missing`);
            }
            if (!text.includes("متبقي:")) failures.push(`${tag}: remaining amount badge is missing`);
          }

          if (page.expect === "finance-receipt") {
            const print = p.print;
            if (!print) {
              failures.push(`${tag}: receipt print root is missing`);
            } else {
              if (!print.className.includes("max-w-[80mm]"))
                failures.push(`${tag}: receipt is not the fixed 80mm width`);
              if (print.width > 303)
                failures.push(`${tag}: printed receipt is ${print.width}px wide (max 80mm)`);
              if (print.background !== "rgb(255, 255, 255)")
                failures.push(`${tag}: printed receipt background is ${print.background}`);
              if (print.color !== "rgb(0, 0, 0)")
                failures.push(`${tag}: printed receipt ink is ${print.color}`);
              if (!print.text.includes("R-000042"))
                failures.push(`${tag}: receipt number R-000042 is missing`);
              if (!print.text.includes("إيصال استلام نقدية"))
                failures.push(`${tag}: receipt title is missing`);
              if (!print.text.includes("أحمد محمود"))
                failures.push(`${tag}: receipt student is missing`);
              if (!print.text.includes("300 ج.م"))
                failures.push(`${tag}: receipt amount is missing`);
              if (!print.text.includes("شهر نوفمبر 2026"))
                failures.push(`${tag}: receipt billing period is missing`);
              if (!print.printClass)
                failures.push(`${tag}: print isolation class is not applied`);
              if (!print.toolbarPrint) failures.push(`${tag}: screen print button is missing`);
              if (!print.toolbarClose) failures.push(`${tag}: screen close button is missing`);
            }
          }

          if (page.expect === "finance-payment-modal") {
            const d = p.dialog;
            if (!d) failures.push(`${tag}: payment dialog is missing`);
            else {
              if (!d.title.includes("إضافة دفعة مالية"))
                failures.push(`${tag}: payment dialog title is "${d.title}"`);
              if (!d.body || !d.footer)
                failures.push(`${tag}: payment dialog lost its sticky body/footer`);
              if (d.selects["payment-group"] !== "")
                failures.push(`${tag}: group should start empty`);
              if (d.submitDisabled !== true)
                failures.push(`${tag}: empty payment dialog should not be submittable`);
              if (!d.fullText.includes("استلمها"))
                failures.push(`${tag}: received-by label is missing`);
            }
          }

          if (page.expect === "finance-empty") {
            if (p.empty !== "payments")
              failures.push(`${tag}: payments empty state is missing`);
            if (p.paymentRows !== 0)
              failures.push(`${tag}: ${p.paymentRows} rows when the list should be empty`);
          }

          if (page.expect === "overdue") {
            if (!text.includes("متابعة المتأخرين"))
              failures.push(`${tag}: overdue heading is missing`);
            if (!p.overdueCards) failures.push(`${tag}: overdue cards are missing`);
            if (!p.overdueTable) failures.push(`${tag}: overdue table is missing`);
            if (p.overdueRows !== 3)
              failures.push(`${tag}: ${p.overdueRows} overdue rows, expected 3`);
            for (const label of ["عدد المتأخرين", "إجمالي المستحق", "إجمالي المدفوع", "إجمالي المتبقي"]) {
              if (!text.includes(label)) failures.push(`${tag}: stat "${label}" is missing`);
            }
            for (const value of ["850 ج.م", "100 ج.م", "750 ج.م"])
              if (!text.includes(value)) failures.push(`${tag}: overdue total "${value}" is missing`);
            if (!text.includes("نوفمبر 2026"))
              failures.push(`${tag}: billing month label is missing`);
            if (!text.includes("غير مدفوع") || !text.includes("دفع جزء"))
              failures.push(`${tag}: overdue statuses are missing`);
            if (!text.includes("أ. محمد عبد الله"))
              failures.push(`${tag}: teacher column/filter value is missing`);
            for (const label of ["بحث بالاسم أو الهاتف", "المجموعة", "المدرس", "الشهر", "السنة", "عدد الصفوف في الصفحة"]) {
              if (!(p.filterLabels || []).includes(label))
                failures.push(`${tag}: filter "${label}" is missing`);
            }
          }

          if (page.expect === "overdue-payment") {
            const d = p.dialog;
            if (!d) failures.push(`${tag}: prefilled payment dialog is missing`);
            else {
              if (d.selects["payment-group"] !== "g1")
                failures.push(`${tag}: prefilled group is ${d.selects["payment-group"]}, expected g1`);
              if (d.selects["payment-billing-period"] !== "2026-11")
                failures.push(
                  `${tag}: prefilled billing period is ${d.selects["payment-billing-period"]}, expected 2026-11`,
                );
              if (d.inputs["payment-amount"] !== "87.5")
                failures.push(`${tag}: prefilled amount is ${d.inputs["payment-amount"]}, expected 87.5`);
              if (!d.fullText.includes("أحمد محمود"))
                failures.push(`${tag}: prefilled student is not shown`);
              if (!d.fullText.includes("هذا الطالب لديه خصم"))
                failures.push(`${tag}: discount banner is missing`);
              if (!d.fullText.includes("مدفوع سابقاً لهذا الشهر"))
                failures.push(`${tag}: previous-payment row is missing`);
              if (!d.fullText.includes("استلمها"))
                failures.push(`${tag}: received-by label is missing`);
            }
          }

          if (page.expect === "overdue-empty") {
            if (p.empty !== "overdue")
              failures.push(`${tag}: overdue empty state is missing`);
          }

          if (page.expect === "incomes") {
            if (!text.includes("الإيرادات")) failures.push(`${tag}: incomes heading is missing`);
            if (p.tableRows !== 3)
              failures.push(`${tag}: ${p.tableRows} income rows, expected 3`);
            if (!text.includes("3 إيراد إجمالاً"))
              failures.push(`${tag}: income total count is missing (${p.incomesTotal})`);
            if (!text.includes("300.00")) failures.push(`${tag}: income amount is missing`);
            if (!text.includes("اشتراك أحمد")) failures.push(`${tag}: income row is missing`);
            for (const heading of ["اسم الإيراد", "الفئة", "المبلغ", "التاريخ", "ملاحظات", "الإجراءات"]) {
              if (!p.tableHeadings.includes(heading))
                failures.push(`${tag}: income heading "${heading}" is missing`);
            }
          }

          if (page.expect === "expenses") {
            if (!text.includes("المصروفات")) failures.push(`${tag}: expenses heading is missing`);
            if (p.tableRows !== 2)
              failures.push(`${tag}: ${p.tableRows} expense rows, expected 2`);
            if (!text.includes("2 مصروف إجمالاً"))
              failures.push(`${tag}: expense total count is missing (${p.expensesTotal})`);
            if (!text.includes("1,500 ج.م")) failures.push(`${tag}: expense amount is missing`);
            if (!text.includes("إيجار القاعة")) failures.push(`${tag}: expense row is missing`);
            for (const heading of ["اسم المصروف", "الفئة", "المبلغ", "التاريخ", "ملاحظات", "الإجراءات"]) {
              if (!p.tableHeadings.includes(heading))
                failures.push(`${tag}: expense heading "${heading}" is missing`);
            }
          }
        }
      }
    }

    /* ---------- live behaviour probes ---------- */

    setScenario("finance");
    await navigate("/finance", "light", { width: 1280, height: 800 }, [
      '[data-testid="payments-cards"]',
    ]);
    const pageOne = await probeFor(PAGES.find((p) => p.key === "finance-payments"));
    await clickByText('[data-testid="finance-pagination"]', "2");
    await sleep(900);
    const pageTwo = await probeFor(PAGES.find((p) => p.key === "finance-payments"));
    const pageTwoCall = [...apiLog]
      .reverse()
      .find((call) => call.url.toLowerCase().includes("/payments/paginated"));
    probes.financePagination = {
      before: pageOne.paymentRows,
      after: pageTwo.paymentRows,
      firstBefore: (pageOne.text.match(/أحمد محمود/) || [])[0] ?? null,
      pageTwoUrl: pageTwoCall?.url ?? null,
      firstAfter: (pageTwo.text.match(/طارق فؤاد|مي أشرف/) || [])[0] ?? null,
    };
    if (pageTwo.paymentRows !== 2)
      failures.push(`finance probe: page 2 has ${pageTwo.paymentRows} rows, expected 2`);
    if (!/pageNumber=2/.test(pageTwoCall?.url || ""))
      failures.push(`finance probe: page 2 request was not sent`);

    setScenario("finance");
    await navigate("/finance", "light", { width: 1280, height: 800 }, [
      '[data-testid="payments-cards"]',
    ]);
    await clickSelector('button[aria-label^="Print receipt for"]');
    await waitForSelector("#receipt-print-root", 10000);
    await sleep(600);
    const receiptClass = await evaluate(
      `(() => ({
        bodyPrinting: document.body.classList.contains("receipt-printing"),
        printRoot: Boolean(document.querySelector("#receipt-print-root")),
      }))()`,
    );
    await clickByText(null, "إغلاق");
    await sleep(500);
    const receiptClosed = await evaluate(
      `(() => ({
        printRoot: Boolean(document.querySelector("#receipt-print-root")),
        bodyPrinting: document.body.classList.contains("receipt-printing"),
      }))()`,
    );
    probes.receiptClose = { ...receiptClass, ...receiptClosed };
    if (!receiptClass.bodyPrinting || !receiptClass.printRoot)
      failures.push(`receipt probe: receipt did not open with print isolation`);
    if (receiptClosed.printRoot || receiptClosed.bodyPrinting)
      failures.push(`receipt probe: closing did not remove the receipt / print class`);

    setScenario("overdue");
    await navigate("/overdue", "light", { width: 1280, height: 800 }, [
      '[data-testid="overdue-cards"]',
    ]);
    await clickFirstVisibleButton("تذكير واتساب");
    await sleep(400);
    const reminder = apiLog.filter(
      (call) => call.method === "GET" && call.url.toLowerCase().includes("messagetemplate/list"),
    );
    probes.overdueReminder = { templateCalls: reminder.length };
    if (reminder.length === 0)
      failures.push(`overdue probe: the saved WhatsApp template was never loaded`);

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "finance-payments", scenario: "finance", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "finance-students", scenario: "finance", sizes: [["390", 390, 844]] },
      { key: "finance-receipt", scenario: "finance", sizes: [["390", 390, 844]] },
      { key: "overdue", scenario: "overdue", sizes: [["390", 390, 844]] },
      { key: "overdue-payment", scenario: "overdue", sizes: [["390", 390, 844]] },
      { key: "incomes", scenario: "incomes", sizes: [["390", 390, 844]] },
      { key: "expenses", scenario: "expenses", sizes: [["390", 390, 844]] },
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
          let debug = null;
          if (target.key === "overdue-payment") {
            debug = await evaluate(`(() => {
              const root = document.querySelector('[data-testid="payment-modal"]');
              if (!root) return null;
              const inputs = [...root.querySelectorAll("input")].map((el) => {
                const cs = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return {
                  id: el.id,
                  type: el.type,
                  cls: String(el.className).slice(0, 60),
                  w: Math.round(r.width * 10) / 10,
                  h: Math.round(r.height * 10) / 10,
                  minWidth: cs.minWidth,
                  width: cs.width,
                  flex: cs.flex,
                  inlineStyle: el.getAttribute("style"),
                  parentCls: String(el.parentElement.className).slice(0, 50),
                  parentW: Math.round(el.parentElement.getBoundingClientRect().width),
                };
              });
              const sv = root.querySelector('[class*="singleValue"]');
              const svcs = sv ? getComputedStyle(sv) : null;
              return {
                inputs,
                singleValue: sv
                  ? {
                      cls: String(sv.className).slice(0, 60),
                      text: sv.textContent,
                      overflow: svcs.overflow,
                      whiteSpace: svcs.whiteSpace,
                      sw: sv.scrollWidth,
                      cw: sv.clientWidth,
                    }
                  : null,
              };
            })()`);
          }
          textZoom.push({ page: target.key, id, width, height, theme, ...result, debug });
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
      { key: "finance-payments", scenario: "finance" },
      { key: "overdue", scenario: "overdue" },
      { key: "incomes", scenario: "incomes" },
      { key: "expenses", scenario: "expenses" },
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
      join(OUT, "batch5-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 5: شاشات المالية", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: المدفوعات (بطاقات + جدول + ترقيم صفحات)، الحسابات (حالة دفع الطلاب)، الإيصال على الشاشة فقط، نافذة إضافة دفعة، المتأخرون (بطاقات + جدول + إجماليات + تذكير واتساب + نافذة دفعة مُعبأة مسبقًا)، الإيرادات، المصروفات، والحالات الفارغة.",
      "",
    );
    md.push(
      "الدور: CenterOwner مع كل الوحدات. `/finance` و`/income` و`/expense` في مركز فردي، و`/overdue` في مركز متعدد المدرسين لتفعيل عمود/فلتر المدرس. الإيصال يُفحص بنيويًا: عقدة الطباعة `#receipt-print-root` ثابتة 80mm بخلفية بيضاء وحبر أسود، والشريط حولها فقط هو الذي أُعيد تنسيقه.",
      "",
    );

    md.push("## بوابات الجودة", "");
    md.push("| البوابة | الأمر | النتيجة |");
    md.push("| --- | --- | --- |");
    md.push(
      `| اختبارات الوحدة | \`npx vitest run\` من \`Frontend/CenterManagement\` | ${process.env.PHASE3B5_VITEST || "—"} |`,
    );
    md.push(
      `| بناء الإنتاج | \`npm run build\` | ${process.env.PHASE3B5_BUILD || "—"} |`,
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
      "`docs/design/shots/phase3b5/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم، والشاشة للنوافذ والإيصال)، ولقطات تكبير النص والصفحة 200%.",
      "",
    );

    md.push("## حدود الفحص الآلي", "");
    md.push(
      "- **لا طابعة حقيقية.** عقدة الإيصال `#receipt-print-root` تُفحص كعقد DOM (العرض 80mm، الخلفية البيضاء، الحبر الأسود، رقم الإيصال، الفترة، المبلغ)؛ لم تُطبع ورقة على طابعة حرارية ولم تُقس هوامش الطابعة الفعلية.",
      "- **لا SQL Server حقيقي.** الشاشات هنا تقرأ استجابات معترضة بـ fixtures؛ لم يُشغَّل تسجيل دفعة فعلي على قاعدة بيانات، ومنطق حساب المبالغ في الباك إند لم يُعد قياسه في هذه الدفعة.",
      "- **لا شبكة/زمن استجابة إنتاجي.** كل طلبات الـ API معترضة؛ لم تُقس زمن الاستجابة أو انقطاع الشبكة أو إعادة المحاولة على السيرفر الحقيقي.",
      "- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.",
      "- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.",
      "- **لا تغطية لمنطق الحساب.** هذه الدفعة عرض بصري فقط؛ صحة المبالغ والخصومات والمدفوعات السابقة تُغطى باختبارات الوحدة/الباك إند وليست ضمن هذا الفحص.",
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
    if (notes.length) {
      md.push("", "## ملاحظات التشغيل", "");
      notes.forEach((n) => md.push(`- ${n}`));
    }
    await writeFile(join(OUT, "batch5-verify.md"), md.join("\n"));

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
  if (probe.dialog) return `dialog · ${probe.dialog.title}`;
  if (probe.print) return `receipt · ${(probe.print.text.match(/R-\\d{6}/) || ["-"])[0]}`;
  if (probe.empty) return `empty · ${probe.empty}`;
  if (probe.incomesTotal) return `incomes · ${probe.incomesTotal}`;
  if (probe.expensesTotal) return `expenses · ${probe.expensesTotal}`;
  if (probe.overdueCards) return `overdue · ${probe.overdueRows} rows`;
  if (probe.studentsTable) return `students · ${probe.studentRows} rows`;
  if (probe.table) return `payments · ${probe.paymentRows} rows`;
  return "-";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
