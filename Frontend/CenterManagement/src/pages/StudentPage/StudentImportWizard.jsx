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
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import StatusPill from "../../components/ui/StatusPill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../../components/ui/Table";

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

const STATUS_META = {
  valid: { label: "صالح", tone: "success" },
  duplicate: { label: "مكرر", tone: "warning" },
  error: { label: "خطأ", tone: "danger" },
};

const statusMetaFor = (status) =>
  STATUS_META[status] ?? {
    label: status || "-",
    tone: "neutral",
  };

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
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 backdrop-blur-xs sm:items-center sm:p-4"
      dir="rtl"
      lang="ar"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-wizard-title"
        data-testid="import-wizard"
        className="relative flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-card border border-surface-border bg-surface-card text-text-main shadow-2xl sm:max-h-[92dvh] sm:rounded-card"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-surface-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2
              id="import-wizard-title"
              className="truncate text-base font-bold sm:text-lg"
            >
              معالج استيراد الطلاب من Excel
            </h2>
            <p className="text-xs text-text-muted sm:text-sm">
              الخطوة {step} من 4: {STEPS[step - 1]?.title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="إغلاق"
            className="-me-1 shrink-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Steps */}
        <div className="grid shrink-0 grid-cols-4 gap-1 border-b border-surface-border px-3 py-2 sm:flex sm:items-center sm:gap-2 sm:px-6 sm:py-3">
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              className="flex flex-col items-center gap-1 sm:flex-1 sm:flex-row sm:gap-2"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm ${
                  step >= s.id
                    ? "bg-primary text-primary-contrast"
                    : "bg-surface-muted text-text-muted"
                }`}
              >
                {step > s.id ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  s.id
                )}
              </div>
              <span
                className={`text-center text-[10px] leading-tight sm:text-sm ${
                  step >= s.id ? "text-text-main" : "text-text-muted"
                }`}
              >
                {s.title}
              </span>
              {idx < STEPS.length - 1 && (
                <div className="mx-2 hidden h-px flex-1 bg-surface-border sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4" data-testid="import-step-1">
              <div className="flex flex-col gap-3 rounded-card border border-surface-border bg-surface-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-main">
                    ابدأ بقالب جاهز
                  </p>
                  <p className="break-words text-sm text-text-muted">
                    صيغة الملف المطلوبة: .xlsx فقط | الحد الأقصى للحجم:{" "}
                    {formatBytes(MAX_FILE_SIZE)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  تنزيل قالب Excel
                </Button>
              </div>

              <div
                className={`relative flex flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${
                  dragActive
                    ? "border-primary bg-primary-subtle/40"
                    : "border-surface-border bg-surface-bg"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload
                  className="mb-3 h-10 w-10 text-text-muted"
                  aria-hidden="true"
                />
                <p className="text-base font-semibold text-text-main">
                  اسحب وأفلت الملف هنا
                </p>
                <p className="mt-1 text-sm text-text-muted">أو</p>
                <Button
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  اختيار ملف
                </Button>
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
                <div className="flex flex-col gap-3 rounded-card border border-surface-border bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText
                      className="h-8 w-8 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="break-all font-semibold text-text-main">
                        {file.name}
                      </p>
                      <p className="text-sm text-text-muted">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="إزالة الملف"
                    className="self-end sm:self-auto"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  onClick={handleUploadAndPreview}
                  disabled={!file}
                  loading={uploading}
                  className="w-full sm:w-auto"
                >
                  {uploading ? (
                    "جاري الرفع والمعالجة..."
                  ) : (
                    <>
                      متابعة
                      <ArrowRight
                        className="h-4 w-4 rotate-180"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && preview && (
            <div className="space-y-4" data-testid="import-step-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <div className="rounded-card border border-surface-border bg-surface-card p-3 text-center shadow-soft sm:p-4">
                  <p
                    data-testid="summary-total"
                    className="num text-2xl font-bold text-text-main"
                  >
                    {summary.total}
                  </p>
                  <p className="text-xs font-semibold text-text-muted sm:text-sm">
                    إجمالي الصفوف
                  </p>
                </div>
                <div className="rounded-card border border-surface-border bg-status-success-bg p-3 text-center sm:p-4">
                  <p
                    data-testid="summary-valid"
                    className="num text-2xl font-bold text-status-success"
                  >
                    {summary.valid}
                  </p>
                  <p className="text-xs font-semibold text-status-success sm:text-sm">
                    صالح
                  </p>
                </div>
                <div className="rounded-card border border-surface-border bg-status-warning-bg p-3 text-center sm:p-4">
                  <p
                    data-testid="summary-duplicate"
                    className="num text-2xl font-bold text-status-warning"
                  >
                    {summary.duplicate}
                  </p>
                  <p className="text-xs font-semibold text-status-warning sm:text-sm">
                    مكرر
                  </p>
                </div>
                <div className="rounded-card border border-surface-border bg-status-danger-bg p-3 text-center sm:p-4">
                  <p
                    data-testid="summary-error"
                    className="num text-2xl font-bold text-status-danger"
                  >
                    {summary.error}
                  </p>
                  <p className="text-xs font-semibold text-status-danger sm:text-sm">
                    خطأ
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-surface-border bg-surface-card px-3 text-sm font-semibold text-text-main">
                    <input
                      type="checkbox"
                      checked={filterErrorsOnly}
                      onChange={(e) => {
                        setFilterErrorsOnly(e.target.checked);
                        setPreviewPage(1);
                      }}
                      className="h-4 w-4 rounded border-surface-border"
                    />
                    عرض الأخطاء فقط
                  </label>
                  {summary.hasGroupWillBeCreated && (
                    <StatusPill tone="info" dot={false}>
                      ستُنشأ مجموعة
                    </StatusPill>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToUpload}
                  className="justify-start sm:justify-center"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  رجوع ورفع ملف آخر
                </Button>
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell className="w-12">#</TableHeaderCell>
                      <TableHeaderCell>الاسم</TableHeaderCell>
                      <TableHeaderCell>رقم الهاتف</TableHeaderCell>
                      <TableHeaderCell>رقم هاتف ولي الأمر</TableHeaderCell>
                      <TableHeaderCell>المجموعة</TableHeaderCell>
                      <TableHeaderCell>الحالة</TableHeaderCell>
                      <TableHeaderCell>رسالة الخطأ</TableHeaderCell>
                      <TableHeaderCell>إجراء</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {pagedRows.map((row, idx) => {
                      const status = row.status || "";
                      const isError = status === "error";
                      const isDuplicate = status === "duplicate";
                      const isValid = status === "valid";
                      const canUpdate = row.canUpdate === true;
                      const groupWillBeCreated = row.groupWillBeCreated === true;
                      const errorMsg = row.errorMessage || "";
                      const meta = statusMetaFor(status);

                      return (
                        <TableRow
                          key={idx}
                          className={
                            isError
                              ? "bg-status-danger-bg/40"
                              : isDuplicate
                                ? "bg-status-warning-bg/40"
                                : isValid
                                  ? "bg-status-success-bg/40"
                                  : ""
                          }
                        >
                          <TableCell className="tabular-nums text-text-muted">
                            {(previewPage - 1) * previewPageSize + idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-text-main">
                            {row.fullName || "-"}
                          </TableCell>
                          <TableCell dir="ltr" className="text-right font-mono text-text-muted">
                            {row.phone || "-"}
                          </TableCell>
                          <TableCell dir="ltr" className="text-right font-mono text-text-muted">
                            {row.phoneParent || "-"}
                          </TableCell>
                          <TableCell className="text-text-main">
                            <span className="break-words">{row.groupName || "-"}</span>
                            {groupWillBeCreated && (
                              <StatusPill tone="info" dot={false} className="ms-2">
                                ستُنشأ مجموعة
                              </StatusPill>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                          </TableCell>
                          <TableCell
                            className="max-w-xs truncate text-xs text-status-danger"
                            title={errorMsg}
                          >
                            {errorMsg || "-"}
                          </TableCell>
                          <TableCell className="text-text-main">
                            {canUpdate ? (
                              <span className="text-xs font-semibold text-primary">
                                يمكن التحديث
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Phones turn each preview row into a labelled card. */}
              <div
                className="space-y-3 md:hidden"
                data-testid="import-preview-cards"
              >
                {pagedRows.map((row, idx) => {
                  const status = row.status || "";
                  const canUpdate = row.canUpdate === true;
                  const groupWillBeCreated = row.groupWillBeCreated === true;
                  const errorMsg = row.errorMessage || "";
                  const meta = statusMetaFor(status);

                  return (
                    <div
                      key={idx}
                      data-testid="import-preview-card"
                      className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2 border-b border-surface-border pb-2">
                        <p className="min-w-0 break-words text-sm font-bold text-text-main">
                          {row.fullName || "-"}
                        </p>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-xs tabular-nums text-text-muted">
                            #{(previewPage - 1) * previewPageSize + idx + 1}
                          </span>
                          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                        </div>
                      </div>

                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-text-muted">رقم الهاتف</dt>
                          <dd dir="ltr" className="break-all text-right font-mono text-text-main">
                            {row.phone || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">رقم هاتف ولي الأمر</dt>
                          <dd dir="ltr" className="break-all text-right font-mono text-text-main">
                            {row.phoneParent || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">المجموعة</dt>
                          <dd className="break-words text-text-main">
                            {row.groupName || "-"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">إجراء</dt>
                          <dd className="text-text-main">
                            {canUpdate ? (
                              <span className="text-xs font-semibold text-primary">
                                يمكن التحديث
                              </span>
                            ) : (
                              "-"
                            )}
                          </dd>
                        </div>
                        {groupWillBeCreated && (
                          <div className="col-span-2">
                            <StatusPill tone="info" dot={false}>
                              ستُنشأ مجموعة
                            </StatusPill>
                          </div>
                        )}
                        {errorMsg && (
                          <div className="col-span-2">
                            <dt className="text-xs text-text-muted">رسالة الخطأ</dt>
                            <dd className="break-words text-xs text-status-danger">
                              {errorMsg}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  );
                })}
              </div>

              {filteredRows.length > previewPageSize && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-text-muted">
                    عرض {(previewPage - 1) * previewPageSize + 1} -{" "}
                    {Math.min(previewPage * previewPageSize, filteredRows.length)} من{" "}
                    {filteredRows.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                    >
                      السابق
                    </Button>
                    <span className="px-1 text-sm font-semibold text-text-muted">
                      {previewPage} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPreviewPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={previewPage === totalPages}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  رجوع
                </Button>
                <Button
                  onClick={goToOptions}
                  disabled={!canProceedFromPreview}
                  className="w-full sm:w-auto"
                >
                  متابعة
                  <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4" data-testid="import-step-3">
              <Card>
                <CardBody className="space-y-4">
                  <h3 className="text-base font-bold text-text-main">
                    خيارات الاستيراد
                  </h3>

                  <div>
                    <p className="mb-2 text-sm font-bold text-text-main">
                      التعامل مع الطلاب المكررين
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label
                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border p-3 text-sm font-semibold transition-colors ${
                          options.duplicateHandling === "skip"
                            ? "border-primary bg-primary-subtle/40 text-text-main"
                            : "border-surface-border bg-surface-card text-text-main"
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicate"
                          checked={options.duplicateHandling === "skip"}
                          onChange={() =>
                            setOptions((prev) => ({
                              ...prev,
                              duplicateHandling: "skip",
                            }))
                          }
                          className="h-4 w-4"
                        />
                        تخطي (افتراضي)
                      </label>
                      {rows.some((row) => row.canUpdate === true) && (
                        <label
                          className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border p-3 text-sm font-semibold transition-colors ${
                            options.duplicateHandling === "update"
                              ? "border-primary bg-primary-subtle/40 text-text-main"
                              : "border-surface-border bg-surface-card text-text-main"
                          }`}
                        >
                          <input
                            type="radio"
                            name="duplicate"
                            checked={options.duplicateHandling === "update"}
                            onChange={() =>
                              setOptions((prev) => ({
                                ...prev,
                                duplicateHandling: "update",
                              }))
                            }
                            className="h-4 w-4"
                          />
                          تحديث (الاسم وبيانات التواصل فقط)
                        </label>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      عند التحديث يتم تحديث الاسم وبيانات التواصل فقط كما هو موضح.
                    </p>
                  </div>

                  {summary.hasGroupWillBeCreated &&
                    summary.canCreateGroupsOverall && (
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-surface-border bg-surface-card p-3">
                        <input
                          type="checkbox"
                          checked={options.createMissingGroups}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              createMissingGroups: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-surface-border"
                        />
                        <div>
                          <p className="text-sm font-bold text-text-main">
                            إنشاء المجموعات الناقصة
                          </p>
                          <p className="text-xs text-text-muted">
                            (افتراضي معطّل)
                          </p>
                        </div>
                      </label>
                    )}

                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-surface-border bg-surface-card p-3">
                    <input
                      type="checkbox"
                      checked={options.createStudentAccounts}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          createStudentAccounts: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-surface-border"
                    />
                    <div>
                      <p className="text-sm font-bold text-text-main">
                        إنشاء حسابات الطلاب
                      </p>
                    </div>
                  </label>

                  {canCreateParentAccounts && (
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-surface-border bg-surface-card p-3">
                      <input
                        type="checkbox"
                        checked={options.createParentAccounts}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            createParentAccounts: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-surface-border"
                      />
                      <div>
                        <p className="text-sm font-bold text-text-main">
                          إنشاء حسابات أولياء الأمور
                        </p>
                      </div>
                    </label>
                  )}
                </CardBody>
              </Card>

              <div className="rounded-card border border-status-warning/30 bg-status-warning-bg p-4">
                <p className="text-sm font-semibold leading-relaxed text-status-warning">
                  الباسورد المبدئي = رقم الهاتف وسيُطلب تغييره عند أول دخول
                </p>
              </div>

              <Card>
                <CardBody>
                  <h3 className="mb-3 text-base font-bold text-text-main">
                    ملخص ما سيحدث
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <div className="rounded-control border border-surface-border bg-surface-muted/40 p-3 text-center">
                      <p className="num text-lg font-bold text-text-main">
                        {summary.valid}
                      </p>
                      <p className="text-xs text-text-muted">
                        طالب جديد (تقريبي)
                      </p>
                    </div>
                    <div className="rounded-control border border-surface-border bg-surface-muted/40 p-3 text-center">
                      <p className="num text-lg font-bold text-text-main">
                        {updatableCount}
                      </p>
                      <p className="text-xs text-text-muted">قابل للتحديث</p>
                    </div>
                    <div className="rounded-control border border-surface-border bg-surface-muted/40 p-3 text-center">
                      <p className="num text-lg font-bold text-text-main">
                        {options.createStudentAccounts
                          ? summary.valid + updatableCount
                          : 0}
                      </p>
                      <p className="text-xs text-text-muted">حساب طالب</p>
                    </div>
                    <div className="rounded-control border border-surface-border bg-surface-muted/40 p-3 text-center">
                      <p className="num text-lg font-bold text-text-main">
                        {options.createParentAccounts
                          ? summary.valid + updatableCount
                          : 0}
                      </p>
                      <p className="text-xs text-text-muted">حساب ولي أمر</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  رجوع
                </Button>
                <Button
                  onClick={handleCommit}
                  loading={committing}
                  className="w-full sm:w-auto"
                >
                  {committing ? "جاري التنفيذ..." : "تأكيد الاستيراد"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-4" data-testid="import-step-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <div className="rounded-card border border-surface-border bg-status-success-bg p-3 text-center sm:p-4">
                  <p className="num text-2xl font-bold text-status-success">
                    {createdCount}
                  </p>
                  <p className="text-xs font-semibold text-status-success sm:text-sm">
                    مضاف
                  </p>
                </div>
                <div className="rounded-card border border-surface-border bg-status-info-bg p-3 text-center sm:p-4">
                  <p className="num text-2xl font-bold text-status-info">
                    {updatedCount}
                  </p>
                  <p className="text-xs font-semibold text-status-info sm:text-sm">
                    محدّث
                  </p>
                </div>
                <div className="rounded-card border border-surface-border bg-status-warning-bg p-3 text-center sm:p-4">
                  <p className="num text-2xl font-bold text-status-warning">
                    {skippedCount}
                  </p>
                  <p className="text-xs font-semibold text-status-warning sm:text-sm">
                    متخطّى
                  </p>
                </div>
                <div className="rounded-card border border-surface-border bg-status-danger-bg p-3 text-center sm:p-4">
                  <p className="num text-2xl font-bold text-status-danger">
                    {failedCount}
                  </p>
                  <p className="text-xs font-semibold text-status-danger sm:text-sm">
                    فاشل
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                {failedCount > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleDownloadErrors}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    تنزيل تقرير الأخطاء (Excel)
                  </Button>
                )}
                {createdAccounts.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleExportCreatedAccounts}
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    تصدير بيانات الدخول (Excel/PDF)
                  </Button>
                )}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleFinish}
                  size="lg"
                  className="w-full sm:w-auto sm:px-10"
                  data-testid="import-finish"
                >
                  إغلاق
                </Button>
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
