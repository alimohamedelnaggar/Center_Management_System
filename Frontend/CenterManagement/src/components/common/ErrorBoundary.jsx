import { Component } from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";
import ScreenState from "@/components/ui/ScreenState";

/**
 * Top-level safety net. If anything in the tree throws during render, we show a
 * friendly Arabic fallback with a reload button instead of a blank white page.
 * The error (and component stack) is logged so it stays diagnosable.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the full details in the console — the UI stays friendly on purpose.
    console.error("[ErrorBoundary] uncaught render error:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <ScreenState
        tone="danger"
        icon={AlertTriangle}
        eyebrow="خطأ غير متوقع"
        title="حدث خطأ غير متوقع"
        description="نعتذر عن هذا الخلل. يمكنك إعادة تحميل الصفحة للمتابعة، وإذا تكرر الخطأ تواصل مع الدعم."
        actions={[
          {
            label: "إعادة تحميل الصفحة",
            icon: RefreshCw,
            onClick: this.handleReload,
            testId: "error-reload",
          },
        ]}
        testId="app-error"
      />
    );
  }
}
