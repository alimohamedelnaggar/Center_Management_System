import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findForbiddenCharacters,
  findTextProblems,
  hasMojibake,
} from "./uiTextCharacters.js";

/**
 * F-020 was a Chinese fragment inside an Arabic sentence. This suite makes
 * that class of defect impossible to reintroduce silently: every product file
 * under `src/` is scanned for non-Arabic/non-Latin scripts and for mojibake.
 *
 * The backend check is best-effort: it runs when the API solution sits next to
 * the frontend (the normal repo layout) and is skipped in a standalone
 * frontend checkout.
 */

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FRONTEND_SRC = join(PROJECT_ROOT, "src");
const BACKEND_ROOT = resolve(
  PROJECT_ROOT,
  "..",
  "..",
  "API",
  "CenterManagementCleanArchitecture",
);

const FRONTEND_EXTENSIONS = new Set([".js", ".jsx", ".css", ".json"]);
const BACKEND_EXTENSIONS = new Set([".cs"]);
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", "coverage", "bin", "obj", ".git"]);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/i;

const ch = (codePoint) => String.fromCodePoint(codePoint);

function walk(directory, extensions, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) walk(full, extensions, files);
    } else if (extensions.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function scanFiles(files, root) {
  const problems = [];
  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/");
    problems.push(...findTextProblems(readFileSync(file, "utf8"), rel));
  }
  return problems;
}

describe("product text characters", () => {
  it("flags CJK, Hangul and Cyrillic samples", () => {
    const sample = [`a${ch(0x8ddf)}b`, ch(0xac00), ch(0x041f), ch(0x30a2)];

    expect(findForbiddenCharacters(sample[0]).map((hit) => hit.script)).toEqual([
      "CJK unified ideographs",
    ]);
    expect(findForbiddenCharacters(sample[1])[0].script).toBe("Hangul syllables");
    expect(findForbiddenCharacters(sample[2])[0].script).toBe("Cyrillic");
    expect(findForbiddenCharacters(sample[3])[0].script).toBe("Katakana");
  });

  it("flags mojibake but keeps Arabic, Latin, digits and emoji", () => {
    const arabicMojibake = `${ch(0x00d8)}${ch(0x00a3)}${ch(0x00d8)}${ch(0x00ad)}`;
    const windows1256Mojibake = `${ch(0x00c7)}${ch(0x00e1)}${ch(0x00d8)}${ch(0x00c7)}${ch(0x00e1)}${ch(0x00c8)}`;

    expect(hasMojibake(arabicMojibake)).toBe(true);
    expect(hasMojibake(windows1256Mojibake)).toBe(true);
    expect(hasMojibake(ch(0xfffd))).toBe(true);

    const safe = [
      `${ch(0x0645)}${ch(0x0631)}${ch(0x062d)}${ch(0x0628)}${ch(0x0627)}`,
      "café",
      "naïve",
      "0123456789 ٠١٢٣٤٥٦٧٨٩",
      ch(0x1f393),
      "— – • ← → ✓",
    ];
    for (const value of safe) {
      expect(hasMojibake(value), value).toBe(false);
      expect(findForbiddenCharacters(value), value).toEqual([]);
    }
  });

  it("has no foreign script or mojibake characters under src/", () => {
    const files = walk(FRONTEND_SRC, FRONTEND_EXTENSIONS).filter(
      (file) => !TEST_FILE.test(file),
    );

    expect(files.length).toBeGreaterThan(150);
    const problems = scanFiles(files, PROJECT_ROOT);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("has no foreign script or mojibake characters in backend product strings", () => {
    if (!existsSync(BACKEND_ROOT)) {
      // Standalone frontend checkout: nothing to scan.
      return;
    }

    const files = walk(BACKEND_ROOT, BACKEND_EXTENSIONS);
    expect(files.length).toBeGreaterThan(100);
    const problems = scanFiles(files, resolve(BACKEND_ROOT, "..", ".."));
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
