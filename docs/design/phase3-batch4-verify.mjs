/**
 * Phase 3 - batch 4 (attendance, scanner, groups) automated checks.
 *
 *   node phase3-batch4-verify.mjs
 *
 * Boots the real Vite app, intercepts the live API over CDP `Fetch` with
 * deterministic fixtures that mirror the ASP.NET `Response<T>` envelopes, then
 * drives headless Chrome at every required viewport in light and dark:
 *
 *   /attendance   -> the four statuses, counters, bulk bar, the late/excused menu
 *   /scanner      -> running session, camera error/permission state, hardware
 *                    scanner tab with a scan result + history, page scan log
 *   /settings     -> add-group card, group cards, edit modal preload + save,
 *                    group sessions modal
 *
 * Checks: no page scroll, 44px targets, >=14px primary text, no clipped text,
 * no overlay covering a control, no overlapping cards, RTL, local fonts, WCAG
 * AA, the expected state is on stage, the four statuses, the scan log and the
 * edit form keeping per-session price + schedule, plus 200% text and page zoom.
 * Writes phase3/batch4-verify.json + .md and screenshots into shots/phase3b4/.
 *
 * Narrow for a fast iteration:
 *   PHASE3B4_PAGES=attendance PHASE3B4_VIEWPORTS=390 PHASE3B4_THEMES=dark
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT } from "./audit-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, "..", "..", "Frontend", "CenterManagement");
const OUT = join(HERE, "phase3");
const SHOTS = join(HERE, "shots", "phase3b4");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase3b4-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9470;
const APP_PORT = 5204;
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
  {
    id: "g1",
    name: "مجموعة الصف الثالث الثانوي",
    monthlyPrice: 300,
    perSessionPrice: 40,
    sessionsPerMonth: 4,
    totalStudentsCount: 4,
    teacherId: null,
    schedule: [
      { dayOfWeek: 6, startTime: "17:00:00", endTime: "19:00:00" },
      { dayOfWeek: 1, startTime: "16:00:00", endTime: "18:00:00" },
    ],
  },
  {
    id: "g2",
    name: "مجموعة الصف الثاني الثانوي",
    monthlyPrice: 250,
    perSessionPrice: 35,
    sessionsPerMonth: 8,
    totalStudentsCount: 12,
    teacherId: null,
    schedule: [{ dayOfWeek: 3, startTime: "14:00:00", endTime: "16:00:00" }],
  },
  {
    id: "g3",
    name: "مجموعة المراجعة النهائية",
    monthlyPrice: 180,
    perSessionPrice: 30,
    sessionsPerMonth: 2,
    totalStudentsCount: 7,
    teacherId: null,
    schedule: [{ dayOfWeek: 5, startTime: "10:00:00", endTime: "12:00:00" }],
  },
];

const SESSION_ROWS = [
  { id: "sess1", dayOfWeek: 6, startTime: "17:00:00", endTime: "19:00:00", sessionPrice: 40 },
  { id: "sess2", dayOfWeek: 1, startTime: "16:00:00", endTime: "18:00:00", sessionPrice: 40 },
];

const STUDENTS = [
  {
    id: "s1",
    fullName: "أحمد محمود",
    phone: "01012345678",
    parentPhoneNumber: "01112345678",
    status: 1,
    notes: "",
  },
  {
    id: "s2",
    fullName: "منى حسن",
    phone: "01098765432",
    parentPhoneNumber: "01198765432",
    status: 2,
    notes: "",
  },
  {
    id: "s3",
    fullName: "يوسف علي",
    phone: "01055551234",
    parentPhoneNumber: "01155551234",
    status: 3,
    notes: "",
  },
  {
    id: "s4",
    fullName: "سارة سمير",
    phone: "01044442222",
    parentPhoneNumber: "01144442222",
    status: 4,
    notes: "بعذر طبي",
  },
];

const RUNNING_SESSIONS = [
  {
    sessionId: "sess1",
    groupId: "g1",
    groupName: "مجموعة الصف الثالث الثانوي",
    dayOfWeek: 6,
    startTime: "17:00:00",
    endTime: "19:00:00",
    studentsCount: 4,
  },
];

const ATTENDANCE_STATS = {
  presentToday: 8,
  absentToday: 2,
  lateToday: 1,
  excusedToday: 1,
  presentThisMonth: 40,
  absentThisMonth: 6,
  lateThisMonth: 4,
  excusedThisMonth: 2,
  totalThisMonth: 52,
  attendanceRate: 84.6,
};

const SCAN_SUCCESS = {
  succeeded: true,
  message: "تم تسجيل حضور أحمد محمود.",
  data: {
    fullName: "أحمد محمود",
    qrCode: "STU00000001",
    status: 1,
    alreadyRecorded: false,
  },
};

const SCENARIOS = {
  attendance: {
    data: "attendance",
    role: "Teacher",
    centerAdmin: true,
    centerType: "MultiTeacher",
  },
  scanner: {
    data: "scanner",
    role: "Teacher",
    centerAdmin: false,
    centerType: "MultiTeacher",
  },
  groups: {
    data: "groups",
    role: "CenterOwner",
    centerAdmin: true,
    centerType: "SoloTeacher",
  },
};

const PAGES = [
  {
    key: "attendance",
    path: "/attendance",
    wait: '[data-testid="attendance-grid"]',
    scenario: "attendance",
    scope: "attendance-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "attendance",
    full: true,
  },
  {
    key: "attendance-menu",
    path: "/attendance",
    wait: '[data-testid="attendance-grid"]',
    scenario: "attendance",
    action: "attendance-menu",
    scope: "attendance-page",
    viewports: ["390", "1280"],
    expect: "attendance-menu",
    full: false,
  },
  {
    key: "scanner",
    path: "/scanner",
    wait: '[data-testid="scanner-page"]',
    scenario: "scanner",
    scope: "scanner-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "scanner",
    full: true,
  },
  {
    key: "scanner-camera",
    path: "/scanner",
    wait: '[data-testid="scanner-page"]',
    scenario: "scanner",
    action: "scanner-camera",
    expectWait: '[data-testid="qr-scanner-dialog"]',
    scope: "qr-scanner-dialog",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "scanner-camera",
    full: false,
  },
  {
    key: "scanner-code",
    path: "/scanner",
    wait: '[data-testid="scanner-page"]',
    scenario: "scanner",
    action: "scanner-code",
    expectWait: '[data-testid="scanner-result"]',
    scope: "qr-scanner-dialog",
    viewports: ["390", "1280"],
    expect: "scanner-code",
    full: false,
  },
  {
    key: "groups-add",
    path: "/settings",
    wait: '[data-testid="group-add-card"]',
    scenario: "groups",
    scope: "settings-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "groups-add",
    full: true,
  },
  {
    key: "groups-list",
    path: "/settings",
    wait: '[data-testid="group-add-card"]',
    scenario: "groups",
    action: "groups-list",
    expectWait: '[data-testid="group-card-g1"]',
    scope: "settings-page",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "groups-list",
    full: true,
  },
  {
    key: "group-edit",
    path: "/settings",
    wait: '[data-testid="group-add-card"]',
    scenario: "groups",
    action: "group-edit",
    expectWait: '[data-testid="group-edit-modal"]',
    scope: "group-edit-modal",
    viewports: ["360", "390", "768", "1280", "1920", "land-844"],
    expect: "group-edit",
    full: false,
  },
  {
    key: "group-sessions",
    path: "/settings",
    wait: '[data-testid="group-add-card"]',
    scenario: "groups",
    action: "group-sessions",
    expectWait: '[data-testid="group-sessions-modal"]',
    scope: "group-sessions-modal",
    viewports: ["390", "1280"],
    expect: "group-sessions",
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

const RUN_PAGES = list(process.env.PHASE3B4_PAGES, PAGES.map((p) => p.key));
const RUN_VIEWPORTS = list(process.env.PHASE3B4_VIEWPORTS, VIEWPORTS.map((v) => v[0]));
const RUN_THEMES = list(process.env.PHASE3B4_THEMES, THEMES);
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
    [NAME_CLAIM]: "م. محمد المدرس",
    PhoneNumber: "01000000000",
    is_center_admin: scenario.centerAdmin ? "true" : "false",
    pwd_change_required: "false",
    impersonation: "false",
  };
  return `${b64url(header)}.${b64url(payload)}.fixture`;
}

const ok = (data) => ({ succeeded: true, data });

let SCENARIO = SCENARIOS.attendance;

const setScenario = (key) => {
  SCENARIO = SCENARIOS[key] ?? SCENARIOS.attendance;
};

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
      subject: SCENARIO.role === "Teacher" ? "الرياضيات" : null,
      email: SCENARIO.role === "Teacher" ? "teacher@example.com" : null,
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

  /* ---------- groups ---------- */
  if (lower.includes("/group/paginated")) return GROUPS;
  if (lower.includes("/group/get-all")) return GROUPS;
  if (lower.includes("/group/create")) {
    return { succeeded: true, message: "تمت إضافة المجموعة", data: "g4" };
  }
  if (lower.includes("/group/edit")) {
    return { succeeded: true, message: "تم تعديل المجموعة", data: "ok" };
  }
  if (lower.includes("/group/delete/")) return ok(true);
  if (lower.includes("/teacher/paginated")) {
    return ok({ items: [], totalCount: 0, pageIndex: 1, totalPages: 0 });
  }

  /* ---------- sessions (attendance sheet and the sessions modal) ---------- */
  if (lower.includes("/sessionrolesrole-by-group/")) return SESSION_ROWS;
  if (lower.includes("/session/create") || lower.includes("/session/edit")) {
    return { succeeded: true, data: true };
  }

  /* ---------- attendance ---------- */
  if (lower.includes("/attendance/running-sessions")) return ok(RUNNING_SESSIONS);
  if (lower.includes("/attendance/scan")) return SCAN_SUCCESS;
  if (lower.includes("/attendance/student-attendence")) {
    return ok({
      items: STUDENTS,
      totalCount: STUDENTS.length,
      pageIndex: 1,
      pageSize: 600,
      totalPages: 1,
    });
  }
  if (lower.includes("/attendance/stats")) return ok(ATTENDANCE_STATS);
  if (lower.includes("/attendance/get-by-group-session")) return ok([]);
  if (lower.includes("/attendance/create")) return ok(true);

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

    const setInputValue = async (selector, value) => {
      const changed = await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(
          el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype,
          "value",
        ).set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      if (!changed) throw new Error(`missing input ${selector}`);
      await sleep(120);
    };

    const openGroupsList = async () => {
      await clickByText(null, "المجموعات الحالية");
      await waitForSelector('[data-testid="group-card-g1"]', 10000);
      await sleep(300);
    };

    const clickStatusMenuItem = async (label) => {
      const clicked = await evaluate(`(() => {
        const item = [...document.querySelectorAll('[role="menuitemradio"]')]
          .find((el) => (el.textContent || "").replace(/\\s+/g, " ").trim() === ${JSON.stringify(label)});
        if (!item) return false;
        item.click();
        return true;
      })()`);
      if (!clicked) throw new Error(`missing status menu item "${label}"`);
      await sleep(250);
    };

    const openScanner = async () => {
      await clickSelector('[data-testid="scanner-open"]');
      await waitForSelector('[data-testid="qr-scanner-dialog"]', 10000);
      await sleep(900);
    };

    const openScannerTab = async () => {
      await clickByText('[data-testid="qr-scanner-dialog"]', "سكانر");
      await waitForSelector('#scanner-code-input', 5000);
      await sleep(250);
    };

    const runScannerCode = async (code = "STU00000001") => {
      await openScannerTab();
      await setInputValue("#scanner-code-input", code);
      await evaluate(`(() => {
        const el = document.querySelector("#scanner-code-input");
        el?.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        }));
        return true;
      })()`);
      await waitForSelector('[data-testid="scanner-result"]', 8000);
      await sleep(450);
    };

    const applyAction = async (page) => {
      if (!page.action) return;
      if (page.action === "attendance-menu") {
        await clickSelector('[aria-label="تغيير حالة يوسف علي"]');
        await sleep(250);
      } else if (page.action === "scanner-camera") {
        await openScanner();
      } else if (page.action === "scanner-code") {
        await openScanner();
        await runScannerCode();
      } else if (page.action === "groups-list") {
        await openGroupsList();
      } else if (page.action === "group-edit") {
        await openGroupsList();
        await clickSelector('[data-testid="group-edit-g1"]');
      } else if (page.action === "group-sessions") {
        await openGroupsList();
        await clickSelector('[data-testid="group-sessions-g1"]');
      }
      if (page.expectWait) await waitForSelector(page.expectWait, 10000);
      await sleep(350);
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

    const uiProbe = async (scope) => {
      await setAuditScope(scope);
      return evaluate(`(() => {
        const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
        const textOf = (el) => (el ? (el.textContent || "").replace(/\\s+/g, " ").trim() : "");
        const root = window.__AUDIT_SCOPE__ ? testid(window.__AUDIT_SCOPE__) : document;
        if (!root) return { missingScope: window.__AUDIT_SCOPE__ };
        const bodyText = textOf(root);
        return {
          text: bodyText.slice(0, 4000),
          counts: ["present", "absent", "late", "excused"].map((key) => ({
            key,
            text: textOf(testid("attendance-count-" + key)),
          })),
          cards: [...root.querySelectorAll('[data-testid^="attendance-student-"]')].map((card) => ({
            id: card.getAttribute("data-testid"),
            label: card.getAttribute("aria-label"),
            status: textOf(card.querySelector("span[title]")),
          })),
          bulk: {
            select: Boolean(root.querySelector('[aria-label="حالة التسجيل الجماعي"]')),
            apply: Boolean(testid("attendance-bulk-apply")),
          },
          menuItems: [...root.querySelectorAll('[role="menuitem"], [role="menuitemradio"]')].map(textOf),
          scanner: {
            dialog: Boolean(testid("qr-scanner-dialog")),
            tabs: [...root.querySelectorAll('[role="tab"]')].map(textOf),
            result: textOf(testid("scanner-result")),
            history: [...root.querySelectorAll('[data-testid="scanner-result"] ~ * li')].length,
            focusLabel: [...root.querySelectorAll("button")].map(textOf).find((t) => t.includes("الماسح جاهز")) || "",
            activeId: document.activeElement?.id || document.activeElement?.tagName || "",
            hasFocus: document.hasFocus(),
            cameraError: bodyText.includes("إذن الكاميرا مرفوض")
              ? "permission"
              : bodyText.includes("لا توجد كاميرا متاحة")
                ? "not-found"
                : bodyText.includes("تعذر تشغيل الكاميرا")
                  ? "error"
                  : bodyText.includes("الكاميرا غير مدعومة")
                    ? "unsupported"
                    : bodyText.includes("الكاميرا تعمل")
                      ? "ready"
                      : "none",
          },
          groups: {
            cards: [...root.querySelectorAll('[data-testid^="group-card-"]')].map(textOf),
            editOpen: Boolean(testid("group-edit-modal")),
            sessionsOpen: Boolean(testid("group-sessions-modal")),
            sessionItems: root.querySelectorAll('[data-testid^="group-session-"]:not([data-testid="group-session-add"]):not([data-testid="group-session-form"]):not([data-testid="group-session-save"])').length,
          },
          live: {
            logs: [...root.querySelectorAll('[data-testid^="scanner-log-"]')].map(textOf),
            accepted: textOf(testid("scanner-stat-accepted")),
          },
        };
      })()`);
    };

    const runPage = async (page, viewport, theme) => {
      const [id, width, height] = viewport;
      setScenario(page.scenario);
      await navigate(page.path, theme, { width, height }, [page.wait]);
      await applyAction(page);
      await sleep(350);
      const result = await audit(page.scope);
      const ui = await uiProbe(page.scope);
      await screenshot(`${page.key}-${id}-${theme}.png`, { full: page.full });
      return {
        page: page.key,
        id,
        width,
        height,
        theme,
        ...result,
        probe: ui,
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
          const run = await runPage(page, viewport, theme);
          runs.push(run);

          const tag = `${page.key} ${viewport[0]} ${theme}`;
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
                .map((s) => `${s.tag}.${s.cls} ${s.fs}px`)
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

          if (page.expect === "attendance" || page.expect === "attendance-menu") {
            const expected = [
              "حاضر: 1",
              "غياب: 1",
              "تأخر: 1",
              "بعذر: 1",
              "النسبة: 66.67%",
            ];
            for (const value of expected) {
              if (!text.includes(value)) failures.push(`${tag}: counter "${value}" is missing`);
            }
            if (!p.bulk?.select) failures.push(`${tag}: bulk status select is missing`);
            if (!p.bulk?.apply) failures.push(`${tag}: bulk apply button is missing`);
            if ((p.cards || []).length !== 4)
              failures.push(`${tag}: ${(p.cards || []).length} student cards, expected 4`);
            for (const label of ["حاضر", "غائب", "متأخر", "بعذر"]) {
              if (!(p.cards || []).some((card) => (card.label || "").endsWith("- " + label)))
                failures.push(`${tag}: no student card with status "${label}"`);
            }
            if (page.expect === "attendance-menu") {
              for (const item of ["متأخر", "بعذر"]) {
                if (!(p.menuItems || []).includes(item))
                  failures.push(`${tag}: status menu item "${item}" is missing`);
              }
            }
          }

          if (page.expect === "scanner") {
            if (!text.includes("ماسح الحضور")) failures.push(`${tag}: scanner heading is missing`);
            if (!text.includes("سجل المسح")) failures.push(`${tag}: scan log card is missing`);
            if (!text.includes("لا توجد عمليات مسح بعد"))
              failures.push(`${tag}: empty scan log is missing`);
            if (!text.includes("مجموعة الصف الثالث الثانوي"))
              failures.push(`${tag}: running session is missing`);
          }

          if (page.expect === "scanner-camera" || page.expect === "scanner-code") {
            const tabs = p.scanner?.tabs || [];
            for (const tab of ["كاميرا", "إدخال الكود", "سكانر"]) {
              if (!tabs.includes(tab)) failures.push(`${tag}: scanner tab "${tab}" is missing`);
            }
            if (!p.scanner?.dialog) failures.push(`${tag}: scanner dialog is not on stage`);
            if (page.expect === "scanner-camera") {
              if (p.scanner?.cameraError === "none")
                failures.push(`${tag}: camera state/error copy is missing`);
              if (!text.includes("إعادة المحاولة"))
                failures.push(`${tag}: camera retry button is missing`);
            }
            if (page.expect === "scanner-code") {
              if (!(p.scanner?.result || "").includes("أحمد محمود"))
                failures.push(`${tag}: scan result does not name the student`);
              if (!(p.scanner?.result || "").includes("حاضر"))
                failures.push(`${tag}: scan result does not carry the status`);
              if (p.scanner?.activeId !== "scanner-code-input")
                failures.push(`${tag}: scanner input lost the focus after the scan`);
              // The "الماسح جاهز" pill is driven by a DOM focus event, which
              // Chrome suppresses while the page itself is unfocused (headless).
              if (p.scanner?.hasFocus && !(p.scanner?.focusLabel || "").includes("الماسح جاهز"))
                failures.push(`${tag}: scanner focus state is missing`);
              if (!(p.scanner?.history >= 1))
                failures.push(`${tag}: scanner history is empty after a scan`);
            }
          }

          if (page.expect === "groups-add") {
            for (const value of ["اسم المجموعة", "سعر الشهر", "سعر الحصة", "عدد الحصص في الشهر"]) {
              if (!text.includes(value)) failures.push(`${tag}: add form is missing "${value}"`);
            }
            if (!text.includes("إنشاء المجموعة"))
              failures.push(`${tag}: create-group action is missing`);
          }

          if (page.expect === "groups-list") {
            if ((p.groups?.cards || []).length !== 3)
              failures.push(`${tag}: ${(p.groups?.cards || []).length} group cards, expected 3`);
            for (const value of ["سعر الاشتراك", "سعر الحصة", "أيام الحصص", "مواعيد الحصص"]) {
              if (!text.includes(value)) failures.push(`${tag}: group card is missing "${value}"`);
            }
            if (!text.includes("السبت")) failures.push(`${tag}: group schedule day is missing`);
            if (!text.includes("17:00")) failures.push(`${tag}: group schedule time is missing`);
          }

          if (page.expect === "group-edit") {
            if (!text.includes("تعديل بيانات المجموعة"))
              failures.push(`${tag}: edit modal title is missing`);
            const values = await evaluate(`(() => ({
              sessionPrice: document.querySelector("#group-session-price")?.value ?? null,
              monthlyPrice: document.querySelector("#group-monthly-price")?.value ?? null,
              sessions: document.querySelector("#group-sessions-per-month")?.value ?? null,
              times: [...document.querySelectorAll('[id^="group-day-"][id$="-start"]')].map((el) => el.value),
            }))()`);
            if (String(values.sessionPrice) !== "40")
              failures.push(`${tag}: per-session price preload is ${values.sessionPrice}, expected 40`);
            if (String(values.sessions) !== "4")
              failures.push(`${tag}: sessions-per-month preload is ${values.sessions}, expected 4`);
            if ((values.times || []).length !== 2)
              failures.push(`${tag}: ${(values.times || []).length} schedule rows preloaded, expected 2`);
          }

          if (page.expect === "group-sessions") {
            if (!text.includes("مواعيد حصص"))
              failures.push(`${tag}: sessions modal title is missing`);
            if ((p.groups?.sessionItems || 0) < 2)
              failures.push(`${tag}: ${p.groups?.sessionItems || 0} session rows, expected 2`);
            if (!text.includes("40")) failures.push(`${tag}: session price is missing`);
          }
        }
      }
    }

    /* ---------- live behaviour probes ---------- */

    setScenario("attendance");
    await navigate("/attendance", "light", { width: 390, height: 844 }, [
      '[data-testid="attendance-grid"]',
    ]);
    const before = await uiProbe("attendance-page");
    await clickSelector('[data-testid="attendance-student-s1"]');
    await sleep(250);
    const afterOneClick = await uiProbe("attendance-page");
    await clickSelector('[data-testid="attendance-student-s1"]');
    await sleep(250);
    const afterSecondClick = await uiProbe("attendance-page");
    await clickSelector('[aria-label="تغيير حالة أحمد محمود"]');
    await sleep(200);
    await clickStatusMenuItem("بعذر");
    const afterExcused = await uiProbe("attendance-page");

    probes.attendance = {
      before: before.cards?.find((c) => c.id === "attendance-student-s1")?.label,
      afterOneClick: afterOneClick.cards?.find((c) => c.id === "attendance-student-s1")?.label,
      afterSecondClick: afterSecondClick.cards?.find((c) => c.id === "attendance-student-s1")?.label,
      excusedLabel: afterExcused.cards?.find((c) => c.id === "attendance-student-s1")?.label,
      excusedCount: afterExcused.counts?.find((c) => c.key === "excused")?.text,
      counters: afterExcused.counts?.map((c) => c.text),
    };

    if (!String(probes.attendance.afterOneClick).endsWith("- غائب"))
      failures.push(`attendance probe: first click did not make the student absent`);
    if (!String(probes.attendance.afterSecondClick).endsWith("- حاضر"))
      failures.push(`attendance probe: second click did not restore present`);
    if (!String(probes.attendance.excusedLabel).endsWith("- بعذر"))
      failures.push(`attendance probe: the secondary menu did not set excused`);
    if (probes.attendance.excusedCount !== "بعذر: 2")
      failures.push(`attendance probe: excused counter is ${probes.attendance.excusedCount}`);

    setScenario("scanner");
    await navigate("/scanner", "light", { width: 390, height: 844 }, [
      '[data-testid="scanner-page"]',
    ]);
    await evaluate(`(() => {
      window.__ft = [];
      ["focusin", "focusout"].forEach((type) => {
        document.addEventListener(type, (event) => {
          window.__ft.push([type, event.target.id || event.target.tagName]);
        }, true);
      });
      return true;
    })()`);
    await openScanner();
    const cameraProbe = await uiProbe("qr-scanner-dialog");
    const cameraText = await evaluate(
      `(() => {
        const dialog = document.querySelector('[data-testid="qr-scanner-dialog"]');
        return dialog ? dialog.textContent.replace(/\\s+/g, " ").trim() : "";
      })()`,
    );
    const scanPostsBefore = apiLog.filter(
      (call) => call.method === "POST" && call.url.toLowerCase().includes("/attendance/scan"),
    ).length;
    await runScannerCode();
    const scanDialog = await uiProbe("qr-scanner-dialog");
    const focusTrace = await evaluate("window.__ft || []");
    const scanPosts = apiLog.filter(
      (call) => call.method === "POST" && call.url.toLowerCase().includes("/attendance/scan"),
    );
    await clickSelector('[aria-label="إغلاق نافذة المسح"]');
    await sleep(500);
    const scanPage = await uiProbe("scanner-page");

    probes.scanner = {
      cameraCopy: cameraText.slice(0, 220),
      cameraError: cameraProbe.scanner?.cameraError,
      result: scanDialog.scanner?.result,
      history: scanDialog.scanner?.history,
      posts: scanPosts.length - scanPostsBefore,
      postBody: scanPosts.at(-1)?.body ?? null,
      pageLogs: scanPage.live?.logs?.slice(0, 2),
      accepted: scanPage.live?.accepted,
      focusTrace,
      hasFocus: scanDialog.scanner?.hasFocus,
      activeId: scanDialog.scanner?.activeId,
      focusLabel: scanDialog.scanner?.focusLabel,
    };

    if (
      !["permission", "not-found", "error", "unsupported", "ready"].includes(
        probes.scanner.cameraError,
      )
    )
      failures.push(`scanner probe: camera state is ${probes.scanner.cameraError}`);
    if (probes.scanner.posts !== 1)
      failures.push(`scanner probe: ${probes.scanner.posts} scan POSTs, expected 1`);
    if (!(probes.scanner.result || "").includes("تم تسجيل حضور"))
      failures.push(`scanner probe: scan result copy is unexpected`);
    if (!(probes.scanner.pageLogs || []).some((log) => log.includes("أحمد محمود")))
      failures.push(`scanner probe: the page log does not show the scan`);
    if (!(probes.scanner.accepted || "").includes("مسح مقبول"))
      failures.push(`scanner probe: accepted counter is missing`);

    setScenario("groups");
    await navigate("/settings", "light", { width: 1280, height: 800 }, [
      '[data-testid="group-add-card"]',
    ]);
    await clickByText(null, "السبت");
    await sleep(250);
    const addForm = await evaluate(`(() => ({
      sessions: document.querySelector("#group-sessions-per-month")?.value ?? null,
      perSession: document.querySelector("#group-session-price")?.value ?? null,
      scheduleRow: Boolean(document.querySelector('[id="group-day-0-start"]')),
    }))()`);
    probes.groupsAdd = addForm;
    if (String(addForm.sessions) !== "4")
      failures.push(`groups add probe: sessions auto value is ${addForm.sessions}, expected 4`);
    if (!addForm.scheduleRow)
      failures.push(`groups add probe: selecting a day did not render its times`);

    await openGroupsList();
    await clickSelector('[data-testid="group-edit-g1"]');
    await waitForSelector('[data-testid="group-edit-modal"]', 10000);
    await sleep(300);
    const editBefore = await evaluate(`(() => ({
      monthlyPrice: document.querySelector("#group-monthly-price")?.value ?? null,
      sessionPrice: document.querySelector("#group-session-price")?.value ?? null,
      sessions: document.querySelector("#group-sessions-per-month")?.value ?? null,
      schedule: [...document.querySelectorAll('[id^="group-day-"]')]
        .filter((el) => el.type === "time")
        .map((el) => ({ id: el.id, value: el.value })),
    }))()`);
    await setInputValue("#group-monthly-price", "350");
    await clickSelector('[data-testid="group-form-submit"]');
    await sleep(900);
    const editCall = [...apiLog]
      .reverse()
      .find((call) => call.method === "PUT" && call.url.toLowerCase().includes("/group/edit"));
    const editBody = editCall?.body ? JSON.parse(editCall.body) : null;

    probes.groupEdit = {
      before: editBefore,
      putBody: editBody,
      modalClosed: !(await evaluate(
        `!!document.querySelector('[data-testid="group-edit-modal"]')`,
      )),
    };

    if (!editBody) {
      failures.push(`group edit probe: no PUT /Group/Edit call`);
    } else {
      if (Number(editBody.MonthlyPrice) !== 350)
        failures.push(`group edit probe: monthly price is ${editBody.MonthlyPrice}, expected 350`);
      if (Number(editBody.PerSessionPrice) !== 40)
        failures.push(
          `group edit probe: per-session price is ${editBody.PerSessionPrice}, expected 40`,
        );
      if (Number(editBody.SessionsPerMonth) !== 4)
        failures.push(
          `group edit probe: sessions per month is ${editBody.SessionsPerMonth}, expected 4`,
        );
      if (!Array.isArray(editBody.Schedule) || editBody.Schedule.length !== 2)
        failures.push(
          `group edit probe: schedule has ${editBody.Schedule?.length ?? 0} slots, expected 2`,
        );
      if (!probes.groupEdit.modalClosed)
        failures.push(`group edit probe: the modal did not close after saving`);
    }

    await openGroupsList();
    await clickSelector('[data-testid="group-sessions-g1"]');
    await waitForSelector('[data-testid="group-sessions-modal"]', 10000);
    await sleep(500);
    const sessionsProbe = await evaluate(`(() => {
      const modal = document.querySelector('[data-testid="group-sessions-modal"]');
      return {
        rows: modal
          ? modal.querySelectorAll('[data-testid^="group-session-"]:not([data-testid="group-session-add"]):not([data-testid="group-session-form"]):not([data-testid="group-session-save"])').length
          : 0,
        text: modal ? modal.textContent.replace(/\\s+/g, " ").trim().slice(0, 400) : "",
      };
    })()`);
    probes.groupSessions = sessionsProbe;
    if (sessionsProbe.rows !== 2)
      failures.push(`group sessions probe: ${sessionsProbe.rows} rows, expected 2`);
    if (!sessionsProbe.text.includes("40"))
      failures.push(`group sessions probe: per-session price is missing`);

    /* ---------- 200% text zoom ---------- */
    const textZoom = [];
    const textTargets = [
      { key: "attendance", scenario: "attendance", sizes: [["390", 390, 844], ["1440", 1440, 900]] },
      { key: "scanner", scenario: "scanner", sizes: [["390", 390, 844]] },
      { key: "scanner-camera", scenario: "scanner", action: "scanner-camera", wait: '[data-testid="qr-scanner-dialog"]', sizes: [["390", 390, 844]] },
      { key: "groups-list", scenario: "groups", action: "groups-list", wait: '[data-testid="group-card-g1"]', sizes: [["390", 390, 844]] },
      { key: "group-edit", scenario: "groups", action: "group-edit", wait: '[data-testid="group-edit-modal"]', sizes: [["390", 390, 844]] },
    ];
    for (const target of textTargets) {
      const page = PAGES.find((p) => p.key === target.key);
      if (!page) continue;
      for (const [id, width, height] of target.sizes) {
        for (const theme of THEMES.filter((t) => RUN_THEMES.includes(t))) {
          setScenario(target.scenario);
          await navigate(page.path, theme, { width, height }, [page.wait]);
          await applyAction({
            ...page,
            action: target.action ?? null,
            expectWait: target.wait,
          });
          await sleep(350);
          await evaluate('document.documentElement.style.fontSize = "200%"; true');
          await sleep(650);
          const result = await audit(page.scope);
          textZoom.push({ page: target.key, id, width, height, theme, ...result });
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
      { key: "attendance", scenario: "attendance" },
      { key: "groups-list", scenario: "groups", action: "groups-list", wait: '[data-testid="group-card-g1"]' },
    ];
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
        await applyAction({ ...page, action: target.action ?? null, expectWait: target.wait });
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
      join(OUT, "batch4-verify.json"),
      JSON.stringify({ summary, runs, probes, textZoom, pageZoom }, null, 2),
    );

    /* ---------- markdown ---------- */
    const md = [];
    md.push("# المرحلة 3 — دفعة 4: الحضور والماسح والمجموعات", "");
    md.push(`تم التوليد: ${summary.generated}`, "");
    md.push(
      `النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${summary.runs} تشغيلًا: ` +
        `${runs.length} تشغيلًا أساسيًا، ${textZoom.length} تكبير نص 200%، ${pageZoom.length} تكبير صفحة 200%.`,
      "",
    );
    md.push(
      "الحالات: كشف الحضور بحالاته الأربع والعدّادات وقائمة متأخر/بعذر، ماسح الحضور (حالة الكاميرا، تاب السكانر، نتيجة مسح وسجل)، إضافة مجموعة، قائمة المجموعات، تعديل مجموعة (سعر الحصة والجدول)، ونافذة مواعيد الحصص.",
      "",
    );
    md.push(
      "الأدوار: `/attendance` و`/scanner` تُفحص كـTeacher مع تفعيل module `attendance` (وإحصاءات المدير مفعّلة في الكشف)؛ `/settings` تُفحص كـCenterOwner في مركز فردي لتفادي قائمة المدرسين.",
      "",
    );

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
      "`docs/design/shots/phase3b4/` — لقطة لكل حالة/مقاس/وضع (صفحة كاملة للقوائم والكشف، والشاشة للنوافذ)، ولقطات تكبير النص والصفحة 200%.",
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
    await writeFile(join(OUT, "batch4-verify.md"), md.join("\n"));

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
  if (probe.scanner?.dialog)
    return probe.scanner.result
      ? `scan · ${probe.scanner.result.slice(0, 40)}`
      : `camera · ${probe.scanner.cameraError}`;
  if ((probe.counts || []).some((c) => /حاضر|غياب|تأخر|بعذر/.test(c.text || "")))
    return `attendance · ${probe.counts.map((c) => c.text).join(" / ")}`;
  if (probe.groups?.editOpen) return "edit · preload price+schedule";
  if (probe.groups?.sessionsOpen) return `sessions · ${probe.groups.sessionItems} rows`;
  if (probe.groups?.cards?.length) return `groups · ${probe.groups.cards.length} cards`;
  if ((probe.text || "").includes("سجل المسح"))
    return `scanner · logs=${probe.live?.logs?.length ?? 0}`;
  return "-";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
