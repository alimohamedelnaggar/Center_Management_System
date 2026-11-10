/**
 * Center colour engine — one source of truth for the browser board and the
 * Node report.
 *
 *   <script src="center-color.js"></script>   -> window.CenterColor
 *   const CenterColor = require("./center-color.js");
 *
 * The centre owner picks one colour (ThemeColor). We derive exactly four
 * outputs and never let the raw colour leak into text:
 *
 *   fill  – the button / logo / active-nav / highlight surface
 *   on    – white or near-black text on `fill` (>= 4.5:1)
 *   ink   – a link / text variant, lightened or darkened until >= 4.5:1 on
 *           the card in each theme
 *   soft  – a 10% (light) / 18% (dark) tint of `fill` over the card, used for
 *           chips, selected rows and soft badges; `inkOnSoft` is re-checked
 *
 * Large hero gradients, page backgrounds, charts and status colours are
 * deliberately NOT derived from the centre colour (documented in the report).
 *
 * Plain ES5, UMD, no dependencies.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CenterColor = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LIGHT = { bg: "#F4F5FB", card: "#FFFFFF", text: "#101528" };
  var DARK = { bg: "#080B18", card: "#121831", text: "#F2F4FF" };
  var ON_DARK = "#0B102A";
  var AA = 4.5; // normal text
  var AA_LARGE = 3; // large text / UI boundaries
  var SOFT_WEIGHT = { light: 0.1, dark: 0.18 };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseHex(input) {
    var hex = String(input || "").trim().replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      throw new Error("Invalid hex colour: " + input);
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function toHex(rgb) {
    var out = "#";
    ["r", "g", "b"].forEach(function (key) {
      var part = Math.round(clamp(rgb[key], 0, 255)).toString(16).toUpperCase();
      out += part.length === 1 ? "0" + part : part;
    });
    return out;
  }

  function channel(value) {
    var srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(color) {
    var rgb = typeof color === "string" ? parseHex(color) : color;
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function contrastRatio(a, b) {
    var la = relativeLuminance(a);
    var lb = relativeLuminance(b);
    var hi = Math.max(la, lb);
    var lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  function rgbToHsl(rgb) {
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function hslToRgb(hsl) {
    var h = ((hsl.h % 360) + 360) % 360;
    var s = clamp(hsl.s, 0, 100) / 100;
    var l = clamp(hsl.l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0;
    var g = 0;
    var b = 0;

    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  /** Blend `color` over `base`; weight is how much of `color` is kept. */
  function mix(color, base, weight) {
    var a = parseHex(color);
    var b = parseHex(base);
    var w = clamp(weight, 0, 1);
    return toHex({
      r: a.r * w + b.r * (1 - w),
      g: a.g * w + b.g * (1 - w),
      b: a.b * w + b.b * (1 - w),
    });
  }

  /** White or near-black, whichever is more readable on `fill`. */
  function pickOn(fill) {
    var candidates = [
      { color: "#FFFFFF", label: "white" },
      { color: ON_DARK, label: "dark" },
      { color: "#000000", label: "black" },
    ];
    var best = null;
    candidates.forEach(function (candidate) {
      var ratio = contrastRatio(fill, candidate.color);
      if (!best || ratio > best.ratio) {
        best = { hex: candidate.color, ratio: ratio, label: candidate.label };
      }
    });
    return best;
  }

  /**
   * Move the colour's HSL lightness away from the background until it reaches
   * `target`. Returns the new hex, achieved ratio, and the lightness delta in
   * percentage points (0 means the colour already passed).
   */
  function adjustForContrast(startHex, bgHex, target) {
    var startRatio = contrastRatio(startHex, bgHex);
    if (startRatio >= target) {
      return { hex: toHex(parseHex(startHex)), ratio: startRatio, delta: 0 };
    }

    var bgLum = relativeLuminance(bgHex);
    var hsl = rgbToHsl(parseHex(startHex));
    var startL = hsl.l;
    var isLightBg = bgLum > 0.18;
    // Light backgrounds need darker ink; dark backgrounds need lighter ink.
    // Walk away from the original lightness and stop at the first value that
    // passes, so the brand colour stays as close as possible.
    var step = isLightBg ? -0.5 : 0.5;
    var bestL = isLightBg ? 0 : 100;

    for (var l = startL; isLightBg ? l >= 0 : l <= 100; l += step) {
      var hex = toHex(hslToRgb({ h: hsl.h, s: hsl.s, l: l }));
      if (contrastRatio(hex, bgHex) >= target) {
        bestL = l;
        break;
      }
    }

    var out = toHex(hslToRgb({ h: hsl.h, s: hsl.s, l: bestL }));
    return {
      hex: out,
      ratio: contrastRatio(out, bgHex),
      delta: round2(Math.abs(bestL - startL)),
    };
  }

  function buildForTheme(fillInput, surfaces, mode) {
    var fill = toHex(parseHex(fillInput));
    var on = pickOn(fill);
    var ink = adjustForContrast(fill, surfaces.card, AA);

    // The card is not always the hardest surface: in light mode the page bg is
    // slightly darker than white, so re-check and adjust against it too.
    if (contrastRatio(ink.hex, surfaces.bg) < AA) {
      var againstBg = adjustForContrast(ink.hex, surfaces.bg, AA);
      ink = {
        hex: againstBg.hex,
        ratio: againstBg.ratio,
        delta: round2(ink.delta + againstBg.delta),
      };
    }

    var soft = mix(fill, surfaces.card, SOFT_WEIGHT[mode]);
    var inkOnSoft = ink.hex;

    if (contrastRatio(inkOnSoft, soft) < AA) {
      var onSoft = adjustForContrast(ink.hex, soft, AA);
      inkOnSoft = onSoft.hex;
      ink.delta = round2(ink.delta + onSoft.delta);
    }

    var warnings = [];
    if (on.ratio < AA) {
      warnings.push("fill/on contrast " + round2(on.ratio) + ":1 is below AA");
    }
    if (ink.delta > 22) {
      warnings.push(
        "ink moved " + ink.delta + " lightness points to reach AA on the card",
      );
    }
    if (contrastRatio(inkOnSoft, soft) < AA) {
      warnings.push("ink on soft tint is below AA");
    }

    return {
      mode: mode,
      fill: fill,
      hover: mix(fill, mode === "light" ? "#000000" : "#FFFFFF", 0.88),
      on: on.hex,
      onLabel: on.label,
      ink: ink.hex,
      inkDelta: ink.delta,
      soft: soft,
      inkOnSoft: inkOnSoft,
      surfaces: surfaces,
      ratios: {
        fillOn: round2(on.ratio),
        inkCard: round2(contrastRatio(ink.hex, surfaces.card)),
        inkBg: round2(contrastRatio(ink.hex, surfaces.bg)),
        inkOnSoft: round2(contrastRatio(inkOnSoft, soft)),
        fillAsTextOnCard: round2(contrastRatio(fill, surfaces.card)),
      },
      pass:
        on.ratio >= AA &&
        contrastRatio(ink.hex, surfaces.card) >= AA &&
        contrastRatio(ink.hex, surfaces.bg) >= AA &&
        contrastRatio(inkOnSoft, soft) >= AA,
      warnings: warnings,
    };
  }

  /** Build the complete light + dark theme for one centre colour. */
  function buildTheme(fillInput) {
    var light = buildForTheme(fillInput, LIGHT, "light");
    var dark = buildForTheme(fillInput, DARK, "dark");
    return {
      input: String(fillInput),
      light: light,
      dark: dark,
      pass: light.pass && dark.pass,
      warnings: light.warnings
        .map(function (w) { return "light: " + w; })
        .concat(dark.warnings.map(function (w) { return "dark: " + w; })),
    };
  }

  /** CSS custom properties for one mode, ready to paste into a style tag. */
  function cssVars(theme, selector) {
    var mode = theme.light ? theme.light : theme; // accept a single mode
    var host = selector || ":root";
    return (
      host +
      " {\n" +
      "  --center-color: " + mode.fill + ";\n" +
      "  --center-on: " + mode.on + ";\n" +
      "  --center-ink: " + mode.ink + ";\n" +
      "  --center-ink-on-soft: " + mode.inkOnSoft + ";\n" +
      "  --center-soft: " + mode.soft + ";\n" +
      "}\n"
    );
  }

  return {
    LIGHT: LIGHT,
    DARK: DARK,
    AA: AA,
    AA_LARGE: AA_LARGE,
    parseHex: parseHex,
    toHex: toHex,
    relativeLuminance: relativeLuminance,
    contrastRatio: contrastRatio,
    mix: mix,
    pickOn: pickOn,
    adjustForContrast: adjustForContrast,
    buildTheme: buildTheme,
    cssVars: cssVars,
  };
});
