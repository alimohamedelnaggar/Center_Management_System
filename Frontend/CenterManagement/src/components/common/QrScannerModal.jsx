import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  Loader2,
  ScanLine,
  SpeakerHigh,
  SpeakerSlash,
  TriangleAlert,
} from "@/components/icons";
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
        setCameraError("المتصفح ده مش بيدعم الكاميرا.");
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
              ? "مفيش كاميرا متاحة على الجهاز ده."
              : "مش قادرين نشغل الكاميرا دلوقتي.";

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

    return [...dialogs].some((dialog) => !overlayRef.current.contains(dialog));
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

      focusScannerInput();
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

  const tabClass = (active) =>
    `flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
      active
        ? "bg-primary text-text-inverse shadow-sm"
        : "bg-surface-muted text-text-muted hover:text-text-main"
    }`;

  const resultTone = getOutcomeTone(scannerResult);
  const scannerBusyState = isBusy || scannerBusy;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-text-main">مسح كارت الطالب</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
          >
            إغلاق
          </button>
        </div>

        {disabled && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-700">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>{disabledReason}</span>
          </div>
        )}

        <div className="flex gap-2 border-b border-surface-border px-5 py-3">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={tabClass(mode === "camera")}
          >
            <Camera className="h-4 w-4" />
            كاميرا
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={tabClass(mode === "manual")}
          >
            <Keyboard className="h-4 w-4" />
            إدخال الكود
          </button>
          <button
            type="button"
            onClick={() => setMode("scanner")}
            className={tabClass(mode === "scanner")}
          >
            <Barcode className="h-4 w-4" />
            سكانر
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {mode === "camera" ? (
            <>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]">
                    <span className="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tl-2xl border-r-2 border-t-2 border-primary" />
                    <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-tr-2xl border-b-2 border-l-2 border-primary" />
                  </div>
                </div>

                {cameraState === "loading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-xs font-semibold text-white">
                    <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                    جاري تشغيل الكاميرا...
                  </div>
                )}

                {cameraState === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
                    <CameraOff className="h-8 w-8 text-white/70" />
                  </div>
                )}
              </div>

              {cameraState === "error" && cameraError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-status-danger/30 bg-status-danger-bg px-3 py-2.5 text-xs font-semibold leading-relaxed text-status-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {devices.length > 1 && (
                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-semibold text-text-muted">
                    الكاميرا
                  </label>
                  <select
                    value={deviceIdRef.current}
                    onChange={(event) => switchCamera(event.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-xs text-text-main outline-none focus:border-primary"
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `كاميرا ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="mt-3 text-center text-[11px] leading-relaxed text-text-muted">
                وصّل كارت الطالب أمام الكاميرا. الحضور بيتسجل أوتوماتيك.
              </p>
            </>
          ) : mode === "manual" ? (
            <form onSubmit={submitManualCode} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-muted">
                  كود الطالب
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="STU00000001"
                  autoComplete="off"
                  dir="ltr"
                  className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 text-center font-mono text-base tracking-widest text-text-main outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim() || isBusy}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "جاري التسجيل..." : "تسجيل الحضور"}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-text-muted">
                استخدم الكود ده لو الكاميرا مش شغالة أو الكارت اتلف.
              </p>
            </form>
          ) : (
            <div className="space-y-3">
              {scanDisabled && (
                <div className="flex items-start gap-2 rounded-xl border border-status-warning/30 bg-status-warning-bg px-3 py-2.5 text-xs font-semibold leading-relaxed text-status-warning">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {scanDisabledReason || "اختر المجموعة والحصة قبل المسح."}
                  </span>
                </div>
              )}

              <form onSubmit={handleScannerSubmit}>
                <label
                  htmlFor="scanner-code-input"
                  className="mb-1 block text-xs font-semibold text-text-muted"
                >
                  كود الطالب (سكانر)
                </label>
                <input
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
                  className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-3 text-center font-mono text-base tracking-widest text-text-main outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
              </form>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={focusScannerInput}
                  className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    scannerFocused
                      ? "border-status-success/30 bg-status-success-bg text-status-success"
                      : "border-status-warning/30 bg-status-warning-bg text-status-warning"
                  }`}
                >
                  {scannerFocused ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                  )}
                  {scannerFocused ? "الماسح جاهز" : "اضغط للتركيز"}
                </button>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  aria-pressed={soundEnabled}
                  aria-label={soundEnabled ? "كتم صوت المسح" : "تشغيل صوت المسح"}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-muted text-text-muted transition-colors hover:text-text-main"
                >
                  {soundEnabled ? (
                    <SpeakerHigh className="h-5 w-5" />
                  ) : (
                    <SpeakerSlash className="h-5 w-5" />
                  )}
                </button>
              </div>

              {scannerResult && (
                <div
                  className={`rounded-2xl border p-4 ${TONE_CARD_CLASSES[resultTone]}`}
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
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-muted">
                    آخر العمليات
                  </p>
                  {scannerHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannerHistory([])}
                      className="text-[11px] font-semibold text-text-muted transition-colors hover:text-text-main"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {scannerHistory.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-surface-border px-3 py-4 text-center text-[11px] text-text-muted">
                    لسه مفيش عمليات مسح.
                  </p>
                ) : (
                  <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                    {scannerHistory.map((item) => {
                      const tone = getOutcomeTone(item);

                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-muted px-3 py-2"
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

              <p className="text-center text-[11px] leading-relaxed text-text-muted">
                السكانر بيكتب الكود وبيضغط Enter — سيب الماسح في-focus طول ما
                المسح شغال.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
