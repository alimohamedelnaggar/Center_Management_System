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

// Pick white or dark text for the best contrast on a given background.
function readableTextOn(hex) {
  return relativeLuminance(hex) > 0.5 ? "#0f172a" : "#ffffff";
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

  root.style.setProperty("--color-primary-val", color);
  root.style.setProperty("--color-primary-hover-val", shade(color, 0.22));
  root.style.setProperty("--color-primary-light-val", shade(color, -0.18));
  root.style.setProperty("--color-primary-subtle-val", tint(color, 0.9));
  root.style.setProperty("--color-primary-contrast-val", readableTextOn(color));
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
