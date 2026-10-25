import {
  BookOpen,
  CheckCircle2,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  WhatsappLogo,
} from "@/components/icons";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import { getSessionLabel } from "../../components/getSessionLabel";
import { useBranding } from "../../context/useBranding";
import ModuleOnly from "../../components/common/ModuleOnly";
import { examService } from "../../services/examService";
import {
  examConnection,
  startExamConnection,
} from "../../services/signalr/examSignalR";
import { normalizeEgyptianPhone } from "../../utils/phone";
import {
  buildTemplateWhatsAppLink,
  MESSAGE_TEMPLATE_KEYS,
} from "../../utils/whatsappTemplates";

const EXAM_TYPES = {
  Paragraph: 0,
  Recitation: 1,
  Exam: 2,
};

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export default function ExamManagementTab() {
  const branding = useBranding();
  const centerName = branding?.center?.name || "";

  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [exams, setExams] = useState([]);

  const [students, setStudents] = useState([]);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedExam, setSelectedExam] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState({
    [EXAM_TYPES.Paragraph]: {
      active: false,
      totalMarks: "",
    },
    [EXAM_TYPES.Recitation]: {
      active: false,
      totalMarks: "",
    },
    [EXAM_TYPES.Exam]: {
      active: false,
      totalMarks: "",
    },
  });

  const [studentMarks, setStudentMarks] = useState({});

  const DRAFT_KEY = "examManagementTab_draft_v1";

  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // =========================================================
  // Restore Draft
  // =========================================================

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);

    if (raw) {
      try {
        const draft = JSON.parse(raw);

        if (draft.selectedGroup) {
          setSelectedGroup(draft.selectedGroup);
        }

        if (draft.selectedSession) {
          setSelectedSession(draft.selectedSession);
        }

        if (draft.selectedExam) {
          setSelectedExam(draft.selectedExam);
        }

        setPendingDraft({
          selectedExam: draft.selectedExam,
          studentMarks: draft.studentMarks || {},
          selectedTypes: draft.selectedTypes || null,
        });
      } catch (e) {
        console.error("Failed to restore exam management draft", e);
        localStorage.removeItem(DRAFT_KEY);
      }
    }

    setDraftRestored(true);
  }, []);

  // =========================================================
  // Save Draft
  // =========================================================

  useEffect(() => {
    if (!draftRestored) return;

    const hasData =
      selectedExam || Object.keys(studentMarks).length > 0;

    if (!hasData) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    const draft = {
      selectedGroup,
      selectedSession,
      selectedExam,
      selectedTypes,
      studentMarks,
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    draftRestored,
    selectedGroup,
    selectedSession,
    selectedExam,
    selectedTypes,
    studentMarks,
  ]);

  // =========================================================
  // Before Unload
  // =========================================================

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasData =
        selectedExam || Object.keys(studentMarks).length > 0;

      if (!hasData) return;

      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () =>
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
  }, [selectedExam, studentMarks]);

  // =========================================================
  // SignalR
  // =========================================================

  useEffect(() => {
    startExamConnection();

    const handleExamAdded = (data) => {
      toast.success(`تم إضافة امتحان جديد: ${data.name || ""}`);
    };

    const handleExamDeleted = (examId) => {
      toast.success("تم حذف الامتحان");

      setExams((prev) =>
        prev.filter((e) => e.id !== examId),
      );

      if (selectedExam === examId) {
        setSelectedExam("");
        setStudents([]);
        setStudentMarks({});

        setSelectedTypes({
          [EXAM_TYPES.Paragraph]: {
            active: false,
            totalMarks: "",
          },
          [EXAM_TYPES.Recitation]: {
            active: false,
            totalMarks: "",
          },
          [EXAM_TYPES.Exam]: {
            active: false,
            totalMarks: "",
          },
        });
      }
    };

    examConnection.on("ExamAdded", handleExamAdded);
    examConnection.on("ExamDeleted", handleExamDeleted);

    return () => {
      examConnection.off("ExamAdded", handleExamAdded);
      examConnection.off("ExamDeleted", handleExamDeleted);
    };
  }, [selectedExam]);

  // =========================================================
  // Fetch Groups
  // =========================================================

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);

        const res = await examService.getGroups();

        setGroups(normalizeList(res));
      } catch (err) {
        toast.error("حدث خطأ أثناء تحميل المجموعات");
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  // =========================================================
  // Fetch Sessions
  // =========================================================

  useEffect(() => {
    if (!selectedGroup) {
      setSessions([]);
      return;
    }

    const fetchSessions = async () => {
      try {
        const res =
          await examService.getSessionsByGroup(selectedGroup);

        setSessions(normalizeList(res));
      } catch (err) {
        // intentionally silent
      }
    };

    fetchSessions();
  }, [selectedGroup]);

  // =========================================================
  // Fetch Exams
  // =========================================================

  useEffect(() => {
    if (!selectedGroup || !selectedSession) {
      setExams([]);
      return;
    }

    const fetchExams = async () => {
      try {
        setLoadingExams(true);

        const res = await examService.getGroupExams({
          groupId: selectedGroup,
          sessionId: selectedSession,
        });

        setExams(normalizeList(res));
      } catch (err) {
        // intentionally silent
      } finally {
        setLoadingExams(false);
      }
    };

    fetchExams();
  }, [selectedGroup, selectedSession]);

  // =========================================================
  // Fetch Grades
  // =========================================================

  useEffect(() => {
    const fetchExamGrades = async () => {
      if (!selectedGroup || !selectedSession || !selectedExam) {
        setStudents([]);
        setStudentMarks({});
        return;
      }

      try {
        setFetchingStudents(true);

        const res = await examService.getExamGrades({
          groupId: selectedGroup,
          sessionId: selectedSession,
          examId: selectedExam,
        });

        const studentsList = normalizeList(res);

        setStudents(studentsList);

        // -----------------------------------------------------
        // Build marks from backend
        // IMPORTANT:
        // -1 = Absent
        // -----------------------------------------------------

        const marks = {};

        studentsList.forEach((student) => {
          marks[student.studentId] = {};

          student.examGrades?.forEach((grade) => {
            const numericMark = Number(grade.mark);

            if (numericMark === -1) {
              // الطالب غائب
              marks[student.studentId][grade.type] = -1;
            } else if (
              Number.isFinite(numericMark) &&
              numericMark >= 0
            ) {
              // الطالب حاضر
              marks[student.studentId][grade.type] =
                numericMark;
            } else {
              marks[student.studentId][grade.type] = 0;
            }
          });
        });

        // -----------------------------------------------------
        // Build exam types
        // -----------------------------------------------------

        const types = {
          [EXAM_TYPES.Paragraph]: {
            active: false,
            totalMarks: "",
          },
          [EXAM_TYPES.Recitation]: {
            active: false,
            totalMarks: "",
          },
          [EXAM_TYPES.Exam]: {
            active: false,
            totalMarks: "",
          },
        };

        studentsList[0]?.examTypes?.forEach((item) => {
          if (
            Object.prototype.hasOwnProperty.call(
              types,
              item.type,
            )
          ) {
            types[item.type] = {
              active: true,
              totalMarks: item.totalMark,
            };
          }
        });

        // -----------------------------------------------------
        // Restore draft safely
        // -----------------------------------------------------

        if (
          pendingDraft &&
          pendingDraft.selectedExam === selectedExam
        ) {
          const safeDraftMarks = {};

          Object.entries(
            pendingDraft.studentMarks || {},
          ).forEach(([studentId, marksByType]) => {
            safeDraftMarks[studentId] = {};

            Object.entries(marksByType || {}).forEach(
              ([type, rawMark]) => {
                if (
                  rawMark === "" ||
                  rawMark === null ||
                  rawMark === undefined
                ) {
                  safeDraftMarks[studentId][type] = "";
                  return;
                }

                const numericMark = Number(rawMark);

                // Allow -1 because it means absent
                if (Number.isFinite(numericMark)) {
                  safeDraftMarks[studentId][type] =
                    numericMark;
                }
              },
            );
          });

          setStudentMarks({
            ...marks,
            ...safeDraftMarks,
          });

          setSelectedTypes(
            pendingDraft.selectedTypes || types,
          );

          setPendingDraft(null);
        } else {
          setStudentMarks(marks);
          setSelectedTypes(types);
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            "حدث خطأ أثناء تحميل درجات الطلاب",
        );
      } finally {
        setFetchingStudents(false);
      }
    };

    fetchExamGrades();
  }, [selectedGroup, selectedSession, selectedExam]);

  // =========================================================
  // Change Total Mark
  // =========================================================

  const handleTotalMarkChange = (type, value) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        totalMarks: value,
      },
    }));
  };

  // =========================================================
  // Change Student Mark
  // =========================================================

  const handleStudentMarkChange = (
    studentId,
    type,
    mark,
  ) => {
    const currentMark =
      studentMarks[studentId]?.[type];

    // -1 means absent.
    // Do not allow editing it manually.
    if (currentMark === -1) {
      return;
    }

    // Allow clearing the input
    if (mark === "") {
      setStudentMarks((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [type]: "",
        },
      }));

      return;
    }

    // Allow only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(mark)) {
      return;
    }

    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [type]: mark,
      },
    }));
  };

  // =========================================================
  // Toggle Parent Contact
  // =========================================================

  const handleParentContactToggle = async (student) => {
    if (!student?.studentId || !selectedExam) {
      toast.error("بيانات الطالب أو الامتحان غير مكتملة");
      return;
    }

    try {
      const res =
        await examService.updateParentContact({
          studentId: student.studentId,
          examId: selectedExam,
        });

      const newStatus =
        typeof res === "boolean"
          ? res
          : (res?.data ?? res?.value ?? false);

      setStudents((prev) =>
        prev.map((item) =>
          item.studentId === student.studentId
            ? {
                ...item,
                isParentContacted: newStatus,
              }
            : item,
        ),
      );

      toast.success(
        newStatus
          ? "تم تسجيل فتح واتساب مع ولي الأمر"
          : "تم إلغاء تسجيل فتح واتساب",
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "حدث خطأ أثناء تحديث حالة التواصل",
      );
    }
  };

  // =========================================================
  // WhatsApp Exam Result
  // =========================================================
  // Opening WhatsApp IS what records the flag (not actually sending the
  // message), so this marks "تم فتح واتساب" for the parent. It only writes when
  // the flag is not already set, because the backend endpoint toggles.
  const markParentContactedIfNeeded = async (student) => {
    if (student?.isParentContacted) return;
    if (!student?.studentId || !selectedExam) return;

    try {
      const res = await examService.updateParentContact({
        studentId: student.studentId,
        examId: selectedExam,
      });

      const newStatus =
        typeof res === "boolean" ? res : (res?.data ?? res?.value ?? false);

      setStudents((prev) =>
        prev.map((item) =>
          item.studentId === student.studentId
            ? { ...item, isParentContacted: newStatus }
            : item,
        ),
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "تعذر تسجيل التواصل مع ولي الأمر",
      );
    }
  };

  const handleSendExamResult = async (student) => {
    const examName =
      exams.find((e) => e.id === selectedExam)?.name || "الامتحان";

    const marks = student.examGrades || [];
    const types = student.examTypes || [];

    const score = marks
      .filter((g) => Number(g.mark) >= 0)
      .reduce((sum, g) => sum + Number(g.mark), 0);
    const total = types.reduce((sum, t) => sum + Number(t.totalMark), 0);

    const link = buildTemplateWhatsAppLink(
      student.parentPhoneNumber,
      MESSAGE_TEMPLATE_KEYS.examResult,
      {
        student: student.studentName,
        center: centerName,
        exam: examName,
        score,
        total,
      },
    );

    if (!link) {
      toast.error("لا يوجد رقم ولي أمر صحيح لهذا الطالب");
      return;
    }

    await markParentContactedIfNeeded(student);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  // =========================================================
  // Search
  // =========================================================

  const filteredStudents = students.filter((s) => {
    const search = searchQuery.toLowerCase();

    const nameMatch = s.studentName
      ?.toLowerCase()
      .includes(search);

    const phoneMatch =
      s.studentPhone?.includes(search);

    return nameMatch || phoneMatch;
  });

  // =========================================================
  // Exam Types
  // =========================================================

  const examTypeCards = [
    {
      type: EXAM_TYPES.Paragraph,
      label: "برجراف",
    },
    {
      type: EXAM_TYPES.Recitation,
      label: "تسميع",
    },
    {
      type: EXAM_TYPES.Exam,
      label: "امتحان",
    },
  ];

  // =========================================================
  // Submit Grades
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedGroup) {
      return toast.error("يرجى اختيار المجموعة أولاً");
    }

    if (!selectedSession) {
      return toast.error("يرجى اختيار الحصة");
    }

    if (!selectedExam) {
      return toast.error("يرجى اختيار الامتحان");
    }

    // -----------------------------------------------------
    // Active Components
    // -----------------------------------------------------

    const activeComponents = Object.entries(selectedTypes)
      .filter(([_, value]) => value.active)
      .map(([type, value]) => ({
        type: Number(type),
        totalMarks: Number(value.totalMarks),
      }));

    // -----------------------------------------------------
    // Validate Components
    // -----------------------------------------------------

    if (activeComponents.length === 0) {
      return toast.error(
        "اختر نوع تقييم واحد على الأقل (برجراف / تسميع / امتحان)",
      );
    }

    for (const comp of activeComponents) {
      if (
        !Number.isFinite(comp.totalMarks) ||
        comp.totalMarks <= 0
      ) {
        return toast.error(
          "يرجى تحديد الدرجة الكلية للمكونات المحددة",
        );
      }
    }

    // -----------------------------------------------------
    // Validate Student Marks
    // -----------------------------------------------------

    for (const student of students) {
      for (const comp of activeComponents) {
        const rawMark =
          studentMarks[student.studentId]?.[comp.type];

        const mark =
          rawMark === "" ||
          rawMark === null ||
          rawMark === undefined
            ? 0
            : Number(rawMark);

        if (!Number.isFinite(mark)) {
          return toast.error(
            `درجة الطالب ${student.studentName} غير صحيحة`,
          );
        }

        // -1 = Absent
        // It is valid and should be sent to backend.
        if (mark === -1) {
          continue;
        }

        if (mark < 0) {
          return toast.error(
            `درجة الطالب ${student.studentName} لا يمكن أن تكون سالبة`,
          );
        }

        if (mark > comp.totalMarks) {
          return toast.error(
            `درجة الطالب ${student.studentName} في ${
              examTypeCards.find(
                (x) => x.type === comp.type,
              )?.label
            } لا يمكن أن تكون أكبر من الدرجة الكلية (${comp.totalMarks})`,
          );
        }
      }
    }

    // -----------------------------------------------------
    // Build Student Payload
    // -----------------------------------------------------

    const studentPayload = students.map((s) => ({
      studentId: s.studentId,

      marks: activeComponents.map((comp) => {
        const rawMark =
          studentMarks[s.studentId]?.[comp.type];

        return {
          type: comp.type,
          mark:
            rawMark === "" ||
            rawMark === null ||
            rawMark === undefined
              ? 0
              : Number(rawMark),
        };
      }),
    }));

    // -----------------------------------------------------
    // Final Payload
    // -----------------------------------------------------

    const payload = {
      groupId: selectedGroup,
      sessionId: selectedSession,
      examId: selectedExam,
      components: activeComponents,
      students: studentPayload,
    };

    console.log(
      "FINAL EDIT EXAM PAYLOAD:",
      payload,
    );

    try {
      setLoading(true);

      await examService.edit(payload);

      toast.success(
        "تم تعديل الامتحان ودرجات الطلاب بنجاح",
      );

      // Clear old draft
      localStorage.removeItem(DRAFT_KEY);

      // ---------------------------------------------------
      // Reload grades from backend
      // ---------------------------------------------------

      const res =
        await examService.getExamGrades({
          groupId: selectedGroup,
          sessionId: selectedSession,
          examId: selectedExam,
        });

      const updatedStudents =
        normalizeList(res);

      setStudents(updatedStudents);

      // ---------------------------------------------------
      // Rebuild marks from backend
      // ---------------------------------------------------

      const updatedMarks = {};

      updatedStudents.forEach((student) => {
        updatedMarks[student.studentId] = {};

        student.examGrades?.forEach((grade) => {
          const numericMark = Number(
            grade.mark,
          );

          if (numericMark === -1) {
            updatedMarks[student.studentId][
              grade.type
            ] = -1;
          } else if (
            Number.isFinite(numericMark) &&
            numericMark >= 0
          ) {
            updatedMarks[student.studentId][
              grade.type
            ] = numericMark;
          } else {
            updatedMarks[student.studentId][
              grade.type
            ] = 0;
          }
        });
      });

      setStudentMarks(updatedMarks);
    } catch (err) {
      console.error(
        "EDIT EXAM ERROR:",
        err,
      );

      console.error(
        "EDIT EXAM RESPONSE:",
        err.response?.data,
      );

      toast.error(
        err.response?.data?.message ||
          err.response?.data?.Message ||
          "حدث خطأ أثناء حفظ البيانات",
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // Delete Exam
  // =========================================================

  const handleDeleteExam = async () => {
    try {
      setLoading(true);

      await examService.delete(selectedExam);

      localStorage.removeItem(DRAFT_KEY);

      toast.success("تم حذف الامتحان بنجاح");

      setShowDeleteModal(false);
      setSelectedExam("");

      setStudents([]);
      setStudentMarks({});

      setSelectedTypes({
        [EXAM_TYPES.Paragraph]: {
          active: false,
          totalMarks: "",
        },
        [EXAM_TYPES.Recitation]: {
          active: false,
          totalMarks: "",
        },
        [EXAM_TYPES.Exam]: {
          active: false,
          totalMarks: "",
        },
      });

      setExams((prev) =>
        prev.filter(
          (e) => e.id !== selectedExam,
        ),
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "حدث خطأ أثناء حذف الامتحان",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 dir-rtl"
      dir="rtl"
    >
      {/* =====================================================
          Header
      ====================================================== */}

      <div className="bg-surface-card border border-surface-border p-5 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-subtle text-primary">
            <BookOpen className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-text-main">
              اعادة رصد درجات اختبار سابق
            </h2>

            <p className="text-xs text-text-muted mt-0.5">
              اختر المجموعة و الحصة و الاختبار
            </p>
          </div>
        </div>

        {/* Select Group / Session / Exam */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {/* Groups */}

          <div className="flex items-center gap-2 bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border">
            <select
              value={selectedGroup}
              onChange={(e) =>
                setSelectedGroup(e.target.value)
              }
              disabled={loadingGroups}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              <option value="">
                {loadingGroups
                  ? "جاري تحميل المجموعات..."
                  : "اختر المجموعة..."}
              </option>

              {groups.map((g) => (
                <option
                  key={g.id}
                  value={g.id}
                >
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sessions */}

          <div className="flex items-center gap-2 bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border">
            <select
              value={selectedSession}
              onChange={(e) =>
                setSelectedSession(e.target.value)
              }
              disabled={
                !selectedGroup ||
                fetchingStudents
              }
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              <option value="">
                اختر الحصة...
              </option>

              {sessions.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                >
                  {getSessionLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Exams */}

          <div className="flex items-center gap-2 bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border">
            <select
              value={selectedExam}
              onChange={(e) =>
                setSelectedExam(e.target.value)
              }
              disabled={
                loadingExams ||
                !selectedGroup ||
                fetchingStudents ||
                !selectedSession
              }
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              <option value="">
                اختر الامتحان...
              </option>

              {exams.map((exam) => (
                <option
                  key={exam.id}
                  value={exam.id}
                >
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {/* Delete Exam */}

          <div className="flex items-center justify-end rounded-2xl border border-surface-border bg-surface-card p-3">
            {selectedGroup &&
              selectedSession &&
              selectedExam && (
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteModal(true)
                  }
                  disabled={loading}
                  className="group inline-flex items-center gap-2 rounded-xl border border-status-danger/30 bg-status-danger-bg px-4 py-2.5 text-xs font-bold text-status-danger transition-all duration-200 hover:border-status-danger hover:bg-status-danger hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف الامتحان</span>
                </button>
              )}
          </div>
        </div>
      </div>

      {/* =====================================================
          Exam Types
      ====================================================== */}

      <div className="border-t border-surface-border pt-4">
        <label className="block text-xs font-bold mb-3 text-text-main">
          الدرجات الكلية لكل نوع تقييم
          (برجراف / تسميع / امتحان)
        </label>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          {examTypeCards.map(
            ({ type, label }) =>
              selectedTypes[type].totalMarks > 0 && (
                <div
                  key={`exam-type-${type}`}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    selectedTypes[type].active
                      ? "bg-primary-subtle border-primary"
                      : "bg-surface-card border-surface-border hover:border-primary/50"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer font-bold text-xs text-text-main">
                    <span>{label}</span>
                  </label>

                  <input
                    type="number"
                    step="0.25"
                    inputMode="decimal"
                    placeholder="الدرجة الكلية"
                    value={
                      selectedTypes[type]
                        .totalMarks
                    }
                    min={0}
                    onChange={(e) =>
                      handleTotalMarkChange(
                        type,
                        e.target.value,
                      )
                    }
                    className="mt-3 w-full p-2 border border-surface-border rounded-lg bg-surface-muted focus:outline-none focus:border-primary text-center font-bold text-xs text-text-main transition-colors"
                  />
                </div>
              ),
          )}
        </div>
      </div>

      {/* =====================================================
          Students
      ====================================================== */}

      {selectedGroup &&
        selectedSession &&
        selectedExam && (
          <>
            {/* Header */}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-text-muted" />

                <input
                  type="text"
                  placeholder="ابحث باسم الطالب أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value,
                    )
                  }
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-surface-border bg-surface-card text-xs text-text-main focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Student Count */}

              <span className="px-3 py-1.5 bg-primary-subtle text-primary rounded-xl border border-primary/20 text-xs font-bold">
                عدد الطلاب:{" "}
                {filteredStudents.length}
              </span>
            </div>

            <div className="bg-surface-card p-3 sm:p-5 rounded-2xl border border-surface-border shadow-sm space-y-4">
              {fetchingStudents ? (
                <div className="flex justify-center items-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-xs">
                  لا يوجد طلاب يطابقون البحث أو المجموعة فارغة
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map(
                    (student, idx) => (
                      <div
                        key={
                          student.studentId ||
                          `student-${idx}`
                        }
                        className={`p-3.5 sm:p-4 rounded-2xl border bg-surface-card ${
                          student.isAbsent
                            ? "border-orange-200 border-r-4 border-r-orange-500 bg-orange-50/30"
                            : student.isLowGrade
                              ? "border-red-200 border-r-4 border-r-red-500 bg-red-50/30"
                              : "border-surface-border"
                        } hover:border-primary/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5`}
                      >
                        {/* Student Info */}

                        <div className="flex items-center gap-3 pb-2 md:pb-0 border-b md:border-b-0 border-surface-border/60">
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              student.isAbsent
                                ? "bg-orange-100 text-orange-600"
                                : student.isLowGrade
                                  ? "bg-red-100 text-red-600"
                                  : "bg-primary-subtle text-primary"
                            }`}
                          >
                            {idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="font-bold text-xs text-text-main truncate">
                                {student.studentName ||
                                  "بدون اسم"}
                              </h4>

                              {/* Absent Badge */}

                              {student.isAbsent ? (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[9px] font-bold">
                                  غائب
                                </span>
                              ) : student.isLowGrade ? (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold">
                                  مقصّر
                                </span>
                              ) : null}
                            </div>

                            <p className="text-[11px] text-text-muted dir-ltr text-right mt-0.5">
                              {student.studentPhone ||
                                "بدون رقم"}
                            </p>
                          </div>
                        </div>

                        {/* Marks + Parent Contact */}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {/* Parent Contact */}

                          {student.isLowGrade &&
                            !student.isAbsent && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleParentContactToggle(
                                    student,
                                  )
                                }
                                title={
                                  student.isParentContacted
                                    ? "تم فتح واتساب مع ولي الأمر — اضغط للإلغاء"
                                    : "تسجيل أن واتساب فُتح مع ولي الأمر"
                                }
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all duration-200 active:scale-95 ${
                                  student.isParentContacted
                                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                    : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                                }`}
                              >
                                <Phone className="w-3.5 h-3.5" />

                                {student.isParentContacted
                                  ? "تم فتح واتساب"
                                  : "لم يُفتح واتساب"}
                              </button>
                            )}

                          {/* WhatsApp exam result */}

                          <ModuleOnly moduleKey="whatsapp">
                          {student.isLowGrade &&
                            !student.isAbsent &&
                            (() => {
                              const hasParentPhone = Boolean(
                                normalizeEgyptianPhone(
                                  student.parentPhoneNumber,
                                ),
                              );

                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendExamResult(
                                      student,
                                    )
                                  }
                                  disabled={!hasParentPhone}
                                  title={
                                    hasParentPhone
                                      ? "فتح واتساب لإرسال النتيجة (يسجّل فتح واتساب)"
                                      : "لا يوجد رقم ولي أمر صحيح"
                                  }
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all duration-200 ${
                                    hasParentPhone
                                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 active:scale-95 cursor-pointer"
                                      : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                                  }`}
                                >
                                  <WhatsappLogo className="w-3.5 h-3.5" />
                                  إرسال النتيجة
                                </button>
                              );
                            })()}
                          </ModuleOnly>

                          {/* Marks */}

                          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                            {examTypeCards
                              .filter(
                                ({ type }) =>
                                  selectedTypes[
                                    type
                                  ].active,
                              )
                              .map(
                                ({
                                  type,
                                  label,
                                }) => {
                                  const currentMark =
                                    studentMarks[
                                      student
                                        .studentId
                                    ]?.[type];

                                  const isAbsent =
                                    currentMark ===
                                    -1;

                                  return (
                                    <div
                                      key={`student-${student.studentId}-type-${type}`}
                                      className={`flex items-center justify-between sm:justify-start gap-2 px-2.5 py-1.5 rounded-xl border ${
                                        isAbsent
                                          ? "bg-orange-50 border-orange-200"
                                          : "bg-surface-muted border-surface-border"
                                      }`}
                                    >
                                      <span
                                        className={`text-[11px] font-bold whitespace-nowrap ${
                                          isAbsent
                                            ? "text-orange-600"
                                            : "text-text-muted"
                                        }`}
                                      >
                                        {label.split(
                                          " ",
                                        )[0]}
                                        :
                                      </span>

                                      <input
                                        type="number"
                                        step="0.25"
                                        inputMode="decimal"
                                        min={
                                          isAbsent
                                            ? -1
                                            : 0
                                        }
                                        max={
                                          selectedTypes[
                                            type
                                          ]
                                            .totalMarks ||
                                          0
                                        }
                                        placeholder={`من ${
                                          selectedTypes[
                                            type
                                          ]
                                            .totalMarks ||
                                          0
                                        }`}
                                        value={
                                          currentMark ??
                                          student.examGrades?.find(
                                            (g) =>
                                              g.type ===
                                              type,
                                          )?.mark ??
                                          ""
                                        }
                                        disabled={
                                          isAbsent
                                        }
                                        onChange={(
                                          e,
                                        ) =>
                                          handleStudentMarkChange(
                                            student.studentId,
                                            type,
                                            e.target
                                              .value,
                                          )
                                        }
                                        className={`w-16 sm:w-16 p-1.5 rounded-lg text-center font-bold outline-none text-xs transition-colors ${
                                          isAbsent
                                            ? "border border-orange-200 bg-orange-100 text-orange-600 cursor-not-allowed"
                                            : "border border-surface-border bg-surface-card text-text-main focus:border-primary focus:ring-1 focus:ring-primary/20"
                                        }`}
                                      />
                                    </div>
                                  );
                                },
                              )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {/* Submit */}

              <div className="pt-3 border-t border-surface-border flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    students.length === 0
                  }
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-primary hover:bg-primary-hover text-text-inverse rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}

                  {loading
                    ? "جاري حفظ الدرجات..."
                    : "حفظ كل الدرجات"}
                </button>
              </div>
            </div>
          </>
        )}

      {/* =====================================================
          Delete Confirmation
      ====================================================== */}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() =>
          !loading &&
          setShowDeleteModal(false)
        }
        onConfirm={handleDeleteExam}
        loading={loading}
        title="حذف الامتحان"
        message="هل أنت متأكد من حذف هذا الامتحان؟ سيتم حذف جميع درجات الطلاب المرتبطة به ولا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف الامتحان"
        cancelText="إلغاء"
      />
    </div>
  );
}