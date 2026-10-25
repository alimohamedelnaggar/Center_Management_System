// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

const zxingMock = vi.hoisted(() => ({
  listVideoInputDevices: vi.fn(async () => []),
  decodeFromVideoDevice: vi.fn(),
}));

// The real reader opens the camera through getUserMedia, the mock does the
// same so a stray camera start stays observable.
zxingMock.decodeFromVideoDevice.mockImplementation(async () => {
  if (navigator.mediaDevices?.getUserMedia) {
    await navigator.mediaDevices.getUserMedia({ video: true });
  }

  return { stop: vi.fn() };
});

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class BrowserMultiFormatReaderMock {
    static listVideoInputDevices = zxingMock.listVideoInputDevices;

    decodeFromVideoDevice(...args) {
      return zxingMock.decodeFromVideoDevice(...args);
    }
  },
}));

import QrScannerModal from "./QrScannerModal";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let getUserMedia;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const renderModal = async (props = {}) => {
  await act(async () => {
    root.render(
      h(QrScannerModal, {
        isOpen: true,
        onClose: () => {},
        onDetect: vi.fn(),
        ...props,
      }),
    );
  });

  await flush();
};

const findButton = (text) =>
  [...container.querySelectorAll("button")].find((button) =>
    button.textContent.includes(text),
  );

const clickButton = (text) => {
  act(() => {
    findButton(text).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
};

const setInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;

  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const pressKey = (input, key) => {
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
};

const openScannerTab = () => {
  clickButton("سكانر");

  return container.querySelector("#scanner-code-input");
};

beforeEach(() => {
  getUserMedia = vi.fn(async () => ({ getTracks: () => [], stop: () => {} }));

  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
    writable: true,
  });

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });

  container.remove();
  container = null;
  root = null;

  zxingMock.listVideoInputDevices.mockClear();
  zxingMock.decodeFromVideoDevice.mockClear();
});

describe("QrScannerModal tabs", () => {
  it("renders the three tabs in order", async () => {
    await renderModal();

    const tabs = [...container.querySelectorAll("button")].filter((button) =>
      ["كاميرا", "إدخال الكود", "سكانر"].includes(button.textContent.trim()),
    );

    expect(tabs.map((tab) => tab.textContent.trim())).toEqual([
      "كاميرا",
      "إدخال الكود",
      "سكانر",
    ]);
  });

  it("keeps the camera as the default tab", async () => {
    await renderModal();

    expect(container.querySelector("video")).toBeTruthy();
    expect(zxingMock.decodeFromVideoDevice).toHaveBeenCalledTimes(1);
  });

  it("keeps the manual code tab untouched", async () => {
    const onDetect = vi.fn();

    await renderModal({ onDetect });

    clickButton("إدخال الكود");

    expect(container.querySelector("video")).toBeNull();

    const manualInput = container.querySelector(
      'input[placeholder="STU00000001"]:not(#scanner-code-input)',
    );

    expect(manualInput).toBeTruthy();
    expect(findButton("تسجيل الحضور")).toBeTruthy();

    await act(async () => {
      setInputValue(manualInput, "stu00000001");
    });

    act(() => {
      container
        .querySelector("form")
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(onDetect).toHaveBeenCalledTimes(1);
    expect(onDetect).toHaveBeenCalledWith("STU00000001");
  });

  it("shows the camera permission error outside of the scanning frame", async () => {
    zxingMock.decodeFromVideoDevice.mockRejectedValueOnce(
      Object.assign(new Error("denied"), { name: "NotAllowedError" }),
    );

    await renderModal();

    const frame = container.querySelector("video").parentElement;
    const message = [...container.querySelectorAll("span")].find((element) =>
      element.textContent.includes("إذن الكاميرا مرفوض"),
    );

    expect(message).toBeTruthy();
    expect(frame.contains(message)).toBe(false);
  });
});

describe("QrScannerModal scanner tab", () => {
  it("submits a fast typed code on enter and clears the field", async () => {
    const onDetect = vi.fn(async () => ({
      ok: true,
      status: "present",
      name: "أحمد محمد",
      code: "STU00000001",
      message: "تم تسجيل حضور أحمد.",
    }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, "STU00000001");
      pressKey(input, "Enter");
    });

    expect(onDetect).toHaveBeenCalledTimes(1);
    expect(onDetect).toHaveBeenCalledWith("STU00000001");
    expect(input.value).toBe("");
  });

  it("submits on tab when the wedge ends the burst with a tab", async () => {
    const onDetect = vi.fn(async () => ({ ok: true, status: "present" }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, "STU00000001");
      pressKey(input, "Tab");
    });

    expect(onDetect).toHaveBeenCalledTimes(1);
    expect(onDetect).toHaveBeenCalledWith("STU00000001");
  });

  it("normalizes an arabic typed code and a card link before sending them", async () => {
    const onDetect = vi.fn(async () => ({ ok: true, status: "present" }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, `سغه${"٠".repeat(7)}١`);
      pressKey(input, "Enter");
    });

    expect(onDetect).toHaveBeenLastCalledWith("STU00000001");

    await act(async () => {
      setInputValue(input, "https://center.example.com/student-card/STU00000002");
      pressKey(input, "Enter");
    });

    expect(onDetect).toHaveBeenLastCalledWith("STU00000002");
    expect(onDetect).toHaveBeenCalledTimes(2);
  });

  it("ignores the same code twice inside two seconds", async () => {
    const onDetect = vi.fn(async () => ({ ok: true, status: "present" }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, "STU00000001");
      pressKey(input, "Enter");
    });

    await act(async () => {
      setInputValue(input, "STU00000001");
      pressKey(input, "Enter");
    });

    expect(onDetect).toHaveBeenCalledTimes(1);
  });

  it("focuses the field when the tab opens and restores it after a blur", async () => {
    await renderModal();

    const input = openScannerTab();

    expect(document.activeElement).toBe(input);
    expect(container.textContent).toContain("الماسح جاهز");

    act(() => {
      input.blur();
    });

    expect(document.activeElement).not.toBe(input);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(document.activeElement).toBe(input);
  });

  it("restores the focus after a scan", async () => {
    const onDetect = vi.fn(async () => ({ ok: true, status: "present" }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, "STU00000001");
      pressKey(input, "Enter");
    });

    expect(document.activeElement).toBe(input);
  });

  it("never opens the camera in the scanner tab", async () => {
    await renderModal();

    expect(getUserMedia).toHaveBeenCalledTimes(1);

    clickButton("سكانر");

    await flush();

    expect(zxingMock.decodeFromVideoDevice).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("shows a result card and the recent operations after a scan", async () => {
    const onDetect = vi.fn(async () => ({
      ok: true,
      status: "present",
      name: "أحمد محمد",
      code: "STU00000001",
      message: "تم تسجيل حضور أحمد.",
    }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, "STU00000001");
      pressKey(input, "Enter");
    });

    expect(container.textContent).toContain("أحمد محمد");
    expect(container.textContent).toContain("حاضر");
    expect(container.textContent).toContain("تم تسجيل حضور أحمد.");
    expect(container.textContent).toContain("آخر العمليات");
  });

  it("shows a clear error for an unknown code", async () => {
    const onDetect = vi.fn(async () => ({
      ok: false,
      status: "error",
      name: "",
      code: "STU00000009",
      message: "مفيش طالب بالكود ده.",
    }));

    await renderModal({ onDetect });

    const input = openScannerTab();

    await act(async () => {
      setInputValue(input, "STU00000009");
      pressKey(input, "Enter");
    });

    expect(container.textContent).toContain("مفيش طالب بالكود ده.");
    expect(container.textContent).toContain("غير مسجل");
  });

  it("blocks the scan until a group and a session are selected", async () => {
    await renderModal({
      scanDisabled: true,
      scanDisabledReason: "اختر الحصة قبل المسح.",
    });

    const input = openScannerTab();

    expect(container.textContent).toContain("اختر الحصة قبل المسح.");
    expect(input.disabled).toBe(true);
  });
});
