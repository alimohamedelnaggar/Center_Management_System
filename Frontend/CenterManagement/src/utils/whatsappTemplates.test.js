import { describe, expect, it } from "vitest";
import {
  fillTemplate,
  buildMessageFromTemplate,
  buildTemplateWhatsAppLink,
  MESSAGE_TEMPLATE_KEYS,
} from "./whatsappTemplates";

/**
 * The frontend no longer owns any default message text: the backend list is the
 * single source of truth and every screen passes the saved bodies here. These
 * tests use explicit sample bodies for exactly that reason.
 */
const BODIES = {
  [MESSAGE_TEMPLATE_KEYS.absence]:
    "السلام عليكم، نحيطكم علماً بأن الطالب {student} تغيّب عن حصة {group} بتاريخ {date}.\nمع تحيات {center}.",
  [MESSAGE_TEMPLATE_KEYS.examResult]:
    "السلام عليكم، حصل الطالب {student} على {score} من {total} في {exam}.\nمع تحيات {center}.",
};

describe("whatsappTemplates", () => {
  it("fills placeholders", () => {
    expect(
      fillTemplate("Hello {student} from {center}", {
        student: "Ali",
        center: "ABC",
      }),
    ).toBe("Hello Ali from ABC");
  });

  it("keeps unknown placeholders visible", () => {
    expect(fillTemplate("Hi {x}", {})).toBe("Hi {x}");
  });

  it("builds a message from the supplied backend body", () => {
    const msg = buildMessageFromTemplate(
      MESSAGE_TEMPLATE_KEYS.absence,
      {
        student: "Ahmed",
        group: "Math",
        center: "Center",
        date: "01/10/2026",
      },
      BODIES,
    );

    expect(msg).toContain("Ahmed");
    expect(msg).toContain("Math");
  });

  it("has no hardcoded fallback when the backend body is missing", () => {
    expect(
      buildMessageFromTemplate(MESSAGE_TEMPLATE_KEYS.absence, {
        student: "Ahmed",
      }),
    ).toBe("");

    expect(
      buildTemplateWhatsAppLink(
        "01012345678",
        MESSAGE_TEMPLATE_KEYS.absence,
        { student: "Ahmed" },
        {},
      ),
    ).toBeNull();
  });

  it("returns null for an invalid phone", () => {
    expect(
      buildTemplateWhatsAppLink(
        "123",
        MESSAGE_TEMPLATE_KEYS.absence,
        {
          student: "Ahmed",
          group: "Math",
          center: "Center",
          date: "01/10/2026",
        },
        BODIES,
      ),
    ).toBeNull();
  });

  it("builds a valid wa.me link with a correctly encoded Arabic message", () => {
    const values = {
      student: "أحمد",
      group: "الرياضيات",
      center: "مركز النور",
      date: "01/10/2026",
    };

    const message = buildMessageFromTemplate(
      MESSAGE_TEMPLATE_KEYS.absence,
      values,
      BODIES,
    );
    const link = buildTemplateWhatsAppLink(
      "01012345678",
      MESSAGE_TEMPLATE_KEYS.absence,
      values,
      BODIES,
    );

    expect(link).toContain("https://wa.me/201012345678");
    expect(link).toContain("text=");
    expect(link).toContain(encodeURIComponent(message));
    expect(link).toContain("%0A");
    expect(link).not.toContain(" ");
  });

  it("adds the center signature line when the center name is present", () => {
    const msg = buildMessageFromTemplate(
      MESSAGE_TEMPLATE_KEYS.absence,
      {
        student: "Ahmed",
        group: "Math",
        center: "مركز النور",
        date: "01/10/2026",
      },
      BODIES,
    );

    expect(msg).toContain("مع تحيات مركز النور.");
    expect(msg).not.toContain("{center}");
  });

  it("omits the {center} line cleanly when the center name is empty", () => {
    const msg = buildMessageFromTemplate(
      MESSAGE_TEMPLATE_KEYS.absence,
      {
        student: "Ahmed",
        group: "Math",
        center: "",
        date: "01/10/2026",
      },
      BODIES,
    );

    expect(msg).not.toContain("{center}");
    expect(msg).not.toContain("مع تحيات");
    expect(msg).toContain("Ahmed");
    expect(msg.endsWith(".")).toBe(true);
  });

  it("omits the {center} line when no center value is supplied at all", () => {
    const msg = buildMessageFromTemplate(
      MESSAGE_TEMPLATE_KEYS.examResult,
      {
        student: "Ahmed",
        exam: "Quiz",
        score: 8,
        total: 10,
      },
      BODIES,
    );

    expect(msg).not.toContain("{center}");
    expect(msg).not.toContain("مع تحيات");
    expect(msg).toContain("8");
  });
});
