import { Component } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "@/components/icons";
import ScreenState from "@/components/ui/ScreenState";

/** Shared loading screen for every lazily loaded route chunk. */
export function RouteLoading() {
  return (
    <ScreenState
      testId="route-loading"
      tone="info"
      icon={Loader2}
      eyebrow="تحميل الصفحة"
      title="جارٍ تجهيز الصفحة"
      description="نُحمّل المحتوى المطلوب. يرجى الانتظار قليلاً."
      role="status"
    />
  );
}

const AUTO_RELOAD_KEY = "routeChunkAutoReloadAttempted";

/**
 * Catches chunk-load failures (offline, stale deploy, missing file) and shows
 * the same Arabic recovery screen for every route instead of a blank page.
 * After a deploy, an open tab can still hold an old HTML file and request a
 * hashed chunk that no longer exists. One automatic full reload is enough to
 * fetch the new HTML; sessionStorage prevents an endless reload loop when the
 * chunk is genuinely unavailable.
 */
export default class RouteLoadBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, autoReloading: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  shouldRetryAutomatically() {
    if (typeof window === "undefined") return false;
    try {
      const storage = window.sessionStorage;
      if (!storage || storage.getItem(AUTO_RELOAD_KEY) === "1") return false;
      storage.setItem(AUTO_RELOAD_KEY, "1");
      return true;
    } catch {
      return false;
    }
  }

  componentDidCatch(error, info) {
    console.error(
      "[RouteLoadBoundary] failed to load a route chunk:",
      error,
      info?.componentStack,
    );

    if (this.shouldRetryAutomatically()) {
      this.setState({ error: null, autoReloading: true });
      if (typeof window !== "undefined") window.location.reload();
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.autoReloading) return null;
    if (!this.state.error) return this.props.children;

    return (
      <ScreenState
        testId="route-load-error"
        tone="danger"
        icon={AlertTriangle}
        eyebrow="تعذّر التحميل"
        title="لم نتمكّن من فتح الصفحة"
        description="تعذّر تحميل ملفات الصفحة. تحقّق من الاتصال ثم أعد المحاولة."
        role="alert"
        actions={[
          {
            label: "إعادة المحاولة",
            icon: RefreshCw,
            onClick: this.handleRetry,
            testId: "route-retry",
          },
        ]}
      />
    );
  }
}
