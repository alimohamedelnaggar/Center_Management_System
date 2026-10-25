import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Copy,
  Loader2,
  Mail,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Share2,
  TriangleAlert,
  Wand2,
  X,
} from "@/components/icons";
import Pagination from "../../components/common/Pagination";
import StudentCard from "../../components/common/StudentCard";
import ModuleOnly from "../../components/common/ModuleOnly";
import { emailService } from "../../services/emailService";
import { groupsService } from "../../services/groupsService";
import { studentsService } from "../../services/studentService";
import {
  buildStudentCardUrl,
  copyText,
  toQrDataUrl,
} from "../../utils/qrCode";

const PAGE_SIZE = 12;

export default function StudentQrCardsPage() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [printingId, setPrintingId] = useState("");
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    email: "",
    sending: false,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPageNumber(1);
  }, [debouncedSearch, selectedGroupId]);

  useEffect(() => {
    groupsService
      .getAllGroups()
      .then((result) => {
        const list = result?.data ?? result ?? [];

        setGroups(Array.isArray(list) ? list : []);
      })
      .catch(() => setGroups([]));
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);

    try {
      const result = await studentsService.getAllPaged({
        pageIndex: pageNumber,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || null,
        groupId: selectedGroupId || null,
      });

      const payload = result?.data ?? result ?? {};
      const list = payload.items ?? payload.data ?? [];

      setStudents(Array.isArray(list) ? list : []);
      setTotalPages(payload.totalPages ?? 1);
      setTotalCount(payload.totalCount ?? 0);
    } catch (error) {
      toast.error("فشل في تحميل بيانات الطلاب");
    } finally {
      setLoading(false);
    }
  }, [pageNumber, debouncedSearch, selectedGroupId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const missingCodesCount = useMemo(
    () => students.filter((student) => !student.qrCode).length,
    [students],
  );

  const cardUrlFor = useCallback(
    (student) =>
      student.qrCode ? buildStudentCardUrl(student.qrCode) : "",
    [],
  );

  const handleGenerateCodes = async () => {
    setGenerating(true);

    try {
      const result = await studentsService.generateMissingQrCodes();

      if (result?.succeeded) {
        toast.success(result.message || "تم توليد الأكواد الناقصة");
        await loadStudents();
      } else {
        toast.error(result?.message || "فشل في توليد الأكواد");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "فشل في توليد الأكواد الناقصة",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = (studentId) => {
    setPrintingId(studentId);

    setTimeout(() => window.print(), 60);
  };

  useEffect(() => {
    const clear = () => setPrintingId("");

    window.addEventListener("afterprint", clear);

    return () => {
      window.removeEventListener("afterprint", clear);
      clear();
    };
  }, []);

  const handleCopy = async (student) => {
    const copied = await copyText(student.qrCode);

    if (copied) {
      toast.success("تم نسخ الكود");
    } else {
      toast.error("مش قادرين ننسخ الكود");
    }
  };

  const handleShareWhatsApp = (student) => {
    const text = `كارت الطالب ${student.fullName}\nالكود: ${student.qrCode}\n${cardUrlFor(student)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const buildEmailHtml = async () => {
    const cards = await Promise.all(
      students
        .filter((student) => student.qrCode)
        .map(async (student) => {
          const qr = await toQrDataUrl(cardUrlFor(student), { size: 260 });

          return `
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
            <tr>
              <td style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;text-align:center;">
                <img src="${qr}" width="180" height="180" alt="${student.qrCode}" style="display:block;margin:0 auto 8px;" />
                <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#0f172a;">${student.fullName}</div>
                <div style="font-family:monospace;font-size:13px;color:#475569;direction:ltr;">${student.qrCode}</div>
                <div style="font-family:Arial,sans-serif;font-size:12px;color:#64748b;">${student.groupName ?? ""}</div>
              </td>
            </tr>
          </table>`;
        }),
    );

    return `<div dir="rtl" style="font-family:Arial,sans-serif;">${cards.join("")}</div>`;
  };

  const handleSendEmail = async (event) => {
    event.preventDefault();

    const recipient = emailModal.email.trim();

    if (!recipient) {
      toast.error("اكتب البريد الإلكتروني الأول");
      return;
    }

    setEmailModal((prev) => ({ ...prev, sending: true }));

    try {
      const html = await buildEmailHtml();
      const result = await emailService.sendEmail({
        email: recipient,
        subject: "كروت حضور الطلاب",
        message: html,
      });

      if (result?.succeeded) {
        toast.success("تم إرسال الكروت بالإيميل");
        setEmailModal({ isOpen: false, email: "", sending: false });
      } else {
        toast.error(result?.message || "فشل في إرسال الإيميل");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "فشل في إرسال الإيميل");
    } finally {
      setEmailModal((prev) => ({ ...prev, sending: false }));
    }
  };

  return (
    <div
      className={`qr-print-root dir-rtl mx-auto max-w-7xl space-y-5 p-4 md:p-6 ${
        printingId ? "qr-print-single" : ""
      }`}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .qr-print-root, .qr-print-root * { visibility: visible !important; }
          .qr-print-root { position: absolute; inset: 0; width: 100%; }
          .qr-no-print { display: none !important; }
          .qr-card { break-inside: avoid; }
          .qr-print-root.qr-print-single .qr-card { display: none !important; }
          .qr-print-root.qr-print-single .qr-card-target {
            display: flex !important;
          }
        }
      `}</style>

      <div className="qr-no-print flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary-subtle p-3 text-primary">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main">
              كروت حضور الطلاب
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              الكارت فيه QR لولي الأمر و باركود للحضور والغياب. اطبع أو ابعته.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateCodes}
            disabled={generating}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-surface-muted px-3.5 py-2.5 text-xs font-bold text-text-main transition-colors hover:bg-surface-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 text-primary" />
            )}
            توليد أكواد ناقصة
          </button>

          <button
            type="button"
            onClick={() => handlePrint("")}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-surface-muted px-3.5 py-2.5 text-xs font-bold text-text-main transition-colors hover:bg-surface-border"
          >
            <Printer className="h-4 w-4" />
            طباعة الكل
          </button>

          <button
            type="button"
            onClick={() => setEmailModal((prev) => ({ ...prev, isOpen: true }))}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-text-inverse transition-colors hover:bg-primary-hover"
          >
            <Mail className="h-4 w-4" />
            إرسال بالإيميل
          </button>
        </div>
      </div>

      {missingCodesCount > 0 && (
        <div className="qr-no-print flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          فيه {missingCodesCount} طالب بدون كود. اضغط "توليد أكواد ناقصة" عشان
          يتولد لهم كود.
        </div>
      )}

      <div className="qr-no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3.5 top-3 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الطالب أو الكود..."
            className="w-full rounded-xl border border-surface-border bg-surface-card py-2 pl-4 pr-10 text-xs text-text-main outline-none transition-colors focus:border-primary"
          />
        </div>

        <select
          value={selectedGroupId}
          onChange={(event) => setSelectedGroupId(event.target.value)}
          className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 text-xs text-text-main outline-none focus:border-primary sm:w-56"
        >
          <option value="">كل المجموعات</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name || group.Name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface-card py-12 text-center text-xs text-text-muted">
          مفيش طلاب لعرضهم.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {students.map((student) => (
            <div
              key={student.id}
              className={`qr-card flex h-full flex-col ${
                printingId === student.id ? "qr-card-target" : ""
              }`}
            >
              <StudentCard
                student={student}
                cardUrl={cardUrlFor(student)}
                className="flex-1"
              />

              <div className="qr-no-print mt-2 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrint(student.id)}
                  title="طباعة الكارت"
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-card px-2.5 py-1.5 text-[10px] font-bold text-text-muted shadow-sm transition-colors hover:text-primary"
                >
                  <Printer className="h-3.5 w-3.5" />
                  طباعة
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(student)}
                  title="نسخ الكود"
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-card px-2.5 py-1.5 text-[10px] font-bold text-text-muted shadow-sm transition-colors hover:text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                  نسخ
                </button>
                <ModuleOnly moduleKey="whatsapp">
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(student)}
                  title="مشاركة واتساب"
                  className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface-card px-2.5 py-1.5 text-[10px] font-bold text-text-muted shadow-sm transition-colors hover:text-primary"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  واتساب
                </button>
                </ModuleOnly>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="qr-no-print">
        <Pagination
          currentPage={pageNumber}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={PAGE_SIZE}
          name="الطلاب"
          onPageChange={setPageNumber}
        />
      </div>

      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSendEmail}
            className="w-full max-w-md space-y-4 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-text-main">
                  إرسال كروت الحضور
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEmailModal({ isOpen: false, email: "", sending: false })
                }
                className="cursor-pointer rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-main"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-muted">
                البريد الإلكتروني للطالب أو ولي الأمر
              </label>
              <input
                type="email"
                value={emailModal.email}
                onChange={(event) =>
                  setEmailModal((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                dir="ltr"
                placeholder="parent@example.com"
                className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 text-xs text-text-main outline-none focus:border-primary"
              />
            </div>

            <p className="text-[11px] leading-relaxed text-text-muted">
              هيتبعت كروت الطلاب الظاهرين في الصفحة الحالية كصور مدمجة.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setEmailModal({ isOpen: false, email: "", sending: false })
                }
                className="cursor-pointer rounded-xl bg-surface-muted px-4 py-2 text-xs font-bold text-text-main transition-colors hover:bg-surface-border"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={emailModal.sending}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emailModal.sending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                إرسال
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
