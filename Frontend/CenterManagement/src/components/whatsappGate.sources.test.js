import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Source guard for the four WhatsApp action sites. Behaviour of the gate itself
 * (children disappear when the module is off) is covered by
 * moduleOnly.render.test.js; this file proves each of the four concrete buttons
 * is actually wrapped in <ModuleOnly moduleKey="whatsapp"> and that no copy of
 * that action survives outside the gate. The UI has no other WhatsApp entry
 * point (there is no server-side sender — every link is a client wa.me deep link).
 */

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..");

const SITES = [
  {
    name: "AttendanceSheet",
    file: resolve(src, "pages/AttendancePages/AttendanceSheet.jsx"),
    markers: ["إشعار الغائبين", "إرسال إشعار غياب عبر واتساب"],
  },
  {
    name: "OverduePage",
    file: resolve(src, "pages/OverduePage.jsx"),
    markers: ["تذكير واتساب", "تذكير عبر واتساب لولي الأمر"],
  },
  {
    name: "StudentQrCardsPage",
    file: resolve(src, "pages/StudentPages/StudentQrCardsPage.jsx"),
    markers: ["مشاركة واتساب"],
  },
  {
    name: "ExamManagementTab",
    file: resolve(src, "pages/EaxmPages/ExamManagementTab.jsx"),
    markers: ["إرسال النتيجة", "فتح واتساب لإرسال النتيجة"],
  },
];

const GATED = /<ModuleOnly\s+moduleKey="whatsapp"\s*>([\s\S]*?)<\/ModuleOnly>/g;

function gatedAndRemainder(source) {
  let gated = "";
  const remainder = source.replace(GATED, (_, inner) => {
    gated += inner + "\n";
    return "";
  });
  return { gated, remainder };
}

describe("the four whatsapp action buttons are wrapped in ModuleOnly(whatsapp)", () => {
  for (const site of SITES) {
    it(`${site.name}: imports and uses the whatsapp gate`, () => {
      const source = readFileSync(site.file, "utf8");
      expect(source).toMatch(/import\s+ModuleOnly\s+from/);
      const { gated } = gatedAndRemainder(source);
      expect(gated.length).toBeGreaterThan(0);
    });

    it(`${site.name}: every whatsapp action lives inside the gate`, () => {
      const source = readFileSync(site.file, "utf8");
      const { gated, remainder } = gatedAndRemainder(source);

      for (const marker of site.markers) {
        expect(gated, `"${marker}" must be inside a ModuleOnly(whatsapp) block`).toContain(marker);
        expect(
          remainder,
          `"${marker}" leaked outside the whatsapp gate`,
        ).not.toContain(marker);
      }
    });
  }
});
