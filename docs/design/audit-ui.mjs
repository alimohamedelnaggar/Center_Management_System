/**
 * Shared in-page audit used by the phase 3 verification harnesses.
 * Measures overflow, tap targets, text size, clipping, overlays, overlaps,
 * contrast, RTL and the loaded fonts from the rendered DOM.
 */
export const AUDIT = String.raw`(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const round = (n) => Math.round(n * 10) / 10;

  const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
  const scope = window.__AUDIT_SCOPE__ || null;
  const ROOT = scope ? testid(scope) : document;
  if (!ROOT) return { missingScope: scope };

  const qa = (sel) =>
    ROOT === document
      ? document.querySelectorAll(sel === "body *" ? "body *" : sel)
      : ROOT.querySelectorAll(sel === "body *" ? "*" : sel);

  const visible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls:
      typeof el.className === "string" && el.className
        ? el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "",
  });
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      left: Math.round(r.left),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
    };
  };

  const de = document.documentElement;
  const overflowX = Math.max(0, de.scrollWidth - de.clientWidth);
  const overflowY = Math.max(0, de.scrollHeight - de.clientHeight);

  const clippedByAncestor = (el) => {
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (/hidden|clip/.test(cs.overflowX) || /hidden|clip/.test(cs.overflowY)) return true;
      n = n.parentElement;
    }
    return false;
  };

  /* 1 - anything sticking out of the viewport ------------------------ */
  const outside = [];
  qa("body *").forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("svg, symbol, defs, [aria-hidden='true'], .sr-only")) return;
    // The printed student card is a fixed, deliberately tiny-print design that
    // must not change in this batch; it is measured by the print probe instead.
    if (el.closest(".qr-card")) return;
    if (clippedByAncestor(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1.5 || r.left < -1.5) {
      outside.push({ ...describe(el), left: round(r.left), right: round(r.right) });
    }
  });

  /* 1b - diagnostic: boxes whose content is wider than their box -------- */
  const wide = [];
  if (overflowX > 1) {
    qa("body *").forEach((el) => {
      if (!visible(el) || el.scrollWidth <= el.clientWidth + 1) return;
      const cs = getComputedStyle(el);
      wide.push({
        ...describe(el),
        w: Math.round(el.getBoundingClientRect().width),
        sw: el.scrollWidth,
        cw: el.clientWidth,
        ov: cs.overflowX,
        clipped: clippedByAncestor(el),
      });
    });
  }

  /* 1c - diagnostic: every box crossing the viewport edge -------------- */
  const beyond = [];
  if (overflowX > 1) {
    qa("body *").forEach((el) => {
      if (!visible(el)) return;
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1.5 && r.left >= -1.5) return;
      const cs = getComputedStyle(el);
      beyond.push({
        ...describe(el),
        left: round(r.left),
        right: round(r.right),
        w: round(r.width),
        pos: cs.position,
        clip: clippedByAncestor(el),
        parent: el.parentElement
          ? (el.parentElement.className || "").toString().trim().split(/\s+/).slice(0, 3).join(".")
          : "",
      });
    });
  }

  /* 1d - diagnostic: the layout chain from the audited scope up --------- */
  const chain = [];
  if (overflowX > 1) {
    let n = ROOT === document ? document.body : ROOT;
    while (n && n !== document.documentElement && chain.length < 12) {
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      chain.push({
        ...describe(n),
        left: round(r.left),
        right: round(r.right),
        w: round(r.width),
        cw: n.clientWidth,
        sw: n.scrollWidth,
        ovx: cs.overflowX,
        minW: cs.minWidth,
        pad: cs.paddingLeft + "/" + cs.paddingRight,
        mar: cs.marginLeft + "/" + cs.marginRight,
        scrollLeft: Math.round(n.scrollLeft),
      });
      n = n.parentElement;
    }
  }

  /* 2 - 44px touch targets ------------------------------------------- */
  const SEL =
    "a[href], button, input:not([type=radio]):not([type=checkbox]):not([type=hidden]), select, textarea, [role=button], [role=tab]";
  const small = [];
  qa(SEL).forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("[aria-hidden='true']")) return;
    const r = el.getBoundingClientRect();
    if (r.width + 0.5 < 44 || r.height + 0.5 < 44) {
      small.push({
        ...describe(el),
        w: round(r.width),
        h: round(r.height),
        text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24),
      });
    }
  });

  /* 3 - primary text never below 14px -------------------------------- */
  const PRIMARY_SEL = "p, li, td, th, h1, h2, h3, h4, label, button, a[href], input, select, textarea";
  const primary = [];
  qa(PRIMARY_SEL).forEach((el) => {
    if (!visible(el)) return;
    if (el.closest("[aria-hidden='true'], .sr-only, .qr-card")) return;
    if (el.closest("[aria-label='مسار التنقل']")) return;
    if (el.closest(".mobile-bottom-nav")) return;
    // A radio/checkbox has a value, not rendered text; its label carries the
    // copy and is measured on its own.
    if (
      el.tagName === "INPUT" &&
      /^(radio|checkbox|hidden|range|color|file)$/i.test(el.type)
    )
      return;
    const text = (el.value || el.textContent || "").trim();
    if (!text) return;
    if (/(^|\s)text-(xs|\[11px\]|\[10px\])/.test(el.className || "")) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs + 0.01 < 14) {
      primary.push({ ...describe(el), fs, text: text.slice(0, 24) });
    }
  });

  /* 4 - text clipped inside an overflow:hidden box ------------------- */
  const hasDirectText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  const clipped = [];
  qa("body *").forEach((el) => {
    if (!visible(el) || !hasDirectText(el)) return;
    if (el.closest("[aria-hidden='true'], .sr-only, .qr-card, .truncate, [class*='line-clamp'], [title], [data-scroll-region]"))
      return;
    const cs = getComputedStyle(el);
    if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
      clipped.push({ ...describe(el), axis: "x", by: el.scrollWidth - el.clientWidth, text: el.textContent.trim().slice(0, 24) });
    } else if (/hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      clipped.push({ ...describe(el), axis: "y", by: el.scrollHeight - el.clientHeight, text: el.textContent.trim().slice(0, 24) });
    }
  });

  /* 5 - an overlay must not cover an interactive control -------------- */
  const covered = [];
  qa(SEL).forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < 1 || cy < 1 || cx > vw - 1 || cy > vh - 1) return;
    const top = document.elementFromPoint(cx, cy);
    if (!top) return;
    if (top === el || el.contains(top) || top.contains(el)) return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    const moved = el.getBoundingClientRect();
    const again = document.elementFromPoint(
      moved.left + moved.width / 2,
      moved.top + moved.height / 2,
    );
    window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    if (!again || again === el || el.contains(again) || again.contains(el)) return;

    const tr = again.getBoundingClientRect();
    covered.push({
      ...describe(el),
      by: again.tagName.toLowerCase(),
      byCls: again.getAttribute("class") || "",
      byText: (again.textContent || "").trim().slice(0, 30),
      byRect: [Math.round(tr.left), Math.round(tr.top), Math.round(tr.width), Math.round(tr.height)],
      elRect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    });
  });

  /* 6 - sibling cards/sections must not overlap ----------------------- */
  const blocks = [
    ...qa(
      '[data-testid^="section-"], [data-testid^="chart-"], .card-grid > *, [data-testid="student-card-stats"] > *, [data-testid="students-cards"] article, [data-testid="qr-grid"] > *, [data-testid="bulk-parents-cards"] > *, [data-testid="import-preview-cards"] > *',
    ),
  ].filter(visible);
  const overlaps = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const ix = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left));
      const iy = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top));
      const area = ix * iy;
      const minArea = Math.min(ar.width * ar.height, br.width * br.height);
      if (area > 4 && minArea > 0 && area > minArea * 0.05) {
        overlaps.push({ a: describe(a), b: describe(b), area: Math.round(area) });
      }
    }
  }

  /* 7 - contrast (text over non-gradient surfaces) -------------------- */
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = (c) => {
    const ch = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };
  const ratio = (a, b) => {
    const x = lum(a);
    const y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const bgOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.85) return c;
      node = node.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const gradientAncestor = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      if (getComputedStyle(node).backgroundImage !== "none") return true;
      node = node.parentElement;
    }
    return false;
  };
  const contrast = [];
  const contrastLow = [];
  qa("p, li, td, th, h1, h2, h3, h4, label, button, a[href], span, div")
    .forEach((el) => {
      if (!visible(el) || !hasDirectText(el)) return;
      if (el.closest("[aria-hidden='true'], .sr-only, svg, .qr-card")) return;
      if (gradientAncestor(el)) return;
      const fg = parse(getComputedStyle(el).color);
      const bg = bgOf(el);
      if (!fg || !bg) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const fw = parseInt(getComputedStyle(el).fontWeight, 10) || 400;
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      const value = Math.round(ratio(fg, bg) * 100) / 100;
      contrast.push(value);
      if (value + 0.01 < (large ? 3 : 4.5)) {
        contrastLow.push({
          ...describe(el),
          ratio: value,
          fs,
          fg: getComputedStyle(el).color,
          bg: "rgba(" + bg.r + "," + bg.g + "," + bg.b + "," + bg.a + ")",
          text: el.textContent.trim().slice(0, 24),
        });
      }
    });

  /* 8 - fonts -------------------------------------------------------- */
  const faces = [...document.fonts];
  const isLoaded = (name) =>
    faces.some(
      (f) => f.family.replace(/["']/g, "").startsWith(name) && f.status === "loaded",
    );
  const fonts = {
    tajawal: isLoaded("Tajawal"),
    manrope: isLoaded("Manrope"),
    status: document.fonts.status,
    body: getComputedStyle(document.body).fontFamily,
  };

  /* 9 - batch 3 states ------------------------------------------------ */
  const textOf = (el) =>
    el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";

  const qrPage = testid("qr-page");
  const qrGrid = testid("qr-grid");
  const qrEmpty = testid("qr-empty");
  const qrLoading = testid("qr-loading");
  const qrEmail = testid("qr-email-modal");
  const qrPagination = testid("qr-pagination");
  const qrCards = qrGrid
    ? [...qrGrid.querySelectorAll('[data-testid^="qr-card-"]')]
    : [];

  const bulkPage = testid("bulk-parents-page");
  const bulkCards = testid("bulk-parents-cards");
  const bulkStats = testid("bulk-parents-stats");
  const bulkTable = bulkPage ? bulkPage.querySelector("table") : null;
  const bulkCardItems = bulkCards
    ? [...bulkCards.querySelectorAll('[data-testid="bulk-parent-card"]')]
    : [];

  const importWizard = testid("import-wizard");
  const importTitle = document.getElementById("import-wizard-title");
  const previewCards = testid("import-preview-cards");
  const importStepBox = importWizard ? textOf(importWizard) : "";
  const importStep = (importStepBox.match(/الخطوة\s+(\d)\s+من\s+4/) || [])[1] || null;
  const importPreviewTable =
    importStep === "2" ? importWizard.querySelector("table") : null;

  const accountsModal = testid("accounts-modal");
  const accountPasswords = accountsModal
    ? [...accountsModal.querySelectorAll('[data-testid^="accounts-password-"]')]
    : [];

  const modalInfo = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      role: el.getAttribute("role"),
      ariaModal: el.getAttribute("aria-modal"),
      box: box(el),
      inViewport: r.top >= -1 && r.bottom <= vh + 1,
      text: textOf(el).slice(0, 300),
    };
  };

  const ui = {
    qr: qrPage
      ? {
          page: true,
          gridVisible: qrGrid ? visible(qrGrid) : false,
          cardCount: qrCards.length,
          cardPrintButtons: qrCards.filter((card) =>
            card.querySelector('[data-testid^="qr-print-one-"]'),
          ).length,
          emptyVisible: qrEmpty ? visible(qrEmpty) : false,
          emptyText: textOf(qrEmpty).slice(0, 160),
          loadingVisible: qrLoading ? visible(qrLoading) : false,
          loadingText: textOf(qrLoading).slice(0, 90),
          missingText: textOf(testid("qr-missing-codes")),
          paginationVisible: qrPagination ? visible(qrPagination) : false,
          controls: {
            generate: Boolean(testid("qr-generate")) && visible(testid("qr-generate")),
            printAll: Boolean(testid("qr-print-all")) && visible(testid("qr-print-all")),
            email: Boolean(testid("qr-email-open")) && visible(testid("qr-email-open")),
            search: Boolean(testid("qr-search")) && visible(testid("qr-search")),
            group: Boolean(testid("qr-group")) && visible(testid("qr-group")),
            reset: Boolean(testid("qr-reset")) && visible(testid("qr-reset")),
          },
          email: qrEmail
            ? {
                ...modalInfo(qrEmail),
                fullText: textOf(qrEmail).slice(0, 2000),
                input: Boolean(testid("qr-email-input")),
                sendHeight: testid("qr-email-send")?.getBoundingClientRect().height ?? 0,
                cancel: Boolean(testid("qr-email-cancel")),
              }
            : null,
        }
      : null,
    bulk: bulkPage
      ? {
          page: true,
          tableVisible: bulkTable ? visible(bulkTable) : false,
          tableHeadings: bulkTable ? bulkTable.querySelectorAll("thead th").length : 0,
          tableFirstRowCells:
            bulkTable?.querySelector("tbody tr")?.querySelectorAll("td").length ?? 0,
          cardsVisible: bulkCards ? visible(bulkCards) : false,
          cardCount: bulkCardItems.length,
          firstCardText: textOf(bulkCardItems[0]).slice(0, 240),
          tabs: [...bulkPage.querySelectorAll('[role="tab"]')].map(textOf),
          stats: bulkStats
            ? [...bulkStats.children].map((card) =>
                (card.querySelector(".num")?.textContent || "").trim(),
              )
            : [],
          runVisible: [...bulkPage.querySelectorAll("button")].some((button) =>
            textOf(button).includes("إنشاء الحسابات"),
          ),
          exportDisabled: ["bulk-parents-export-excel", "bulk-parents-export-pdf"].map(
            (id) => {
              const el = testid(id);
              return el ? el.disabled : null;
            },
          ),
          text: textOf(bulkPage).slice(0, 320),
          fullText: textOf(bulkPage).slice(0, 3000),
        }
      : null,
    wizard: importWizard
      ? {
          page: true,
          ...modalInfo(importWizard),
          title: textOf(importTitle),
          step: importStep,
          stepVisible: [1, 2, 3, 4].map((n) => {
            const el = testid("import-step-" + n);
            return el ? visible(el) : false;
          }),
          summary: {
            total: textOf(testid("summary-total")),
            valid: textOf(testid("summary-valid")),
            duplicate: textOf(testid("summary-duplicate")),
            error: textOf(testid("summary-error")),
          },
          tableVisible: importPreviewTable ? visible(importPreviewTable) : false,
          tableHeadings: importPreviewTable
            ? importPreviewTable.querySelectorAll("thead th").length
            : 0,
          tableRows: importPreviewTable
            ? importPreviewTable.querySelectorAll("tbody tr").length
            : 0,
          cardsVisible: previewCards ? visible(previewCards) : false,
          cardCount: previewCards
            ? previewCards.querySelectorAll('[data-testid="import-preview-card"]').length
            : 0,
          cardText: previewCards ? textOf(previewCards).slice(0, 700) : "",
          fullText: importStepBox.slice(0, 5000),
          finishVisible:
            Boolean(testid("import-finish")) && visible(testid("import-finish")),
          resultCounts: [
            ...document.querySelectorAll('[data-testid="import-step-4"] p.num'),
          ].map(textOf),
        }
      : null,
    accounts: accountsModal
      ? {
          page: true,
          ...modalInfo(accountsModal),
          credentialCount: accountsModal.querySelectorAll(
            '[data-testid^="accounts-credential-"]',
          ).length,
          passwords: accountPasswords.map((el) => textOf(el)),
          copyButtons: accountsModal.querySelectorAll('[data-testid^="accounts-copy-"]').length,
          printVisible: Boolean(testid("accounts-print")) && visible(testid("accounts-print")),
          closeVisible: Boolean(testid("accounts-close")) && visible(testid("accounts-close")),
          hasWarning: textOf(accountsModal).includes("مرة واحدة فقط"),
          hasName: textOf(accountsModal).includes("أحمد علي"),
          fullText: textOf(accountsModal).slice(0, 2500),
        }
      : null,
    text: textOf(ROOT).slice(0, 260),
  };

  return {
    vw,
    vh,
    dir: document.documentElement.dir || document.body.dir,
    overflowX,
    overflowY,
    outside: outside.slice(0, 10),
    outsideCount: outside.length,
    wide: wide.slice(0, 20),
    beyond: beyond.slice(0, 30),
    chain,
    docWidths: {
      innerWidth: vw,
      client: de.clientWidth,
      scroll: de.scrollWidth,
      body: document.body.scrollWidth,
    },
    small: small.slice(0, 10),
    smallCount: small.length,
    primary: primary.slice(0, 10),
    primaryCount: primary.length,
    clipped: clipped.slice(0, 10),
    clippedCount: clipped.length,
    covered: covered.slice(0, 10),
    coveredCount: covered.length,
    overlaps: overlaps.slice(0, 10),
    overlapCount: overlaps.length,
    contrastMin: contrast.length ? Math.min(...contrast) : null,
    contrastLow,
    fonts,
    pageHeading: (ROOT.querySelector("h1")?.textContent || "").trim(),
    badText: (() => {
      const found = (document.body.innerText || "").match(/(undefined|NaN|Infinity)/g);
      return found ? [...new Set(found)] : [];
    })(),
    ui,
  };
})()`;
