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

/**
 * Catches chunk-load failures (offline, stale deploy, missing file) and shows
 * the same Arabic recovery screen for every route instead of a blank page.
 */
export default class RouteLoadBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(
      "[RouteLoadBoundary] failed to load a route chunk:",
      error,
      info?.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
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
