import { BookOpen, CheckCircle2, RefreshCw, Search } from "@/components/icons";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getSessionLabel } from "../../components/getSessionLabel";
import { examService } from "../../services/examService";
import {
  examConnection,
  startExamConnection,
} from "../../services/signalr/examSignalR";

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

export default function ExamTab() {
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTypes, setSelectedTypes] = useState({
    [EXAM_TYPES.Paragraph]: { active: false, totalMarks: "" },
    [EXAM_TYPES.Recitation]: { active: false, totalMarks: "" },
    [EXAM_TYPES.Exam]: { active: false, totalMarks: "" },
  });

  const [studentMarks, setStudentMarks] = useState({});
  const DRAFT_KEY = "examTab_draft_v1";
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    startExamConnection();

    const handleExamAdded = (data) => {
      toast.success(`تم إضافة امتحان جديد: ${data.name || ""}`);
    };

    examConnection.on("ExamAdded", handleExamAdded);

    return () => {
      examConnection.off("ExamAdded", handleExamAdded);
    };
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await examService.getGroups();
        setGroups(normalizeList(res));
      } catch (err) {
        toast.error("حدث خطأ أثناء تحميل المجموعات", err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  // const handleGroupChange = async (groupId) => {
  //   setSelectedGroup(groupId);
  //   setSelectedSession("");
  //   setStudents([]);
  //   setStudentMarks({});
  //   setSessions([]);

  //   if (!groupId) return;

  //   setFetchingStudents(true);

  //   const [sessionsResult, studentsResult] = await Promise.allSettled([
  //     examService.getSessionsByGroup(groupId),
  //     examService.getStudentsByGroup(groupId),
  //   ]);

  //   if (sessionsResult.status === "fulfilled") {
  //     setSessions(normalizeList(sessionsResult.value));
  //   } else {
  //     console.error("getSessionsByGroup failed:", sessionsResult.reason);
  //     toast.error("تعذر جلب الحصص لهذه المجموعة");
  //   }

  //   if (studentsResult.status === "fulfilled") {
  //     setStudents(normalizeList(studentsResult.value));
  //   } else {
  //     console.error("getStudentsByGroup failed:", studentsResult.reason);
  //     toast.error("تعذر جلب الطلاب لهذه المجموعة");
  //   }

  //   setFetchingStudents(false);
  // };
  // fetch sessions & students for a group WITHOUT resetting anything
  // (يُستخدم عند تغيير المجموعة يدويًا، وأيضًا عند استرجاع Draft محفوظ)
  const loadGroupData = async (groupId) => {
    setFetchingStudents(true);

    const [sessionsResult, studentsResult] = await Promise.allSettled([
      examService.getSessionsByGroup(groupId),
      examService.getStudentsByGroup(groupId),
    ]);

    if (sessionsResult.status === "fulfilled") {
      setSessions(normalizeList(sessionsResult.value));
    } else {
      console.error("getSessionsByGroup failed:", sessionsResult.reason);
      toast.error("تعذر جلب الحصص لهذه المجموعة");
    }

    if (studentsResult.status === "fulfilled") {
      setStudents(normalizeList(studentsResult.value));
    } else {
      console.error("getStudentsByGroup failed:", studentsResult.reason);
      toast.error("تعذر جلب الطلاب لهذه المجموعة");
    }

    setFetchingStudents(false);
  };

  const handleGroupChange = async (groupId) => {
    setSelectedGroup(groupId);
    setSelectedSession("");
    setStudents([]);
    setStudentMarks({});
    setSessions([]);

    if (!groupId) return;

    await loadGroupData(groupId);
  };
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        setExamName(draft.examName || "");
        setExamDate(draft.examDate || new Date().toISOString().split("T")[0]);
        if (draft.selectedTypes) setSelectedTypes(draft.selectedTypes);
        if (draft.studentMarks) setStudentMarks(draft.studentMarks);

        if (draft.selectedGroup) {
          setSelectedGroup(draft.selectedGroup);
          loadGroupData(draft.selectedGroup).then(() => {
            if (draft.selectedSession)
              setSelectedSession(draft.selectedSession);
          });
        }
      } catch (e) {
        console.error("Failed to restore exam draft", e);
      }
    }
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;

    const hasData =
      selectedGroup || examName.trim() || Object.keys(studentMarks).length > 0;

    if (!hasData) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    const draft = {
      selectedGroup,
      selectedSession,
      examName,
      examDate,
      selectedTypes,
      studentMarks,
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    draftRestored,
    selectedGroup,
    selectedSession,
    examName,
    examDate,
    selectedTypes,
    studentMarks,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasData =
        selectedGroup ||
        examName.trim() ||
        Object.keys(studentMarks).length > 0;
      if (!hasData) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [selectedGroup, examName, studentMarks]);

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: { ...prev[type], active: !prev[type].active },
    }));
  };

  const handleTotalMarkChange = (type, value) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: { ...prev[type], totalMarks: value },
    }));
    setStudentMarks((prev) => {
      const updated = { ...prev };

      students.forEach((student) => {
        updated[student.id] = {
          ...(updated[student.id] || {}),
          [type]: Number(value),
        };
      });

      return updated;
    });
  };

  const handleStudentMarkChange = (studentId, type, mark) => {
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [type]: mark,
      },
    }));
  };

  const filteredStudents = students.filter((s) => {
    const nameMatch = s.fullName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const phoneMatch =
      s.phone?.includes(searchQuery) || s.phoneNumber?.includes(searchQuery);
    return nameMatch || phoneMatch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedGroup) return toast.error("يرجى اختيار المجموعة أولاً");
    if (!selectedSession) return toast.error("يرجى اختيار الحصة");
    if (!examName.trim()) return toast.error("يرجى إدخال اسم الامتحان");

    const activeComponents = Object.entries(selectedTypes)
      .filter(([_, value]) => value.active)
      .map(([type, value]) => ({
        type: Number(type),
        totalMarks: Number(value.totalMarks),
      }));

    if (activeComponents.length === 0) {
      return toast.error(
        "اختر نوع تقييم واحد على الأقل (برجراف / تسميع / امتحان)",
      );
    }

    for (const comp of activeComponents) {
      if (!comp.totalMarks || comp.totalMarks <= 0) {
        return toast.error("يرجى تحديد الدرجة الكلية للمكونات المحددة");
      }
    }

    const studentPayload = students.map((s) => ({
      studentId: s.id,
      marks: activeComponents.map((comp) => ({
        type: comp.type,
        mark: Number(studentMarks[s.id]?.[comp.type] || 0),
      })),
    }));

    const payload = {
      name: examName,
      groupId: selectedGroup,
      sessionId: selectedSession,
      examDate: new Date(examDate).toISOString(),
      components: activeComponents,
      students: studentPayload,
    };

    try {
      setLoading(true);
      await examService.create(payload);
      toast.success("تم تسجيل الامتحان ودرجات الطلاب بنجاح ");
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  const examTypeCards = [
    { type: EXAM_TYPES.Paragraph, label: "برجراف " },
    { type: EXAM_TYPES.Recitation, label: "تسميع " },
    { type: EXAM_TYPES.Exam, label: "امتحان " },
  ];

  // ----------------------------- start stats : by abdullah
  // ----------------------------- end stats : by abdullah

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 dir-rtl" dir="rtl">
      <div className="bg-surface-card border border-surface-border p-5 rounded-2xl shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-subtle text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main">
              رصد درجات اختبار جديد
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              اختر المجموعة والحصة، وحدد أنواع التقييم، ثم سجل درجات الطلاب
            </p>
          </div>
        </div>

        {/* select group and session and write exam name and date */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="flex items-center gap-2 bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border">
            <select
              value={selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              disabled={loadingGroups}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              <option value="">
                {loadingGroups ? "جاري تحميل المجموعات..." : "اختر المجموعة..."}
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              disabled={!selectedGroup || fetchingStudents}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              <option value="">اختر الحصة...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {getSessionLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="اسم الامتحان / العنوان"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-colors"
          />

          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="bg-surface-muted px-3 py-2.5 rounded-xl border border-surface-border text-xs font-bold text-text-main focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Exam Types Selection */}
        <div className="border-t border-surface-border pt-4">
          <label className="block text-xs font-bold mb-3 text-text-main">
            حدد أجزاء التقييم والدرجات الكلية:
          </label>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            {examTypeCards.map(({ type, label }) => (
              <div
                key={type}
                className={`p-4 rounded-2xl border transition-all duration-200 ${
                  selectedTypes[type].active
                    ? "bg-primary-subtle border-primary"
                    : "bg-surface-card border-surface-border hover:border-primary/50"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer font-bold text-xs text-text-main">
                  <input
                    type="checkbox"
                    checked={selectedTypes[type].active}
                    onChange={() => handleTypeToggle(type)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                  <span>{label}</span>
                </label>
                {selectedTypes[type].active && (
                  <input
                    type="number"
                    step="0.25"
                    inputMode="decimal"
                    placeholder="الدرجة الكلية"
                    value={selectedTypes[type].totalMarks}
                    onChange={(e) =>
                      handleTotalMarkChange(type, e.target.value)
                    }
                    className="mt-3 w-full p-2 border border-surface-border rounded-lg bg-surface-muted focus:outline-none focus:border-primary text-center font-bold text-xs text-text-main transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* display students and their marks inputs */}
      {selectedGroup && (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-text-muted" />
              <input
                type="text"
                placeholder="ابحث باسم الطالب أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-xl border border-surface-border bg-surface-card text-xs text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <span className="px-3 py-1.5 bg-primary-subtle text-primary rounded-xl border border-primary/20 text-xs font-bold">
              عدد الطلاب: {filteredStudents.length}
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
                {filteredStudents.map((student, idx) => (
                  <div
                    key={student.id || idx}
                    className="p-3.5 sm:p-4 rounded-2xl border border-surface-border bg-surface-card hover:border-primary/40 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                  >
                    {/* Header Card: Student Info */}
                    <div className="flex items-center gap-3 pb-2 md:pb-0 border-b md:border-b-0 border-surface-border/60">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-subtle flex items-center justify-center font-bold text-primary text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-text-main truncate">
                          {student.fullName}
                        </h4>
                        <p className="text-[11px] text-text-muted dir-ltr text-right mt-0.5">
                          {student.phone || student.phoneNumber || "بدون رقم"}
                        </p>
                      </div>
                    </div>

                    {/* Marks Inputs Grid */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                      {examTypeCards
                        .filter(({ type }) => selectedTypes[type].active)
                        .map(({ type, label }) => (
                          <div
                            key={type}
                            className="flex items-center justify-between sm:justify-start gap-2 bg-surface-muted px-2.5 py-1.5 rounded-xl border border-surface-border"
                          >
                            <span className="text-[11px] font-bold text-text-muted whitespace-nowrap">
                              {label.split(" ")[0]}:
                            </span>
                            <input
                              type="number"
                              step="0.25"
                              inputMode="decimal"
                              placeholder={`من ${selectedTypes[type].totalMarks || 0}`}
                              value={
                                studentMarks[student.id]?.[type] ??
                                selectedTypes[type].totalMarks ??
                                ""
                              }
                              onChange={(e) =>
                                handleStudentMarkChange(
                                  student.id,
                                  type,
                                  e.target.value,
                                )
                              }
                              className="w-16 sm:w-16 p-1.5 border border-surface-border rounded-lg text-center bg-surface-card font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-xs text-text-main transition-colors"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-3 border-t border-surface-border flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading || students.length === 0}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-primary hover:bg-primary-hover text-text-inverse rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {loading ? "جاري حفظ الدرجات..." : "حفظ كل الدرجات"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
