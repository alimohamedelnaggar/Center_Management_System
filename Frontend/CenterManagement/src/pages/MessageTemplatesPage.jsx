import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  WhatsappLogo,
} from "@/components/icons";
import Spinner from "../components/common/Spinner";
import { useAuth } from "../context/useAuth";
import { useMessageTemplates } from "../hooks/useMessageTemplates";
import { messageTemplateService } from "../services/messageTemplateService";
import { MESSAGE_TEMPLATE_LABELS } from "../utils/whatsappTemplates";

const PREVIEW_DEBOUNCE_MS = 250;
const FALLBACK_ERROR = "تعذر إتمام العملية، حاول مرة أخرى";

const apiErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

/**
 * Owner editor for the three fixed WhatsApp quick-message templates.
 *
 * These are manual wa.me links only: nothing is sent automatically and these
 * are not Meta message templates. The backend stores the body and is the single
 * source of truth; every WhatsApp screen reads the saved body from it.
 */
export default function MessageTemplatesPage() {
  const { role, isSoloTeacher } = useAuth();
  const canEdit = role === "CenterOwner" || isSoloTeacher === true;

  const { templates, loading, error: loadError, setTemplates, reload } =
    useMessageTemplates({ enabled: canEdit });

  const [selectedKey, setSelectedKey] = useState("absence");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const textareaRef = useRef(null);

  const selected = useMemo(
    () => templates.find((template) => template.key === selectedKey) ?? null,
    [templates, selectedKey],
  );

  const draft = drafts[selectedKey] ?? "";

  // Seed one draft per fixed template, without overwriting unsaved edits.
  useEffect(() => {
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const template of templates) {
        if (!(template.key in next)) {
          next[template.key] = template.body;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [templates]);

  // Real-time preview from the backend (it owns the sample values and renders
  // the same way the message is finally produced).
  useEffect(() => {
    if (!selected || draft.trim() === "") {
      setPreview("");
      setPreviewError(null);
      setPreviewLoading(false);
      return undefined;
    }

    let active = true;
    setPreviewLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await messageTemplateService.preview(selectedKey, draft);

        if (!active) return;

        if (response?.succeeded === false) {
          setPreview("");
          setPreviewError(response?.message || "تعذر معاينة القالب");
          return;
        }

        setPreview(response?.data?.text || "");
        setPreviewError(null);
      } catch (err) {
        if (!active) return;
        setPreview("");
        setPreviewError(apiErrorMessage(err, "تعذر معاينة القالب"));
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft, selected, selectedKey]);

  const setDraft = (value) => {
    setActionError(null);
    setDrafts((prev) => ({ ...prev, [selectedKey]: value }));
  };

  const insertPlaceholder = (key) => {
    const token = `{${key}}`;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? start;
    const next = `${draft.slice(0, start)}${token}${draft.slice(end)}`;

    setDraft(next);

    const restoreSelection = () => {
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(restoreSelection);
    } else {
      setTimeout(restoreSelection, 0);
    }
  };

  const selectTemplate = (key) => {
    setSelectedKey(key);
    setActionError(null);
    setPreviewError(null);
  };

  const applySavedTemplate = (updated) => {
    if (!updated?.key) return;

    setTemplates((prev) =>
      prev.map((template) =>
        template.key === updated.key ? updated : template,
      ),
    );
    setDrafts((prev) => ({ ...prev, [updated.key]: updated.body }));
  };

  const handleSave = async () => {
    if (!selected || !canEdit) return;

    setSaving(true);
    setActionError(null);

    try {
      const response = await messageTemplateService.update(selectedKey, draft);

      if (response?.succeeded === false || !response?.data) {
        setActionError(response?.message || "تعذر حفظ قالب الرسالة");
        return;
      }

      applySavedTemplate(response.data);
      toast.success(response.message || "تم حفظ قالب الرسالة بنجاح");
    } catch (err) {
      setActionError(apiErrorMessage(err, "تعذر حفظ قالب الرسالة"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selected || !canEdit) return;

    setResetting(true);
    setActionError(null);

    try {
      const response = await messageTemplateService.reset(selectedKey);

      if (response?.succeeded === false || !response?.data) {
        setActionError(response?.message || "تعذر استعادة القالب الافتراضي");
        return;
      }

      applySavedTemplate(response.data);
      toast.success(response.message || "تمت استعادة القالب الافتراضي");
    } catch (err) {
      setActionError(apiErrorMessage(err, "تعذر استعادة القالب الافتراضي"));
    } finally {
      setResetting(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-card border border-surface-border bg-surface-card p-8 text-center shadow-sm">
          <AlertTriangle
            className="mx-auto mb-3 h-10 w-10 text-status-warning"
            aria-hidden="true"
          />
          <h2 className="mb-2 text-xl font-bold text-text-main">
            لا تملك صلاحية تعديل القوالب
          </h2>
          <p className="text-sm text-text-muted">
            تعديل قوالب الرسائل واستعادتها متاح لمالك المركز فقط.
          </p>
        </div>
      </div>
    );
  }

  if (loading && templates.length === 0) {
    return (
      <div className="p-10">
        <Spinner msg="جارٍ تحميل قوالب الرسائل..." />
      </div>
    );
  }

  if (loadError && templates.length === 0) {
    return (
      <div className="p-6">
        <div
          role="alert"
          className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-card border border-status-danger/30 bg-status-danger-bg p-8 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-status-danger" aria-hidden="true" />
          <p className="font-bold text-status-danger">{loadError}</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex min-h-11 items-center rounded-action bg-primary px-5 text-sm font-bold text-primary-contrast transition hover:bg-primary-hover"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const maxLength = selected?.maxLength ?? 500;
  const overLimit = draft.length > maxLength;
  const placeholders = selected?.placeholders ?? [];

  return (
    <div
      data-testid="message-templates-page"
      dir="rtl"
      className="mx-auto min-h-screen w-full max-w-7xl space-y-6 bg-surface-bg p-4 text-text-main md:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2 font-bold text-text-main">
            <WhatsappLogo className="h-6 w-6 text-primary" aria-hidden="true" />
            قوالب الرسائل
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            عدّل نص رسائل واتساب التي تُفتح يدوياً من صفحات الغياب والامتحانات
            والمتأخرات. لا يتم إرسال أي رسالة تلقائياً؛ يفتح الرابط واتساب بنص
            جاهز ويبقى الإرسال بيدك.
          </p>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="أنواع القوالب"
      >
        {templates.map((template) => {
          const active = template.key === selectedKey;

          return (
            <button
              key={template.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTemplate(template.key)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-action border px-4 text-sm font-bold transition ${
                active
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-surface-border bg-surface-card text-text-main hover:bg-surface-muted"
              }`}
            >
              {MESSAGE_TEMPLATE_LABELS[template.key] || template.key}
              {template.isCustomized && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-primary-contrast/20 text-primary-contrast"
                      : "bg-status-warning-bg text-status-warning"
                  }`}
                >
                  مخصص
                </span>
              )}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-control border border-status-danger/30 bg-status-danger-bg p-3 text-sm font-semibold text-status-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {actionError}
        </div>
      )}

      {selected && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-card border border-surface-border bg-surface-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-text-main">نص الرسالة</h2>
              <span className="text-xs font-bold text-text-muted">
                {selected.isCustomized ? "قالب مخصص" : "القالب الافتراضي"}
              </span>
            </div>

            <div>
              <label
                htmlFor="message-template-body"
                className="mb-1 block text-sm font-medium text-text-main"
              >
                {MESSAGE_TEMPLATE_LABELS[selected.key] || selected.key}
              </label>
              <textarea
                id="message-template-body"
                ref={textareaRef}
                rows={9}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-11 w-full resize-y rounded-control border border-surface-border bg-surface-muted p-3 text-sm leading-7 text-text-main focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  يستخدم المتغيرات بين الأقواس، مثل {"{student}"}.
                </span>
                <span
                  aria-live="polite"
                  className={
                    overLimit
                      ? "font-bold text-status-danger"
                      : "font-bold text-text-muted"
                  }
                >
                  {draft.length} / {maxLength} حرف
                </span>
              </div>
              {overLimit && (
                <p role="alert" className="mt-1 text-xs font-bold text-status-danger">
                  نص الرسالة يجب ألا يزيد عن {maxLength} حرف
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-text-main">
                إدراج متغير
              </p>
              <div className="flex flex-wrap gap-2">
                {placeholders.map((placeholder) => (
                  <button
                    key={placeholder.key}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder.key)}
                    title={placeholder.label}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-surface-border bg-surface-muted px-3 text-xs font-bold text-text-main transition hover:border-primary hover:text-primary"
                  >
                    <code dir="ltr">{`{${placeholder.key}}`}</code>
                    <span className="font-normal text-text-muted">
                      {placeholder.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-surface-border pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || resetting || draft.trim() === ""}
                className="inline-flex min-h-11 items-center gap-2 rounded-action bg-primary px-5 text-sm font-bold text-primary-contrast transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {saving ? "جارٍ الحفظ..." : "حفظ القالب"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={saving || resetting}
                className="inline-flex min-h-11 items-center gap-2 rounded-action border border-surface-border px-5 text-sm font-bold text-text-main transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                )}
                {resetting ? "جارٍ الاستعادة..." : "استعادة الافتراضي"}
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-card border border-surface-border bg-surface-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-text-main">معاينة حيّة</h2>
              {previewLoading && (
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جارٍ التحديث...
                </span>
              )}
            </div>

            {previewError ? (
              <div
                role="alert"
                className="rounded-control border border-status-danger/30 bg-status-danger-bg p-4 text-sm font-semibold text-status-danger"
              >
                {previewError}
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-border bg-surface-muted p-4" dir="rtl">
                <div className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-status-success/20 bg-status-success-bg p-3 text-sm leading-7 text-text-main shadow-sm">
                  {preview || "اكتب النص أو أدرج متغيراً لعرض المعاينة."}
                </div>
              </div>
            )}

            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <CheckCircle2 className="h-4 w-4 text-status-success" aria-hidden="true" />
              المعاينة تستخدم قيماً تجريبية من الخادم وتُحدَّث أثناء الكتابة.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
