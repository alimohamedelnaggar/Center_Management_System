import {
  Award,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Printer,
  X,
  XCircle,
} from "@/components/icons";

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-ZA");
};

const getDayName = (dayNumber) => {
  const days = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  return days[dayNumber] || "-";
};

const getSubscriptionText = (type) => {
  if (type === 1) return "حسب الحصة";
  if (type === 2) return "اشتراك شهري";

  return "غير محدد";
};

const getAttendanceStatus = (status) => {
  if (status === 1) {
    return (
      <span className="inline-flex items-center gap-1 text-status-success font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        حضور
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-status-danger font-bold">
      <XCircle className="w-3.5 h-3.5" />
      غياب
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| Parent Contact Status
|--------------------------------------------------------------------------
| دي بتتعامل مع حالة التواصل فقط.
| مش بنستدعيها إلا لو الطالب مقصر.
*/

const getParentContactStatus = (isContacted) => {
  if (isContacted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 font-bold whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        تم التواصل
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 font-bold whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5" />
      لم يتم التواصل
    </span>
  );
};

export default function ReportDetailsModal({
  isOpen,
  onClose,
  reportData,
  type,
  groupHistory = [],
  groupFilter = null,
  onGroupFilterChange = () => {},
}) {
  if (!isOpen || !reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // Parse Exams
  // ==========================================

  const getParsedExams = () => {
    if (!reportData?.exams) return [];

    const parsed = [];

    const componentTypeMap = {
      0: "برجراف",
      1: "تسميع",
      2: "امتحان",
    };

    reportData.exams.forEach((exam) => {
      // ========================================
      // Exam Has Components
      // ========================================

      if (exam.components && exam.components.length > 0) {
        exam.components.forEach((comp) => {
          const typeLabel =
            componentTypeMap[comp.type] || "اختبار";

          const mark = comp.mark ?? 0;

          const total = comp.totalMarks ?? 0;

          const percentage =
            total > 0
              ? ((mark / total) * 100).toFixed(1)
              : 0;

          parsed.push({
            examName: `${exam.examName || "اختبار"} (${typeLabel})`,

            examDate: exam.examDate,

            obtainedMarks: mark,

            totalMarks: total,

            percentage: percentage,

            // ======================================
            // هل الطالب مقصر في الامتحان؟
            // جاي من الـ Backend
            // ======================================

            isLowGrade: exam.isLowGrade ?? false,

            // ======================================
            // Parent Contact
            // ======================================

            isParentContacted:
              exam.isParentContacted ?? false,

            parentContactedAt:
              exam.parentContactedAt ?? null,
          });
        });
      }

      // ========================================
      // Exam Without Components
      // ========================================

      else {
        const mark = exam.obtainedMarks ?? 0;

        const total = exam.totalMarks ?? 0;

        const percentage =
          exam.percentage ??
          (total > 0
            ? ((mark / total) * 100).toFixed(1)
            : 0);

        parsed.push({
          examName: exam.examName || "اختبار",

          examDate: exam.examDate,

          obtainedMarks: mark,

          totalMarks: total,

          percentage: percentage,

          // ======================================
          // Low Grade
          // ======================================

          isLowGrade: exam.isLowGrade ?? false,

          // ======================================
          // Parent Contact
          // ======================================

          isParentContacted:
            exam.isParentContacted ?? false,

          parentContactedAt:
            exam.parentContactedAt ?? null,
        });
      }
    });

    return parsed;
  };

  const parsedExams = getParsedExams();

  // ==========================================
  // Export CSV
  // ==========================================

  const handleExportCSV = () => {
    let csvContent =
      "data:text/csv;charset=utf-8,\uFEFF";

    // ========================================
    // Attendance
    // ========================================

    if (type === "attendance") {
      csvContent +=
        "تاريخ الجلسة,اليوم,الوقت,الحالة,ملاحظات\n";

      reportData.records?.forEach((r) => {
        csvContent += `"${formatDate(
          r.attendanceDate
        )}","${getDayName(r.dayOfWeek)}","${
          r.startTime || ""
        } - ${r.endTime || ""}","${
          r.status === 1 ? "حضور" : "غياب"
        }","${r.notes || ""}"\n`;
      });
    }

    // ========================================
    // Financial
    // ========================================

    else if (type === "financial") {
      csvContent +=
        "تاريخ الدفع,المبلغ,الفترة,الملاحظات\n";

      reportData.payments?.forEach((p) => {
        csvContent += `"${formatDate(
          p.paymentDate
        )}","${p.amount} ج.م","${
          p.billingPeriod || ""
        }","${p.notes || ""}"\n`;
      });
    }

    // ========================================
    // Grades
    // ========================================

    else if (type === "grades" || type === "full") {
      csvContent +=
        "الامتحان,التاريخ,الدرجة المحصلة,الدرجة الكلية,النسبة المئوية,التواصل مع ولي الأمر,تاريخ التواصل\n";

      parsedExams.forEach((e) => {
        /*
         * لو الطالب مقصر:
         *   - تم التواصل
         *   - لم يتم التواصل
         *
         * لو مش مقصر:
         *   - غير مطلوب
         */

        const contactStatus = e.isLowGrade
          ? e.isParentContacted
            ? "تم التواصل"
            : "لم يتم التواصل"
          : "غير مطلوب";

        const contactDate =
          e.isLowGrade && e.parentContactedAt
            ? formatDate(e.parentContactedAt)
            : "-";

        csvContent += `"${e.examName}","${formatDate(
          e.examDate
        )}","${e.obtainedMarks}","${
          e.totalMarks
        }","%${e.percentage}","${contactStatus}","${contactDate}"\n`;
      });
    }

    // ========================================
    // Download CSV
    // ========================================

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);

    link.setAttribute(
      "download",
      `تقرير_${reportData.studentName || "طالب"}_${type}.csv`
    );

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-surface-card rounded-2xl p-6 border border-surface-border w-full max-w-4xl shadow-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="flex items-center justify-between border-b border-surface-border pb-4">

          <div className="flex items-center gap-3">

            <div className="p-2.5 rounded-xl bg-primary-subtle text-primary">

              {type === "attendance" && (
                <Calendar className="w-6 h-6" />
              )}

              {type === "financial" && (
                <CreditCard className="w-6 h-6" />
              )}

              {type === "grades" && (
                <Award className="w-6 h-6" />
              )}

              {type === "full" && (
                <FileText className="w-6 h-6" />
              )}

            </div>

            <div>

              <h3 className="text-base font-bold text-text-main">

                {type === "attendance" &&
                  "تقرير الحضور والغياب"}

                {type === "financial" &&
                  "التقرير المالي والتسديدات"}

                {type === "grades" &&
                  "نتائج الامتحانات"}

                {type === "full" &&
                  "التقرير الشامل للطالب"}

              </h3>

              <p className="text-xs text-text-muted mt-0.5">

                الطالب:{" "}

                <span className="font-bold text-text-main">
                  {reportData.studentName}
                </span>

                {" | "}

                المجموعة:{" "}

                <span className="font-bold text-text-main">
                  {reportData.groupName}
                </span>

              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-primary-subtle text-primary hover:bg-primary/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />

              <span className="hidden sm:inline">
                طباعة / PDF
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </div>

        {/* ==========================================
            GROUP FILTER
        ========================================== */}

        {groupHistory.length > 0 && (
          <div className="pt-3 flex items-center gap-2">

            <span className="text-xs font-bold text-text-muted whitespace-nowrap">
              تصفية حسب المجموعة:
            </span>

            <select
              value={groupFilter || ""}
              onChange={(e) =>
                onGroupFilterChange(
                  e.target.value || null
                )
              }
              className="text-xs font-bold border border-surface-border rounded-lg px-2 py-1.5 bg-surface-card text-text-main focus:outline-none focus:border-primary"
            >

              <option value="">
                كل المجموعات (التاريخ الكامل)
              </option>

              {groupHistory.map((g) => (
                <option
                  key={g.groupId}
                  value={g.groupId}
                >
                  {g.groupName}{" "}
                  {g.isActive
                    ? "(الحالية)"
                    : "(سابقة)"}
                </option>
              ))}

            </select>

          </div>
        )}

        {/* ==========================================
            CONTENT
        ========================================== */}

        <div className="flex-1 overflow-y-auto py-4 space-y-5">

          {/* ========================================
              SUMMARY CARDS
          ======================================== */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            {/* Attendance */}

            {(type === "attendance" ||
              type === "full") && (
              <>
                <div className="bg-surface-muted/60 p-3 rounded-xl border border-surface-border text-center">

                  <span className="text-[11px] text-text-muted block">
                    إجمالي الحصص
                  </span>

                  <span className="text-base font-bold text-text-main">
                    {reportData.totalSessions ?? 0}
                  </span>

                </div>

                <div className="bg-status-success-bg/50 p-3 rounded-xl border border-status-success/20 text-center">

                  <span className="text-[11px] text-status-success block">
                    مرات الحضور
                  </span>

                  <span className="text-base font-bold text-status-success">
                    {reportData.presentCount ?? 0}
                  </span>

                </div>

                <div className="bg-status-danger-bg/50 p-3 rounded-xl border border-status-danger/20 text-center">

                  <span className="text-[11px] text-status-danger block">
                    مرات الغياب
                  </span>

                  <span className="text-base font-bold text-status-danger">
                    {reportData.absentCount ?? 0}
                  </span>

                </div>

                <div className="bg-primary-subtle p-3 rounded-xl border border-primary/20 text-center">

                  <span className="text-[11px] text-primary block">
                    نسبة الحضور
                  </span>

                  <span className="text-base font-bold text-primary">
                    %{reportData.attendancePercentage ?? 0}
                  </span>

                </div>
              </>
            )}

            {/* Financial */}

            {(type === "financial" ||
              type === "full") && (
              <>
                <div className="bg-surface-muted/60 p-3 rounded-xl border border-surface-border text-center">

                  <span className="text-[11px] text-text-muted block">
                    نوع الاشتراك
                  </span>

                  <span className="text-xs font-bold text-text-main">
                    {getSubscriptionText(
                      reportData.subscriptionType
                    )}
                  </span>

                </div>

                <div className="bg-surface-muted/60 p-3 rounded-xl border border-surface-border text-center">

                  <span className="text-[11px] text-text-muted block">
                    عدد الدفعات
                  </span>

                  <span className="text-base font-bold text-text-main">
                    {reportData.payments?.length ?? 0}
                  </span>

                </div>
              </>
            )}

            {/* Grades / Exam Results */}

            {(type === "grades" ||
              type === "full") && (
              <>
                <div className="bg-surface-muted/60 p-3 rounded-xl border border-surface-border text-center">

                  <span className="text-[11px] text-text-muted block">
                    عدد الامتحانات
                  </span>

                  <span className="text-base font-bold text-text-main">
                    {reportData.exams?.length ?? 0}
                  </span>

                </div>

                <div className="bg-surface-muted/60 p-3 rounded-xl border border-surface-border text-center">

                  <span className="text-[11px] text-text-muted block">
                    مجموع درجات الامتحانات
                  </span>

                  <span className="text-base font-bold text-text-main">
                    {reportData.totalObtainedMarks ?? 0}
                  </span>

                </div>

                <div className="bg-surface-muted/60 p-3 rounded-xl border border-surface-border text-center">

                  <span className="text-[11px] text-text-muted block">
                    إجمالي الدرجات
                  </span>

                  <span className="text-base font-bold text-text-main">
                    {reportData.totalMarks ?? 0}
                  </span>

                </div>

                <div className="bg-primary-subtle p-3 rounded-xl border border-primary/20 text-center">

                  <span className="text-[11px] text-primary block">
                    المعدل التراكمي
                  </span>

                  <span className="text-base font-bold text-primary">
                    %{reportData.percentage ?? 0}
                  </span>

                </div>
              </>
            )}

          </div>

          {/* ========================================
              ATTENDANCE
          ======================================== */}

          {(type === "attendance" ||
            type === "full") && (
            <div className="space-y-2">

              {type === "full" && (
                <h4 className="font-bold text-xs text-text-muted">
                  تفاصيل الحضور
                </h4>
              )}

              <div className="w-full overflow-x-auto rounded-xl border border-surface-border">

                <table className="w-full min-w-[500px] text-right text-xs">

                  <thead className="bg-surface-muted border-b border-surface-border text-text-muted font-bold">

                    <tr>

                      <th className="p-3">
                        التاريخ
                      </th>

                      <th className="p-3">
                        اليوم
                      </th>

                      <th className="p-3">
                        التوقيت
                      </th>

                      <th className="p-3">
                        الحالة
                      </th>

                      <th className="p-3">
                        ملاحظات
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-surface-border text-text-main">

                    {reportData.records?.length > 0 ? (
                      reportData.records.map(
                        (record, idx) => (
                          <tr key={idx}>

                            <td className="p-3 font-medium">
                              {formatDate(
                                record.attendanceDate
                              )}
                            </td>

                            <td className="p-3">
                              {getDayName(
                                record.dayOfWeek
                              )}
                            </td>

                            <td className="p-3 text-text-muted">
                              {record.startTime} -{" "}
                              {record.endTime}
                            </td>

                            <td className="p-3">
                              {getAttendanceStatus(
                                record.status
                              )}
                            </td>

                            <td className="p-3 text-text-muted">
                              {record.notes || "-"}
                            </td>

                          </tr>
                        )
                      )
                    ) : (
                      <tr>

                        <td
                          colSpan={5}
                          className="p-4 text-center text-text-muted"
                        >
                          لا توجد سجلات حضور
                        </td>

                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

          {/* ========================================
              FINANCIAL
          ======================================== */}

          {(type === "financial" ||
            type === "full") && (
            <div className="space-y-2">

              {type === "full" && (
                <h4 className="font-bold text-xs text-text-muted">
                  تفاصيل المالية
                </h4>
              )}

              <div className="w-full overflow-x-auto rounded-xl border border-surface-border">

                <table className="w-full min-w-[500px] text-right text-xs">

                  <thead className="bg-surface-muted border-b border-surface-border text-text-muted font-bold">

                    <tr>

                      <th className="p-3">
                        تاريخ الدفع
                      </th>

                      <th className="p-3">
                        المبلغ
                      </th>

                      <th className="p-3">
                        إجمالي الاشتراك
                      </th>

                      <th className="p-3">
                        المدفوع
                      </th>

                      <th className="p-3">
                        المتبقي
                      </th>

                      <th className="p-3">
                        الحالة
                      </th>

                      <th className="p-3">
                        الفترة
                      </th>

                      <th className="p-3">
                        الملاحظات
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-surface-border text-text-main">

                    {reportData.payments?.length > 0 ? (
                      reportData.payments.map(
                        (pay, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-surface-muted/40"
                          >

                            <td className="p-3">
                              {formatDate(
                                pay.paymentDate
                              )}
                            </td>

                            <td className="p-3 font-bold text-status-success">
                              {pay.amount} ج.م
                            </td>

                            <td className="p-3">
                              {pay.totalAmount} ج.م
                            </td>

                            <td className="p-3 text-green-600 font-bold">
                              {pay.paidAmount} ج.م
                            </td>

                            <td className="p-3 text-red-600 font-bold">
                              {pay.remainingAmount} ج.م
                            </td>

                            <td className="p-3">

                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  pay.status === 2
                                    ? "bg-green-100 text-green-700"
                                    : pay.status === 1
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {pay.status === 2
                                  ? "تم السداد"
                                  : pay.status === 1
                                    ? "دفع جزء"
                                    : "غير مدفوع"}
                              </span>

                            </td>

                            <td className="p-3">
                              {pay.billingPeriod
                                ? formatDate(
                                    pay.billingPeriod
                                  )
                                : "-"}
                            </td>

                            <td className="p-3 text-text-muted">
                              {pay.notes || "-"}
                            </td>

                          </tr>
                        )
                      )
                    ) : (
                      <tr>

                        <td
                          colSpan={8}
                          className="p-4 text-center text-text-muted"
                        >
                          لا توجد عمليات دفع مسجلة
                        </td>

                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

          {/* ========================================
              GRADES
          ======================================== */}

          {(type === "grades" ||
            type === "full") && (
            <div className="space-y-2">

              {type === "full" && (
                <h4 className="font-bold text-xs text-text-muted">
                  نتائج الامتحانات
                </h4>
              )}

              <div className="w-full overflow-x-auto rounded-xl border border-surface-border">

                <table className="w-full min-w-[800px] text-right text-xs">

                  <thead className="bg-surface-muted border-b border-surface-border text-text-muted font-bold">

                    <tr>

                      <th className="p-3">
                        الامتحان
                      </th>

                      <th className="p-3">
                        التاريخ
                      </th>

                      <th className="p-3">
                        الدرجة
                      </th>

                      <th className="p-3">
                        النسبة
                      </th>

                      <th className="p-3">
                        التواصل مع ولي الأمر
                      </th>

                      <th className="p-3">
                        تاريخ التواصل
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-surface-border text-text-main">

                    {parsedExams.length > 0 ? (
                      parsedExams.map(
                        (exam, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-surface-muted/40"
                          >

                            {/* Exam Name */}

                            <td className="p-3 font-bold">
                              {exam.examName}
                            </td>

                            {/* Exam Date */}

                            <td className="p-3 text-text-muted">
                              {formatDate(
                                exam.examDate
                              )}
                            </td>

                            {/* Marks */}

                            <td className="p-3 font-bold">
                              {exam.obtainedMarks} /{" "}
                              {exam.totalMarks}
                            </td>

                            {/* Percentage */}

                            <td className="p-3">

                              <span className="px-2 py-0.5 rounded-md bg-primary-subtle text-primary font-bold">
                                %{exam.percentage}
                              </span>

                            </td>

                            {/* ==================================
                                Parent Contact
                            ================================== */}

                            <td className="p-3">

                              {exam.isLowGrade ? (
                                getParentContactStatus(
                                  exam.isParentContacted
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-surface-muted text-text-muted font-bold whitespace-nowrap">
                                  غير مطلوب
                                </span>
                              )}

                            </td>

                            {/* ==================================
                                Contact Date
                            ================================== */}

                            <td className="p-3 text-text-muted font-medium">

                              {exam.isLowGrade &&
                              exam.parentContactedAt ? (
                                formatDate(
                                  exam.parentContactedAt
                                )
                              ) : (
                                "-"
                              )}

                            </td>

                          </tr>
                        )
                      )
                    ) : (
                      <tr>

                        <td
                          colSpan={6}
                          className="p-4 text-center text-text-muted"
                        >
                          لا توجد اختبارات مسجلة
                        </td>

                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        </div>

        {/* ==========================================
            FOOTER
        ========================================== */}

        <div className="border-t border-surface-border pt-3 flex justify-end">

          <button
            onClick={onClose}
            className="px-5 py-2 border border-surface-border rounded-xl text-xs font-bold text-text-muted hover:bg-surface-muted transition-colors cursor-pointer"
          >
            إغلاق
          </button>

        </div>

      </div>
    </div>
  );
}