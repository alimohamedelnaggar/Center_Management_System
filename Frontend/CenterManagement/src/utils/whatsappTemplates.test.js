import { describe, expect, it } from "vitest";
import {
  fillTemplate,
  buildMessageFromTemplate,
  buildTemplateWhatsAppLink,
  MESSAGE_TEMPLATE_KEYS,
} from "./whatsappTemplates";

describe("whatsappTemplates", () => {
  it("fills placeholders", () => {
    expect(
      fillTemplate("Hello {student} from {center}", {
        student: "Ali",
        center: "ABC",
      })
    ).toBe("Hello Ali from ABC");
  });

  it("leaves unknown placeholders as-is if desired? but we replace known; unknown remain", () => {
    expect(fillTemplate("Hi {x}", {})).toBe("Hi {x}");
  });

  it("builds message from template key", () => {
    const msg = buildMessageFromTemplate(MESSAGE_TEMPLATE_KEYS.absence, {
      student: "Ahmed",
      group: "Math",
      center: "Center",
      date: "01/10/2026",
    });
    expect(msg).toContain("Ahmed");
    expect(msg).toContain("Math");
  });

  it("buildTemplateWhatsAppLink returns null for invalid phone", () => {
    expect(
      buildTemplateWhatsAppLink("123", MESSAGE_TEMPLATE_KEYS.absence, {
        student: "Ahmed",
        group: "Math",
        center: "Center",
        date: "01/10/2026",
      })
    ).toBeNull();
  });

  it("buildTemplateWhatsAppLink builds valid wa.me", () => {
    const link = buildTemplateWhatsAppLink(
      "01012345678",
      MESSAGE_TEMPLATE_KEYS.absence,
      {
        student: "Ahmed",
        group: "Math",
        center: "Center",
        date: "01/10/2026",
      }
    );
    expect(link).toContain("https://wa.me/201012345678");
    expect(link).toContain("text=");
  });

  it("adds the center signature line when the center name is present", () => {
    const msg = buildMessageFromTemplate(MESSAGE_TEMPLATE_KEYS.absence, {
      student: "Ahmed",
      group: "Math",
      center: "مركز النور",
      date: "01/10/2026",
    });
    expect(msg).toContain("مع تحيات مركز النور.");
    expect(msg).not.toContain("{center}");
  });

  it("omits the {center} line cleanly when the center name is empty", () => {
    const msg = buildMessageFromTemplate(MESSAGE_TEMPLATE_KEYS.absence, {
      student: "Ahmed",
      group: "Math",
      center: "",
      date: "01/10/2026",
    });
    expect(msg).not.toContain("{center}");
    expect(msg).not.toContain("مع تحيات");
    expect(msg).toContain("Ahmed");
    expect(msg.endsWith(".")).toBe(true);
  });

  it("omits the {center} line when no center value is supplied at all", () => {
    const msg = buildMessageFromTemplate(MESSAGE_TEMPLATE_KEYS.examResult, {
      student: "Ahmed",
      exam: "Quiz",
      score: 8,
      total: 10,
    });
    expect(msg).not.toContain("{center}");
    expect(msg).not.toContain("مع تحيات");
    expect(msg).toContain("8");
  });
});
