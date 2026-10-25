import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "@/components/icons";
import toast from "react-hot-toast";
import { studentsService } from "../../services/studentService";
import { exportBothFormats } from "../../utils/bulkCredentialsExport";
import { useAuth } from "../../context/useAuth";
import ConfirmModal from "../../components/common/ConfirmModal";
import Spinner from "../../components/common/Spinner";

class WizardErrorBoundary extends Component {
  constructor(props){ super(props); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(){ }
  render(){
    if(this.state.hasError){
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl" lang="ar">
          <div className="rounded-xl bg-surface-card p-6 text-center shadow-xl">
            <p className="mb-4 text-text-main">حدث خطأ أثناء فتح معالج الاستيراد</p>
            <button onClick={()=>this.props.onClose && this.props.onClose()} className="rounded-lg bg-primary px-4 py-2 text-sm text-text-inverse">إغلاق</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const STEPS = [
  { id: 1, title: "رفع الملف" },
  { id: 2, title: "المعاينة" },
  { id: 3, title: "الخيارات" },
  { id: 4, title: "النتيجة" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB as reasonable default, backend enforces

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getErrorMessage(err) {
  if (!err) return "حدث خطأ غير متوقع";
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message && typeof data.message === "string") return data.message;
  if (data?.error && typeof data.error === "string") return data.error;
  if (err.message) return err.message;
  return "حدث خطأ غير متوقع";
}

function StudentImportWizardInner({
  open,
  onClose,
  onImported,
  centerName = "",
}) {
  const { isCenterAdmin, hasModule } = useAuth();
  const canCreateGroups = isCenterAdmin;
  const canCreateParentAccounts = isCenterAdmin && hasModule("parent_portal");

  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 100;

  const [options, setOptions] = useState({
    duplicateHandling: "skip", // skip | update
    createMissingGroups: false,
    createStudentAccounts: true,
    createParentAccounts: canCreateParentAccounts,
  });

  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [storedResult, setStoredResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep(1);
      setFile(null);
      setDragActive(false);
      setUploading(false);
      setPreview(null);
      setSessionId(null);
      setFilterErrorsOnly(false);
      setPreviewPage(1);
      setOptions({
        duplicateHandling: "skip",
        createMissingGroups: false,
        createStudentAccounts: true,
        createParentAccounts: canCreateParentAccounts,
      });
      setCommitting(false);
      setCommitResult(null);
      setShowExitConfirm(false);
      setStoredResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      // ensure defaults reflect permissions
      setOptions((prev) => ({
        ...prev,
        createParentAccounts: canCreateParentAccounts,
        createMissingGroups: prev.createMissingGroups && canCreateGroups,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetToUpload = useCallback(() => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setSessionId(null);
    setFilterErrorsOnly(false);
    setPreviewPage(1);
    setCommitResult(null);
    setStoredResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const res = await studentsService.downloadImportTemplate();
      const blob = new Blob([res.data], {
        type:
          res.headers?.["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "قالب_استيراد_الطلاب.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  const validateFile = useCallback((f) => {
    if (!f) return "يرجى اختيار ملف";
    const name = f.name || "";
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx") {
      return "يجب أن يكون الملف بصيغة .xlsx فقط";
    }
    if (f.size > MAX_FILE_SIZE) {
      return `حجم الملف كبير جدًا. الحد الأقصى ${formatBytes(MAX_FILE_SIZE)}`;
    }
    return null;
  }, []);

  const onFileSelected = useCallback(
    (f) => {
      const err = validateFile(f);
      if (err) {
        toast.error(err);
        return;
      }
      setFile(f);
    },
    [validateFile],
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileSelected(e.dataTransfer.files[0]);
      }
    },
    [onFileSelected],
  );

  const handleUploadAndPreview = useCallback(async () => {
    if (!file) {
      toast.error("يرجى اختيار ملف أولاً");
      return;
    }
    setUploading(true);
    try {
      const res = await studentsService.importPreview(file);
      // Handle various response shapes
      if (res?.succeeded === false) {
        const msg = res?.message || getErrorMessage({ response: { data: res } });
        toast.error(msg);
        return;
      }
      const data = res?.data || res;
      setPreview(data);
      setSessionId(data?.sessionId || null);
      setFilterErrorsOnly(false);
      setPreviewPage(1);
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }, [file]);

  const rows = useMemo(() => {
    const data = preview?.data ?? preview ?? {};
    return Array.isArray(data.rows) ? data.rows : [];
  }, [preview]);

  const summary = useMemo(() => {
    const data = preview?.data ?? preview ?? {};
    return {
      total: data.total ?? rows.length,
      valid: data.valid ?? 0,
      duplicate: data.duplicate ?? 0,
      error: data.error ?? 0,
      hasGroupWillBeCreated:
        data.hasGroupWillBeCreated === true ||
        rows.some((row) => row.groupWillBeCreated === true),
      canCreateGroupsOverall: canCreateGroups,
    };
  }, [preview, rows, canCreateGroups]);

  const filteredRows = useMemo(() => {
    if (!filterErrorsOnly) return rows;
    // "الأخطاء فقط" = كل صف غير صالح (خطأ أو مكرر)
    return rows.filter((r) => r.status !== "valid");
  }, [rows, filterErrorsOnly]);

  const pagedRows = useMemo(() => {
    const start = (previewPage - 1) * previewPageSize;
    return filteredRows.slice(start, start + previewPageSize);
  }, [filteredRows, previewPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / previewPageSize));

  const canProceedFromPreview = useMemo(() => {
    if (!preview) return false;
    // لا يمكن المتابعة دون صف صالح أو صف مكرر قابل للتحديث
    if ((summary.valid || 0) > 0) return true;
    return rows.some((row) => row.canUpdate === true);
  }, [preview, summary.valid, rows]);

  const goToOptions = useCallback(() => {
    if (!canProceedFromPreview) {
      toast.error("لا يوجد أي صف صالح أو قابل للتحديث للمتابعة");
      return;
    }
    // adjust group creation option
    setOptions((prev) => ({
      ...prev,
      createMissingGroups: summary.hasGroupWillBeCreated && summary.canCreateGroupsOverall ? prev.createMissingGroups : false,
    }));
    setStep(3);
  }, [canProceedFromPreview, summary.hasGroupWillBeCreated, summary.canCreateGroupsOverall]);

  const openResultsWindow = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.open("", "_blank", "width=1000,height=900");
    } catch {
      return null;
    }
  }, []);

  const handleCommit = useCallback(async () => {
    if (!sessionId) {
      toast.error("جلسة المعاينة غير موجودة، يرجى رفع الملف مرة أخرى");
      setStep(1);
      return;
    }
    if (committing) return;
    setCommitting(true);
    try {
      const payload = {
        sessionId,
        duplicateMode: options.duplicateHandling === "update" ? "update" : "skip",
        createMissingGroups: options.createMissingGroups,
        createStudentAccounts: options.createStudentAccounts,
        createParentAccounts: options.createParentAccounts,
      };
      const res = await studentsService.importCommit(payload);
      if (res?.succeeded === false) {
        const msg = res?.message || getErrorMessage({ response: { data: res } });
        // check for expired session
        if (
          msg.includes("انتهت") ||
          msg.toLowerCase().includes("expired") ||
          msg.includes("غير موجودة")
        ) {
          toast.error("انتهت صلاحية المعاينة");
          resetToUpload();
          return;
        }
        toast.error(msg);
        return;
      }
      const data = res?.data || res;
      setCommitResult(data);
      setStoredResult(data);
      setStep(4);
    } catch (err) {
      const msg = getErrorMessage(err);
      if (
        msg.includes("انتهت") ||
        msg.toLowerCase().includes("expired") ||
        msg.includes("غير موجودة")
      ) {
        toast.error("انتهت صلاحية المعاينة");
        resetToUpload();
        return;
      }
      toast.error(msg);
    } finally {
      setCommitting(false);
    }
  }, [sessionId, options, committing, resetToUpload]);

  const handleDownloadErrors = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await studentsService.downloadImportErrorsReport(sessionId);
      const blob = new Blob([res.data], {
        type:
          res.headers?.["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "تقرير_أخطاء_استيراد_الطلاب.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [sessionId]);

  const handleExportCreatedAccounts = useCallback(async () => {
    const result = commitResult || storedResult;
    const accounts = Array.isArray(result?.createdAccounts)
      ? result.createdAccounts
      : [];
    if (!accounts.length) {
      toast("لا توجد حسابات منشأة للتصدير");
      return;
    }
    const printWindow = openResultsWindow();
    const { excel, pdf } = exportBothFormats({
      rows: accounts,
      phoneKey: "phone",
      usernameKey: "username",
      title: "تصدير بيانات دخول الطلاب",
      phoneLabel: "رقم الهاتف",
      centerName,
      fileName: "بيانات_دخول_الطلاب_المستوردين",
      win: printWindow,
    });
    if (excel || pdf) toast.success("تم تصدير بيانات الدخول");
    else toast.error("فشل تصدير بيانات الدخول");
  }, [commitResult, storedResult, centerName, openResultsWindow]);

  const handleClose = useCallback(() => {
    if (step === 3 && committing) return;
    if (step === 2 || step === 3) {
      setShowExitConfirm(true);
      return;
    }
    onClose();
  }, [step, committing, onClose]);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  const handleFinish = useCallback(() => {
    if (onImported) {
      try {
        onImported(commitResult || storedResult);
      } catch {
        /* ignore */
      }
    }
    onClose();
  }, [onImported, onClose, commitResult, storedResult]);

  const updatableCount = rows.filter((row) => row.canUpdate === true).length;
  const result = commitResult || storedResult || {};
  const createdCount = result.created ?? 0;
  const updatedCount = result.updated ?? 0;
  const skippedCount = result.skipped ?? 0;
  const failedCount = result.failed ?? 0;
  const createdAccounts = Array.isArray(result.createdAccounts)
    ? result.createdAccounts
    : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl" lang="ar">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-surface-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-main">معالج استيراد الطلاب من Excel</h2>
            <p className="text-sm text-text-muted">
              الخطوة {step} من 4: {STEPS[step - 1]?.title}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 border-b border-surface-border px-6 py-3">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= s.id
                    ? "bg-primary text-text-inverse"
                    : "bg-surface-muted text-text-muted"
                }`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={`text-sm ${
                  step >= s.id ? "text-text-main" : "text-text-muted"
                }`}
              >
                {s.title}
              </span>
              {idx < STEPS.length - 1 && (
                <div className="mx-2 h-px flex-1 bg-surface-border" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-surface-muted"
                >
                  <Download className="h-4 w-4" />
                  تنزيل قالب Excel
                </button>
                <p className="text-sm text-text-muted">
                  صيغة الملف المطلوبة: .xlsx فقط | الحد الأقصى للحجم: {formatBytes(MAX_FILE_SIZE)}
                </p>
              </div>

              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-surface-border bg-surface-bg"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mb-3 h-10 w-10 text-text-muted" />
                <p className="text-base font-medium text-text-main">
                  اسحب وأفلت الملف هنا
                </p>
                <p className="mt-1 text-sm text-text-muted">أو</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" />
                  اختيار ملف
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFileSelected(f);
                  }}
                />
              </div>

              {file && (
                <div className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-card p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-text-main">{file.name}</p>
                      <p className="text-sm text-text-muted">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-red-500"
                    aria-label="إزالة الملف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleUploadAndPreview}
                  disabled={!file || uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري الرفع والمعالجة...
                    </>
                  ) : (
                    <>
                      متابعة
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-surface-border bg-surface-card p-4 text-center">
                  <p data-testid="summary-total" className="text-2xl font-bold text-text-main">{summary.total}</p>
                  <p className="text-sm text-text-muted">إجمالي الصفوف</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/20">
                  <p data-testid="summary-valid" className="text-2xl font-bold text-green-600">{summary.valid}</p>
                  <p className="text-sm text-green-700 dark:text-green-400">صالح</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20">
                  <p data-testid="summary-duplicate" className="text-2xl font-bold text-amber-600">{summary.duplicate}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">مكرر</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20">
                  <p data-testid="summary-error" className="text-2xl font-bold text-red-600">{summary.error}</p>
                  <p className="text-sm text-red-700 dark:text-red-400">خطأ</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-text-main">
                    <input
                      type="checkbox"
                      checked={filterErrorsOnly}
                      onChange={(e) => {
                        setFilterErrorsOnly(e.target.checked);
                        setPreviewPage(1);
                      }}
                      className="rounded border-surface-border"
                    />
                    عرض الأخطاء فقط
                  </label>
                  {summary.hasGroupWillBeCreated && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      ستُنشأ مجموعة
                    </span>
                  )}
                </div>
                <button
                  onClick={resetToUpload}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <RefreshCw className="h-4 w-4" />
                  رجوع ورفع ملف آخر
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-surface-border">
                <table className="w-full text-right text-sm">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">#</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">الاسم</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">رقم الهاتف</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">رقم هاتف ولي الأمر</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">المجموعة</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">الحالة</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">رسالة الخطأ</th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-text-muted">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, idx) => {
                      const status = row.status || "";
                      const isError = status === "error";
                      const isDuplicate = status === "duplicate";
                      const isValid = status === "valid";
                      const canUpdate = row.canUpdate === true;
                      const groupWillBeCreated = row.groupWillBeCreated === true;
                      const errorMsg = row.errorMessage || "";

                      return (
                        <tr
                          key={idx}
                          className={`border-t border-surface-border ${
                            isError
                              ? "bg-red-50/50 dark:bg-red-900/10"
                              : isDuplicate
                              ? "bg-amber-50/50 dark:bg-amber-900/10"
                              : isValid
                              ? "bg-green-50/50 dark:bg-green-900/10"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 text-text-muted">{(previewPage - 1) * previewPageSize + idx + 1}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-text-main">{row.fullName || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-text-muted">{row.phone || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-text-muted">{row.phoneParent || "-"}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-text-main">
                            {row.groupName || "-"}
                            {groupWillBeCreated && (
                              <span className="mr-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                ستُنشأ مجموعة
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                isError
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : isDuplicate
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : isValid
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-surface-muted text-text-muted"
                              }`}
                            >
                              {isError ? "خطأ" : isDuplicate ? "مكرر" : isValid ? "صالح" : status || "-"}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-4 py-2.5 text-xs text-red-600 dark:text-red-400" title={errorMsg}>
                            {errorMsg || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-text-main">
                            {canUpdate ? <span className="text-xs text-primary">يمكن التحديث</span> : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > previewPageSize && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-muted">
                    عرض {(previewPage - 1) * previewPageSize + 1} -{" "}
                    {Math.min(previewPage * previewPageSize, filteredRows.length)} من {filteredRows.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <span className="text-sm text-text-muted">
                      {previewPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      disabled={previewPage === totalPages}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-text-main hover:bg-surface-muted"
                >
                  <ArrowRight className="h-4 w-4" />
                  رجوع
                </button>
                <button
                  onClick={goToOptions}
                  disabled={!canProceedFromPreview}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  متابعة
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-surface-border bg-surface-card p-4">
                <h3 className="mb-3 font-medium text-text-main">خيارات الاستيراد</h3>
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-text-main">التعامل مع الطلاب المكررين</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="flex items-center gap-2 rounded-lg border border-surface-border p-3 text-sm text-text-main">
                        <input
                          type="radio"
                          name="duplicate"
                          checked={options.duplicateHandling === "skip"}
                          onChange={() => setOptions((prev) => ({ ...prev, duplicateHandling: "skip" }))}
                        />
                        تخطي (افتراضي)
                      </label>
                      {rows.some((row) => row.canUpdate === true) && (
                        <label className="flex items-center gap-2 rounded-lg border border-surface-border p-3 text-sm text-text-main">
                          <input
                            type="radio"
                            name="duplicate"
                            checked={options.duplicateHandling === "update"}
                            onChange={() => setOptions((prev) => ({ ...prev, duplicateHandling: "update" }))}
                          />
                          تحديث (الاسم وبيانات التواصل فقط)
                        </label>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      عند التحديث يتم تحديث الاسم وبيانات التواصل فقط كما هو موضح.
                    </p>
                  </div>

                  {summary.hasGroupWillBeCreated && summary.canCreateGroupsOverall && (
                    <label className="flex items-start gap-3 rounded-lg border border-surface-border p-3">
                      <input
                        type="checkbox"
                        checked={options.createMissingGroups}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, createMissingGroups: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-surface-border"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-main">إنشاء المجموعات الناقصة</p>
                        <p className="text-xs text-text-muted">(افتراضي معطّل)</p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-start gap-3 rounded-lg border border-surface-border p-3">
                    <input
                      type="checkbox"
                      checked={options.createStudentAccounts}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, createStudentAccounts: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-surface-border"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-main">إنشاء حسابات الطلاب</p>
                    </div>
                  </label>

                  {canCreateParentAccounts && (
                    <label className="flex items-start gap-3 rounded-lg border border-surface-border p-3">
                      <input
                        type="checkbox"
                        checked={options.createParentAccounts}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, createParentAccounts: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-surface-border"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-main">إنشاء حسابات أولياء الأمور</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  الباسورد المبدئي = رقم الهاتف وسيُطلب تغييره عند أول دخول
                </p>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-card p-4">
                <h3 className="mb-3 font-medium text-text-main">ملخص ما سيحدث</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-main">{summary.valid}</p>
                    <p className="text-xs text-text-muted">طالب جديد (تقريبي)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-main">{updatableCount}</p>
                    <p className="text-xs text-text-muted">قابل للتحديث</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-main">
                      {options.createStudentAccounts ? summary.valid + updatableCount : 0}
                    </p>
                    <p className="text-xs text-text-muted">حساب طالب</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-main">
                      {options.createParentAccounts ? summary.valid + updatableCount : 0}
                    </p>
                    <p className="text-xs text-text-muted">حساب ولي أمر</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-text-main hover:bg-surface-muted"
                >
                  <ArrowRight className="h-4 w-4" />
                  رجوع
                </button>
                <button
                  onClick={handleCommit}
                  disabled={committing}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {committing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري التنفيذ...
                    </>
                  ) : (
                    "تأكيد الاستيراد"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-2xl font-bold text-green-600">{createdCount}</p>
                  <p className="text-sm text-green-700 dark:text-green-400">مضاف</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-2xl font-bold text-blue-600">{updatedCount}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">محدّث</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-2xl font-bold text-amber-600">{skippedCount}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">متخطّى</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                  <p className="text-sm text-red-700 dark:text-red-400">فاشل</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {failedCount > 0 && (
                  <button
                    onClick={handleDownloadErrors}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-surface-muted"
                  >
                    <Download className="h-4 w-4" />
                    تنزيل تقرير الأخطاء (Excel)
                  </button>
                )}
                {createdAccounts.length > 0 && (
                  <button
                    onClick={handleExportCreatedAccounts}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-main shadow-sm transition-colors hover:bg-surface-muted"
                  >
                    <Download className="h-4 w-4" />
                    تصدير بيانات الدخول (Excel/PDF)
                  </button>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleFinish}
                  className="rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={confirmExit}
        title="إغلاق المعالج"
        message="سيتم إغلاق المعالج ومسح البيانات، هل أنت متأكد؟"
        confirmText="إغلاق"
        cancelText="إلغاء"
      />
    </div>
  );
}

export default function StudentImportWizard(props){
  return (
    <WizardErrorBoundary onClose={props.onClose}>
      <StudentImportWizardInner {...props} />
    </WizardErrorBoundary>
  );
}
