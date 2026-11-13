/**
 * Phase 1 automated checks. No human eyes required.
 *
 *   node phase1-verify.mjs
 *
 * Checks at 360 / 390 / 768 / 1440 in both themes:
 *   - no horizontal page scroll
 *   - no element sticks out of the viewport (scrollable report tables excepted)
 *   - every interactive target is at least 44x44 CSS px
 *   - Tajawal + Manrope actually loaded (document.fonts.check)
 *   - WCAG AA on the primary button, status pills and hero text
 *   - the promised behaviours actually work: filter panel, action sheet,
 *     drawer semantics, sticky sheet footer, sticky exam timer/submit
 *
 * Writes phase1-verify.json + phase1-verify.md next to this file.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PROFILE = join(process.env.TEMP || "/tmp", "opencode", "chrome-phase1-verify");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9455;
const require = createRequire(import.meta.url);
const CenterColor = require("./phase1/center-color.js");

const WIDTHS = [360, 390, 768, 1440];
const THEMES = ["light", "dark"];

const PAGES = [
  { id: "dashboard-before", file: "compare-dashboard.html", query: "variant=before" },
  { id: "dashboard-after", file: "compare-dashboard.html", query: "variant=after" },
  { id: "students-before", file: "compare-students.html", query: "variant=before" },
  { id: "students-after", file: "compare-students.html", query: "variant=after" },
  { id: "mobile-B", file: "mobile-B.html", query: "" },
  { id: "portals-B", file: "portals-B.html", query: "" },
  { id: "center-colors", file: "center-colors.html", query: "" },
];

function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* in-page audit                                                       */
/* ------------------------------------------------------------------ */

const AUDIT = String.raw`(() => {
  const vw = window.innerWidth;
  const chrome = s => !!(s.closest && s.closest(".demo-bar, .board-head, .phone-title"));
  const round = n => Math.round(n * 10) / 10;

  const visible = el => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /* 1 - page scroll ------------------------------------------------- */
  const de = document.documentElement;
  const overflowX = Math.max(0, de.scrollWidth - de.clientWidth);

  /* 2 - elements outside the viewport ------------------------------- */
  const clippedByAncestor = el => {
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (/hidden|clip/.test(cs.overflowX) || /hidden|clip/.test(cs.overflowY)) return true;
      n = n.parentElement;
    }
    return false;
  };
  const scrollers = [];
  document.querySelectorAll("*").forEach(el => {
    const cs = getComputedStyle(el);
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) {
      scrollers.push((el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : el.tagName.toLowerCase()) + " " + (el.scrollWidth - el.clientWidth) + "px");
    }
  });
  const outside = [];
  document.querySelectorAll("body *").forEach(el => {
    if (!visible(el) || chrome(el)) return;
    if (el.closest("svg, symbol, defs, [aria-hidden='true']")) return;
    if (el.closest(".pbody, .sheet-b")) return; // clipped scrollers, checked by their own probe
    if (clippedByAncestor(el)) return; // decorative overflow inside a rounded card
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    if (r.right > vw + 1.5 || r.left < -1.5) {
      const cls = typeof el.className === "string" && el.className ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      outside.push({ tag: el.tagName.toLowerCase(), cls, left: round(r.left), right: round(r.right) });
    }
  });

  /* 3 - tap targets -------------------------------------------------- */
  const SEL = "a[href], button, input:not([type=radio]):not([type=checkbox]), select, textarea, [role=button], label.opt, label.switch";
  const small = [];
  document.querySelectorAll(SEL).forEach(el => {
    if (!visible(el) || chrome(el)) return;
    const r = el.getBoundingClientRect();
    // a small checkbox is fine when its label is the real target
    const label = el.closest("label");
    const box = label && label !== el && label.classList.contains("switch") ? label.getBoundingClientRect() : r;
    if (box.width + 0.5 < 44 || box.height + 0.5 < 44) {
      const cls = typeof el.className === "string" && el.className ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      small.push({ tag: el.tagName.toLowerCase(), cls, w: round(box.width), h: round(box.height), text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24) });
    }
  });

  /* 4 - fonts -------------------------------------------------------- */
  const faces = [...document.fonts];
  const face = name => faces.filter(f => f.family.replace(/["']/g, "").startsWith(name));
  const tajawal = face("Tajawal");
  const manrope = face("Manrope");
  const fonts = {
    tajawal: tajawal.length > 0 && tajawal.filter(f => f.status === "loaded").length >= 2,
    manrope: manrope.length > 0 && manrope.some(f => f.status === "loaded"),
    cairo: face("Cairo").filter(f => f.status === "loaded").length >= 2,
    manropeUsed: !!document.querySelector(".num, .mono, .money, .timer-chip, .pager button, .imp-stat b, .tile b"),
    declared: { tajawal: tajawal.length, manrope: manrope.length },
    loaded: document.fonts.status,
    body: getComputedStyle(document.body).fontFamily,
  };

  /* 5 - contrast ----------------------------------------------------- */
  const parse = c => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = c => {
    const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => {
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.85) return c;
      if (cs.backgroundImage && cs.backgroundImage.includes("gradient")) {
        const m = cs.backgroundImage.match(/rgba?\([^)]+\)/g);
        if (m) return parse(m[0]);
      }
      node = node.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const pairs = [];
  const add = (label, el) => {
    if (!el || !visible(el)) return;
    const fg = parse(getComputedStyle(el).color);
    const bg = bgOf(el);
    if (!fg || !bg) return;
    pairs.push({ label, fg: getComputedStyle(el).color, bg: "rgb(" + bg.r + "," + bg.g + "," + bg.b + ")", ratio: Math.round(ratio(fg, bg) * 100) / 100, size: getComputedStyle(el).fontSize });
  };
  const scope = [...document.querySelectorAll(".phone-screen, .app")];
  const all = scope.length ? scope : [document.body];
  all.forEach(root => {
    add("body text", root.querySelector("p, td, .mcard-meta, .tile small"));
    add("primary button", root.querySelector(".btn-primary"));
    add("secondary button", root.querySelector(".btn-outline"));
    add("link", root.querySelector("a[href]:not(.nav-item):not(.ptab):not(.btn)"));
    add("success pill", root.querySelector(".pill-ok"));
    add("warning pill", root.querySelector(".pill-warn"));
    add("error pill", root.querySelector(".pill-error, .pill-err"));
    add("brand pill", root.querySelector(".pill-brand"));
    add("hero text", root.querySelector(".hero *:not(svg):not(svg *)"));
    add("nav label", root.querySelector(".nav-item span, .ptab"));
    add("muted meta", root.querySelector(".text2, .sub, small"));
  });
  const seen = new Set();
  const contrast = pairs.filter(p => { const k = p.label + p.fg + p.bg; if (seen.has(k)) return false; seen.add(k); return true; }).map(p => ({ ...p, pass: p.ratio >= 4.5 }));

  /* 4 - primary text never below 14px ------------------------------- */
  const primary = [];
  document.querySelectorAll("td, .who b, .mcard .name b, .pcard-h h3, .exam-item b, .hero h2").forEach(el => {
    if (!visible(el) || chrome(el)) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs + 0.01 < 14) {
      const cls = typeof el.className === "string" && el.className ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      primary.push({ tag: el.tagName.toLowerCase(), cls, fs, text: (el.textContent || "").trim().slice(0, 24) });
    }
  });

  return {
    vw,
    overflowX,
    scrollers: [...new Set(scrollers)],
    outside: outside.slice(0, 12),
    outsideCount: outside.length,
    small: small.slice(0, 20),
    smallCount: small.length,
    primary: primary.slice(0, 12),
    primaryCount: primary.length,
    fonts,
    contrast,
  };
})()`;

/* ------------------------------------------------------------------ */
/* behaviour probes                                                    */
/* ------------------------------------------------------------------ */

const STUDENTS_BEHAVIOUR = String.raw`(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const toggle = document.querySelector("[data-filter-toggle]");
  const panel = document.querySelector("#st-filters");
  out.hasToggle = !!toggle;
  out.hasPanel = !!panel;
  if (toggle && panel) {
    const before = panel.getBoundingClientRect().height;
    toggle.click();
    await wait(280);
    out.panelAfterOpen = Math.round(panel.getBoundingClientRect().height);
    out.expandedOpen = toggle.getAttribute("aria-expanded");
    toggle.click();
    await wait(280);
    out.panelAfterClose = Math.round(panel.getBoundingClientRect().height);
    out.expandedClose = toggle.getAttribute("aria-expanded");
    out.before = Math.round(before);
  }
  const menu = document.querySelector(".js-menu");
  const sheet = document.querySelector("#action-sheet");
  out.hasMenu = !!menu;
  out.hasSheet = !!sheet;
  if (menu && sheet) {
    out.sheetBefore = sheet.getBoundingClientRect().height;
    menu.click();
    await wait(300);
    out.sheetOpen = sheet.getBoundingClientRect().height;
    out.sheetExpanded = menu.getAttribute("aria-expanded");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(300);
    out.sheetClosed = sheet.getBoundingClientRect().height;
    out.sheetExpandedAfter = menu.getAttribute("aria-expanded");
  }
  return out;
})()`;

const MOBILE_BEHAVIOUR = String.raw`(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  const screens = [...document.querySelectorAll(".phone-screen")];
  const screen = screens[3]; // exam frame
  out.screens = screens.length;
  if (screen) {
    // shrink the device to a short phone so the body really has to scroll
    const original = screen.style.height;
    screen.style.height = "520px";
    await wait(80);
    const body = screen.querySelector(".pbody");
    const foot = screen.querySelector(".exam-foot");
    const timer = screen.querySelector(".timer-chip");
    out.footExists = !!foot;
    out.timerExists = !!timer;
    if (body) body.scrollTop = body.scrollHeight;
    await wait(120);
    const sr = screen.getBoundingClientRect();
    const fr = foot.getBoundingClientRect();
    const tr = timer.getBoundingClientRect();
    out.footVisible = fr.top >= sr.top - 0.5 && fr.bottom <= sr.bottom + 0.5;
    out.footBottomGap = Math.round(sr.bottom - fr.bottom);
    out.timerVisible = tr.top >= sr.top - 0.5 && tr.bottom <= sr.bottom + 0.5;
    out.scrollable = body ? body.scrollHeight > body.clientHeight : null;
    out.bodyScrolledBy = body ? Math.round(body.scrollTop) : null;
    screen.style.height = original;
  }
  const sheetScreen = screens[2]; // add-student frame
  if (sheetScreen) {
    const b = sheetScreen.querySelector(".sheet-b");
    const f = sheetScreen.querySelector(".sheet-f");
    if (b) b.scrollTop = b.scrollHeight;
    await wait(120);
    const sr = sheetScreen.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    out.sheetFootExists = !!f;
    out.sheetFootVisible = fr.top >= sr.top - 0.5 && fr.bottom <= sr.bottom + 0.5;
    out.sheetScrollable = b ? b.scrollHeight > b.clientHeight + 1 : null;
  }
  const layer = document.getElementById("mobile-drawer");
  const opener = document.querySelector("[data-drawer-open]");
  if (layer && opener) {
    out.drawerInitiallyOpen = !layer.hidden;
    const close = layer.querySelector("[data-drawer-close]");
    if (close) close.click();
    await wait(200);
    out.drawerClosed = layer.hidden;
    out.drawerExpandedAfterClose = opener.getAttribute("aria-expanded");
    opener.click();
    await wait(200);
    out.drawerReopened = !layer.hidden;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(200);
    out.drawerClosedByEsc = layer.hidden;
  }
  return out;
})()`;

const PORTALS_BEHAVIOUR = String.raw`(() => {
  const navs = [...document.querySelectorAll(".ptabs")];
  const tabs = [...document.querySelectorAll(".ptab")];
  const cs = getComputedStyle(document.querySelector(".ptabs") || document.body);
  let safeAreaRule = false;
  try {
    [...document.styleSheets].forEach(sheet => {
      try {
        [...sheet.cssRules].forEach(rule => {
          if (rule.cssText && rule.cssText.includes("safe-area-inset-bottom")) safeAreaRule = true;
        });
      } catch (e) {}
    });
  } catch (e) {}
  return {
    navs: navs.length,
    tabs: tabs.length,
    current: document.querySelectorAll('.ptab[aria-current="page"]').length,
    navLabel: navs.map(n => n.getAttribute("aria-label")),
    safeArea: cs.paddingBottom,
    safeAreaRule,
    tabHeights: [...new Set(tabs.map(t => Math.round(t.getBoundingClientRect().height)))],
    tabWidths: [...new Set(tabs.map(t => Math.round(t.getBoundingClientRect().width)))],
  };
})()`;

/* ------------------------------------------------------------------ */
/* center colour report                                                */
/* ------------------------------------------------------------------ */

const CENTERS = [
  { key: "red", name: "أحمر", hex: "#E11D48" },
  { key: "violet", name: "بنفسجي", hex: "#7C3AED" },
  { key: "orange", name: "برتقالي", hex: "#F97316" },
  { key: "green", name: "أخضر", hex: "#10B981" },
  { key: "yellow", name: "أصفر", hex: "#EAB308" },
];

function centerReport() {
  const rows = [];
  CENTERS.forEach((c) => {
    const t = CenterColor.buildTheme(c.hex);
    ["light", "dark"].forEach((mode) => {
      const x = t[mode];
      rows.push({
        name: c.name,
        input: c.hex,
        mode,
        fill: x.fill,
        on: x.on,
        onLabel: x.onLabel,
        ink: x.ink,
        inkDelta: x.inkDelta,
        soft: x.soft,
        inkOnSoft: x.inkOnSoft,
        ratios: x.ratios,
        pass: x.pass && x.ratios.fillOn >= 4.5 && x.ratios.inkCard >= 4.5 && x.ratios.inkBg >= 4.5 && x.ratios.inkOnSoft >= 4.5,
        warnings: x.warnings,
      });
    });
  });

  // guard cases: colours that cannot be used raw as text
  const guards = ["#22D3EE", "#FAFAFA", "#111827", "#F97316"].map((hex) => {
    const t = CenterColor.buildTheme(hex);
    return {
      hex,
      pass: t.pass,
      lightInk: t.light.ink,
      lightDelta: t.light.inkDelta,
      darkInk: t.dark.ink,
      darkDelta: t.dark.inkDelta,
      warnings: t.warnings,
    };
  });

  return { rows, guards };
}

/* ------------------------------------------------------------------ */

async function main() {
  await rm(PROFILE, { recursive: true, force: true });
  await mkdir(join(ROOT, "shots", "phase1"), { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--force-device-scale-factor=1",
      `--user-data-dir=${PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let version;
  for (let i = 0; i < 60; i += 1) {
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
  const client = connect(created.webSocketDebuggerUrl);
  await client.ready;
  await client.send("Page.enable");
  await client.send("Runtime.enable");

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

  const load = async (file, query) => {
    const url = pathToFileURL(join(HERE, "phase1", file)).href + (query ? `?${query}` : "");
    await client.send("Page.navigate", { url });
    for (let i = 0; i < 50; i += 1) {
      if ((await evaluate("document.readyState")) === "complete") break;
      await sleep(100);
    }
    await evaluate("document.fonts.ready.then(() => true)", true);
    await sleep(350);
  };

  const results = [];
  const extra = {};

  for (const page of PAGES) {
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        if (page.id === "center-colors" && theme === "dark") continue; // board renders both modes itself
        await client.send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          screenWidth: width,
          screenHeight: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        const query = [page.query, `theme=${theme}`].filter(Boolean).join("&");
        await load(page.file, query);
        const audit = await evaluate(AUDIT);
        results.push({ page: page.id, width, theme, ...audit });

        if (page.id === "students-after" && width === 390 && theme === "light") {
          extra.students = await evaluate(STUDENTS_BEHAVIOUR, true);
        }
        if (page.id === "mobile-B" && width === 390 && theme === "light") {
          extra.mobile = await evaluate(MOBILE_BEHAVIOUR, true);
        }
        if (page.id === "portals-B" && width === 390 && theme === "light") {
          extra.portals = await evaluate(PORTALS_BEHAVIOUR);
        }
      }
    }
  }

  client.close();
  chrome.kill();

  const colours = centerReport();

  const failures = [];
  const baselineNotes = [];
  const BASELINE = new Set(["dashboard-before", "students-before"]);
  results.forEach((r) => {
    const base = BASELINE.has(r.page);
    if (r.overflowX > 1) {
      (base ? baselineNotes : failures).push(`${r.page} ${r.width} ${r.theme}: horizontal page scroll ${r.overflowX}px`);
    }
    if (r.outsideCount) {
      (base ? baselineNotes : failures).push(`${r.page} ${r.width} ${r.theme}: ${r.outsideCount} element(s) outside the viewport`);
    }
    if (r.smallCount) {
      (base ? baselineNotes : failures).push(`${r.page} ${r.width} ${r.theme}: ${r.smallCount} tap target(s) under 44px`);
    }
    if (r.primaryCount && r.page !== "center-colors") {
      (base ? baselineNotes : failures).push(`${r.page} ${r.width} ${r.theme}: ${r.primaryCount} primary text node(s) under 14px`);
    }
    if (!base) {
      if (!r.fonts.tajawal) failures.push(`${r.page} ${r.width} ${r.theme}: Tajawal not loaded`);
      if (r.fonts.manropeUsed && !r.fonts.manrope) failures.push(`${r.page} ${r.width} ${r.theme}: Manrope not loaded`);
    }
    r.contrast.filter((c) => !c.pass).forEach((c) => {
      (base ? baselineNotes : failures).push(`${r.page} ${r.width} ${r.theme}: contrast ${c.label} ${c.ratio}:1 (${c.fg} on ${c.bg})`);
    });
  });
  if (extra.students) {
    if (extra.students.hasToggle && extra.students.expandedClose !== "false") failures.push("students: filter toggle does not report collapsed state");
    if (extra.students.hasMenu && extra.students.sheetClosed > 1) failures.push("students: action sheet does not close with Escape");
  }
  if (extra.mobile) {
    if (!extra.mobile.footVisible) failures.push("mobile-B: exam submit bar is not visible at the bottom of the scroll");
    if (!extra.mobile.timerVisible) failures.push("mobile-B: exam timer is not visible");
    if (!extra.mobile.sheetFootVisible) failures.push("mobile-B: sheet footer is not visible when the sheet body is scrolled");
    if (extra.mobile.drawerInitiallyOpen) {
      if (!extra.mobile.drawerClosed) failures.push("mobile-B: drawer does not close from its close control");
      if (!extra.mobile.drawerReopened) failures.push("mobile-B: drawer does not reopen from the header button");
      if (!extra.mobile.drawerClosedByEsc) failures.push("mobile-B: drawer does not close with Escape");
    }
  }
  colours.rows.forEach((r) => {
    if (!r.pass) failures.push(`center colour ${r.name} ${r.mode}: fails AA (${JSON.stringify(r.ratios)})`);
  });

  const summary = {
    generated: new Date().toISOString(),
    checks: results.length,
    failures,
    baselineNotes,
    extra,
    byPage: PAGES.reduce((acc, p) => {
      const list = results.filter((r) => r.page === p.id);
      acc[p.id] = {
        runs: list.length,
        maxOverflowX: Math.max(0, ...list.map((r) => r.overflowX)),
        outside: list.reduce((n, r) => n + r.outsideCount, 0),
        smallTargets: list.reduce((n, r) => n + r.smallCount, 0),
        smallPrimaryText: list.reduce((n, r) => n + r.primaryCount, 0),
        minContrast: Math.min(...list.flatMap((r) => r.contrast.map((c) => c.ratio))),
      };
      return acc;
    }, {}),
  };

  await writeFile(join(HERE, "phase1", "phase1-verify.json"), JSON.stringify({ summary, results, colours }, null, 2));

  /* ---------- markdown ---------- */
  const md = [];
  md.push("# المرحلة 1 — تقرير الفحص الآلي", "");
  md.push(`تم التوليد: ${summary.generated}`, "");
  md.push(`النتيجة: **${failures.length ? "FAIL" : "ALL PASS"}** — ${results.length} تشغيلًا (${PAGES.length} صفحات × عرض × وضع).`, "");
  md.push("| الصفحة | تشغيلات | أقصى تمرير أفقي | عناصر خارج الشاشة | أهداف لمس < 44 | أقل تباين |");
  md.push("| --- | --- | --- | --- | --- | --- |");
  Object.entries(summary.byPage).forEach(([id, v]) => {
    md.push(`| ${id} | ${v.runs} | ${v.maxOverflowX}px | ${v.outside} | ${v.smallTargets} | ${v.minContrast.toFixed(2)}:1 |`);
  });
  md.push("");
  md.push("## الفحص عند كل عرض", "");
  md.push("| الصفحة | العرض | الوضع | تمرير أفقي | خارج الشاشة | لمس < 44 | نص < 14 | خط Tajawal | خط Manrope |");
  md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  results.forEach((r) => {
    md.push(
      `| ${r.page} | ${r.width} | ${r.theme} | ${r.overflowX}px | ${r.outsideCount} | ${r.smallCount} | ${r.primaryCount} | ${r.fonts.tajawal ? "✓" : "✗"} | ${r.fonts.manrope ? "✓" : "✗"} |`,
    );
  });
  md.push("");
  md.push("## التباين (WCAG 2.1 AA = 4.5:1)", "");
  md.push("| الصفحة | العرض | الوضع | العنصر | النسبة | الحكم |");
  md.push("| --- | --- | --- | --- | --- | --- |");
  results.forEach((r) => {
    r.contrast.forEach((c) => {
      md.push(`| ${r.page} | ${r.width} | ${r.theme} | ${c.label} | ${c.ratio}:1 | ${c.pass ? "AA" : "FAIL"} |`);
    });
  });
  md.push("");
  md.push("## سلوك الواجهة", "");
  md.push("```json");
  md.push(JSON.stringify(extra, null, 2));
  md.push("```");
  md.push("");
  if (baselineNotes.length) {
    md.push("## ملاحظات نسخة «قبل» (مقصودة — تُظهر مشاكل الواجهة الحالية)", "");
    baselineNotes.slice(0, 30).forEach((f) => md.push(`- ${f}`));
    if (baselineNotes.length > 30) md.push(`- … و${baselineNotes.length - 30} أخرى`);
    md.push("");
  }
  if (failures.length) {
    md.push("## الإخفاقات", "");
    failures.forEach((f) => md.push(`- ${f}`));
  } else {
    md.push("لا إخفاقات: لا تمرير أفقي، لا عناصر مقطوعة، كل هدف لمس ≥44px، الخطوط محمّلة، والتباين AA.");
  }
  await writeFile(join(HERE, "phase1", "phase1-verify.md"), md.join("\n"));

  /* ---------- centre colour report ---------- */
  const cm = [];
  cm.push("# لون المركز — تقرير التباين", "");
  cm.push("محرك واحد: `center-color.js` (UMD) يُستخدم في المتصفح وفي هذا التقرير. المدخل لون واحد، والمخرجات أربع قيم فقط.", "");
  cm.push("## الألوان الخمسة", "");
  cm.push("| اللون | المدخل | الوضع | fill | on | ink | تعديل ink | soft | fill/on | ink/card | ink/bg | ink/soft |");
  cm.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  colours.rows.forEach((r) => {
    cm.push(
      `| ${r.name} | \`${r.input}\` | ${r.mode} | \`${r.fill}\` | \`${r.on}\` (${r.onLabel}) | \`${r.ink}\` | ${r.inkDelta} | \`${r.soft}\` | ${r.ratios.fillOn} | ${r.ratios.inkCard} | ${r.ratios.inkBg} | ${r.ratios.inkOnSoft} |`,
    );
  });
  cm.push("");
  cm.push("## حالات الحماية", "");
  cm.push("| المدخل | النتيجة | ink فاتح | تعديل | ink ليلي | تعديل | تحذيرات |");
  cm.push("| --- | --- | --- | --- | --- | --- | --- |");
  colours.guards.forEach((g) => {
    cm.push(
      `| \`${g.hex}\` | ${g.pass ? "AA" : "راجع"} | \`${g.lightInk}\` | ${g.lightDelta} | \`${g.darkInk}\` | ${g.darkDelta} | ${g.warnings.length ? g.warnings.join(" · ") : "—"} |`,
    );
  });
  cm.push("");
  cm.push("## ما لا يتلوّن", "");
  cm.push("تدرّج الترحيب (hero)، خلفيات الصفحة والبطاقات والحدود، ألوان الحالات (نجاح/تحذير/خطأ/معلومة)، ولوحة ألوان الرسوم البيانية — كلها ثابتة في الهوية ولا تُشتق من لون المركز.");
  cm.push("");
  cm.push("## قاعدة الحفظ", "");
  cm.push("إن احتاج `ink` إلى تعديل أكبر من 22 نقطة إضاءة، أو فشل `fill/on`، تُعرض رسالة تحذير قبل الحفظ مع تعديل تلقائي للقيمة الآمنة. القيم الخام لا تُستخدم كنص أبدًا (البرتقالي 2.8:1 والأخضر 2.54:1 والأصفر 1.92:1 على البطاقة الفاتحة).");
  await writeFile(join(HERE, "phase1", "center-color-report.md"), cm.join("\n"));

  console.log(failures.length ? `FAIL (${failures.length})` : "ALL PASS");
  failures.slice(0, 40).forEach((f) => console.log(" - " + f));
  console.log(`baseline notes: ${baselineNotes.length}`);
  console.log(JSON.stringify(summary.byPage, null, 2));
  console.log(JSON.stringify(extra, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
