/**
 * Numeric WCAG contrast audit for the three design directions.
 * Run: node check-contrast.mjs
 * Writes: contrast-report.md
 */
import { writeFileSync } from "node:fs";

const palettes = {
  A: {
    name: "دفتر",
    light: {
      bg: "#F6F2EA",
      card: "#FFFDF8",
      muted: "#ECE5D8",
      border: "#D8CFBE",
      text: "#1C2434",
      mutedText: "#5B6472",
      primary: "#1D4E5F",
      onPrimary: "#FFFFFF",
      accent: "#A8541A",
      onAccent: "#FFFFFF",
      success: "#1E6B3A",
      successBg: "#E3F1E6",
      warning: "#8A5A00",
      warningBg: "#FBF0D9",
      danger: "#A3262A",
      dangerBg: "#F8E3E2",
      info: "#1E5A8A",
      infoBg: "#E2EEF7",
    },
    dark: {
      bg: "#0E1416",
      card: "#161F22",
      muted: "#1F2B2E",
      border: "#2C3B3F",
      text: "#F3F0E8",
      mutedText: "#A9B4B2",
      primary: "#7FD1BE",
      onPrimary: "#08211D",
      accent: "#E9A23B",
      onAccent: "#241703",
      success: "#6EDB9A",
      successBg: "#10281B",
      warning: "#F2C14E",
      warningBg: "#2B2110",
      danger: "#FF8A84",
      dangerBg: "#2F1515",
      info: "#7CC4F2",
      infoBg: "#0F2230",
    },
  },
  B: {
    name: "نبض",
    light: {
      bg: "#F4F5FB",
      card: "#FFFFFF",
      muted: "#ECEEF8",
      border: "#DDE1F0",
      text: "#101528",
      mutedText: "#5A6178",
      primary: "#4F46E5",
      onPrimary: "#FFFFFF",
      accent: "#E11D48",
      onAccent: "#FFFFFF",
      success: "#067A52",
      successBg: "#DDF7EC",
      warning: "#9A5B00",
      warningBg: "#FFF0D6",
      danger: "#C81E3A",
      dangerBg: "#FFE4E8",
      info: "#0B6FA4",
      infoBg: "#DFF2FF",
    },
    dark: {
      bg: "#080B18",
      card: "#121831",
      muted: "#1B2340",
      border: "#2A3357",
      text: "#F2F4FF",
      mutedText: "#A8B0CA",
      primary: "#8B93FF",
      onPrimary: "#0B102A",
      accent: "#FF7A93",
      onAccent: "#2A0810",
      success: "#4CE0A5",
      successBg: "#0B2A1F",
      warning: "#FFC857",
      warningBg: "#2B230C",
      danger: "#FF8FA3",
      dangerBg: "#2E0F18",
      info: "#6EC8FF",
      infoBg: "#0B2233",
    },
  },
  C: {
    name: "حِرفة",
    light: {
      bg: "#FAF5EC",
      card: "#FFFBF2",
      muted: "#F0E7D7",
      border: "#DCCDB6",
      text: "#21251F",
      mutedText: "#62655B",
      primary: "#23624F",
      onPrimary: "#FFFFFF",
      accent: "#B25808",
      onAccent: "#FFFFFF",
      success: "#2E6B3F",
      successBg: "#E5F2E6",
      warning: "#8C5A08",
      warningBg: "#FAEED7",
      danger: "#A82F33",
      dangerBg: "#F8E4E2",
      info: "#2C5F82",
      infoBg: "#E4EFF6",
    },
    dark: {
      bg: "#101512",
      card: "#18201B",
      muted: "#222C25",
      border: "#344036",
      text: "#F4F1E8",
      mutedText: "#ADB5A9",
      primary: "#7ED0AF",
      onPrimary: "#0B1F18",
      accent: "#F0B05A",
      onAccent: "#241703",
      success: "#79D69A",
      successBg: "#12261A",
      warning: "#F2C66D",
      warningBg: "#2A2211",
      danger: "#FF9A90",
      dangerBg: "#2C1514",
      info: "#83C7E8",
      infoBg: "#10232C",
    },
  },
};

function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function verdict(value, large = false) {
  const aa = large ? 3 : 4.5;
  const aaa = large ? 4.5 : 7;
  if (value >= aaa) return "AAA";
  if (value >= aa) return "AA";
  return "FAIL";
}

const pairs = (p) => [
  ["نص أساسي / خلفية الصفحة", p.text, p.bg, false],
  ["نص أساسي / البطاقة", p.text, p.card, false],
  ["نص ثانوي / خلفية الصفحة", p.mutedText, p.bg, false],
  ["نص ثانوي / البطاقة", p.mutedText, p.card, false],
  ["نص ثانوي / خلفية خفيفة", p.mutedText, p.muted, false],
  ["لون التمييز كنص / خلفية الصفحة", p.primary, p.bg, false],
  ["لون التمييز كنص / البطاقة", p.primary, p.card, false],
  ["نص الزر الأساسي / زر أساسي", p.onPrimary, p.primary, false],
  ["نص اللون الثانوي / زر ثانوي", p.onAccent, p.accent, false],
  ["Success / خلفية Success", p.success, p.successBg, false],
  ["Success / البطاقة", p.success, p.card, false],
  ["Warning / خلفية Warning", p.warning, p.warningBg, false],
  ["Warning / البطاقة", p.warning, p.card, false],
  ["Danger / خلفية Danger", p.danger, p.dangerBg, false],
  ["Danger / البطاقة", p.danger, p.card, false],
  ["Info / خلفية Info", p.info, p.infoBg, false],
  ["Info / البطاقة", p.info, p.card, false],
];

let md = `# فحص تباين الألوان — الاتجاهات الثلاثة\n\n`;
md += `تم الحساب وفق WCAG 2.1 (Relative Luminance). الحد المطلوب للنص العادي **4.5:1**، وللنص الكبير **3:1**. كل القيم أدناه محسوبة من قيم HEX الفعلية المستخدمة في ملفات HTML.\n\n`;

let failures = 0;

for (const [key, palette] of Object.entries(palettes)) {
  md += `## الاتجاه ${key} — ${palette.name}\n\n`;
  for (const [theme, p] of [["فاتح", palette.light], ["ليلي", palette.dark]]) {
    md += `### ${key} / ${theme}\n\n`;
    md += `| الزوج | المقدمة | الخلفية | النسبة | النتيجة |\n|---|---|---|---|---|\n`;
    for (const [label, fg, bg, large] of pairs(p)) {
      const value = ratio(fg, bg);
      const v = verdict(value, large);
      if (v === "FAIL") failures += 1;
      md += `| ${label} | \`${fg}\` | \`${bg}\` | ${value.toFixed(2)}:1 | ${v} |\n`;
    }
    md += `\n`;
  }
}

md += `## الخلاصة\n\n`;
md += failures === 0
  ? `كل أزواج النصوص المفحوصة (**${Object.keys(palettes).length * 2 * 17}** زوجًا) تجتاز WCAG AA على الأقل. لا توجد حالة FAIL.\n`
  : `**${failures}** زوجًا يحتاج تعديلًا. راجع الجدول أعلاه.\n`;

writeFileSync("contrast-report.md", md, "utf8");
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
