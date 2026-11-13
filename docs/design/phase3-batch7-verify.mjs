/**
 * Phase 3 / batch 7 verification harness.
 *
 * Screens: teachers, assistants (+ salaries), subscription, settings (groups),
 * profile, forced password change, message templates, and the long teacher /
 * center dialogs hosted by /centers.
 *
 * Run from the repository root:
 *   node docs/design/phase3-batch7-verify.mjs
 *
 * Optional narrowing (fast iterations):
 *   PHASE3B7_PAGES="teachers,assistants"
 *   PHASE3B7_VIEWPORTS="390,1280"
 *   PHASE3B7_THEMES="light"
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b7");
const CHROME_PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b7-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9473;
const APP_PORT = 5207;
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

/* ------------------------------------------------------------------ */
/* fixtures                                                            */
/* ------------------------------------------------------------------ */

const SUBSCRIPTION = {
  type: "Annual",
  state: "active",
  startDate: "2026-01-01T00:00:00",
  endDate: "2027-01-01T00:00:00",
  daysLeftInGrace: null,
};

const PROFILE = {
  fullName: "أ. سارة عبد الله",
  phoneNumber: "01000000000",
  userName: "sara",
  address: "القاهرة - مدينة نصر",
  createdAt: "2025-09-01T00:00:00",
  email: "owner@example.com",
  pendingEmail: null,
  subject: "الرياضيات",
  centerType: "MultiTeacher",
  enabledModules: ALL_MODULES,
  subscription: SUBSCRIPTION,
};

const TEACHER_NAMES = [
  "أ. سارة عبد الله",
  "أ. محمد علي",
  "أ. هدى مصطفى",
  "أ. كريم فؤاد",
  "أ. نهى سمير",
  "أ. أحمد جمال",
  "أ. مريم عادل",
  "أ. يوسف حامد",
  "أ. دينا رشاد",
];

const TEACHERS = TEACHER_NAMES.map((fullName, index) => ({
  id: `t${index + 1}`,
  fullName,
  phoneNumber: `0100000${String(1000 + index)}`,
  subject: index % 3 === 2 ? null : index % 2 === 0 ? "الرياضيات" : "العلوم",
  groups:
    index % 3 === 0
      ? [
          { id: "g1", name: "مجموعة أ" },
          { id: "g2", name: "مجموعة ب" },
        ]
      : [{ id: "g1", name: "مجموعة أ" }],
}));

const ASSISTANTS = [
  { id: "a1", fullName: "منال حسن", phoneNumber: "01011112222", salary: 4500, teacherName: "أ. سارة عبد الله" },
  { id: "a2", fullName: "عمرو سيد", phoneNumber: "01011113333", salary: 3800, teacherName: "أ. محمد علي" },
  { id: "a3", fullName: "سلمى إبراهيم", phoneNumber: "01011114444", salary: 4200, teacherName: null },
  { id: "a4", fullName: "طارق منصور", phoneNumber: "01011115555", salary: 3600, teacherName: "أ. هدى مصطفى" },
  { id: "a5", fullName: "ياسمين فتحي", phoneNumber: "01011116666", salary: 4000, teacherName: null },
  { id: "a6", fullName: "حسام الدين", phoneNumber: "01011117777", salary: 3500, teacherName: "أ. كريم فؤاد" },
  { id: "a7", fullName: "نور الهدى", phoneNumber: "01011118888", salary: 3900, teacherName: "أ. نهى سمير" },
];

const SALARY_STATUS = [
  {
    id: "a1",
    fullName: "منال حسن",
    phoneNumber: "01011112222",
    salary: 4500,
    paid: 4500,
    remaining: 0,
    status: "paid",
    month: 11,
    year: 2026,
    lastPaymentDate: "2026-11-05T10:00:00",
    paymentsCount: 1,
  },
  {
    id: "a2",
    fullName: "عمرو سيد",
    phoneNumber: "01011113333",
    salary: 3800,
    paid: 2000,
    remaining: 1800,
    status: "partial",
    month: 11,
    year: 2026,
    lastPaymentDate: "2026-11-08T10:00:00",
    paymentsCount: 1,
  },
  {
    id: "a3",
    fullName: "سلمى إبراهيم",
    phoneNumber: "01011114444",
    salary: 4200,
    paid: 0,
    remaining: 4200,
    status: "unpaid",
    month: 11,
    year: 2026,
    lastPaymentDate: null,
    paymentsCount: 0,
  },
];

const GROUPS = [
  {
    id: "g1",
    name: "مجموعة أ",
    totalStudentsCount: 18,
    monthlyPrice: 400,
    perSessionPrice: 60,
    teacherId: "t1",
    teacherName: "أ. سارة عبد الله",
    schedule: [{ dayOfWeek: 0, startTime: "10:00", endTime: "12:00" }],
  },
  {
    id: "g2",
    name: "مجموعة ب",
    totalStudentsCount: 12,
    monthlyPrice: 350,
    perSessionPrice: 50,
    teacherId: "t2",
    teacherName: "أ. محمد علي",
    schedule: [],
  },
];

const TEMPLATE_BODIES = {
  absence: "عزيزي ولي الأمر، غاب الطالب {student} اليوم {date} عن حصة {group} في {center}.",
  examResult: "نتيجة {student} في امتحان {exam}: {score} من {total}.",
  feesReminder: "تذكير بخصوص اشتراك {student} في {center}: المتبقي {amount} جنيه.",
};

const TEMPLATES = Object.entries(TEMPLATE_BODIES).map(([key, body]) => ({
  key,
  body,
  isCustomized: false,
  maxLength: 500,
  placeholders: [
    { key: "student", label: "اسم الطالب" },
    { key: "center", label: "اسم المركز" },
    { key: "date", label: "التاريخ" },
  ],
}));

const CENTERS = [
  {
    id: 1,
    name: "مركز النور التعليمي",
    ownerName: "أ. سارة عبد الله",
    ownerPhone: "01000000000",
    ownerEmail: "owner@example.com",
    ownerId: 43,
    phone: "0223456789",
    address: "القاهرة - مدينة نصر",
    description: "مركز تعليمي متكامل",
    notes: null,
    type: "MultiTeacher",
    plan: "Annual",
    subscriptionStart: "2026-01-01T00:00:00",
    subscriptionEnd: "2027-01-01T00:00:00",
    teachersCount: 4,
    studentsCount: 52,
    status: "Active",
  },
  {
    id: 2,
    name: "مركز الأمل",
    ownerName: "أ. خالد سعيد",
    ownerPhone: "01099998888",
    ownerEmail: null,
    ownerId: 51,
    phone: null,
    address: "الجيزة",
    description: null,
    notes: null,
    type: "SoloTeacher",
    plan: "Monthly",
    subscriptionStart: "2026-02-01T00:00:00",
    subscriptionEnd: "2026-12-01T00:00:00",
    teachersCount: 1,
    studentsCount: 16,
    status: "Suspended",
  },
];

const SCENARIOS = {
  staff: { role: "CenterOwner", centerAdmin: true, centerType: "MultiTeacher" },
  superadmin: { role: "SuperAdmin", centerAdmin: false, centerType: null },
};

/* Pages. Every page runs the full viewport x theme matrix by default. */
const PAGES = [
  {
    key: "teachers",
    path: "/teachers",
    wait: '[data-testid="teachers-page"]',
    scenario: "staff",
    scope: "teachers-page",
    expect: "teachers",
    full: true,
  },
  {
    key: "teachers-add",
    path: "/teachers",
    wait: '[data-testid="teachers-page"]',
    action: "add-teacher",
    expectWait: '[data-testid="teacher-modal"]',
    scenario: "staff",
    scope: "teacher-modal",
    expect: "teacher-modal",
    full: false,
  },
  {
    key: "teachers-edit",
    path: "/teachers",
    wait: '[data-testid="teachers-page"]',
    action: "edit-teacher",
    expectWait: '[data-testid="teacher-modal"]',
    scenario: "staff",
    scope: "teacher-modal",
    expect: "teacher-modal-edit",
    full: false,
  },
  {
    key: "teachers-delete",
    path: "/teachers",
    wait: '[data-testid="teachers-page"]',
    action: "delete-teacher",
    expectWait: '[data-testid="confirm-modal"]',
    scenario: "staff",
    scope: "confirm-modal",
    expect: "confirm-modal",
    full: false,
  },
  {
    key: "assistants",
    path: "/assistants",
    wait: '[data-testid="assistants-page"]',
    scenario: "staff",
    scope: "assistants-page",
    expect: "assistants",
    full: true,
  },
  {
    key: "assistants-salaries",
    path: "/assistants",
    wait: '[data-testid="assistants-page"]',
    action: "assistant-salaries",
    scenario: "staff",
    scope: "assistants-page",
    expect: "assistants-salaries",
    full: true,
  },
  {
    key: "assistants-edit",
    path: "/assistants",
    wait: '[data-testid="assistants-page"]',
    action: "assistant-edit",
    expectWait: '[data-testid="assistant-modal"]',
    scenario: "staff",
    scope: "assistant-modal",
    expect: "assistant-modal",
    full: false,
  },
  {
    key: "assistants-reset",
    path: "/assistants",
    wait: '[data-testid="assistants-page"]',
    action: "assistant-reset",
    expectWait: '[data-testid="reset-password-modal"]',
    scenario: "staff",
    scope: "reset-password-modal",
    expect: "reset-password-modal",
    full: false,
  },
  {
    key: "assistants-pay",
    path: "/assistants",
    wait: '[data-testid="assistants-page"]',
    action: "assistant-pay",
    expectWait: '[data-testid="pay-salary-modal"]',
    scenario: "staff",
    scope: "pay-salary-modal",
    expect: "pay-salary-modal",
    full: false,
  },
  {
    key: "subscription",
    path: "/my-subscription",
    wait: '[data-testid="subscription-page"]',
    scenario: "staff",
    scope: "subscription-page",
    expect: "subscription",
    full: true,
  },
  {
    key: "settings",
    path: "/settings",
    wait: '[data-testid="settings-page"]',
    scenario: "staff",
    scope: "settings-page",
    expect: "settings",
    full: true,
  },
  {
    key: "profile",
    path: "/profile",
    wait: '[data-testid="profile-page"]',
    scenario: "staff",
    scope: "profile-page",
    expect: "profile",
    full: true,
  },
  {
    key: "change-password",
    path: "/change-password",
    wait: '[data-testid="force-password-page"]',
    scenario: "staff",
    scope: "force-password-page",
    expect: "change-password",
    full: true,
    // The temporary password (the phone number) is intentionally pre-filled so
    // the user can replace it without retyping; every other screen must start
    // with an empty password field.
    allowPrefilledPassword: true,
  },
  {
    key: "message-templates",
    path: "/message-templates",
    wait: '[data-testid="message-templates-page"]',
    scenario: "staff",
    scope: "message-templates-page",
    expect: "message-templates",
    full: true,
  },
  {
    key: "centers-add-teacher",
    path: "/centers",
    wait: 'button[title="تعديل"]',
    action: "add-teacher-super",
    expectWait: '[data-testid="add-teacher-modal"]',
    scenario: "superadmin",
    scope: "add-teacher-modal",
    expect: "add-teacher-modal",
    full: false,
    ignorePageOverflow: true,
  },
  {
    key: "centers-edit",
    path: "/centers",
    wait: 'button[title="تعديل"]',
    action: "center-edit",
    expectWait: '[data-testid="center-edit-modal"]',
    scenario: "superadmin",
    scope: "center-edit-modal",
    expect: "center-edit-modal",
    full: false,
    ignorePageOverflow: true,
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

const RUN_PAGES = list(process.env.PHASE3B7_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B7_VIEWPORTS, ALL_VIEWPORTS);
const RUN_THEMES = list(process.env.PHASE3B7_THEMES, THEMES);
const pages = PAGES.filter((p) => RUN_PAGES.includes(p.key));

/* ------------------------------------------------------------------ */
/* fixtures (continued)                                                */
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

let SCENARIO = SCENARIOS.staff;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.staff;
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
    start,
    slice: rows.slice(start, start + pageSize),
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    totalCount: rows.length,
  };
}

function teacherPaged(url) {
  const page = pageSlice(TEACHERS, url);
  return ok({ data: page.slice, totalPages: page.totalPages, totalCount: page.totalCount });
}

function assistantPaged(url) {
  const page = pageSlice(ASSISTANTS, url);
  return ok({ items: page.slice, totalPages: page.totalPages, totalCount: page.totalCount });
}

function centerPaged(url) {
  const page = pageSlice(CENTERS, url);
  return ok({ data: page.slice, totalPages: page.totalPages, totalCount: page.totalCount });
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
    return ok({ ...PROFILE, centerType: SCENARIO.centerType });
  }
  if (lower.includes("profile/changepassword")) {
    return ok({ accessToken: makeJwt(SCENARIO) });
  }
  if (lower.includes("profile/editmyprofile") || lower.includes("profile/requestemailchange")) {
    return { succeeded: true, data: null, message: "تم" };
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

  /* ---------- staff ---------- */
  if (lower.includes("/teacher/paginated")) return teacherPaged(url);
  if (lower.includes("/assistant/salary-status")) return ok(SALARY_STATUS);
  if (lower.includes("/assistant/pay-salary") || lower.includes("/assistant/pay-salary/edit")) {
    return { succeeded: true, data: null, message: "تم صرف المرتب" };
  }
  if (/\/assistant\/[^/]+\/reset-password/.test(lower)) {
    return { succeeded: true, data: { temporaryPassword: "Temp#12345" }, message: "تم" };
  }
  if (/\/assistant\/[^/]+\/salary-info/.test(lower)) return ok(null);
  if (lower.includes("/assistant/paginated")) return assistantPaged(url);

  if (lower.includes("/group/paginated")) {
    return { succeeded: true, data: GROUPS, totalPages: 1, totalCount: GROUPS.length };
  }
  if (lower.includes("/group/get-all")) return ok(GROUPS);

  if (lower.includes("/messagetemplate/list")) return ok(TEMPLATES);
  if (lower.includes("/messagetemplate/update")) {
    return ok({ ...TEMPLATES[0], isCustomized: true });
  }
  if (lower.includes("/messagetemplate/preview")) {
    return ok({ text: "معاينة: عزيزي ولي الأمر، غاب الطالب أحمد اليوم عن حصة مجموعة أ." });
  }
  if (/\/messagetemplate\/[^/]+\/reset/.test(lower)) return ok(TEMPLATES[0]);

  if (lower.includes("/center/paginated")) return centerPaged(url);
  if (lower.includes("/center/createwithowner")) {
    return { succeeded: true, data: { ownerPhone: "01012345678", initialPassword: "Init#12345" } };
  }
  if (lower.includes("/center/edit")) return { succeeded: true, data: null };

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
  const labels = (sel) => q(sel).map((el) => el.getAttribute("aria-label")).filter(Boolean);
  const nav = root.querySelector('nav[aria-label="ترقيم الصفحات"]');
  // The app shell also renders a mobile navigation drawer with role="dialog".
  // Only the batch dialogs carry a data-testid, so prefer those (and the audit
  // scope itself when it is the dialog).
  const scoped = scope ? testid(scope) : null;
  const dialogs = [...document.querySelectorAll('[role="dialog"][data-testid]')];
  const dialog =
    scoped && scoped.getAttribute("role") === "dialog"
      ? scoped
      : dialogs.length
        ? dialogs[dialogs.length - 1]
        : null;
  const close = dialog ? dialog.querySelector('button[aria-label="إغلاق"]') : null;
  const footer = dialog ? dialog.querySelector('[data-testid$="-footer"]') : null;
  const body = dialog ? dialog.querySelector('[data-testid$="-body"]') : null;

  const footBefore = footer ? footer.getBoundingClientRect() : null;
  let bodyScrollable = false;
  if (body) {
    bodyScrollable = body.scrollHeight > body.clientHeight + 1;
    body.scrollTop = body.scrollHeight;
  }
  const footAfter = footer ? footer.getBoundingClientRect() : null;
  if (body) body.scrollTop = 0;

  const pw = q("input").filter(
    (el) =>
      el.type === "password" ||
      /password/i.test(el.id + " " + el.name + " " + (el.getAttribute("placeholder") || "")),
  );
  const unmasked = q("input").filter(
    (el) => el.type !== "password" && /password/i.test(el.id + " " + el.name),
  );
  const hard = q("*")
    .filter((el) => {
      const cls = String(el.className || "");
      return (
        /(^|\s)(text-white|bg-white|text-black|bg-black)(\s|$)/.test(cls) ||
        /(?:text|bg|border)-\[#[0-9a-fA-F]{3,8}\]/.test(cls)
      );
    })
    .map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 80) }))
    .slice(0, 8);

  return {
    text: textOf(root).slice(0, 8000),
    heading: textOf(root.querySelector("h1")),
    dialogTitle: textOf(dialog ? dialog.querySelector("h2") : null),
    table: Boolean(root.querySelector("table")),
    tableRows: root.querySelectorAll("tbody tr").length,
    mobileCards: root.querySelectorAll("ul.divide-y > li").length,
    groupCards: root.querySelectorAll('[data-testid^="group-card-"]').length,
    salaryCards: root.querySelectorAll("article").length,
    tabs: q('[role="tab"]').length,
    textarea: Boolean(root.querySelector("textarea")),
    navText: textOf(nav),
    actionLabels: labels("button[aria-label]"),
    filterLabels: labels("input[aria-label], select[aria-label]"),
    links: q("a[href]").map((a) => a.getAttribute("href")).slice(0, 12),
    smallButtons: q("button")
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && (r.width < 43.5 || r.height < 43.5);
      })
      .map((b) => ({
        label: b.getAttribute("aria-label") || textOf(b).slice(0, 20),
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
      })),
    passwordInputs: pw.map((el) => ({
      id: el.id,
      type: el.type,
      autocomplete: el.autocomplete,
      value: el.value,
      cls: String(el.className).slice(0, 60),
    })),
    unmaskedPasswords: unmasked.map((el) => ({ id: el.id, type: el.type, name: el.name })),
    hardColors: hard,
    modal: dialog
      ? {
          testid: dialog.getAttribute("data-testid"),
          panelClass: String(dialog.className),
          maxHCapped: /max-h-\[100dvh\]/.test(String(dialog.className)),
          closeClass: close ? String(close.className) : "",
          closeBox: close
            ? {
                w: Math.round(close.getBoundingClientRect().width),
                h: Math.round(close.getBoundingClientRect().height),
              }
            : null,
          hasFooter: Boolean(footer),
          footerInsideBody: Boolean(body && footer && body.contains(footer)),
          footerStable: Boolean(
            footBefore &&
              footAfter &&
              Math.abs(footBefore.bottom - footAfter.bottom) <= 1 &&
              Math.abs(footBefore.top - footAfter.top) <= 1,
          ),
          footerVisible: Boolean(
            footAfter && footAfter.bottom <= window.innerHeight + 1 && footAfter.top >= -1,
          ),
          bodyScrollable,
          hasForm: Boolean(dialog.querySelector("form")),
          inputCount: dialog.querySelectorAll("input").length,
          selectCount: dialog.querySelectorAll("select").length,
          text: textOf(dialog).slice(0, 5000),
        }
      : null,
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
      "--use-fake-ui-for-media-stream",
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

    const applyAction = async (page) => {
      if (!page.action) return;

      if (page.action === "add-teacher") {
        await clickByText(null, "إضافة مدرس");
      } else if (page.action === "edit-teacher") {
        await clickFirstVisibleByLabel("تعديل ");
      } else if (page.action === "delete-teacher") {
        await clickFirstVisibleByLabel("حذف ");
      } else if (page.action === "assistant-edit") {
        await clickFirstVisibleByLabel("تعديل ");
      } else if (page.action === "assistant-reset") {
        await clickFirstVisibleByLabel("إعادة تعيين كلمة سر ");
      } else if (page.action === "assistant-salaries") {
        await clickByText(null, "سجل المرتبات");
        await sleep(900);
      } else if (page.action === "assistant-pay") {
        await clickByText(null, "سجل المرتبات");
        await sleep(900);
        await clickByText(null, "صرف المرتب");
      } else if (page.action === "add-teacher-super") {
        await clickByText(null, "مدرس فردي");
      } else if (page.action === "center-edit") {
        await clickSelector('button[title="تعديل"]');
      }

      if (page.expectWait) await waitForSelector(page.expectWait, 12000);
      await sleep(500);
    };

    const audit = async (scope) => {
      await setAuditScope(scope);
      return evaluate(AUDIT);
    };

    const probeFor = async (page) => {
      await setAuditScope(page.scope);
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

          const p = run.probe || {};
          const text = p.text || "";

          /* ---------- batch-wide sensitive-field checks ---------- */
          for (const input of p.passwordInputs || []) {
            if (input.type !== "password")
              failures.push(`${tag}: password field "${input.id}" is type ${input.type}`);
            if (input.value && !page.allowPrefilledPassword)
              failures.push(`${tag}: password field "${input.id}" arrived pre-filled`);
          }
          if ((p.unmaskedPasswords || []).length)
            failures.push(
              `${tag}: unmasked password-named input(s) (${p.unmaskedPasswords
                .map((i) => `${i.id}:${i.type}`)
                .join(", ")})`,
            );
          if ((p.hardColors || []).length)
            failures.push(
              `${tag}: hard-coded colour class(es) (${p.hardColors
                .map((c) => c.cls)
                .join(" | ")})`,
            );

          const m = p.modal;
          if (m) {
            if (!m.maxHCapped)
              failures.push(`${tag}: dialog is not capped to the viewport (${m.panelClass})`);
            if (!m.closeClass.includes("h-11"))
              failures.push(`${tag}: dialog close is not 44px`);
            if (m.closeBox && (m.closeBox.w < 43.5 || m.closeBox.h < 43.5))
              failures.push(`${tag}: dialog close is ${m.closeBox.w}x${m.closeBox.h}`);
            if (m.hasFooter) {
              if (m.footerInsideBody)
                failures.push(`${tag}: dialog footer scrolls with the body`);
              if (!m.footerStable)
                failures.push(`${tag}: dialog footer moved while scrolling the body`);
              if (!m.footerVisible)
                failures.push(`${tag}: dialog footer is outside the viewport`);
            }
            if (page.expect.startsWith("teacher-modal") && !m.hasForm)
              failures.push(`${tag}: dialog lost its form wrapper`);
          }

          if (page.expect === "teachers") {
            if (!text.includes("إدارة المدرسين"))
              failures.push(`${tag}: teachers heading is missing`);
            if (!p.table) failures.push(`${tag}: teachers table is missing`);
            if (p.tableRows !== 8)
              failures.push(`${tag}: ${p.tableRows} teacher rows, expected 8`);
            if (p.mobileCards !== 8)
              failures.push(`${tag}: ${p.mobileCards} teacher cards, expected 8`);
            if (!text.includes("أ. سارة عبد الله"))
              failures.push(`${tag}: first teacher is missing`);
            if (!text.includes("الرياضيات"))
              failures.push(`${tag}: subject badge is missing`);
            if (!p.navText.includes("9"))
              failures.push(`${tag}: pagination total is missing`);
            if (!(p.filterLabels || []).includes("بحث عن مدرس"))
              failures.push(`${tag}: teacher search label is missing`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("تعديل ")))
              failures.push(`${tag}: edit action is missing`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("حذف ")))
              failures.push(`${tag}: delete action is missing`);
          }

          if (page.expect === "teacher-modal") {
            if (p.dialogTitle !== "إضافة مدرس جديد")
              failures.push(`${tag}: dialog title is "${p.dialogTitle}"`);
            if ((p.passwordInputs || []).length !== 2)
              failures.push(`${tag}: ${(p.passwordInputs || []).length} password fields, expected 2`);
            if ((p.passwordInputs || []).some((i) => i.autocomplete !== "new-password"))
              failures.push(`${tag}: password autocomplete is not new-password`);
            if (!text.includes("تأكيد كلمة المرور"))
              failures.push(`${tag}: password confirmation field is missing`);
            if (!text.includes("الاسم الكامل"))
              failures.push(`${tag}: teacher name field is missing`);
          }

          if (page.expect === "teacher-modal-edit") {
            if (p.dialogTitle !== "تعديل بيانات المدرس")
              failures.push(`${tag}: dialog title is "${p.dialogTitle}"`);
            if ((p.passwordInputs || []).length !== 0)
              failures.push(`${tag}: edit dialog exposes ${(p.passwordInputs || []).length} password field(s)`);
            if (!text.includes("المجموعات"))
              failures.push(`${tag}: groups field is missing`);
          }

          if (page.expect === "confirm-modal") {
            if (!text.includes("حذف المدرس"))
              failures.push(`${tag}: delete dialog title is missing`);
            if (!text.includes("هل أنت متأكد"))
              failures.push(`${tag}: confirm message is missing`);
          }

          if (page.expect === "assistants") {
            if (!text.includes("إدارة المساعدين"))
              failures.push(`${tag}: assistants heading is missing`);
            if (!p.table) failures.push(`${tag}: assistants table is missing`);
            if (p.tableRows !== 6)
              failures.push(`${tag}: ${p.tableRows} assistant rows, expected 6`);
            if (p.mobileCards !== 6)
              failures.push(`${tag}: ${p.mobileCards} assistant cards, expected 6`);
            if (p.tabs !== 2) failures.push(`${tag}: ${p.tabs} assistant tabs, expected 2`);
            if (!text.includes("منال حسن"))
              failures.push(`${tag}: first assistant is missing`);
            if (!p.navText.includes("7"))
              failures.push(`${tag}: pagination total is missing`);
            if (!(p.filterLabels || []).includes("بحث عن مساعد"))
              failures.push(`${tag}: assistant search label is missing`);
            if (!(p.actionLabels || []).some((l) => l.startsWith("إعادة تعيين كلمة سر ")))
              failures.push(`${tag}: reset password action is missing`);
          }

          if (page.expect === "assistants-salaries") {
            if (!text.includes("سجل المرتبات"))
              failures.push(`${tag}: salary tab title is missing`);
            if (!text.includes("عدد المساعدين"))
              failures.push(`${tag}: salary summary is missing`);
            if (!text.includes("منال حسن") || !text.includes("سلمى إبراهيم"))
              failures.push(`${tag}: salary cards are missing`);
            if (p.salaryCards !== 3)
              failures.push(`${tag}: ${p.salaryCards} salary cards, expected 3`);
            if (!text.includes("تم الصرف") || !text.includes("لم يتم الصرف"))
              failures.push(`${tag}: salary statuses are missing`);
            for (const label of ["شهر المرتبات", "بحث عن مساعد في المرتبات", "حالة المرتب"]) {
              if (!(p.filterLabels || []).includes(label))
                failures.push(`${tag}: filter "${label}" is missing`);
            }
            if (!text.includes("صرف المرتب"))
              failures.push(`${tag}: pay action is missing`);
            if (!text.includes("السجل"))
              failures.push(`${tag}: salary log action is missing`);
          }

          if (page.expect === "assistant-modal") {
            if (p.dialogTitle !== "تعديل بيانات المساعد")
              failures.push(`${tag}: dialog title is "${p.dialogTitle}"`);
            if ((p.passwordInputs || []).length !== 0)
              failures.push(`${tag}: edit dialog exposes ${(p.passwordInputs || []).length} password field(s)`);
            if (!text.includes("المرتب (ج.م)"))
              failures.push(`${tag}: salary field is missing`);
          }

          if (page.expect === "reset-password-modal") {
            if (!text.includes("إعادة تعيين كلمة السر"))
              failures.push(`${tag}: reset dialog title is missing`);
            if (!text.includes("كلمة مرور مؤقتة"))
              failures.push(`${tag}: reset explanation is missing`);
            if ((p.passwordInputs || []).length !== 0)
              failures.push(`${tag}: reset dialog unexpectedly renders a password input`);
          }

          if (page.expect === "pay-salary-modal") {
            if (!text.includes("صرف مرتب"))
              failures.push(`${tag}: pay dialog title is missing`);
            if (!text.includes("منال حسن") && !text.includes("عمرو سيد") && !text.includes("سلمى إبراهيم"))
              failures.push(`${tag}: pay dialog has no assistant name`);
            if (!(p.filterLabels || []).length && !text.includes("المبلغ"))
              failures.push(`${tag}: pay dialog fields are missing`);
          }

          if (page.expect === "subscription") {
            if (!text.includes("اشتراكي")) failures.push(`${tag}: subscription heading is missing`);
            if (!text.includes("الخطة الحالية"))
              failures.push(`${tag}: plan block is missing`);
            if (!text.includes("سنوي"))
              failures.push(`${tag}: plan type is missing`);
            if (!text.includes("نشط")) failures.push(`${tag}: subscription state is missing`);
            if (!text.includes("الميزات المفعّلة"))
              failures.push(`${tag}: enabled-modules block is missing`);
            if (!text.includes("11 من 11"))
              failures.push(`${tag}: enabled module count is missing`);
            if (!(p.links || []).some((href) => /wa\.me|api\.whatsapp/.test(href || "")))
              failures.push(`${tag}: support link is missing`);
          }

          if (page.expect === "settings") {
            if (!text.includes("إدارة المجموعات"))
              failures.push(`${tag}: groups heading is missing`);
            if (!text.includes("إضافة مجموعة جديدة"))
              failures.push(`${tag}: add-group card is missing`);
            if (!text.includes("اسم المجموعة"))
              failures.push(`${tag}: group form fields are missing`);
          }

          if (page.expect === "profile") {
            if (!text.includes("الملف الشخصي"))
              failures.push(`${tag}: profile heading is missing`);
            if (!text.includes("بيانات الحساب"))
              failures.push(`${tag}: account block is missing`);
            if (!text.includes("تغيير كلمة المرور"))
              failures.push(`${tag}: password block is missing`);
            if ((p.passwordInputs || []).length !== 3)
              failures.push(`${tag}: ${(p.passwordInputs || []).length} password fields, expected 3`);
            const reveals = (p.actionLabels || []).filter((l) => l.includes("كلمة المرور"));
            if (reveals.length < 3)
              failures.push(`${tag}: ${reveals.length} password reveal labels, expected 3`);
          }

          if (page.expect === "change-password") {
            if (!text.includes("كلمة المرور المؤقتة"))
              failures.push(`${tag}: temporary-password label is missing`);
            if (!text.includes("كلمة المرور الجديدة") || !text.includes("تأكيد كلمة المرور"))
              failures.push(`${tag}: new/confirm password labels are missing`);
            if ((p.passwordInputs || []).length !== 3)
              failures.push(`${tag}: ${(p.passwordInputs || []).length} password fields, expected 3`);
            if (!text.includes("حفظ كلمة المرور"))
              failures.push(`${tag}: submit button is missing`);
          }

          if (page.expect === "message-templates") {
            if (!text.includes("قوالب الرسائل"))
              failures.push(`${tag}: templates heading is missing`);
            if (p.tabs !== 3)
              failures.push(`${tag}: ${p.tabs} template tabs, expected 3`);
            if (!p.textarea) failures.push(`${tag}: template editor is missing`);
            if (!text.includes("حفظ القالب"))
              failures.push(`${tag}: save button is missing`);
            if (!text.includes("استعادة الافتراضي"))
              failures.push(`${tag}: reset button is missing`);
            if (!text.includes("معاينة"))
              failures.push(`${tag}: preview block is missing`);
          }

          if (page.expect === "add-teacher-modal") {
            if (p.dialogTitle !== "إضافة مدرس جديد")
              failures.push(`${tag}: dialog title is "${p.dialogTitle}"`);
            if ((p.passwordInputs || []).length !== 1)
              failures.push(
                `${tag}: ${(p.passwordInputs || []).length} password fields, expected 1 (owner password)`,
              );
            if (!text.includes("رقم الهاتف (اسم الدخول)"))
              failures.push(`${tag}: owner phone field is missing`);
            if (!text.includes("بيانات المركز"))
              failures.push(`${tag}: center section is missing`);
            if (!text.includes("تاريخ النهاية"))
              failures.push(`${tag}: subscription section is missing`);
            if (viewport[0] === "360" || viewport[0] === "390") {
              if (!m || !m.bodyScrollable)
                failures.push(`${tag}: long form is not scrollable on a phone`);
            }
          }

          if (page.expect === "center-edit-modal") {
            if (p.dialogTitle !== "تعديل المركز والاشتراك")
              failures.push(`${tag}: dialog title is "${p.dialogTitle}"`);
            if (!text.includes("اسم المركز"))
              failures.push(`${tag}: center name field is missing`);
            if (!text.includes("نهاية الاشتراك"))
              failures.push(`${tag}: subscription end field is missing`);
            if (!text.includes("حفظ التغييرات"))
              failures.push(`${tag}: save action is missing`);
            if ((p.unmaskedPasswords || []).length)
              failures.push(`${tag}: center dialog exposes a password field`);
          }
        }
      }
    }

    /* ---------- live behaviour probes ---------- */

    const lastCall = (needle) =>
      [...apiLog].reverse().find((call) => call.url.toLowerCase().includes(needle));
    const hasPage = (key) => pages.some((p) => p.key === key);

    if (hasPage("teachers")) {
      setScenario("staff");
      await navigate("/teachers", "light", { width: 1280, height: 800 }, [
        '[data-testid="teachers-page"]',
      ]);
      await evaluate(`(() => {
        const input = document.querySelector('input[aria-label="بحث عن مدرس"]');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "سارة");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await sleep(1100);
      const searchCall = lastCall("/teacher/paginated");
      probes.teachersSearch = { url: searchCall?.url ?? null };
      if (!/search=/i.test(searchCall?.url || ""))
        failures.push(`teachers probe: the search request was not sent`);
    }

    if (hasPage("assistants")) {
      setScenario("staff");
      await navigate("/assistants", "light", { width: 1280, height: 800 }, [
        '[data-testid="assistants-page"]',
      ]);
      await clickByText(null, "سجل المرتبات");
      await sleep(1200);
      const salaryCall = lastCall("/assistant/salary-status");
      const salaryProbe = await evaluate(`(() => ({
        cards: document.querySelectorAll("article").length,
        statuses: [...document.querySelectorAll("article")].map((el) => el.textContent.replace(/\\s+/g, " ").trim()).join(" | ").slice(0, 600),
      }))()`);
      probes.assistantsSalary = { url: salaryCall?.url ?? null, ...salaryProbe };
      if (!salaryCall) failures.push(`assistants probe: salary status request was not sent`);
      if (!/month=|Month=/.test(salaryCall?.url || ""))
        failures.push(`assistants probe: salary request has no month`);
      if (salaryProbe.cards !== 3)
        failures.push(`assistants probe: ${salaryProbe.cards} salary cards, expected 3`);
      if (!salaryProbe.statuses.includes("تم الصرف"))
        failures.push(`assistants probe: paid status is missing`);
    }

    if (hasPage("profile")) {
      setScenario("staff");
      await navigate("/profile", "light", { width: 390, height: 844 }, [
        '[data-testid="profile-page"]',
      ]);
      const before = await evaluate(`(() => {
        const input = document.querySelector('input[name="currentPassword"]');
        return input ? { type: input.type, autocomplete: input.autocomplete } : null;
      })()`);
      const toggled = await evaluate(`(() => {
        const button = document.querySelector('button[aria-label="إظهار كلمة المرور"]');
        if (!button) return false;
        button.click();
        return true;
      })()`);
      await sleep(200);
      const after = await evaluate(`(() => {
        const input = document.querySelector('input[name="currentPassword"]');
        return input ? { type: input.type } : null;
      })()`);
      const typed = await evaluate(`(() => {
        const input = document.querySelector('input[name="newPassword"]');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "MySecret#123");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await sleep(250);
      const secretInBody = await evaluate(
        `(document.body.innerText || "").includes("MySecret#123")`,
      );
      probes.profilePassword = {
        before,
        toggled,
        after,
        typed,
        secretInBody,
        secretInConsole: consoleLog.some((entry) => entry.text.includes("MySecret#123")),
      };
      if (!toggled) failures.push(`profile probe: reveal button is missing`);
      if (before?.type !== "password" || after?.type !== "text")
        failures.push(`profile probe: reveal toggle did not change the input type`);
      if (before?.autocomplete !== "current-password")
        failures.push(`profile probe: current password autocomplete is "${before?.autocomplete}"`);
      if (!typed) failures.push(`profile probe: new-password field is missing`);
      if (secretInBody) failures.push(`profile probe: typed password leaked into the page text`);
      if (probes.profilePassword.secretInConsole)
        failures.push(`profile probe: typed password leaked into the console`);
    }

    if (hasPage("change-password")) {
      setScenario("staff");
      await navigate("/change-password", "light", { width: 390, height: 844 }, [
        '[data-testid="force-password-page"]',
      ]);
      const forced = await evaluate(`(() => {
        const page = document.querySelector('[data-testid="force-password-page"]');
        const inputs = [...page.querySelectorAll("input")];
        return {
          count: inputs.length,
          types: inputs.map((el) => el.type),
          autocomplete: inputs.map((el) => el.autocomplete),
          labels: inputs.map((el) => el.id),
        };
      })()`);
      probes.forcePassword = forced;
      if (forced.count !== 3) failures.push(`force-password probe: ${forced.count} inputs, expected 3`);
      if (forced.types.some((type) => type !== "password"))
        failures.push(`force-password probe: ${forced.types.join(",")}`);
      if (JSON.stringify(forced.autocomplete) !== JSON.stringify([
        "current-password",
        "new-password",
        "new-password",
      ]))
        failures.push(`force-password probe: autocomplete ${JSON.stringify(forced.autocomplete)}`);
    }

    if (hasPage("centers-add-teacher")) {
      setScenario("superadmin");
      await navigate("/centers", "light", { width: 390, height: 600 }, [
        'button[title="تعديل"]',
      ]);
      await clickByText(null, "مدرس فردي");
      await waitForSelector('[data-testid="add-teacher-modal"]', 12000);
      await sleep(600);
      const longModal = await evaluate(`(() => {
        const dialog = document.querySelector('[data-testid="add-teacher-modal"]');
        const body = dialog.querySelector('[data-testid="add-teacher-modal-body"]');
        const footer = dialog.querySelector('[data-testid="add-teacher-modal-footer"]');
        const save = footer ? footer.querySelector('button[type="submit"]') : null;
        const before = footer.getBoundingClientRect();
        body.scrollTop = body.scrollHeight;
        const after = footer.getBoundingClientRect();
        return {
          scrollHeight: body.scrollHeight,
          clientHeight: body.clientHeight,
          scrollTop: body.scrollTop,
          footerBefore: Math.round(before.top),
          footerAfter: Math.round(after.top),
          footerBottom: Math.round(after.bottom),
          viewport: window.innerHeight,
          saveVisible: Boolean(save) && save.getBoundingClientRect().bottom <= window.innerHeight + 1,
          dialogHeight: Math.round(dialog.getBoundingClientRect().height),
        };
      })()`);
      probes.longModal = longModal;
      if (longModal.scrollHeight <= longModal.clientHeight)
        failures.push(`long modal probe: the form did not overflow its scroll body`);
      if (longModal.scrollTop <= 0)
        failures.push(`long modal probe: the body did not scroll`);
      if (longModal.footerBefore !== longModal.footerAfter)
        failures.push(
          `long modal probe: footer moved ${longModal.footerBefore} -> ${longModal.footerAfter}`,
        );
      if (!longModal.saveVisible)
        failures.push(`long modal probe: the save button is not visible`);
      if (longModal.dialogHeight > longModal.viewport + 1)
        failures.push(`long modal probe: dialog is taller than the viewport`);
    }

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "teachers", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "teachers-add", sizes: [["390", 390, 844]] },
      { key: "assistants", sizes: [["390", 390, 844]] },
      { key: "assistants-salaries", sizes: [["390", 390, 844]] },
      { key: "assistants-pay", sizes: [["390", 390, 844]] },
      { key: "subscription", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "settings", sizes: [["390", 390, 844]] },
      { key: "profile", sizes: [["390", 390, 844]] },
      { key: "change-password", sizes: [["390", 390, 844]] },
      { key: "message-templates", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "centers-add-teacher", sizes: [["390", 390, 844]] },
      { key: "centers-edit", sizes: [["390", 390, 844]] },
    ].filter((t) => RUN_PAGES.includes(t.key));

    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;

      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(page.scenario);
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
      { key: "teachers" },
      { key: "assistants" },
      { key: "subscription" },
      { key: "profile" },
      { key: "message-templates" },
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
        ["MySecret#123", "OwnerPass#123", "Temp#12345", "Init#12345"].some((secret) =>
          entry.text.includes(secret),
        ),
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
      join(OUT, "batch7-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 7: المدرسون والمساعدون والاشتراك والإعدادات والملف الشخصي", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: إدارة المدرسين (جدول + بطاقات + ترقيم + بحث)، نافذة إضافة/تعديل المدرس وحذفه، إدارة المساعدين وتبويب سجل المرتبات وبطاقاته، نوافذ تعديل المساعد وإعادة تعيين كلمة السر وصرف المرتب، اشتراكي، إعدادات المجموعات، الملف الشخصي، شاشة تغيير كلمة المرور الإجبارية، قوالب الرسائل، ونافذتا المدرس الفردي وتعديل المركز الطويلتان على صفحة المراكز.",
      "",
    );
    md.push(
      "الدور: CenterOwner في مركز متعدد المدرسين لشاشات الإدارة، وSuperAdmin لصفحة المراكز. تُفحص شاشات كلمة المرور كشاشات حساسة: كل حقل `type=password`، لا قيمة مسبقة، لا تسريب إلى وحدة التحكم، ونوافذ النماذج الطويلة تُفحص بثبات الفوتر خارج جسم التمرير بعد تمرير الجسم إلى أقصاه.",
      "",
    );

    md.push("## بوابات الجودة", "");
    md.push("| البوابة | الأمر | النتيجة |");
    md.push("| --- | --- | --- |");
    md.push(
      `| اختبارات الوحدة | \`npx vitest run\` من \`Frontend/CenterManagement\` | ${process.env.PHASE3B7_VITEST || "—"} |`,
    );
    md.push(
      `| بناء الإنتاج | \`npm run build\` | ${process.env.PHASE3B7_BUILD || "—"} |`,
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
      "`docs/design/shots/phase3b7/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.",
      "",
    );

    md.push("## حدود الفحص الآلي", "");
    md.push(
      "- **لا SQL Server حقيقي.** كل الشاشات تقرأ استجابات معترضة بـ fixtures؛ لم يُنشأ مدرس أو مساعد أو مجموعة فعليًا على قاعدة بيانات، والحفظ/الحذف/الصرف في الباك إند لم يُعد قياسه هنا.",
      "- **لا شبكة إنتاجية.** كل طلبات الـ API معترضة؛ لا قياس لزمن الاستجابة أو سلوك إعادة المحاولة.",
      "- **جهاز/متصفح واحد.** كل اللقطات والقياسات من Chromium سطح مكتب (CDP)؛ لا Safari ولا Firefox ولا أحجام خطوط iOS/Android.",
      "- **اللمس والتمرير محاكيان.** أحجام الأهداف (44px) والتمرير الأفقي والتراكب والتباين تُحسب من CSSOM و`getBoundingClientRect`؛ لا إيماءات لمس فعلية.",
      "- **كلمة المرور تُفحص شكليًا.** يُتحقق من `type=password` وعدم وجود قيمة مسبقة وعدم ظهور القيمة المكتوبة في نص الصفحة أو وحدة التحكم؛ لم يُختبر تغيير كلمة مرور حقيقي على الخادم.",
      "- **صفحة المراكز خارج نطاق إعادة التصميم.** تدقيق النافذتين يقتصر على نطاق النافذة (`add-teacher-modal` / `center-edit-modal`) ولا يحكم على تنسيق صفحة `/centers` نفسها التي لم تُعدَّل في هذه الدفعة.",
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
    await writeFile(join(OUT, "batch7-verify.md"), md.join("\n"));

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
  if (probe.modal) return `dialog · ${probe.dialogTitle || probe.modal.testid || "-"}`;
  if (probe.salaryCards) return `salary · ${probe.salaryCards}`;
  if (probe.passwordInputs?.length) return `form · ${probe.passwordInputs.length} masked`;
  if (probe.table) return `table · ${probe.tableRows} rows`;
  return "-";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
