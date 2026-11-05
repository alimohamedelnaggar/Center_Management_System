// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * Phase 1 of the optional staff-email feature. Every admin-facing form must
 * accept an omitted address, reject a malformed one with the shared message,
 * normalize what it sends, and warn before an existing address is cleared.
 */

const state = vi.hoisted(() => ({
  auth: {
    role: "CenterOwner",
    isSoloCenter: false,
    centerTypeLoaded: true,
    accessToken: "test-token",
    loading: false,
    refreshModules: async () => {},
  },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => state.auth }));

vi.mock("../../services/groupsService", () => ({
  groupsService: { getAllGroups: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock("../../services/teacherService", () => ({
  teacherService: { getPaginated: vi.fn().mockResolvedValue({ data: { items: [] } }) },
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import toast from "react-hot-toast";
import AddTeacherModal from "./AddTeacherModal";
import TeacherModal from "./TeacherModal";
import AssistantModal from "./AssistantModal";
import CenterEditModal from "./CenterEditModal";
import Profile from "../../pages/Profile";
import {
  STAFF_EMAIL_HELPER_TEXT,
  STAFF_EMAIL_INVALID_MESSAGE,
} from "../../utils/staffEmail";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const render = async (element) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(element);
  });
  await flush();

  return container;
};

const fieldByLabel = (scope, text) => {
  const label = Array.from(scope.querySelectorAll("label")).find((node) =>
    node.textContent.includes(text),
  );
  return label?.parentElement?.querySelector("input, select, textarea") ?? null;
};

const setValue = async (field, value) => {
  const proto =
    field instanceof window.HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;

  await act(async () => {
    setter.call(field, value);
    field.dispatchEvent(
      new Event(field instanceof window.HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
};

const submit = async (scope, text) => {
  const button = Array.from(scope.querySelectorAll("button")).find((node) =>
    node.textContent.includes(text),
  );
  expect(button).toBeTruthy();

  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

beforeEach(() => {
  vi.clearAllMocks();
  state.auth = {
    role: "CenterOwner",
    isSoloCenter: false,
    centerTypeLoaded: true,
    accessToken: "test-token",
    loading: false,
    refreshModules: async () => {},
  };
});

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.restoreAllMocks();
});

describe("AddTeacherModal (SuperAdmin onboarding)", () => {
  it("shows the optional email field with the shared helper text", async () => {
    const scope = await render(
      h(AddTeacherModal, { isOpen: true, onClose: () => {}, onSubmit: vi.fn() }),
    );

    const email = fieldByLabel(scope, "البريد الإلكتروني");
    expect(email).toBeTruthy();
    expect(email.type).toBe("email");
    expect(scope.textContent).toContain(STAFF_EMAIL_HELPER_TEXT);
  });

  it("blocks a malformed address and keeps the form open", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(AddTeacherModal, { isOpen: true, onClose: () => {}, onSubmit }),
    );

    await setValue(fieldByLabel(scope, "اسم المدرس"), "Owner One");
    await setValue(fieldByLabel(scope, "رقم الهاتف"), "01012345678");
    await setValue(fieldByLabel(scope, "اسم المركز"), "Center One");
    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "not-an-email");
    await submit(scope, "إنشاء الحساب");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(STAFF_EMAIL_INVALID_MESSAGE);
  });

  it("sends the trimmed, lower-cased address", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(AddTeacherModal, { isOpen: true, onClose: () => {}, onSubmit }),
    );

    await setValue(fieldByLabel(scope, "اسم المدرس"), "Owner One");
    await setValue(fieldByLabel(scope, "رقم الهاتف"), "01012345678");
    await setValue(fieldByLabel(scope, "اسم المركز"), "Center One");
    await setValue(
      fieldByLabel(scope, "البريد الإلكتروني"),
      "  Owner.One@Example.COM  ",
    );
    await submit(scope, "إنشاء الحساب");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].ownerEmail).toBe("owner.one@example.com");
  });

  it("allows an omitted address", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(AddTeacherModal, { isOpen: true, onClose: () => {}, onSubmit }),
    );

    await setValue(fieldByLabel(scope, "اسم المدرس"), "Owner One");
    await setValue(fieldByLabel(scope, "رقم الهاتف"), "01012345678");
    await setValue(fieldByLabel(scope, "اسم المركز"), "Center One");
    await submit(scope, "إنشاء الحساب");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].ownerEmail).toBe("");
  });
});

describe("TeacherModal", () => {
  const teacher = {
    id: "teacher-1",
    fullName: "Teacher One",
    phoneNumber: "01012345678",
    subject: "Math",
    email: "old.teacher@example.com",
    groups: [],
  };

  it("prefills the existing address and sends the new one normalized", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(TeacherModal, {
        isOpen: true,
        onClose: () => {},
        onSubmit,
        initialData: teacher,
      }),
    );

    const email = fieldByLabel(scope, "البريد الإلكتروني");
    expect(email.value).toBe("old.teacher@example.com");

    await setValue(email, " New.Teacher@Example.com ");
    await submit(scope, "حفظ");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].email).toBe("new.teacher@example.com");
  });

  it("warns before clearing an existing address and can cancel", async () => {
    const onSubmit = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const scope = await render(
      h(TeacherModal, {
        isOpen: true,
        onClose: () => {},
        onSubmit,
        initialData: teacher,
      }),
    );

    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "");
    await submit(scope, "حفظ");

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the address when the warning is accepted", async () => {
    const onSubmit = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const scope = await render(
      h(TeacherModal, {
        isOpen: true,
        onClose: () => {},
        onSubmit,
        initialData: teacher,
      }),
    );

    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "");
    await submit(scope, "حفظ");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].email).toBe("");
  });

  it("rejects a malformed address", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(TeacherModal, { isOpen: true, onClose: () => {}, onSubmit }),
    );

    await setValue(fieldByLabel(scope, "الاسم الكامل"), "Teacher Two");
    await setValue(fieldByLabel(scope, "رقم الهاتف"), "01012345678");
    await setValue(fieldByLabel(scope, "المادة الدراسية"), "Math");
    await setValue(fieldByLabel(scope, "كلمة المرور"), "Secret1");
    await setValue(fieldByLabel(scope, "تأكيد كلمة المرور"), "Secret1");
    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "bad@@mail");
    await submit(scope, "حفظ");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(STAFF_EMAIL_INVALID_MESSAGE);
  });
});

describe("AssistantModal", () => {
  it("shows the optional email field and sends a normalized address", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(AssistantModal, { isOpen: true, onClose: () => {}, onSubmit }),
    );

    expect(scope.textContent).toContain(STAFF_EMAIL_HELPER_TEXT);

    await setValue(fieldByLabel(scope, "الاسم الكامل"), "Assistant One");
    await setValue(fieldByLabel(scope, "رقم الهاتف"), "01012345678");
    await setValue(fieldByLabel(scope, "كلمة المرور"), "Secret1");
    await setValue(fieldByLabel(scope, "تأكيد كلمة المرور"), "Secret1");
    await setValue(
      fieldByLabel(scope, "البريد الإلكتروني"),
      " Assistant@Example.com ",
    );
    await submit(scope, "حفظ");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].email).toBe("assistant@example.com");
  });

  it("warns before clearing an existing address", async () => {
    const onSubmit = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const scope = await render(
      h(AssistantModal, {
        isOpen: true,
        onClose: () => {},
        onSubmit,
        initialData: {
          id: "assistant-1",
          fullName: "Assistant One",
          phoneNumber: "01012345678",
          email: "old.assistant@example.com",
          salary: 1000,
          isActive: true,
        },
      }),
    );

    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "");
    await submit(scope, "حفظ");

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("CenterEditModal", () => {
  const center = {
    id: "center-1",
    name: "Center One",
    phone: "01012345678",
    ownerEmail: "old.owner@example.com",
    type: "MultiTeacher",
    plan: "",
    subscriptionStart: null,
    subscriptionEnd: null,
  };

  it("prefills the owner email and sends a normalized replacement", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(CenterEditModal, {
        isOpen: true,
        center,
        onClose: () => {},
        onSubmit,
      }),
    );

    const email = fieldByLabel(scope, "البريد الإلكتروني");
    expect(email.value).toBe("old.owner@example.com");

    await setValue(email, " New.Owner@Example.com ");
    await submit(scope, "حفظ التغييرات");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].ownerEmail).toBe("new.owner@example.com");
  });

  it("warns before clearing the owner email", async () => {
    const onSubmit = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const scope = await render(
      h(CenterEditModal, {
        isOpen: true,
        center,
        onClose: () => {},
        onSubmit,
      }),
    );

    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "");
    await submit(scope, "حفظ التغييرات");

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed owner email", async () => {
    const onSubmit = vi.fn();
    const scope = await render(
      h(CenterEditModal, {
        isOpen: true,
        center,
        onClose: () => {},
        onSubmit,
      }),
    );

    await setValue(fieldByLabel(scope, "البريد الإلكتروني"), "bad email");
    await submit(scope, "حفظ التغييرات");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(STAFF_EMAIL_INVALID_MESSAGE);
  });
});

describe("Profile email visibility", () => {
  const profile = {
    fullName: "Account Holder",
    email: "account@example.com",
    phoneNumber: "01012345678",
    userName: "01012345678",
    address: null,
    createdAt: "2026-01-01T00:00:00Z",
    subject: "Math",
  };

  const mockProfileFetch = () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: profile }),
      }),
    );
  };

  it("hides the email for students and parents", async () => {
    for (const role of ["Student", "Parent"]) {
      state.auth = { ...state.auth, role };
      mockProfileFetch();

      const scope = await render(h(Profile));
      await flush();

      expect(scope.textContent).not.toContain(profile.email);
    }
  });

  it("shows the email for staff accounts", async () => {
    state.auth = { ...state.auth, role: "Teacher" };
    mockProfileFetch();

    const scope = await render(h(Profile));
    await flush();

    expect(scope.textContent).toContain(profile.email);
  });
});
