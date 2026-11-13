// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

/**
 * Public student card: the route code is resolved automatically, the search
 * only accepts a student code (or a card URL containing one), and the card is
 * branded with the student's centre - never the platform logo.
 */

const route = vi.hoisted(() => ({ params: {} }));
const toast = vi.hoisted(() => {
  const fn = vi.fn();
  fn.success = vi.fn();
  fn.error = vi.fn();
  return fn;
});
const qr = vi.hoisted(() => ({
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,QR"),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => route.params,
}));
vi.mock("react-hot-toast", () => ({ default: toast }));
vi.mock("qrcode", () => ({ default: qr }));
vi.mock("@/services/studentService", () => ({
  studentsService: { getStudentCard: vi.fn() },
}));

import { studentsService } from "@/services/studentService";
import StudentCardLookupPage from "./StudentCardLookupPage";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CARD = {
  centerName: "مركز النور",
  centerLogoUrl: "center-logo.png",
  fullName: "أحمد محمود عبد الرحمن",
  groupName: "الصف الثالث الثانوي - أ",
  school: "مدرسة النور الثانوية",
  subscriptionType: "اشتراك شهري",
  parentPhone: "01012345678",
  qrCode: "STU00000001",
  summary: {
    totalSessions: 32,
    presentSessions: 26,
    absentSessions: 3,
    lateSessions: 2,
    excusedSessions: 1,
    attendanceRate: 81.3,
  },
  attendances: [
    {
      sessionId: 8,
      groupName: "الصف الثالث الثانوي - أ",
      attendanceDate: "2026-11-09",
      dayName: "الأحد",
      startTime: "17:00",
      endTime: "19:00",
      status: "Present",
      statusLabel: "حاضر",
    },
  ],
  exams: [
    {
      examId: 301,
      examName: "امتحان الفيزياء الشهري",
      examDate: "2026-11-08",
      groupName: "الصف الثالث الثانوي - أ",
      isAbsent: false,
      isLowGrade: false,
      percentage: 73.3,
      components: [
        { typeLabel: "اختيار من متعدد", mark: 11, totalMark: 15, isAbsent: false },
      ],
    },
  ],
};

let container;
let root;

const flush = async (delay = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
  });
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<StudentCardLookupPage />);
  });
  await flush(100);
};

const unmount = async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
};

const byTestId = (id) => container.querySelector(`[data-testid="${id}"]`);

const type = async (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const submit = async () => {
  const form = container.querySelector('[data-testid="student-card-search"]');
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await flush(100);
};

beforeEach(() => {
  vi.clearAllMocks();
  route.params = {};
  studentsService.getStudentCard.mockReset();
  qr.toDataURL.mockResolvedValue("data:image/png;base64,QR");
});

afterEach(async () => {
  await unmount();
});

describe("student card integration", () => {
  it("loads the card from the route code with the centre branding and every field", async () => {
    route.params = { code: "STU00000001" };
    studentsService.getStudentCard.mockResolvedValue({
      succeeded: true,
      data: CARD,
    });

    await mount();

    expect(studentsService.getStudentCard).toHaveBeenCalledWith("STU00000001");

    const result = byTestId("student-card-result");
    expect(result).toBeTruthy();
    expect(result.textContent).toContain("أحمد محمود عبد الرحمن");
    expect(result.textContent).toContain("الصف الثالث الثانوي - أ");
    expect(result.textContent).toContain("مدرسة النور الثانوية");
    expect(result.textContent).toContain("اشتراك شهري");
    expect(result.textContent).toContain("01012345678");
    expect(result.textContent).toContain("STU00000001");

    // The header names the student's centre, and the logo comes from the
    // centre uploads - the platform logo is not used on the public card.
    const page = byTestId("student-card-page");
    expect(page.textContent).toContain("مركز النور");
    expect(page.querySelector('img[src="/logo.png"]')).toBeNull();
    const logo = page.querySelector('img[alt="شعار مركز النور"]');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute("src")).toContain("center-logo.png");

    expect(byTestId("student-card-stats").textContent).toContain("81.3%");
    expect(byTestId("student-card-attendance").textContent).toContain("حاضر");
    expect(byTestId("student-card-exams").textContent).toContain(
      "امتحان الفيزياء الشهري",
    );
    expect(byTestId("student-card-exams").textContent).toContain("73.3%");
  });

  it("falls back to a building icon when the centre has no logo", async () => {
    route.params = { code: "STU00000001" };
    studentsService.getStudentCard.mockResolvedValue({
      succeeded: true,
      data: { ...CARD, centerLogoUrl: null },
    });

    await mount();

    const page = byTestId("student-card-page");
    expect(page.textContent).toContain("مركز النور");
    expect(page.querySelector('img[alt="شعار مركز النور"]')).toBeNull();
    expect(page.querySelector("svg")).toBeTruthy();
  });

  it("shows the backend message for an unknown code", async () => {
    route.params = { code: "STU00000009" };
    studentsService.getStudentCard.mockResolvedValue({
      succeeded: false,
      message: "مفيش طالب بالكود ده.",
    });

    await mount();

    const error = byTestId("student-card-error");
    expect(error).toBeTruthy();
    expect(error.textContent).toContain("مفيش طالب بالكود ده.");
    expect(byTestId("student-card-result")).toBeNull();
  });

  it("shows a network failure without crashing", async () => {
    route.params = { code: "STU00000001" };
    studentsService.getStudentCard.mockRejectedValue({
      response: { data: { message: "الخادم مش متاح دلوقتي." } },
    });

    await mount();

    expect(byTestId("student-card-error").textContent).toContain(
      "الخادم مش متاح دلوقتي.",
    );
  });

  it("extracts the code from a scanned card URL and ignores the rest", async () => {
    route.params = {};
    studentsService.getStudentCard.mockResolvedValue({
      succeeded: true,
      data: CARD,
    });

    await mount();

    const input = container.querySelector("#student-card-code");
    await type(input, "https://center.example/student-card/STU00000002");
    await submit();

    expect(studentsService.getStudentCard).toHaveBeenCalledTimes(1);
    expect(studentsService.getStudentCard).toHaveBeenCalledWith("STU00000002");
    expect(byTestId("student-card-result")).toBeTruthy();
  });

  it("requires a code before searching", async () => {
    route.params = {};
    await mount();

    await submit();

    expect(toast.error).toHaveBeenCalledWith("اكتب كود الطالب");
    expect(studentsService.getStudentCard).not.toHaveBeenCalled();
    expect(byTestId("student-card-result")).toBeNull();
  });
});
