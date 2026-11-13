/**
 * Guards the product's Arabic UI copy against accidental script mixing and
 * broken encodings.
 *
 * The list covers scripts that have no business being mixed into this app's
 * Arabic/Latin copy: CJK (Chinese/Japanese/Korean), Cyrillic, Greek, Hebrew,
 * the Indic scripts, Thai, Georgian, Ethiopic, and so on. Arabic, Latin,
 * digits, punctuation, arrows, symbols and emoji are all allowed.
 *
 * Everything here is written with code points so this file itself stays
 * ASCII-only and cannot trip its own scan.
 */

export const FORBIDDEN_SCRIPT_RANGES = Object.freeze([
  ["Cyrillic", 0x0400, 0x04ff],
  ["Cyrillic supplement", 0x0500, 0x052f],
  ["Cyrillic extended-a", 0x2de0, 0x2dff],
  ["Cyrillic extended-b", 0xa640, 0xa69f],
  ["Greek", 0x0370, 0x03ff],
  ["Greek extended", 0x1f00, 0x1fff],
  ["Hebrew", 0x0590, 0x05ff],
  ["Hebrew presentation", 0xfb1d, 0xfb4f],
  ["Syriac", 0x0700, 0x074f],
  ["Thaana", 0x0780, 0x07bf],
  ["NKo", 0x07c0, 0x07ff],
  ["Samaritan", 0x0800, 0x083f],
  ["Mandaic", 0x0840, 0x085f],
  ["Devanagari", 0x0900, 0x097f],
  ["Bengali", 0x0980, 0x09ff],
  ["Gurmukhi", 0x0a00, 0x0a7f],
  ["Gujarati", 0x0a80, 0x0aff],
  ["Oriya", 0x0b00, 0x0b7f],
  ["Tamil", 0x0b80, 0x0bff],
  ["Telugu", 0x0c00, 0x0c7f],
  ["Kannada", 0x0c80, 0x0cff],
  ["Malayalam", 0x0d00, 0x0d7f],
  ["Sinhala", 0x0d80, 0x0dff],
  ["Thai", 0x0e00, 0x0e7f],
  ["Lao", 0x0e80, 0x0eff],
  ["Tibetan", 0x0f00, 0x0fff],
  ["Myanmar", 0x1000, 0x109f],
  ["Georgian", 0x10a0, 0x10ff],
  ["Hangul jamo", 0x1100, 0x11ff],
  ["Ethiopic", 0x1200, 0x137f],
  ["Cherokee", 0x13a0, 0x13ff],
  ["Canadian aboriginal", 0x1400, 0x167f],
  ["Ogham", 0x1680, 0x169f],
  ["Runic", 0x16a0, 0x16ff],
  ["Khmer", 0x1780, 0x17ff],
  ["Mongolian", 0x1800, 0x18af],
  ["CJK radicals", 0x2e80, 0x2eff],
  ["Kangxi radicals", 0x2f00, 0x2fdf],
  ["CJK punctuation", 0x3000, 0x303f],
  ["Hiragana", 0x3040, 0x309f],
  ["Katakana", 0x30a0, 0x30ff],
  ["Bopomofo", 0x3100, 0x312f],
  ["Hangul compatibility jamo", 0x3130, 0x318f],
  ["Kanbun", 0x3190, 0x319f],
  ["Bopomofo extended", 0x31a0, 0x31bf],
  ["CJK strokes", 0x31c0, 0x31ef],
  ["Katakana phonetic extensions", 0x31f0, 0x31ff],
  ["Enclosed CJK", 0x3200, 0x32ff],
  ["CJK compatibility", 0x3300, 0x33ff],
  ["CJK unified ideographs extension-a", 0x3400, 0x4dbf],
  ["CJK unified ideographs", 0x4e00, 0x9fff],
  ["Yi", 0xa000, 0xa48f],
  ["Hangul jamo extended-a", 0xa960, 0xa97f],
  ["Hangul syllables", 0xac00, 0xd7af],
  ["Hangul jamo extended-b", 0xd7b0, 0xd7ff],
  ["CJK compatibility ideographs", 0xf900, 0xfaff],
  ["CJK compatibility forms", 0xfe30, 0xfe4f],
  ["Fullwidth forms", 0xff00, 0xffef],
  ["Kana supplement", 0x1b000, 0x1b16f],
  ["Enclosed ideographic supplement", 0x1f200, 0x1f2ff],
  ["CJK extension-b", 0x20000, 0x2a6df],
  ["CJK extension-c", 0x2a700, 0x2b73f],
  ["CJK extension-d", 0x2b740, 0x2b81f],
  ["CJK extension-e", 0x2b820, 0x2ceaf],
  ["CJK extension-f", 0x2ceb0, 0x2ebef],
  ["CJK compatibility supplement", 0x2f800, 0x2fa1f],
]);

/**
 * Mojibake signatures:
 *  - Arabic UTF-8 decoded as Latin-1 leaves runs of Latin-1 letters
 *    (a capital O with stroke, a pound sign after it, and so on);
 *  - Windows-1256 decodes Arabic into a run of accented Latin-1 letters;
 *  - smart quotes decoded as Latin-1 show the a-circumflex/euro prefix;
 *  - a failed decode leaves U+FFFD.
 */
const MOJIBAKE_SOURCE = [
  "\\u00c3[\\u0080-\\u00bf]",
  "\\u00c2[\\u0080-\\u00bf]",
  "\\u00e2\\u20ac[\\u0080-\\u00bf\\u2122]",
  "\\u00ef\\u00bb\\u00bf",
  "\\uFFFD",
  "\\u00d8[\\u0080-\\u00ff]",
  "\\u00d9[\\u0080-\\u00ff]",
  "[\\u00c3\\u00c2\\u00d8\\u00d9\\u00d0\\u00d1][\\u0080-\\u00ff]{2,}",
  "[\\u00c0-\\u00ff]{3,}",
].join("|");

export const MOJIBAKE_PATTERN = new RegExp(MOJIBAKE_SOURCE, "u");

export function findForbiddenCharacters(value) {
  const text = String(value ?? "");
  const hits = [];
  let index = 0;
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    const match = FORBIDDEN_SCRIPT_RANGES.find(
      ([, start, end]) => codePoint >= start && codePoint <= end,
    );
    if (match) {
      hits.push({
        index,
        char,
        codePoint,
        codePointLabel: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
        script: match[0],
      });
    }
    index += char.length;
  }
  return hits;
}

export function hasMojibake(value) {
  return MOJIBAKE_PATTERN.test(String(value ?? ""));
}

/**
 * Scans a whole string line-by-line and returns human-readable findings that
 * point at `file:line`.
 */
export function findTextProblems(text, file = "<text>") {
  const problems = [];
  String(text ?? "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const hit of findForbiddenCharacters(line)) {
        problems.push(
          `${file}:${index + 1} ${hit.script} character (${hit.codePointLabel})`,
        );
      }
      if (hasMojibake(line)) {
        problems.push(`${file}:${index + 1} mojibake sequence: ${line.trim().slice(0, 160)}`);
      }
    });
  return problems;
}
