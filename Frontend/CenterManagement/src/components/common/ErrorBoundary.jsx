import { Component } from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";

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
      <div
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-muted p-6 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-status-warning-bg text-status-warning">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="text-xl font-bold text-text-main">حدث خطأ غير متوقع</h1>
        <p className="max-w-md text-sm text-text-muted">
          نعتذر عن هذا الخلل. يمكنك إعادة تحميل الصفحة للمتابعة، وإذا تكرر الخطأ
          تواصل مع الدعم.
        </p>

        <button
          type="button"
          onClick={this.handleReload}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-all active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة تحميل الصفحة
        </button>
      </div>
    );
  }
}
