import { Calendar, Pencil, X } from "@/components/icons";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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

        console.log("Update Payment Payload:", payload);

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

      console.log("Add Payment Payload:", payload);

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

  if (!isOpen) return null;

  const subscriptionType = Number(
    paymentInfo?.subscriptionType ??
      paymentToEdit?.subscriptionType ??
      (paymentToEdit?.billingPeriod ? 2 : 1),
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 dir-rtl text-right">
      <div className="bg-white w-full max-w-lg max-h-[calc(100vh-40px)] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* =====================================================
            Header
        ===================================================== */}

        <div className="p-6 pb-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <Pencil className="w-6 h-6 text-[#1e3a8a]" />
            ) : (
              <Calendar className="w-6 h-6 text-[#1e3a8a]" />
            )}

            <h2 className="text-xl font-bold text-[#1e3a8a]">
              {isEditMode ? "تعديل عملية الدفع" : "إضافة دفعة مالية"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* =====================================================
            Form
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="p-6 pt-3 space-y-4 overflow-y-auto"
        >
          <div className="bg-[#f8fafc] border border-gray-100 p-5 rounded-2xl space-y-4">
            {/* =================================================
                Group
            ================================================= */}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                المجموعة
              </label>

              <select
                value={groupId}
                onChange={handleGroupChange}
                disabled={isEditMode}
                className={`w-full p-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition ${
                  isEditMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                }`}
                required
              >
                <option value="">-- اختر المجموعة --</option>

                {groups.map((g) => (
                  <option key={g.id || g.groupId} value={g.id || g.groupId}>
                    {g.name || g.groupName}
                  </option>
                ))}
              </select>
            </div>

            {/* =================================================
                Student
            ================================================= */}

            <StudentSearchSelect
              students={students}
              value={studentId}
              onChange={handleStudentChange}
              disabled={!groupId || isEditMode}
            />

            {loadingStudentInfo && (
              <div className="text-center py-2 text-xs text-gray-400 animate-pulse">
                جاري جلب بيانات الاشتراك...
              </div>
            )}

            {/* =================================================
                Edit Info
            ================================================= */}

            {isEditMode && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
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
              <div className="pt-2 border-t border-gray-200 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-gray-500">نوع الاشتراك:</span>

                  <span className="text-[#1e3a8a] font-bold">
                    {subscriptionType === 1 ? "بالحصة" : "شهري"}
                  </span>
                </div>

                {/* =============================================
                    Session
                ============================================= */}

                {subscriptionType === 1 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      الحصة
                    </label>

                    <select
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      disabled={isEditMode}
                      className={`w-full p-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] ${
                        isEditMode
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white"
                      }`}
                      required
                    >
                      <option value="">-- اختر الحصة --</option>

                      {sessions.map((sess) => (
                        <option key={sess.id} value={sess.id}>
                          اليوم: {days[sess.dayOfWeek]}
                        </option>
                      ))}
                    </select>

                    {isEditMode && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        لا يمكن تغيير الحصة المرتبطة بعملية دفع سابقة.
                      </p>
                    )}
                  </div>
                )}

                {/* =============================================
                    Billing Period
                ============================================= */}

                {subscriptionType === 2 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      الشهر المستحق للدفع
                    </label>

                    <select
                      value={selectedBillingPeriod}
                      onChange={(e) => setSelectedBillingPeriod(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                      required
                    >
                      <option value="">-- اختر الشهر --</option>

                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {selectedBillingPeriod && paymentInfo && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500">
                          طريقة الحساب
                        </label>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUseFullMonth(true);
                              setSessionsCount("");
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                              useFullMonth
                                ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                                : "bg-white text-gray-600 border-gray-200"
                            }`}
                          >
                            شهر كامل
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUseFullMonth(false);
                              setSessionsCount(
                                String(paymentInfo.attendedSessions || 1),
                              );
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                              !useFullMonth
                                ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                                : "bg-white text-gray-600 border-gray-200"
                            }`}
                          >
                            بعدد الحصص
                          </button>
                        </div>

                        {!useFullMonth && (
                          <div>
                            <input
                              type="number"
                              min="1"
                              max={paymentInfo.sessionsPerMonth}
                              value={sessionsCount}
                              onChange={(e) => setSessionsCount(e.target.value)}
                              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-bold"
                              placeholder="عدد الحصص"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                              حضر فعلياً {paymentInfo.attendedSessions} حصة هذا
                              الشهر — يمكنك التعديل.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                Amount
            ================================================= */}
            {subscriptionType === 2 && selectedBillingPeriod && (
              <PaymentBreakdownCard info={paymentInfo} amount={amount} />
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                المبلغ (ج.م)
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                placeholder="0"
                required
              />

              {isEditMode && (
                <p className="text-[11px] text-gray-400 mt-1">
                  اكتب قيمة الدفعة الجديدة.
                </p>
              )}
            </div>
            {paymentInfo?.remainingAmount > 0 && !isEditMode && (
              <button
                type="button"
                onClick={() => setAmount(String(paymentInfo.remainingAmount))}
                className="text-[11px] font-bold text-[#1e3a8a] mt-1 hover:underline"
              >
                دفع المتبقي كامل ({paymentInfo.remainingAmount} ج.م)
              </button>
            )}
            {/* =================================================
                Payment Date
            ================================================= */}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                تاريخ الدفع
              </label>

              <input
                type="date"
                value={paymentDate}
                disabled={isEditMode}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={`w-full p-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] ${
                  isEditMode ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                }`}
                required
              />

              {isEditMode && (
                <p className="text-[11px] text-gray-400 mt-1">
                  تاريخ العملية لا يتم تغييره أثناء التعديل.
                </p>
              )}
            </div>

            {/* Received By - set server-side, not from client */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-500 font-bold">
                collected by
              </span>
              <span className="font-bold text-gray-900">
                {paymentInfo?.receivedByName || "-"}
              </span>
            </div>

            {/* =================================================
                Notes
            ================================================= */}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                ملاحظات
              </label>

              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] resize-none"
                placeholder="أية ملاحظات إضافية..."
              />
            </div>

            {/* =================================================
                Buttons
            ================================================= */}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loadingSubmit}
                className="px-6 py-3 rounded-2xl bg-[#f1f5f9] text-gray-600 font-bold hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={loadingSubmit || !studentId || !groupId || !amount}
                className="flex-1 py-3 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {loadingSubmit
                  ? isEditMode
                    ? "جاري التعديل..."
                    : "جاري الحفظ..."
                  : isEditMode
                    ? "حفظ التعديل"
                    : "حفظ الدفعة"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
