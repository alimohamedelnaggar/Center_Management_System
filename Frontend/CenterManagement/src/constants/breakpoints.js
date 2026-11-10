/**
 * Breakpoint mirror for JavaScript-only decisions (the components gallery and
 * its tests). The rendering contract itself lives in `src/index.css` under
 * `@theme`; keep these values in sync with the CSS tokens.
 *
 * xs  360  small phone
 * ph  390  phone
 * phl 430  large phone
 * md  768  portrait tablet -> icon rail
 * lg  1024 landscape tablet -> compact sidebar
 * xl  1280 desktop -> full sidebar
 * 2xl 1440 full desktop
 * wide 1920 large screens
 * ultra 2560 ultra-wide
 */
export const BREAKPOINTS = Object.freeze({
  xs: 360,
  ph: 390,
  phl: 430,
  md: 768,
  lg: 1024,
  xl: 1280,
  desk: 1440,
  wide: 1920,
  ultra: 2560,
});

export const SIDEBAR_MODE = Object.freeze({
  DRAWER: "drawer",
  RAIL: "rail",
  COMPACT: "compact",
  FULL: "full",
});

/** Sidebar/layout mode for a viewport width. */
export function layoutMode(width) {
  if (width < BREAKPOINTS.md) return SIDEBAR_MODE.DRAWER;
  if (width < BREAKPOINTS.lg) return SIDEBAR_MODE.RAIL;
  if (width < BREAKPOINTS.xl) return SIDEBAR_MODE.COMPACT;
  return SIDEBAR_MODE.FULL;
}

/** Content max width in px, matching `--content-max*` tokens. */
export function contentMaxWidth(width) {
  if (width >= BREAKPOINTS.ultra) return 1760;
  if (width >= BREAKPOINTS.wide) return 1600;
  return 1440;
}

/**
 * Number of KPI columns for a container/content width (px). Mirrors the
 * `.card-grid` container queries in `index.css` (24rem / 46rem / 72rem).
 */
export function statColumns(width) {
  if (width >= 72 * 16) return 4;
  if (width >= 46 * 16) return 3;
  if (width >= 24 * 16) return 2;
  return 1;
}

/** Portrait/landscape viewports exercised by the automated check. */
export const PREVIEW_VIEWPORTS = Object.freeze([
  { id: "360", label: "360", width: 360, height: 800, kind: "portrait" },
  { id: "390", label: "390", width: 390, height: 844, kind: "portrait" },
  { id: "430", label: "430", width: 430, height: 932, kind: "portrait" },
  { id: "768", label: "768", width: 768, height: 1024, kind: "portrait" },
  { id: "1024", label: "1024", width: 1024, height: 768, kind: "landscape" },
  { id: "1280", label: "1280", width: 1280, height: 800, kind: "landscape" },
  { id: "1440", label: "1440", width: 1440, height: 900, kind: "landscape" },
  { id: "1920", label: "1920", width: 1920, height: 1080, kind: "landscape" },
  { id: "2560", label: "2560", width: 2560, height: 1440, kind: "landscape" },
  { id: "land-640", label: "640×360", width: 640, height: 360, kind: "landscape" },
  { id: "land-844", label: "844×390", width: 844, height: 390, kind: "landscape" },
]);

/** True when the viewport is a short landscape phone. */
export function isShortLandscape(width, height) {
  return height <= 430 && width > height;
}

/** Data attribute consumed by the gallery iframe toolbar. */
export function previewAriaLabel(viewport) {
  return `معاينة ${viewport.label} بكسل`;
}
