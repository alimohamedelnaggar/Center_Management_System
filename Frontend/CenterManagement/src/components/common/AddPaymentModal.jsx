import { Calendar, Pencil } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AppModal from "@/components/ui/AppModal";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

import { attendanceService } from "../../services/attendanceService";
import { examService } from "../../services/examService";
import { financeService } from "../../services/financeService";
import StudentSearchSelect from "./StudentSearchSelect";
import PaymentBreakdownCard from "./PaymentBreakdownCard";

export default function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  paymentToEdit = null,
  prefill = null,
}) {
  const isEditMode = !!paymentToEdit;

  // Optional values used to open the modal already filled in (e.g. from the
  // overdue page): { studentId, groupId, billingPeriod: "yyyy-MM" }.
  const prefillStudentId = prefill?.studentId || "";
  const prefillGroupId = prefill?.groupId || "";
  const prefillBillingPeriod = prefill?.billingPeriod || "";

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [groupId, setGroupId] = useState("");
  const [studentId, setStudentId] = useState("");

  const [paymentInfo, setPaymentInfo] = useState(null);

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [notes, setNotes] = useState("");
  const [sessionsCount, setSessionsCount] = useState("");
  const [useFullMonth, setUseFullMonth] = useState(true);
  // =========================================================
  // Load Groups
  // =========================================================

  useEffect(() => {
    if (!isOpen) return;

    const loadGroups = async () => {
      try {
        const res = await examService.getGroups();

        const groupList = res?.data?.data || res?.data || res || [];

        setGroups(Array.isArray(groupList) ? groupList : []);
      } catch (err) {
        console.error("Error loading groups:", err);
        setGroups([]);
      }
    };

    loadGroups();
  }, [isOpen]);

  // =========================================================
  // Reset / Initialize Modal
  // =========================================================

  useEffect(() => {
    if (!isOpen) return;

    // =========================
    // Edit Mode
    // =========================
    if (paymentToEdit) {
      const payment = paymentToEdit;

      const currentGroupId = payment.groupId || payment.group?.id || "";

      const currentStudentId = payment.studentId || payment.student?.id || "";

      const currentSessionId = payment.sessionId || payment.session?.id || "";

      setGroupId(currentGroupId);
      setStudentId(currentStudentId);

      setSelectedSessionId(currentSessionId);

      // BillingPeriod ممكن يرجع:
      // 2026-09-01
      // أو 2026-09-01T00:00:00
      // أو null
      if (payment.billingPeriod) {
        const date = new Date(payment.billingPeriod);

        if (!Number.isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");

          setSelectedBillingPeriod(`${year}-${month}`);
        } else if (
          typeof payment.billingPeriod === "string" &&
          payment.billingPeriod.length >= 7
        ) {
          setSelectedBillingPeriod(payment.billingPeriod.substring(0, 7));
        } else {
          setSelectedBillingPeriod("");
        }
      } else {
        setSelectedBillingPeriod("");
      }

      setAmount(
        payment.amount !== null && payment.amount !== undefined
          ? String(payment.amount)
          : "",
      );

      setNotes(payment.notes || "");

      if (payment.paymentDate) {
        const date = new Date(payment.paymentDate);

        if (!Number.isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");

          setPaymentDate(`${year}-${month}-${day}`);
        }
      }

      return;
    }

    // =========================
    // Add Mode
    // =========================

    setGroupId(prefillGroupId);
    setStudentId(prefillStudentId);
    setPaymentInfo(null);

    setSelectedSessionId("");
    setSelectedBillingPeriod(prefillBillingPeriod);

    setAmount("");

    setPaymentDate(new Date().toISOString().slice(0, 10));

    setNotes("");

    setStudents([]);
    setSessions([]);
  }, [
    isOpen,
    paymentToEdit,
    prefillGroupId,
    prefillStudentId,
    prefillBillingPeriod,
  ]);

  // =========================================================
  // Load Students + Sessions when Group Changes
  // =========================================================

  const handleGroupChange = async (e) => {
    const gId = e.target.value;

    setGroupId(gId);
    setStudentId("");
    setPaymentInfo(null);
    setStudents([]);

    setSelectedSessionId("");
    setSelectedBillingPeriod("");
    setAmount("");

    if (!gId) {
      setSessions([]);
      return;
    }

    try {
      // -------------------------
      // Sessions
      // -------------------------

      const sessionRes = await examService.getSessionsByGroup(gId);

      const sessionList =
        sessionRes?.data?.data || sessionRes?.data || sessionRes || [];

      setSessions(Array.isArray(sessionList) ? sessionList : []);

      // -------------------------
      // Students
      // -------------------------

      const res = await attendanceService.getStudentsForAttendance({
        groupId: gId,
        pageSize: 200,
      });

      const list =
        res?.data?.data || res?.data?.items || res?.data || res?.items || [];

      setStudents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);

      setStudents([]);
      setSessions([]);
    }
  };

  // =========================================================
  // Load Students for Edit Mode
  // =========================================================

  useEffect(() => {
    if (!isOpen || !paymentToEdit?.groupId) return;

    const loadEditData = async () => {
      try {
        const gId = paymentToEdit.groupId;

        const [sessionRes, studentsRes] = await Promise.all([
          examService.getSessionsByGroup(gId),

          attendanceService.getStudentsForAttendance({
            groupId: gId,
            pageSize: 200,
          }),
        ]);

        const sessionList =
          sessionRes?.data?.data || sessionRes?.data || sessionRes || [];

        const studentList =
          studentsRes?.data?.data ||
          studentsRes?.data?.items ||
          studentsRes?.data ||
          studentsRes?.items ||
          [];

        setSessions(Array.isArray(sessionList) ? sessionList : []);

        setStudents(Array.isArray(studentList) ? studentList : []);
      } catch (err) {
        console.error("Error loading edit payment data:", err);
      }
    };

    loadEditData();
  }, [isOpen, paymentToEdit]);

  // =========================================================
  // Load Student Payment Info
  // =========================================================

  const loadPaymentInfo = async (sId, period, sCount) => {
    if (!sId) return;
    setLoadingStudentInfo(true);
    try {
      const res = await financeService.getStudentPaymentInfo(sId, {
        billingPeriod: period || undefined,
        sessionsCount: sCount || undefined,
      });

      if (res?.succeeded && res?.data) {
        setPaymentInfo(res.data);
        if (!isEditMode) setAmount(res.data.remainingAmount || "");
      }
    } catch (err) {
      console.error("Error loading student payment info:", err);
    } finally {
      setLoadingStudentInfo(false);
    }
  };

  const handleStudentChange = async (e) => {
    const sId = e.target.value;
    setStudentId(sId);
    setPaymentInfo(null);
    if (!isEditMode) {
      setSelectedSessionId("");
      setSelectedBillingPeriod("");
      setAmount("");
      setSessionsCount("");
      setUseFullMonth(true);
    }
    if (sId) await loadPaymentInfo(sId, "", "");
  };

  useEffect(() => {
    if (!studentId || isEditMode) return;
    const t = setTimeout(() => {
      loadPaymentInfo(
        studentId,
        selectedBillingPeriod,
        useFullMonth ? "" : sessionsCount,
      );
    }, 350);
    return () => clearTimeout(t);
  }, [studentId, selectedBillingPeriod, sessionsCount, useFullMonth]);

  // =========================================================
  // Prefill (Add Mode): load the sessions + students of the
  // prefilled group so the student selection resolves.
  // =========================================================

  useEffect(() => {
    if (!isOpen || isEditMode || !prefillGroupId) return;

    let cancelled = false;

    const loadPrefillGroup = async () => {
      try {
        const [sessionRes, studentsRes] = await Promise.all([
          examService.getSessionsByGroup(prefillGroupId),

          attendanceService.getStudentsForAttendance({
            groupId: prefillGroupId,
            pageSize: 200,
          }),
        ]);

        if (cancelled) return;

        const sessionList =
          sessionRes?.data?.data || sessionRes?.data || sessionRes || [];

        const studentList =
          studentsRes?.data?.data ||
          studentsRes?.data?.items ||
          studentsRes?.data ||
          studentsRes?.items ||
          [];

        setSessions(Array.isArray(sessionList) ? sessionList : []);

        setStudents(Array.isArray(studentList) ? studentList : []);
      } catch (err) {
        console.error("Error loading prefilled group data:", err);
      }
    };

    loadPrefillGroup();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isEditMode, prefillGroupId]);

  // const handleStudentChange = async (e) => {
  //   const sId = e.target.value;

  //   setStudentId(sId);
  //   setPaymentInfo(null);

  //   if (!isEditMode) {
  //     setSelectedSessionId("");
  //     setSelectedBillingPeriod("");
  //     setAmount("");
  //   }

  //   if (!sId) return;

  //   setLoadingStudentInfo(true);

  //   try {
  //     const res = await financeService.getStudentPaymentInfo(sId);

  //     if (res?.succeeded && res?.data) {
  //       const info = res.data;

  //       setPaymentInfo(info);

  //       // في الإضافة فقط نملأ السعر تلقائيًا.
  //       // في التعديل نحافظ على قيمة العملية الحالية.
  //       if (!isEditMode) {
  //         setAmount(info.monthlyPrice || "");
  //       }
  //     }
  //   } catch (err) {
  //     console.error("Error loading student payment info:", err);
  //   } finally {
  //     setLoadingStudentInfo(false);
  //   }
  // };

  // =========================================================
  // Months
  // =========================================================

  const months = [];

  const startYear = 2026;
  const startMonth = 8;

  const endYear = 2027;
  const endMonth = 12;

  const startIndex = startYear * 12 + (startMonth - 1);
  const currentIndex = endYear * 12 + (endMonth - 1);

  for (let index = startIndex; index <= currentIndex; index++) {
    const year = Math.floor(index / 12);
    const monthNumber = (index % 12) + 1;

    const month = String(monthNumber).padStart(2, "0");

    months.push({
      value: `${year}-${month}`,
      label: `${month}/${year}`,
    });
  }

  // =========================================================
  // Days
  // =========================================================

  const days = {
    0: "الأحد",
    1: "الإثنين",
    2: "الثلاثاء",
    3: "الأربعاء",
    4: "الخميس",
    5: "الجمعة",
    6: "السبت",
  };

  // =========================================================
// Reset Modal After Successful Payment
// =========================================================

const resetPaymentForm = () => {
  setStudentId("");

  setPaymentInfo(null);


  setSelectedSessionId("");
  setSelectedBillingPeriod("");

  setAmount("");

  setPaymentDate(
    new Date().toISOString().slice(0, 10)
  );

  setNotes("");

  setSessionsCount("");
  setUseFullMonth(true);

  setLoadingStudentInfo(false);
};
  // =========================================================
  // Submit
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!studentId || !groupId || !amount) {
      toast.error("يرجى إكمال جميع البيانات المطلوبة");
      return;
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("قيمة الدفعة يجب أن تكون أكبر من صفر");
      return;
    }

    // =========================
    // Monthly Validation
    // =========================

    const subscriptionType = Number(
      paymentInfo?.subscriptionType ??
        paymentToEdit?.subscriptionType ??
        (paymentToEdit?.billingPeriod ? 2 : 1),
    );

    const isMonthlyPayment =
      subscriptionType === 2 || (isEditMode && !!paymentToEdit?.billingPeriod);

    if (isMonthlyPayment && !selectedBillingPeriod) {
      toast.error("يرجى اختيار الشهر المستحق");
      return;
    }

    // =========================
    // Session Validation
    // =========================

    if (subscriptionType === 1 && !selectedSessionId) {
      toast.error("يرجى اختيار الحصة");
      return;
    }

    setLoadingSubmit(true);

    try {
      // =====================================================
      // EDIT
      // =====================================================

      if (isEditMode) {
        const payload = {
          id: paymentToEdit.id || paymentToEdit.paymentId,

          studentId: paymentToEdit.studentId || studentId,

          groupId: paymentToEdit.groupId || groupId,

          sessionId:
            paymentToEdit.sessionId ||
            (subscriptionType === 1 ? selectedSessionId : null),

          billingPeriod: selectedBillingPeriod
            ? `${selectedBillingPeriod}-01`
            : null,

          amount: numericAmount,

          notes: notes || null,
        };

        const res = await financeService.updatePayment(payload);

        if (res?.succeeded) {
          toast.success("تم تعديل عملية الدفع بنجاح");

          await onSuccess?.();

          onClose();

          return;
        }

        toast.error(res?.message || "حدث خطأ أثناء تعديل عملية الدفع");

        return;
      }

      // =====================================================
      // ADD
      // =====================================================

      const payload = {
        studentId,
        groupId,
        amount: numericAmount,
        notes: notes || null,

        sessionId: subscriptionType === 1 ? selectedSessionId : null,

        billingPeriod:
          subscriptionType === 2 && selectedBillingPeriod
            ? `${selectedBillingPeriod}-01`
            : null,

        sessionsCount:
          subscriptionType === 2 && !useFullMonth && sessionsCount
            ? Number(sessionsCount)
            : null,
      };

      const res = await financeService.addPayment(payload);

      if (res?.succeeded) {
        toast.success("تم حفظ الدفعة بنجاح");

        // The API returns the new payment id as the response data so the
        // caller can immediately open its receipt.
        await onSuccess?.(res?.data);

        resetPaymentForm();

        return;
      }

      toast.error(res?.message || "حدث خطأ أثناء الحفظ");
    } catch (err) {
      console.error("Payment submit error:", err);

      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        err?.message ||
        "تعذر إكمال العملية";

      toast.error(serverMessage);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const formDisabled = loadingSubmit;

  const subscriptionType = Number(
    paymentInfo?.subscriptionType ??
      paymentToEdit?.subscriptionType ??
      (paymentToEdit?.billingPeriod ? 2 : 1),
  );

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      busy={loadingSubmit}
      title={isEditMode ? "تعديل عملية الدفع" : "إضافة دفعة مالية"}
      icon={isEditMode ? Pencil : Calendar}
      testId="payment-modal"
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={formDisabled}
            className="shrink-0"
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            form="payment-form"
            block
            loading={loadingSubmit}
            disabled={formDisabled || !studentId || !groupId || !amount}
            data-testid="payment-submit"
          >
            {loadingSubmit
              ? isEditMode
                ? "جاري التعديل..."
                : "جاري الحفظ..."
              : isEditMode
                ? "حفظ التعديل"
                : "حفظ الدفعة"}
          </Button>
        </div>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4 rounded-card border border-surface-border bg-surface-bg/60 p-4">
          {/* =================================================
              Group
          ================================================= */}

          <FormField label="المجموعة" htmlFor="payment-group">
            <Select
              id="payment-group"
              value={groupId}
              onChange={handleGroupChange}
              disabled={isEditMode || formDisabled}
              required
            >
              <option value="">-- اختر المجموعة --</option>

              {groups.map((g) => (
                <option key={g.id || g.groupId} value={g.id || g.groupId}>
                  {g.name || g.groupName}
                </option>
              ))}
            </Select>
          </FormField>

          {/* =================================================
              Student
          ================================================= */}

          <StudentSearchSelect
            students={students}
            value={studentId}
            onChange={handleStudentChange}
            disabled={!groupId || isEditMode || formDisabled}
          />

          {loadingStudentInfo && (
            <p className="animate-pulse py-1 text-center text-sm text-text-muted">
              جاري جلب بيانات الاشتراك...
            </p>
          )}

          {/* =================================================
              Edit Info
          ================================================= */}

          {isEditMode && (
            <div className="rounded-control border border-status-warning/40 bg-status-warning-bg p-3 text-sm text-status-warning">
              <span className="font-bold">تعديل عملية دفع موجودة</span>

              <p className="mt-1">
                يتم تعديل قيمة العملية الحالية فقط، مع الحفاظ على تاريخ تسجيل
                الدفع.
              </p>
            </div>
          )}

          {/* =================================================
              Payment Info
          ================================================= */}

          {(paymentInfo || isEditMode) && (
            <div className="space-y-3 border-t border-surface-border pt-3">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span className="text-text-muted">نوع الاشتراك:</span>

                <span className="font-bold text-primary">
                  {subscriptionType === 1 ? "بالحصة" : "شهري"}
                </span>
              </div>

              {/* =============================================
                  Session
              ============================================= */}

              {subscriptionType === 1 && (
                <FormField
                  label="الحصة"
                  htmlFor="payment-session"
                  helper={
                    isEditMode
                      ? "لا يمكن تغيير الحصة المرتبطة بعملية دفع سابقة."
                      : undefined
                  }
                >
                  <Select
                    id="payment-session"
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    disabled={isEditMode || formDisabled}
                    required
                  >
                    <option value="">-- اختر الحصة --</option>

                    {sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        اليوم: {days[sess.dayOfWeek]}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              {/* =============================================
                  Billing Period
              ============================================= */}

              {subscriptionType === 2 && (
                <div className="space-y-3">
                  <FormField
                    label="الشهر المستحق للدفع"
                    htmlFor="payment-billing-period"
                  >
                    <Select
                      id="payment-billing-period"
                      value={selectedBillingPeriod}
                      onChange={(e) =>
                        setSelectedBillingPeriod(e.target.value)
                      }
                      required
                    >
                      <option value="">-- اختر الشهر --</option>

                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  {selectedBillingPeriod && paymentInfo && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-text-main">
                        طريقة الحساب
                      </p>

                      <div
                        role="group"
                        aria-label="طريقة الحساب"
                        className="grid grid-cols-1 gap-2 xs:grid-cols-2"
                      >
                        <button
                          type="button"
                          aria-pressed={useFullMonth}
                          onClick={() => {
                            setUseFullMonth(true);
                            setSessionsCount("");
                          }}
                          className={`min-h-11 rounded-control border px-3 py-2 text-sm font-bold transition-colors ${
                            useFullMonth
                              ? "border-primary bg-primary text-primary-contrast"
                              : "border-surface-border bg-surface-card text-text-main hover:bg-surface-muted"
                          }`}
                        >
                          شهر كامل
                        </button>

                        <button
                          type="button"
                          aria-pressed={!useFullMonth}
                          onClick={() => {
                            setUseFullMonth(false);
                            setSessionsCount(
                              String(paymentInfo.attendedSessions || 1),
                            );
                          }}
                          className={`min-h-11 rounded-control border px-3 py-2 text-sm font-bold transition-colors ${
                            !useFullMonth
                              ? "border-primary bg-primary text-primary-contrast"
                              : "border-surface-border bg-surface-card text-text-main hover:bg-surface-muted"
                          }`}
                        >
                          بعدد الحصص
                        </button>
                      </div>

                      {!useFullMonth && (
                        <FormField
                          label="عدد الحصص"
                          htmlFor="payment-sessions-count"
                          helper={`حضر فعلياً ${paymentInfo.attendedSessions} حصة هذا الشهر — يمكنك التعديل.`}
                        >
                          <Input
                            id="payment-sessions-count"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max={paymentInfo.sessionsPerMonth}
                            value={sessionsCount}
                            onChange={(e) => setSessionsCount(e.target.value)}
                            placeholder="عدد الحصص"
                            className="num font-bold"
                          />
                        </FormField>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            Amount breakdown
        ================================================= */}

        {subscriptionType === 2 && selectedBillingPeriod && (
          <PaymentBreakdownCard info={paymentInfo} amount={amount} />
        )}

        {/* =================================================
            Amount
        ================================================= */}

        <FormField
          label="المبلغ (ج.م)"
          htmlFor="payment-amount"
          helper={isEditMode ? "اكتب قيمة الدفعة الجديدة." : undefined}
        >
          <Input
            id="payment-amount"
            data-testid="payment-amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            className="num text-lg font-bold"
          />
        </FormField>

        {paymentInfo?.remainingAmount > 0 && !isEditMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAmount(String(paymentInfo.remainingAmount))}
            className="text-primary"
          >
            دفع المتبقي كامل ({paymentInfo.remainingAmount} ج.م)
          </Button>
        )}

        {/* =================================================
            Payment Date
        ================================================= */}

        <FormField
          label="تاريخ الدفع"
          htmlFor="payment-date"
          helper={
            isEditMode
              ? "تاريخ العملية لا يتم تغييره أثناء التعديل."
              : undefined
          }
        >
          <Input
            id="payment-date"
            type="date"
            value={paymentDate}
            disabled={isEditMode || formDisabled}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            className="num"
          />
        </FormField>

        {/* Received By - set server-side, not from client */}
        <div className="flex items-center justify-between gap-2 rounded-control border border-surface-border bg-surface-card px-3 py-2.5">
          <span className="text-sm text-text-muted">استلمها</span>
          <span className="num font-bold text-text-main">
            {paymentInfo?.receivedByName || "-"}
          </span>
        </div>

        {/* =================================================
            Notes
        ================================================= */}

        <FormField label="ملاحظات" htmlFor="payment-notes">
          <Textarea
            id="payment-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أية ملاحظات إضافية..."
          />
        </FormField>
      </form>
    </AppModal>
  );
}
