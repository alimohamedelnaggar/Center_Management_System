import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { centerService } from "../services/centerService";
import { useAuth } from "./useAuth";

export const BrandingContext = createContext(null);

const DEFAULT_TITLE = "نظام الإدارة";

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return null;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }) {
  return (
    "#" +
    [r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")
  );
}

// amount > 0 darkens, amount < 0 lightens.
function shade(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (channel) =>
    amount >= 0
      ? channel * (1 - amount)
      : channel + (255 - channel) * -amount;

  return toHex({
    r: adjust(rgb.r),
    g: adjust(rgb.g),
    b: adjust(rgb.b),
  });
}

// Mix the color with white by `ratio` (0..1) -> very light tint.
function tint(hex, ratio) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return toHex({
    r: rgb.r + (255 - rgb.r) * ratio,
    g: rgb.g + (255 - rgb.g) * ratio,
    b: rgb.b + (255 - rgb.b) * ratio,
  });
}

// WCAG relative luminance (0..1) of an sRGB hex color.
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;

  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  );
}

// Pick the text colour (white or near-black) that contrasts best on `hex`.
function readableTextOn(hex) {
  return contrastRatio(hex, "#0f172a") >= contrastRatio(hex, "#ffffff")
    ? "#0f172a"
    : "#ffffff";
}

function applyThemeColor(color) {
  const root = document.documentElement;

  if (!color || !hexToRgb(color)) {
    root.style.removeProperty("--color-primary-val");
    root.style.removeProperty("--color-primary-hover-val");
    root.style.removeProperty("--color-primary-light-val");
    root.style.removeProperty("--color-primary-subtle-val");
    root.style.removeProperty("--color-primary-contrast-val");
    return;
  }

  // The center brand colour is authored for light surfaces. On the dark canvas
  // that exact hex can drop to ~3:1 (e.g. #4F46E5 on #080B18), so derive a
  // lightened variant that keeps at least 4.5:1 for body-size text while still
  // reading as the same hue.
  const isDark = root.classList.contains("dark");
  // Worst-case dark surface for primary-coloured *text* is the muted card /
  // active nav row, not the page background.
  const darkTextSurface = "#1b2340";

  if (!isDark) {
    root.style.setProperty("--color-primary-val", color);
    root.style.setProperty("--color-primary-hover-val", shade(color, 0.22));
    root.style.setProperty("--color-primary-light-val", shade(color, -0.18));
    root.style.setProperty("--color-primary-subtle-val", tint(color, 0.9));
    root.style.setProperty("--color-primary-contrast-val", readableTextOn(color));
    return;
  }

  const primary = ensureContrast(color, darkTextSurface, 4.5);
  root.style.setProperty("--color-primary-val", primary);
  root.style.setProperty("--color-primary-hover-val", tint(primary, 0.18));
  root.style.setProperty("--color-primary-light-val", tint(primary, 0.32));
  root.style.setProperty("--color-primary-subtle-val", mix(primary, "#080b18", 0.82));
  root.style.setProperty("--color-primary-contrast-val", readableTextOn(primary));
}

function mix(a, b, ratio) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const at = (x, y) => x + (y - x) * ratio;
  return toHex({ r: at(ca.r, cb.r), g: at(ca.g, cb.g), b: at(ca.b, cb.b) });
}

// Ratio between a color and a background, per WCAG 2.x.
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Step the color toward white until it clears `min` against `background`.
function ensureContrast(color, background, min) {
  let candidate = color;
  for (let step = 1; step <= 14; step += 1) {
    if (contrastRatio(candidate, background) >= min) return candidate;
    candidate = tint(color, step * 0.06);
  }
  return "#ffffff";
}

export function BrandingProvider({ children }) {
  const { accessToken, role } = useAuth();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(false);

  const isStudent = role === "Student";

  const refresh = useCallback(async () => {
    if (!accessToken || isStudent) return;

    setLoading(true);
    try {
      const response = await centerService.getMyCenter();
      setCenter(response?.data ?? null);
    } catch {
      setCenter(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isStudent]);

  useEffect(() => {
    if (!accessToken || isStudent) {
      setCenter(null);
      return;
    }
    refresh();
  }, [accessToken, isStudent, refresh]);

  useEffect(() => {
    if (center?.name) {
      document.title = `${center.name} - ${DEFAULT_TITLE}`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    applyThemeColor(center?.themeColor);

    // ThemeContext toggles `.dark` on <html> after this effect has run, and the
    // derived palette is contrast-dependent, so re-apply whenever the mode
    // changes (including the initial mount toggle).
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      applyThemeColor(center?.themeColor);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [center]);

  const value = useMemo(
    () => ({
      center,
      loading,
      refresh,
      /** Optimistically reflect a freshly saved center without a refetch. */
      setCenter,
      title: center?.name || DEFAULT_TITLE,
      logoUrl: center?.logoUrl || null,
      themeColor: center?.themeColor || null,
    }),
    [center, loading, refresh],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}
