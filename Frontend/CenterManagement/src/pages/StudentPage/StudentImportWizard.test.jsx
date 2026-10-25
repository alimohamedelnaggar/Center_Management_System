// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

/**
 * These mocks mirror the REAL backend contract (no hand-made "status" field):
 *
 *   StudentImportPreviewResult
 *     { sessionId, totalRows, validRows, duplicateInFile, duplicateInDb,
 *       errorRows, rows[], headers[] }
 *   StudentImportRow
 *     { rowNumber, fullName, phone, phoneParent, groupName, groupId,
 *       subscriptionType, customMonthlyPrice, school, notes, phoneNormalized,
 *       phoneParentNormalized, errors[], isValid, isDuplicateInFile,
 *       isDuplicateInDb, canUpdate, groupWillBeCreated }
 *   StudentImportCommitResult
 *     { created, updated, skipped, failed, errors[{rowNumber,fullName,reason}],
 *       createdStudents[], createdGroups[], studentAccounts, parentAccounts,
 *       alreadyCompleted }
 *
 * All wrapped in Response<T>: { statusCode, succeeded, message, code, errors,
 * errorsBag, data } with camelCase JSON.
 *
 * We mock axios (not the service) so the real studentsService mapping runs.
 */

const authState = vi.hoisted(() => ({
  auth: {
    isCenterAdmin: true,
    role: "CenterOwner",
    hasModule: () => true,
  },
}));

vi.mock("@/context/useAuth", () => ({ useAuth: () => authState.auth }));

vi.mock("../../api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../../utils/bulkCredentialsExport", () => ({
  exportBothFormats: vi.fn(() => ({ excel: true, pdf: false })),
}));

vi.mock("react-hot-toast", () => {
  const toast = vi.fn((msg) => msg);
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

import apiClient from "../../api/axios";
import StudentImportWizard from "./StudentImportWizard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------------------------------------------------ helpers */

const envelope = (data, { message = null, succeeded = true } = {}) => ({
  statusCode: succeeded ? 200 : 400,
  meta: null,
  succeeded,
  message,
  code: null,
  errors: null,
  errorsBag: null,
  data,
});

const importRow = (overrides = {}) => ({
  rowNumber: 2,
  fullName: "أحمد محمد",
  phone: "01012345678",
  phoneParent: "01112345678",
  groupName: "المجموعة أ",
  groupId: "group-1",
  subscriptionType: "",
  customMonthlyPrice: "",
  school: "",
  notes: "",
  phoneNormalized: "01012345678",
  phoneParentNormalized: "01112345678",
  errors: [],
  isValid: true,
  isDuplicateInFile: false,
  isDuplicateInDb: false,
  canUpdate: false,
  groupWillBeCreated: false,
  ...overrides,
});

const previewResult = (rows, overrides = {}) => ({
  sessionId: "session-1",
  totalRows: rows.length,
  validRows: rows.filter((r) => r.isValid).length,
  duplicateInFile: rows.filter((r) => r.isDuplicateInFile).length,
  duplicateInDb: rows.filter((r) => r.isDuplicateInDb).length,
  errorRows: rows.filter((r) => !r.isValid).length,
  rows,
  headers: ["الاسم الكامل", "رقم الهاتف", "رقم هاتف ولي الأمر", "اسم المجموعة"],
  ...overrides,
});

const commitResult = (overrides = {}) => ({
  created: 1,
  updated: 0,
  skipped: 0,
  failed: 0,
  errors: [],
  createdStudents: [],
  createdGroups: [],
  studentAccounts: [],
  parentAccounts: [],
  alreadyCompleted: false,
  ...overrides,
});

const badRequest = (message) =>
  Object.assign(new Error(message), {
    response: { status: 400, data: envelope(null, { message, succeeded: false }) },
  });

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

let container;
let root;

const renderWizard = async (props = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  const onClose = vi.fn();
  const onImported = vi.fn();

  await act(async () => {
    root.render(
      h(StudentImportWizard, {
        open: true,
        onClose,
        onImported,
        centerName: "Test Center",
        ...props,
      }),
    );
  });

  return { container, onClose, onImported };
};

const buttonByText = (scope, text, exact = false) =>
  Array.from(scope.querySelectorAll("button")).find((b) =>
    exact ? b.textContent.trim() === text : b.textContent.includes(text),
  );

const chooseFile = async (scope, name = "students.xlsx") => {
  const input = scope.querySelector('input[type="file"]');
  const file = new File(["x"], name, {
    type:
      name.endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/plain",
  });
  await act(async () => {
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush();
};

const mockPreview = (rows, overrides) => {
  apiClient.post.mockImplementation((url) => {
    if (url.includes("/Student/Import/Preview")) {
      return Promise.resolve({ data: envelope(previewResult(rows, overrides)) });
    }
    return Promise.reject(new Error(`unexpected POST ${url}`));
  });
};

const mockCommit = (resultOrError) => {
  const previewImpl = apiClient.post.getMockImplementation();
  apiClient.post.mockImplementation((url, body) => {
    if (url.includes("/Student/Import/Commit")) {
      if (typeof resultOrError === "function") return resultOrError(url, body);
      if (resultOrError instanceof Error) return Promise.reject(resultOrError);
      return Promise.resolve({ data: envelope(resultOrError) });
    }
    return previewImpl(url, body);
  });
};

/** Uploads a file and moves from step 1 to step 2. */
const goToPreview = async (scope) => {
  await chooseFile(scope);
  await act(async () => {
    buttonByText(scope, "متابعة").click();
  });
  await flush();
};

/** From step 2, presses "متابعة" to reach step 3. */
const goToOptions = async (scope) => {
  const next = buttonByText(scope, "متابعة");
  expect(next).toBeTruthy();
  await act(async () => {
    next.click();
  });
  await flush();
};

beforeEach(() => {
  authState.auth = {
    isCenterAdmin: true,
    role: "CenterOwner",
    hasModule: () => true,
  };
  apiClient.get.mockReset();
  apiClient.post.mockReset();
  apiClient.get.mockResolvedValue({
    data: new Blob(["x"]),
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  if (typeof window !== "undefined") {
    window.open = vi.fn(() => ({
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
    }));
  }
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

/* -------------------------------------------------------------------- tests */

describe("StudentImportWizard", () => {
  it("يظهر المعالج للـ CenterOwner", async () => {
    authState.auth = {
      isCenterAdmin: true,
      role: "CenterOwner",
      hasModule: () => false,
    };
    const { container } = await renderWizard();
    expect(container.textContent).toContain("معالج استيراد الطلاب من Excel");
    expect(container.textContent).toContain("الخطوة 1 من 4");
  });

  it("يظهر المعالج للمعلم والمساعد حسب الصلاحية", async () => {
    authState.auth = {
      isCenterAdmin: false,
      role: "Teacher",
      hasModule: () => false,
    };
    const { container } = await renderWizard();
    expect(container.textContent).toContain("معالج استيراد الطلاب من Excel");
  });

  it("الخطوة 1: رفض ملف غير xlsx قبل الإرسال", async () => {
    const toast = await import("react-hot-toast");
    const { container } = await renderWizard();
    await chooseFile(container, "notes.txt");
    expect(toast.default.error).toHaveBeenCalledWith(
      "يجب أن يكون الملف بصيغة .xlsx فقط",
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("الخطوة 1: رفض ملف أكبر من الحد", async () => {
    const toast = await import("react-hot-toast");
    const { container } = await renderWizard();
    const input = container.querySelector('input[type="file"]');
    const big = new File([new ArrayBuffer(11 * 1024 * 1024)], "big.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await act(async () => {
      Object.defineProperty(input, "files", {
        value: [big],
        configurable: true,
      });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    expect(toast.default.error).toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("الخطوة 1: تنزيل القالب", async () => {
    const { container } = await renderWizard();
    const templateButton = buttonByText(container, "تنزيل قالب Excel");
    expect(templateButton).toBeTruthy();
    await act(async () => {
      templateButton.click();
    });
    await flush();
    expect(apiClient.get).toHaveBeenCalledWith("/Student/Import/Template", {
      responseType: "blob",
    });
  });

  it("الخطوة 1: عرض رسالة الباك عند ملف تالف أو أكثر من 2000 صف", async () => {
    const toast = await import("react-hot-toast");
    apiClient.post.mockRejectedValue(
      badRequest("تعذر قراءة الملف. تأكد أنه ملف Excel xlsx صالح."),
    );
    const { container } = await renderWizard();
    await chooseFile(container);
    await act(async () => {
      buttonByText(container, "متابعة").click();
    });
    await flush();
    expect(toast.default.error).toHaveBeenCalledWith(
      "تعذر قراءة الملف. تأكد أنه ملف Excel xlsx صالح.",
    );
    expect(container.textContent).toContain("الخطوة 1 من 4");
  });

  it("الخطوة 2: صف Valid يُحتسب في الملخص ويفعّل متابعة", async () => {
    mockPreview([importRow()]);
    const { container } = await renderWizard();
    await goToPreview(container);

    expect(container.querySelector('[data-testid="summary-total"]').textContent).toBe("1");
    expect(container.querySelector('[data-testid="summary-valid"]').textContent).toBe("1");
    expect(container.querySelector('[data-testid="summary-duplicate"]').textContent).toBe("0");
    expect(container.querySelector('[data-testid="summary-error"]').textContent).toBe("0");
    // الحالة تُشتق من isValid وليس من حقل status غير موجود في الباك
    expect(container.textContent).toContain("صالح");
    expect(buttonByText(container, "متابعة").disabled).toBe(false);
  });

  it("الخطوة 2: صف Error لا يُحتسب كصالح ويعطّل متابعة", async () => {
    mockPreview([
      importRow({
        fullName: "",
        errors: ["الاسم الكامل مطلوب"],
        isValid: false,
      }),
    ]);
    const { container } = await renderWizard();
    await goToPreview(container);

    expect(container.querySelector('[data-testid="summary-total"]').textContent).toBe("1");
    expect(container.querySelector('[data-testid="summary-valid"]').textContent).toBe("0");
    expect(container.querySelector('[data-testid="summary-error"]').textContent).toBe("1");
    expect(container.textContent).toContain("الاسم الكامل مطلوب");
    expect(container.textContent).toContain("خطأ");
    expect(buttonByText(container, "متابعة").disabled).toBe(true);
  });

  it("الخطوة 2: فلتر الأخطاء فقط يُظهر الصفوف غير الصالحة", async () => {
    mockPreview([
      importRow({ rowNumber: 2 }),
      importRow({
        rowNumber: 3,
        fullName: "",
        errors: ["الاسم الكامل مطلوب"],
        isValid: false,
      }),
    ]);
    const { container } = await renderWizard();
    await goToPreview(container);

    const rowsBefore = container.querySelectorAll("tbody tr");
    expect(rowsBefore).toHaveLength(2);

    const filter = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
      (input) => input.closest("label")?.textContent.includes("عرض الأخطاء فقط"),
    );
    expect(filter).toBeTruthy();
    await act(async () => {
      filter.click();
    });
    await flush();

    const rowsAfter = container.querySelectorAll("tbody tr");
    expect(rowsAfter).toHaveLength(1);
    expect(rowsAfter[0].textContent).toContain("الاسم الكامل مطلوب");
  });

  it("الخطوة 2: صف مكرر مع CanUpdate يعرض علامة التحديث وخيار التحديث في الخطوة 3", async () => {
    mockPreview([
      importRow({
        isValid: false,
        isDuplicateInDb: true,
        canUpdate: true,
        errors: ["رقم الهاتف مكرر"],
      }),
    ]);
    const { container } = await renderWizard();
    await goToPreview(container);

    expect(container.textContent).toContain("مكرر");
    expect(container.textContent).toContain("يمكن التحديث");
    expect(
      container.querySelector('[data-testid="summary-duplicate"]').textContent,
    ).toBe("1");

    await goToOptions(container);
    expect(container.textContent).toContain("تحديث (الاسم وبيانات التواصل فقط)");
  });

  it("الخطوة 2: صف مكرر بلا CanUpdate لا يعرض خيار التحديث", async () => {
    mockPreview([
      importRow({
        isValid: false,
        isDuplicateInDb: true,
        canUpdate: false,
        errors: ["رقم الهاتف مكرر"],
      }),
    ]);
    const { container } = await renderWizard();
    await goToPreview(container);

    expect(container.textContent).not.toContain("يمكن التحديث");
    // لا يوجد صالح ولا قابل للتحديث ⇒ المتابعة معطّلة
    expect(buttonByText(container, "متابعة").disabled).toBe(true);
  });

  it("الخطوة 3: الخيارات الافتراضية وعلامة المجموعة وملخص", async () => {
    mockPreview([
      importRow({ groupWillBeCreated: true, groupId: null }),
    ]);
    const { container } = await renderWizard();
    await goToPreview(container);

    expect(container.textContent).toContain("ستُنشأ مجموعة");
    await goToOptions(container);

    expect(container.textContent).toContain("تخطي (افتراضي)");
    expect(container.textContent).toContain("إنشاء المجموعات الناقصة");
    expect(container.textContent).toContain("إنشاء حسابات الطلاب");
    expect(container.textContent).toContain(
      "الباسورد المبدئي = رقم الهاتف وسيُطلب تغييره عند أول دخول",
    );
    expect(container.textContent).toContain("ملخص ما سيحدث");

    const groupsCheckbox = Array.from(
      container.querySelectorAll('input[type="checkbox"]'),
    ).find((input) =>
      input.closest("label")?.textContent.includes("إنشاء المجموعات الناقصة"),
    );
    expect(groupsCheckbox).toBeTruthy();
    expect(groupsCheckbox.checked).toBe(false);

    // لا صفوف قابلة للتحديث ⇒ لا يظهر خيار التحديث
    expect(container.textContent).not.toContain("تحديث (الاسم وبيانات التواصل فقط)");
  });

  it("الخطوة 4: يعرض النتيجة الحقيقية ويصدّر الحسابات ويحدّث القائمة عند الإغلاق", async () => {
    mockPreview([importRow()]);
    mockCommit(
      commitResult({
        created: 1,
        failed: 1,
        errors: [
          { rowNumber: 5, fullName: "سارة", reason: "رقم الهاتف غير صالح" },
        ],
        studentAccounts: [
          {
            id: "student-1",
            fullName: "أحمد محمد",
            username: "01012345678",
            temporaryPassword: "01012345678",
            reason: null,
          },
        ],
        parentAccounts: [
          {
            studentId: "student-1",
            studentName: "أحمد محمد",
            parentPhone: "01112345678",
            status: "Created",
            temporaryPassword: "01112345678",
            passwordChanged: false,
            reason: null,
          },
        ],
      }),
    );

    const { container, onImported, onClose } = await renderWizard();
    await goToPreview(container);
    await goToOptions(container);

    await act(async () => {
      buttonByText(container, "تأكيد الاستيراد").click();
    });
    await flush();

    // أرسل أسماء الحقول التي يتوقعها CommitStudentImportCommand
    const commitCall = apiClient.post.mock.calls.find(([url]) =>
      url.includes("/Student/Import/Commit"),
    );
    expect(commitCall[1]).toEqual({
      sessionId: "session-1",
      duplicateMode: "skip",
      createMissingGroups: false,
      createStudentAccounts: true,
      createParentAccounts: true,
    });

    expect(container.textContent).toContain("مضاف");
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("محدّث");
    expect(container.textContent).toContain("متخطّى");
    expect(container.textContent).toContain("فاشل");

    const errorButton = buttonByText(container, "تنزيل تقرير الأخطاء");
    expect(errorButton).toBeTruthy();
    await act(async () => {
      errorButton.click();
    });
    await flush();
    expect(apiClient.get).toHaveBeenCalledWith(
      "/Student/Import/Errors/session-1",
      { responseType: "blob" },
    );

    const exportButton = buttonByText(container, "تصدير بيانات الدخول");
    expect(exportButton).toBeTruthy();
    await act(async () => {
      exportButton.click();
    });
    await flush();

    expect(onImported).not.toHaveBeenCalled();
    await act(async () => {
      buttonByText(container, "إغلاق", true).click();
    });
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("منع الضغط المزدوج على التأكيد", async () => {
    mockPreview([importRow()]);
    let resolveCommit;
    mockCommit(
      () =>
        new Promise((resolve) => {
          resolveCommit = resolve;
        }),
    );

    const { container } = await renderWizard();
    await goToPreview(container);
    await goToOptions(container);

    const confirmButton = buttonByText(container, "تأكيد الاستيراد");
    await act(async () => {
      confirmButton.click();
    });
    await flush();

    expect(confirmButton.disabled).toBe(true);
    const commitCalls = apiClient.post.mock.calls.filter(([url]) =>
      url.includes("/Student/Import/Commit"),
    );
    expect(commitCalls).toHaveLength(1);

    await act(async () => {
      resolveCommit({
        data: envelope(commitResult({ created: 1 })),
      });
    });
    await flush();
  });

  it("انتهاء الجلسة يعيد للخطوة 1 برسالة عربية", async () => {
    const toast = await import("react-hot-toast");
    mockPreview([importRow()]);
    mockCommit(badRequest("انتهت صلاحية جلسة الاستيراد أو غير موجودة"));

    const { container } = await renderWizard();
    await goToPreview(container);
    await goToOptions(container);

    await act(async () => {
      buttonByText(container, "تأكيد الاستيراد").click();
    });
    await flush();

    expect(toast.default.error).toHaveBeenCalledWith("انتهت صلاحية المعاينة");
    expect(container.textContent).toContain("الخطوة 1 من 4");
  });

  it("فشل الشبكة أثناء Commit لا يُعيد الإرسال تلقائيًا", async () => {
    const toast = await import("react-hot-toast");
    mockPreview([importRow()]);
    mockCommit(new Error("Network Error"));

    const { container } = await renderWizard();
    await goToPreview(container);
    await goToOptions(container);

    await act(async () => {
      buttonByText(container, "تأكيد الاستيراد").click();
    });
    await flush();

    const commitCalls = apiClient.post.mock.calls.filter(([url]) =>
      url.includes("/Student/Import/Commit"),
    );
    expect(commitCalls).toHaveLength(1);
    expect(toast.default.error).toHaveBeenCalled();
  });

  it("يطلب تأكيدًا قبل الإغلاق أثناء المعاينة وينظّف الحالة دون استخدام localStorage", async () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    const getSpy = vi.spyOn(Storage.prototype, "getItem");
    mockPreview([importRow()]);

    const { container, onClose } = await renderWizard();
    await goToPreview(container);

    await act(async () => {
      container.querySelector('button[aria-label="إغلاق"]').click();
    });
    await flush();

    expect(onClose).not.toHaveBeenCalled();
    const confirmClose = buttonByText(document.body, "إغلاق", true);
    expect(confirmClose).toBeTruthy();
    await act(async () => {
      confirmClose.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(setSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
    getSpy.mockRestore();
  });
});
