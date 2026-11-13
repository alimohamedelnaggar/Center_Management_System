import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BREAKPOINTS,
  PREVIEW_VIEWPORTS,
  SIDEBAR_MODE,
  contentMaxWidth,
  isShortLandscape,
  layoutMode,
  statColumns,
} from "./breakpoints";

const cssPath = fileURLToPath(new URL("../index.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

describe("breakpoint tokens", () => {
  it("mirrors every CSS breakpoint token", () => {
    const expected = {
      xs: "360px",
      ph: "390px",
      phl: "430px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      wide: "1920px",
      ultra: "2560px",
    };

    for (const [name, value] of Object.entries(expected)) {
      expect(css).toContain(`--breakpoint-${name}: ${value};`);
    }
  });

  it("switches the sidebar from drawer to rail to compact to full", () => {
    expect(layoutMode(359)).toBe(SIDEBAR_MODE.DRAWER);
    expect(layoutMode(BREAKPOINTS.xs)).toBe(SIDEBAR_MODE.DRAWER);
    expect(layoutMode(BREAKPOINTS.md - 1)).toBe(SIDEBAR_MODE.DRAWER);
    expect(layoutMode(BREAKPOINTS.md)).toBe(SIDEBAR_MODE.RAIL);
    expect(layoutMode(BREAKPOINTS.lg - 1)).toBe(SIDEBAR_MODE.RAIL);
    expect(layoutMode(BREAKPOINTS.lg)).toBe(SIDEBAR_MODE.COMPACT);
    expect(layoutMode(BREAKPOINTS.xl - 1)).toBe(SIDEBAR_MODE.COMPACT);
    expect(layoutMode(BREAKPOINTS.xl)).toBe(SIDEBAR_MODE.FULL);
    expect(layoutMode(BREAKPOINTS.ultra)).toBe(SIDEBAR_MODE.FULL);
  });

  it("caps and centres content on large screens", () => {
    expect(contentMaxWidth(BREAKPOINTS.xl)).toBe(1440);
    expect(contentMaxWidth(BREAKPOINTS.wide)).toBe(1600);
    expect(contentMaxWidth(BREAKPOINTS.ultra)).toBe(1760);
    expect(css).toContain("--content-max: 90rem;");
    expect(css).toContain("--content-max-wide: 100rem;");
    expect(css).toContain("--content-max-ultra: 110rem;");
    expect(css).toContain("margin-inline: auto;");
  });

  it("grows KPI columns with the available width", () => {
    expect(statColumns(360)).toBe(1);
    expect(statColumns(430)).toBe(2);
    expect(statColumns(768)).toBe(3);
    expect(statColumns(1440)).toBe(4);
  });

  it("covers every required automated viewport", () => {
    const sizes = PREVIEW_VIEWPORTS.map((item) => `${item.width}x${item.height}`);
    for (const size of [
      "360x800",
      "390x844",
      "430x932",
      "768x1024",
      "1024x768",
      "1280x800",
      "1440x900",
      "1920x1080",
      "2560x1440",
      "640x360",
      "844x390",
    ]) {
      expect(sizes).toContain(size);
    }
  });

  it("detects short landscape phones", () => {
    expect(isShortLandscape(844, 390)).toBe(true);
    expect(isShortLandscape(640, 360)).toBe(true);
    expect(isShortLandscape(390, 844)).toBe(false);
    expect(isShortLandscape(1024, 768)).toBe(false);
  });
});

describe("responsive CSS contracts", () => {
  it("switches tables to cards with a container query, not the viewport", () => {
    expect(css).toContain(".responsive-table {");
    expect(css).toContain("container-type: inline-size;");
    expect(css).toContain("@container (max-width: 44rem)");
    expect(css).toContain(".responsive-table .as-table");
    expect(css).toContain(".responsive-table .as-cards");
  });

  it("keeps modal header/footer visible while the body scrolls", () => {
    expect(css).toContain(".modal-scroll {");
    expect(css).toContain("overflow-y: auto;");
    expect(css).toContain(".modal-panel {");
    expect(css).toContain("max-height: calc(100dvh");
  });

  it("respects safe areas and short landscape", () => {
    expect(css).toContain("env(safe-area-inset-top");
    expect(css).toContain("env(safe-area-inset-bottom");
    expect(css).toContain("env(safe-area-inset-left");
    expect(css).toContain("@media (max-height: 430px) and (orientation: landscape)");
    expect(css).toContain(".mobile-bottom-nav");
  });

  it("loads local OFL fonts instead of Google Fonts", () => {
    const html = readFileSync(
      fileURLToPath(new URL("../../index.html", import.meta.url)),
      "utf8",
    );
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).not.toContain("fonts.gstatic.com");
    expect(css).toContain('font-family: "Tajawal";');
    expect(css).toContain('font-family: "Manrope";');
    expect(
      existsSync(
        fileURLToPath(
          new URL("../assets/fonts/tajawal-arabic-400-normal.woff2", import.meta.url),
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        fileURLToPath(
          new URL("../assets/fonts/manrope-latin-400-normal.woff2", import.meta.url),
        ),
      ),
    ).toBe(true);
  });

  it("uses rem typography and a reduced-motion guard", () => {
    expect(css).toContain("font-size: 1rem;");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
