import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Copy,
  Mail,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Share2,
  TriangleAlert,
  Wand2,
} from "@/components/icons";
import Pagination from "../../components/common/Pagination";
import StudentCard from "../../components/common/StudentCard";
import ModuleOnly from "../../components/common/ModuleOnly";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import AppModal from "../../components/ui/AppModal";
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

  const filtersActive = Boolean(debouncedSearch || selectedGroupId);

  const cardUrlFor = useCallback(
    (student) => (student.qrCode ? buildStudentCardUrl(student.qrCode) : ""),
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

  const closeEmailModal = () =>
    setEmailModal({ isOpen: false, email: "", sending: false });

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
        closeEmailModal();
      } else {
        toast.error(result?.message || "فشل في إرسال الإيميل");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "فشل في إرسال الإيميل");
    } finally {
      setEmailModal((prev) => ({ ...prev, sending: false }));
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedGroupId("");
  };

  return (
    <div
      data-testid="qr-page"
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

      <PageHeader
        className="qr-no-print"
        title="كروت حضور الطلاب"
        subtitle="كل كارت يحمل QR لولي الأمر وباركود للحضور والغياب. اطبع الكروت أو أرسلها."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateCodes}
              loading={generating}
              data-testid="qr-generate"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              توليد أكواد ناقصة
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePrint("")}
              data-testid="qr-print-all"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              طباعة الكل
            </Button>
            <Button
              size="sm"
              onClick={() => setEmailModal((prev) => ({ ...prev, isOpen: true }))}
              data-testid="qr-email-open"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              إرسال بالإيميل
            </Button>
          </>
        }
      />

      {missingCodesCount > 0 && (
        <div
          data-testid="qr-missing-codes"
          className="qr-no-print flex items-start gap-2 rounded-card border border-status-warning/30 bg-status-warning-bg px-4 py-3 text-sm font-semibold text-status-warning"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {missingCodesCount} طالب بدون كود. اضغط «توليد أكواد ناقصة» لتوليد كود
            لكل طالب.
          </p>
        </div>
      )}

      <Card className="qr-no-print">
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label="بحث" htmlFor="qr-search" className="flex-1">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="qr-search"
                  data-testid="qr-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم الطالب أو الكود..."
                  aria-label="بحث باسم الطالب أو الكود"
                  className="ps-9"
                />
              </div>
            </FormField>

            <FormField
              label="المجموعة"
              htmlFor="qr-group"
              className="sm:w-64"
            >
              <Select
                id="qr-group"
                data-testid="qr-group"
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                aria-label="تصفية حسب المجموعة"
              >
                <option value="">كل المجموعات</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name || group.Name}
                  </option>
                ))}
              </Select>
            </FormField>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={!filtersActive}
              data-testid="qr-reset"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              إعادة تعيين
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div
          data-testid="qr-loading"
          className="qr-no-print grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
            >
              <Skeleton className="mb-3 h-5 w-2/3" />
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <div data-testid="qr-empty" className="qr-no-print">
          <Card>
            <EmptyState
              icon={QrCode}
              title={filtersActive ? "لا توجد نتائج مطابقة" : "لا يوجد طلاب"}
              description={
                filtersActive
                  ? "امسح البحث أو الفلتر لعرض كل الطلاب."
                  : "أضف طلابًا من صفحة الطلاب ثم ارجع لتوليد الكروت."
              }
              action={
                filtersActive ? (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    مسح الفلاتر
                  </Button>
                ) : null
              }
            />
          </Card>
        </div>
      ) : (
        <div
          data-testid="qr-grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {students.map((student) => (
            <div
              key={student.id}
              data-testid={`qr-card-${student.id}`}
              className={`qr-card flex h-full flex-col ${
                printingId === student.id ? "qr-card-target" : ""
              }`}
            >
              <StudentCard
                student={student}
                cardUrl={cardUrlFor(student)}
                className="flex-1"
              />

              <div className="qr-no-print mt-2 grid grid-cols-3 gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePrint(student.id)}
                  title="طباعة الكارت"
                  aria-label={`طباعة كارت ${student.fullName}`}
                  className="px-2 text-[11px]"
                  data-testid={`qr-print-one-${student.id}`}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  طباعة
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(student)}
                  title="نسخ الكود"
                  aria-label={`نسخ كود ${student.fullName}`}
                  className="px-2 text-[11px]"
                  data-testid={`qr-copy-${student.id}`}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  نسخ
                </Button>
                <ModuleOnly moduleKey="whatsapp">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShareWhatsApp(student)}
                    title="مشاركة واتساب"
                    aria-label={`مشاركة كارت ${student.fullName} على واتساب`}
                    className="w-full px-2 text-[11px]"
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    واتساب
                  </Button>
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
          testId="qr-pagination"
          onPageChange={setPageNumber}
        />
      </div>

      <AppModal
        open={emailModal.isOpen}
        onClose={closeEmailModal}
        title="إرسال كروت الحضور"
        icon={Send}
        testId="qr-email-modal"
        busy={emailModal.sending}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={closeEmailModal}
              disabled={emailModal.sending}
              data-testid="qr-email-cancel"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              form="qr-email-form"
              loading={emailModal.sending}
              data-testid="qr-email-send"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              إرسال
            </Button>
          </div>
        }
      >
        <form
          id="qr-email-form"
          onSubmit={handleSendEmail}
          className="space-y-3"
        >
          <FormField
            label="البريد الإلكتروني للطالب أو ولي الأمر"
            htmlFor="qr-email"
          >
            <Input
              id="qr-email"
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
              data-testid="qr-email-input"
            />
          </FormField>

          <p className="text-sm leading-relaxed text-text-muted">
            سيتم إرسال كروت الطلاب الظاهرين في الصفحة الحالية كصور مدمجة.
          </p>
        </form>
      </AppModal>
    </div>
  );
}
