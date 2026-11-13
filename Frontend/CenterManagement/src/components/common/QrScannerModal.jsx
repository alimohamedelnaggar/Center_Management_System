import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  Loader2,
  RefreshCw,
  ScanLine,
  SpeakerHigh,
  SpeakerSlash,
  TriangleAlert,
  X,
} from "@/components/icons";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusPill from "@/components/ui/StatusPill";
import { normalizeCode, normalizeScanCode } from "../../utils/qrCode";
import {
  SCAN_OUTCOME_LABELS,
  SCAN_OUTCOME_STATUS,
} from "../../utils/scanOutcome";

const REPEAT_WINDOW_MS = 2500;
const SCANNER_REPEAT_WINDOW_MS = 2000;
const SCANNER_RESULT_MS = 3000;
const SCANNER_HISTORY_LIMIT = 10;
const FOCUS_RESTORE_DELAY_MS = 60;

const TONE_CLASSES = {
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

const TONE_CARD_CLASSES = {
  success: "border-status-success/30 bg-status-success-bg",
  warning: "border-status-warning/30 bg-status-warning-bg",
  danger: "border-status-danger/30 bg-status-danger-bg",
};

const TABS = [
  { key: "camera", label: "كاميرا", icon: Camera },
  { key: "manual", label: "إدخال الكود", icon: Keyboard },
  { key: "scanner", label: "سكانر", icon: Barcode },
];

const CAMERA_STATES = {
  idle: { tone: "neutral", label: "الكاميرا متوقفة" },
  loading: { tone: "info", label: "جارٍ تشغيل الكاميرا" },
  ready: { tone: "success", label: "الكاميرا تعمل" },
  unsupported: { tone: "warning", label: "الكاميرا غير مدعومة" },
  error: { tone: "danger", label: "تعذر تشغيل الكاميرا" },
};

/**
 * A dialog that stays mounted but is hidden (closed drawer, off-screen panel)
 * must not block the focus restore - otherwise the wedge scanner loses the
 * focus after every scan as soon as a navigation drawer exists in the tree.
 */
const isDialogOnScreen = (dialog) => {
  if (!dialog) return false;
  if (dialog.getAttribute("aria-hidden") === "true") return false;
  if (typeof dialog.closest === "function" && dialog.closest("[inert]")) {
    return false;
  }
  if (typeof window === "undefined" || !window.getComputedStyle) return true;

  const style = window.getComputedStyle(dialog);

  if (style.display === "none" || style.visibility === "hidden") return false;

  const rect = dialog.getBoundingClientRect?.();

  if (!rect || !rect.width || !rect.height) return true;

  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;

  if (!viewportWidth || !viewportHeight) return true;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return (
    centerX >= 0 &&
    centerX < viewportWidth &&
    centerY >= 0 &&
    centerY < viewportHeight
  );
};

const getOutcomeTone = (outcome) => {
  if (!outcome?.ok) return "danger";
  if (outcome.status === SCAN_OUTCOME_STATUS.PRESENT) return "success";

  return "warning";
};

const getOutcomeLabel = (outcome) => {
  if (!outcome) return "";

  return SCAN_OUTCOME_LABELS[outcome.status] ?? SCAN_OUTCOME_LABELS.error;
};

export default function QrScannerModal({
  isOpen,
  onClose,
  onDetect,
  isBusy = false,
  disabled = false,
  disabledReason = "",
  scanDisabled = false,
  scanDisabledReason = "",
}) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const onDetectRef = useRef(onDetect);
  const deviceIdRef = useRef("");
  const lastScanRef = useRef({ value: "", at: 0 });

  const overlayRef = useRef(null);
  const scannerInputRef = useRef(null);
  const scannerCodeRef = useRef("");
  const scannerLastRef = useRef({ value: "", at: 0 });
  const scannerHistoryIdRef = useRef(0);
  const resultTimerRef = useRef(null);
  const focusTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const soundEnabledRef = useRef(true);

  const [mode, setMode] = useState("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraState, setCameraState] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [devices, setDevices] = useState([]);

  const [scannerCode, setScannerCode] = useState("");
  const [scannerFocused, setScannerFocused] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerResult, setScannerResult] = useState(null);
  const [scannerHistory, setScannerHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    // Release the camera light for good, even if the reader kept the stream.
    const stream = videoRef.current?.srcObject;

    if (stream && typeof stream.getTracks === "function") {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState("idle");
  }, []);

  const handleDecode = useCallback((result) => {
    if (!result) return;

    const value = normalizeCode(result.getText());
    if (!value) return;

    const now = Date.now();
    const last = lastScanRef.current;

    if (value === last.value && now - last.at < REPEAT_WINDOW_MS) return;

    lastScanRef.current = { value, at: now };
    onDetectRef.current?.(value);
  }, []);

  const startCamera = useCallback(
    async (preferredDeviceId) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraState("unsupported");
        setCameraError("هذا المتصفح لا يدعم الكاميرا.");
        return;
      }

      setCameraError("");
      setCameraState("loading");

      try {
        let available = await BrowserMultiFormatReader.listVideoInputDevices();

        if (available.length === 0) {
          available = await BrowserMultiFormatReader.listVideoInputDevices();
        }

        setDevices(available);

        const backCamera =
          available.find((device) =>
            /back|rear|environment/i.test(device.label),
          ) ?? available[0];

        const deviceId = preferredDeviceId || backCamera?.deviceId || undefined;

        const controls = await new BrowserMultiFormatReader().decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          handleDecode,
        );

        controlsRef.current = controls;
        deviceIdRef.current = deviceId ?? "";
        setCameraState("ready");
      } catch (error) {
        const message =
          error?.name === "NotAllowedError"
            ? "إذن الكاميرا مرفوض. اسمح بالكاميرا من إعدادات المتصفح أو استخدم الإدخال اليدوي."
            : error?.name === "NotFoundError"
              ? "لا توجد كاميرا متاحة على هذا الجهاز."
              : "تعذر تشغيل الكاميرا الآن. أعد المحاولة أو استخدم الإدخال اليدوي.";

        setCameraState("error");
        setCameraError(message);
      }
    },
    [handleDecode],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    if (mode === "camera") {
      startCamera(deviceIdRef.current);
    } else {
      stopCamera();
    }

    return stopCamera;
  }, [isOpen, mode, startCamera, stopCamera]);

  useEffect(() => {
    if (isOpen) return;

    setManualCode("");
    setScannerCode("");
    setScannerResult(null);
    setScannerHistory([]);
    setScannerFocused(false);
    deviceIdRef.current = "";
    lastScanRef.current = { value: "", at: 0 };
    scannerCodeRef.current = "";
    scannerLastRef.current = { value: "", at: 0 };

    window.clearTimeout(resultTimerRef.current);
    window.clearTimeout(focusTimerRef.current);
  }, [isOpen]);

  /**
   * The hardware scanner is a keyboard wedge: it keeps typing as long as it
   * owns the focus, so we take the focus back - unless the user is typing in
   * another field or another modal took over the screen.
   */
  const isEditingElsewhere = useCallback(() => {
    if (typeof document === "undefined") return false;

    const active = document.activeElement;

    if (!active || active === document.body) return false;
    if (active === scannerInputRef.current) return false;

    return Boolean(
      active.closest?.("input, textarea, select, [contenteditable='true']"),
    );
  }, []);

  const isAnotherModalOpen = useCallback(() => {
    if (typeof document === "undefined") return false;
    if (!overlayRef.current) return false;

    const dialogs = document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"], dialog[open]',
    );

    return [...dialogs].some(
      (dialog) =>
        !overlayRef.current.contains(dialog) && isDialogOnScreen(dialog),
    );
  }, []);

  const focusScannerInput = useCallback(() => {
    const input = scannerInputRef.current;

    if (!input) return;
    if (isEditingElsewhere()) return;
    if (isAnotherModalOpen()) return;

    input.focus();

    if (typeof input.select === "function" && input.value) {
      input.select();
    }
  }, [isEditingElsewhere, isAnotherModalOpen]);

  useEffect(() => {
    if (!isOpen || mode !== "scanner") return undefined;

    focusScannerInput();

    return undefined;
  }, [isOpen, mode, focusScannerInput]);

  const handleScannerBlur = useCallback(() => {
    setScannerFocused(false);

    window.clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => {
      if (document.activeElement === scannerInputRef.current) return;

      focusScannerInput();
    }, FOCUS_RESTORE_DELAY_MS);
  }, [focusScannerInput]);

  const playScanSound = useCallback((kind) => {
    if (!soundEnabledRef.current) return;

    try {
      const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;

      if (!AudioContextCtor) return;

      const context = audioContextRef.current ?? new AudioContextCtor();
      audioContextRef.current = context;

      if (context.state === "suspended") {
        context.resume?.();
      }

      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.connect(gain);
      gain.connect(context.destination);

      gain.gain.setValueAtTime(0.0001, now);

      if (kind === "error") {
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(240, now);
        oscillator.frequency.setValueAtTime(170, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        oscillator.start(now);
        oscillator.stop(now + 0.27);
      } else {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.setValueAtTime(1180, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.21);
      }
    } catch {
      // Sound is a nice to have, a scan must never break because of it.
    }
  }, []);

  const submitScannerCode = useCallback(
    async (rawValue) => {
      const raw =
        typeof rawValue === "string" ? rawValue : scannerCodeRef.current;
      const code = normalizeScanCode(raw);

      // The wedge keeps typing, the field is consumed on every submit.
      setScannerCode("");
      scannerCodeRef.current = "";

      if (!code) {
        focusScannerInput();
        return;
      }

      const now = Date.now();
      const last = scannerLastRef.current;

      if (code === last.value && now - last.at < SCANNER_REPEAT_WINDOW_MS) {
        focusScannerInput();
        return;
      }

      scannerLastRef.current = { value: code, at: now };

      setScannerBusy(true);

      let outcome = null;

      try {
        outcome = await onDetectRef.current?.(code);
      } catch {
        outcome = null;
      }

      setScannerBusy(false);

      const result = outcome ?? {
        ok: true,
        status: SCAN_OUTCOME_STATUS.PRESENT,
        name: "",
        code,
        message: "تم تسجيل الكود.",
      };

      setScannerResult(result);

      setScannerHistory((prev) =>
        [
          { id: ++scannerHistoryIdRef.current, at: new Date(), ...result },
          ...prev,
        ].slice(0, SCANNER_HISTORY_LIMIT),
      );

      playScanSound(result.ok ? "success" : "error");

      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = window.setTimeout(() => {
        setScannerResult(null);
      }, SCANNER_RESULT_MS);

      // The input is disabled while the scan is in flight, so focusing it right
      // away is a no-op. Wait for the enabled input to commit, then take the
      // focus back so the hardware wedge keeps working for the next student.
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = window.setTimeout(() => {
        focusScannerInput();
      }, 0);
    },
    [focusScannerInput, playScanSound],
  );

  const handleScannerChange = (event) => {
    scannerCodeRef.current = event.target.value;
    setScannerCode(event.target.value);
  };

  const handleScannerKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitScannerCode(event.currentTarget.value);
      return;
    }

    // Some wedges end the burst with a tab instead of an enter.
    if (event.key === "Tab" && event.currentTarget.value.trim()) {
      event.preventDefault();
      submitScannerCode(event.currentTarget.value);
    }
  };

  const handleScannerSubmit = (event) => {
    event.preventDefault();

    submitScannerCode(scannerCodeRef.current);
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      soundEnabledRef.current = !prev;

      return !prev;
    });
  };

  if (!isOpen) return null;

  const submitManualCode = (event) => {
    event.preventDefault();

    const value = normalizeCode(manualCode);

    if (!value) return;

    onDetectRef.current?.(value);
    setManualCode("");
  };

  const switchCamera = (deviceId) => {
    stopCamera();
    startCamera(deviceId);
  };

  const resultTone = getOutcomeTone(scannerResult);
  const scannerBusyState = isBusy || scannerBusy;
  const cameraStatus = CAMERA_STATES[cameraState] ?? CAMERA_STATES.idle;

  return (
    <div
      ref={overlayRef}
      data-testid="qr-scanner-overlay"
      className="fixed inset-0 z-[9999] flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      dir="rtl"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="مسح كارت الطالب"
        data-testid="qr-scanner-dialog"
        className="flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden border border-surface-border bg-surface-card shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-card"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-text-main">
                مسح كارت الطالب
              </h3>
              <p className="truncate text-xs text-text-muted">
                كاميرا · إدخال يدوي · سكانر
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المسح"
            className="focus-ring inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {disabled && (
          <div className="flex items-start gap-2 border-b border-status-warning/30 bg-status-warning-bg px-4 py-3 text-xs font-semibold leading-relaxed text-status-warning sm:px-5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{disabledReason}</span>
          </div>
        )}

        <div className="shrink-0 border-b border-surface-border px-4 py-3 sm:px-5">
          <div
            role="tablist"
            aria-label="طريقة المسح"
            className="flex gap-1 rounded-control border border-surface-border bg-surface-muted p-1"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = mode === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setMode(tab.key)}
                  className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-control px-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-surface-card text-primary shadow-soft"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {mode === "camera" ? (
            <div className="space-y-3">
              <div className="-mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full">
                <div className="relative aspect-square w-full overflow-hidden bg-slate-950 sm:aspect-video sm:rounded-card">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)] sm:h-56 sm:w-56">
                      <span className="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tl-2xl border-r-2 border-t-2 border-primary" />
                      <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-tr-2xl border-b-2 border-l-2 border-primary" />
                    </div>
                  </div>

                  {cameraState === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-white">
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      <span className="text-xs font-bold">
                        جارٍ تشغيل الكاميرا...
                      </span>
                    </div>
                  )}

                  {cameraState === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                      <CameraOff
                        className="h-10 w-10 text-white/70"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusPill tone={cameraStatus.tone}>{cameraStatus.label}</StatusPill>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => startCamera(deviceIdRef.current)}
                  loading={cameraState === "loading"}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  إعادة المحاولة
                </Button>
              </div>

              {cameraState === "error" && cameraError && (
                <div className="flex items-start gap-2 rounded-control border border-status-danger/30 bg-status-danger-bg px-3 py-2.5 text-xs font-semibold leading-relaxed text-status-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{cameraError}</span>
                </div>
              )}

              {devices.length > 1 && (
                <FormField label="الكاميرا" htmlFor="scanner-camera-device">
                  <Select
                    id="scanner-camera-device"
                    value={deviceIdRef.current}
                    onChange={(event) => switchCamera(event.target.value)}
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `كاميرا ${index + 1}`}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <p className="text-center text-xs leading-relaxed text-text-muted">
                قرّب كارت الطالب من الكاميرا؛ يُسجَّل الحضور تلقائيًا.
              </p>
            </div>
          ) : mode === "manual" ? (
            <form onSubmit={submitManualCode} className="space-y-3">
              <FormField
                label="كود الطالب"
                htmlFor="manual-code-input"
                helper="استخدمه إذا تعذر تشغيل الكاميرا أو تلف الكارت."
              >
                <Input
                  id="manual-code-input"
                  type="text"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="STU00000001"
                  autoComplete="off"
                  dir="ltr"
                  className="text-center font-mono text-base tracking-widest"
                />
              </FormField>

              <Button
                type="submit"
                block
                loading={isBusy}
                disabled={!manualCode.trim()}
              >
                تسجيل الحضور
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              {scanDisabled && (
                <div className="flex items-start gap-2 rounded-control border border-status-warning/30 bg-status-warning-bg px-3 py-2.5 text-xs font-semibold leading-relaxed text-status-warning">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {scanDisabledReason || "اختر المجموعة والحصة قبل المسح."}
                  </span>
                </div>
              )}

              <form onSubmit={handleScannerSubmit}>
                <FormField
                  label="كود الطالب (سكانر)"
                  htmlFor="scanner-code-input"
                  helper="الماسح يكتب الكود ثم يضغط Enter تلقائيًا."
                >
                  <Input
                    id="scanner-code-input"
                    ref={scannerInputRef}
                    type="text"
                    value={scannerCode}
                    onChange={handleScannerChange}
                    onKeyDown={handleScannerKeyDown}
                    onFocus={() => setScannerFocused(true)}
                    onBlur={handleScannerBlur}
                    placeholder="STU00000001"
                    autoComplete="off"
                    spellCheck={false}
                    dir="ltr"
                    disabled={scanDisabled || scannerBusyState}
                    className="text-center font-mono text-base tracking-widest"
                  />
                </FormField>
              </form>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={focusScannerInput}
                  className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border px-3 py-2 text-xs font-bold transition-colors ${
                    scannerFocused
                      ? "border-status-success/30 bg-status-success-bg text-status-success"
                      : "border-status-warning/30 bg-status-warning-bg text-status-warning"
                  }`}
                >
                  {scannerFocused ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  {scannerFocused ? "الماسح جاهز" : "اضغط للتركيز"}
                </button>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  aria-pressed={soundEnabled}
                  aria-label={soundEnabled ? "كتم صوت المسح" : "تشغيل صوت المسح"}
                  className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control border border-surface-border bg-surface-muted text-text-muted transition-colors hover:text-text-main"
                >
                  {soundEnabled ? (
                    <SpeakerHigh className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <SpeakerSlash className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {scannerResult && (
                <div
                  data-testid="scanner-result"
                  className={`rounded-card border p-4 ${TONE_CARD_CLASSES[resultTone]}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-card">
                      {scannerResult.ok ? (
                        <CheckCircle2 className={`h-7 w-7 ${TONE_CLASSES[resultTone]}`} />
                      ) : (
                        <TriangleAlert className={`h-7 w-7 ${TONE_CLASSES[resultTone]}`} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-base font-bold ${TONE_CLASSES[resultTone]}`}>
                        {scannerResult.name || "كود غير مسجل"}
                      </p>
                      <p className={`text-xs font-bold ${TONE_CLASSES[resultTone]}`}>
                        {getOutcomeLabel(scannerResult)}
                      </p>
                    </div>
                  </div>

                  {scannerResult.message && (
                    <p className={`mt-2 text-xs leading-relaxed ${TONE_CLASSES[resultTone]}`}>
                      {scannerResult.message}
                    </p>
                  )}

                  <p className="mt-1 font-mono text-[11px] opacity-80" dir="ltr">
                    {scannerResult.code}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-text-muted">آخر العمليات</p>
                  {scannerHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannerHistory([])}
                      className="min-h-11 cursor-pointer px-1 text-xs font-semibold text-text-muted transition-colors hover:text-text-main"
                    >
                      مسح السجل
                    </button>
                  )}
                </div>

                {scannerHistory.length === 0 ? (
                  <p className="rounded-control border border-dashed border-surface-border px-3 py-4 text-center text-xs text-text-muted">
                    لا توجد عمليات مسح بعد.
                  </p>
                ) : (
                  <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                    {scannerHistory.map((item) => {
                      const tone = getOutcomeTone(item);

                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-control border border-surface-border bg-surface-muted px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-text-main">
                              {item.name || "كود غير مسجل"}
                            </p>
                            <p
                              className="truncate font-mono text-[10px] text-text-muted"
                              dir="ltr"
                            >
                              {item.code}
                            </p>
                          </div>

                          <div className="shrink-0 text-end">
                            <p className={`text-[10px] font-bold ${TONE_CLASSES[tone]}`}>
                              {getOutcomeLabel(item)}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              {item.at.toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="text-center text-xs leading-relaxed text-text-muted">
                يكتب الماسح الكود ثم يضغط Enter تلقائيًا؛ أبقِ الماسح في التركيز
                طوال فترة المسح.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
