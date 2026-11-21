// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

import RouteLoadBoundary, {
  RouteLoading,
} from "@/components/common/RouteLoadBoundary";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const RELOAD_KEY = "routeChunkAutoReloadAttempted";

let container;
let root;
let restoreLocation;

function Boom() {
  throw new Error("chunk failed to load");
}

function stubReload() {
  const reload = vi.fn();
  const originalLocation = window.location;

  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, reload },
  });

  return () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  };
}

async function render(element) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
}

describe("RouteLoadBoundary", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    restoreLocation = stubReload();
  });

  afterEach(() => {
    restoreLocation();
    vi.restoreAllMocks();
    act(() => root.unmount());
    container.remove();
    container = null;
    root = null;
  });

  it("shows the shared loading screen", async () => {
    await render(h(RouteLoading));

    expect(container.querySelector('[data-testid="route-loading"]')).not.toBeNull();
    expect(container.textContent).toContain("جارٍ تجهيز الصفحة");
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("reloads once automatically on a stale chunk before showing an error", async () => {
    await render(h(RouteLoadBoundary, null, h(Boom)));

    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(RELOAD_KEY)).toBe("1");
    // The reload is in flight, so the error card is not shown yet.
    expect(container.querySelector('[data-testid="route-load-error"]')).toBeNull();
  });

  it("shows the error and only retries manually after the automatic retry", async () => {
    window.sessionStorage.setItem(RELOAD_KEY, "1");

    await render(h(RouteLoadBoundary, null, h(Boom)));

    expect(window.location.reload).not.toHaveBeenCalled();
    const errorCard = container.querySelector('[data-testid="route-load-error"]');
    expect(errorCard).not.toBeNull();
    expect(errorCard.textContent).toContain("لم نتمكّن من فتح الصفحة");

    await act(async () => {
      container
        .querySelector('[data-testid="route-retry"]')
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});
