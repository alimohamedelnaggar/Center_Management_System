import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit3,
  FilePenLine,
  Lock,
  RefreshCw,
  Save,
  ScanLine,
  Search,
  UserCheck,
  Users,
  WhatsappLogo,
  X,
} from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Pagination from "../../components/common/Pagination";
import QrScannerModal from "../../components/common/QrScannerModal";
import { getSessionLabel } from "../../components/getSessionLabel";
import { useAuth } from "../../context/useAuth";
import ModuleOnly from "../../components/common/ModuleOnly";
import { useBranding } from "../../context/useBranding";
import { attendanceService } from "../../services/attendanceService";
import { groupsService } from "../../services/groupsService";
import { normalizeEgyptianPhone } from "../../utils/phone";
import { extractStudentCode } from "../../utils/qrCode";
import {
  buildScanErrorOutcome,
  isLateScan,
  outcomeFromApiResponse,
} from "../../utils/scanOutcome";
import {
  buildTemplateWhatsAppLink,
  MESSAGE_TEMPLATE_KEYS,
} from "../../utils/whatsappTemplates";
import {
  attendanceConnection,
  startAttendanceConnection,
} from "../../services/signalr/attendanceHub";
import {
  mergeAttendanceRows,
  parseAttendanceHubPayload,
  selectAttendanceRows,
} from "../../utils/attendanceHubPayload";
import AttendanceStatsCards from "./AttendanceStatsCards";

const ATTENDANCE_STATUS = {
  ABSENT: 2,
  PRESENT: 1,
};

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = String(isoDate).split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

const checkSessionAvailability = (session, selectedDate) => {
  if (!session || !selectedDate) {
    return {
      isAvailable: false,
      reason: "يرجى اختيار الحصة والتاريخ",
    };
  }

  const now = new Date();
  const today =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");

  if (selectedDate > today) {
    return {
      isAvailable: false,
      reason: "لا يمكن تسجيل الحضور لتاريخ مستقبلي",
    };
  }

  return {
    isAvailable: true,
    reason: "",
  };
};

export default function AttendanceSheet() {
  const { user } = useAuth();
  const branding = useBranding();
  const centerName = branding?.center?.name || "";
  const isAdmin =
    user?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ===
      "CenterOwner" ||
    user?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ===
      "SuperAdmin";

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  const [students, setStudents] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [pageSize, setPageSize] = useState(600);

  const [attendanceMap, setAttendanceMap] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSessionEnded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // The live event is registered once, so it reads the current sheet from
  // these refs instead of a stale closure.
  const selectedSessionIdRef = useRef(selectedSessionId);
  const studentsRef = useRef(students);
  const manualStudentIdsRef = useRef(new Set());
  const lastScanRef = useRef(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [note, setNote] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Remaining absentees to notify one-by-one after the bulk action opens the
  // first WhatsApp link (we never open many tabs at once).
  const [bulkAbsentQueue, setBulkAbsentQueue] = useState([]);

  //--------------------------- start status : By Abdullah
  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    absentToday: 0,
    presentThisMonth: 0,
    attendanceRate: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const loadAttendanceStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      if (!isAdmin) return;
      const result = await attendanceService.getStats();
      if (result?.succeeded) {
        setAttendanceStats(result.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل الإحصائيات");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  //alert when refresh or close the page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty || isSaved) return;

      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, isSaved]);

  useEffect(() => {
    loadAttendanceStats();
  }, [loadAttendanceStats]);

  //--------------------------- end status : By Abdullah

  const isReadOnly = isSaved || isSessionEnded;

  const openNotesModal = (student) => {
    setSelectedStudent(student);
    setNote(attendanceMap[student.id]?.note || "");
    setIsNoteModalOpen(true);
  };

  const saveNote = () => {
    if (!selectedStudent) return;

    setAttendanceMap((prev) => ({
      ...prev,
      [selectedStudent.id]: {
        status: prev[selectedStudent.id]?.status ?? ATTENDANCE_STATUS.PRESENT,
        note: note,
      },
    }));

    setIsDirty(true);
    setIsNoteModalOpen(false);
    toast.success(`تم حفظ ملاحظة ${selectedStudent.fullName}`);
  };

  const promptUnsavedChanges = (onConfirmAction) => {
    if (isDirty && !isSaved) {
      setConfirmModal({
        isOpen: true,
        title: "تغييرات غير محفوظة",
        message:
          "لديك تغييرات غير محفوظة في كشف الحضور الحالي. هل أنت متأكد من التنقل وإلغاء التغييرات؟",
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          onConfirmAction();
        },
      });
      return false;
    }
    onConfirmAction();
    return true;
  };

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const data = await groupsService.getAll(1, 100);
      const groupList = data.items || data.data || data || [];

      setGroups(Array.isArray(groupList) ? groupList : []);

      if (groupList.length > 0) {
        setSelectedGroupId(groupList[0].id);
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchGroupSessions = async (groupId) => {
    if (!groupId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    try {
      setLoadingSessions(true);
      const data = await attendanceService.getSessionsByGroupId(groupId);
      const sessionList = data.items || data.data || data || [];

      setSessions(Array.isArray(sessionList) ? sessionList : []);

      if (sessionList.length > 0) {
        setSelectedSessionId(sessionList[0].id);
      } else {
        setSelectedSessionId("");
      }
    } catch (err) {
      //console.log(err);
      setSessions([]);
      setSelectedSessionId("");
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchGroupStudents = async () => {
    if (!selectedGroupId || !selectedSessionId || !attendanceDate) {
      setStudents([]);

      setAttendanceMap({});
      setIsDirty(false);
      manualStudentIdsRef.current.clear();

      return;
    }

    try {
      setLoadingStudents(true);
      setIsSaved(false);
      setIsDirty(false);

      const response = await attendanceService.getStudentsForAttendance({
        pageIndex: pageNumber,
        pageSize: pageSize,
        groupId: selectedGroupId,
        sessionId: selectedSessionId,
        attendanceDate: attendanceDate,
        search: searchQuery || "",
      });

      const resultData = response.data || response.items || response || [];
      const studentList =
        resultData.items || (Array.isArray(resultData) ? resultData : []);

      setStudents(studentList);
      setTotalCount(resultData.totalCount || 0);
      setTotalPages(resultData.totalPages || 1);

      const resetMap = {};
      studentList.forEach((s) => {
        resetMap[s.id] = {
          status:
            s.status !== null && s.status !== undefined
              ? s.status
              : ATTENDANCE_STATUS.PRESENT,
          note: s.notes || s.note || "",
        };
      });

      setAttendanceMap(resetMap);
      manualStudentIdsRef.current.clear();
    } catch (err) {
      //console.log(err);
      toast.error("تعذر جلب قائمة الطلاب للمجموعة المختارة");
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    fetchGroups();
    startAttendanceConnection();

    attendanceConnection.on("AttendanceSaved", (...args) => {
      const payload = parseAttendanceHubPayload(...args);

      const { rows, skipped, otherSession } = selectAttendanceRows(payload, {
        currentSessionId: selectedSessionIdRef.current,
        loadedStudentIds: studentsRef.current.map((student) => student.id),
        manualStudentIds: [...manualStudentIdsRef.current],
      });

      if (otherSession || rows.length === 0) {
        if (skipped > 0) {
          toast("تم تحديث الحضور لحظياً - لم يتم تغيير الطلاب المعدّلين يدوياً");
        }

        return;
      }

      // Only the cards of the loaded students are updated. The sheet is never
      // locked by a live event, an unsaved manual change stays unsaved.
      setAttendanceMap((prev) => mergeAttendanceRows(prev, rows));

      // A scan of this sheet already reported the student, no second toast.
      const lastScan = lastScanRef.current;
      const isOwnScan =
        rows.length === 1 &&
        lastScan &&
        lastScan.id === rows[0].id &&
        Date.now() - lastScan.at < 5000;

      if (!isOwnScan) {
        toast.success("تم تحديث الحضور لحظياً");
      }
    });

    return () => {
      attendanceConnection.off("AttendanceSaved");
    };
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupSessions(selectedGroupId);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && selectedSessionId) {
      fetchGroupStudents();
    }
  }, [
    selectedGroupId,
    selectedSessionId,
    attendanceDate,
    pageNumber,
    searchQuery,
  ]);

  const handlePageChange = (newPage) => {
    setPageNumber(newPage);
  };
  const handleDateChange = (newDate) => {
    setAttendanceDate(newDate);

    const currentSession = sessions.find((s) => s.id === selectedSessionId);
    if (!currentSession) return;

    const availability = checkSessionAvailability(currentSession, newDate);
    if (!availability.isAvailable) {
      toast.error(availability.reason);
      setIsSaved(true);
    } else {
      setIsSaved(false);
    }
  };

  const handleGroupChange = (newGroupId) => {
    if (newGroupId === selectedGroupId) return;
    promptUnsavedChanges(() => {
      setSelectedGroupId(newGroupId);
    });
  };

  const handleSessionChange = (newSessionId) => {
    if (newSessionId === selectedSessionId) return;
    promptUnsavedChanges(() => {
      setSelectedSessionId(newSessionId);
    });
  };

  const toggleAttendance = (studentId) => {
    if (isReadOnly) {
      toast.error(
        "الكشف مفعل عليه وضع الحفظ. اضغطي على زر 'تعديل الحضور' لتتمكني من التعديل.",
      );
      return;
    }

    setIsDirty(true);
    manualStudentIdsRef.current.add(studentId);
    setAttendanceMap((prev) => {
      const current = prev[studentId] || {
        status: ATTENDANCE_STATUS.PRESENT,
        note: "",
      };
      const nextStatus =
        current.status === ATTENDANCE_STATUS.PRESENT
          ? ATTENDANCE_STATUS.ABSENT
          : ATTENDANCE_STATUS.PRESENT;

      return {
        ...prev,
        [studentId]: {
          ...current,
          status: nextStatus,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!selectedGroupId) {
      toast.error("برجاء اختيار مجموعة أولاً");
      return;
    }

    if (!selectedSessionId) {
      toast.error("برجاء اختيار الحصة المراد تسجيل الحضور لها");
      return;
    }

    const currentSession = sessions.find((s) => s.id === selectedSessionId);
    const availability = checkSessionAvailability(
      currentSession,
      attendanceDate,
    );

    if (!availability.isAvailable) {
      toast.error(availability.reason);
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        sessionId: selectedSessionId,
        attendanceDate: attendanceDate,
        attendances: students.map((student) => {
          const item = attendanceMap[student.id] || {};
          return {
            studentId: student.id,
            status: Number(item.status) || ATTENDANCE_STATUS.ABSENT,
            notes: item.note || "",
            // note: item.note || "",
          };
        }),
      };

      await attendanceService.saveAttendance(payload);
      toast.success("تم حفظ سجل الحضور والغياب بنجاح");
      setIsSaved(true);
      setIsDirty(false);
      manualStudentIdsRef.current.clear();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "حدث خطأ أثناء حفظ الحضور";
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(
    (item) => item?.status === ATTENDANCE_STATUS.PRESENT,
  ).length;
  const absentCount = students.length - presentCount;

  // =========================================================
  // WhatsApp absence notices
  // =========================================================
  const selectedGroupName =
    groups.find((g) => g.id === selectedGroupId)?.name || "";

  const buildAbsenceWhatsAppLink = (student) =>
    buildTemplateWhatsAppLink(
      student.parentPhoneNumber,
      MESSAGE_TEMPLATE_KEYS.absence,
      {
        student: student.fullName,
        group: selectedGroupName,
        center: centerName,
        date: formatDisplayDate(attendanceDate),
      },
    );

  const handleSendAbsence = (student) => {
    const link = buildAbsenceWhatsAppLink(student);

    if (!link) {
      toast.error("لا يوجد رقم ولي أمر صحيح لهذا الطالب");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleBulkNotifyAbsentees = () => {
    // Absent = the map holds an explicit ABSENT status; only those with a valid
    // parent phone can be notified at all.
    const absentees = students.filter(
      (student) =>
        attendanceMap[student.id]?.status === ATTENDANCE_STATUS.ABSENT &&
        normalizeEgyptianPhone(student.parentPhoneNumber),
    );

    if (absentees.length === 0) {
      toast.error("لا يوجد غائبون لديهم رقم ولي أمر صحيح");
      return;
    }

    // Open the first link, then let the user send the rest one at a time.
    const [first, ...rest] = absentees;
    window.open(buildAbsenceWhatsAppLink(first), "_blank", "noopener,noreferrer");
    setBulkAbsentQueue(rest);
  };

  const handleScanDetect = async (scannedText) => {
    const code = extractStudentCode(scannedText);

    if (!selectedGroupId || !selectedSessionId) {
      const message = "برجاء اختيار مجموعة وحصة قبل المسح";

      toast.error(message);

      return buildScanErrorOutcome(code, message);
    }

    setIsScanning(true);

    try {
      const result = await attendanceService.scanAttendance({
        code,
        sessionId: selectedSessionId,
        attendanceDate,
      });

      const data = result?.data;

      if (result?.succeeded && data) {
        const studentId = data.studentId ?? data.StudentId;

        lastScanRef.current = { id: studentId, at: Date.now() };

        setAttendanceMap((prev) => ({
          ...prev,
          [studentId]: {
            status: data.status ?? data.Status ?? ATTENDANCE_STATUS.PRESENT,
            note: prev[studentId]?.note ?? data.notes ?? data.Notes ?? "",
          },
        }));

        toast.success(
          result.message ||
            `تم تسجيل حضور ${data.fullName ?? data.FullName ?? ""}`,
        );
      } else {
        toast.error(result?.message || "الكود ده مش مسجل.");
      }

      return outcomeFromApiResponse(result, {
        code,
        isLate: isLateScan(selectedSession?.startTime),
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "حدث خطأ أثناء تسجيل المسح";

      toast.error(errorMsg);

      return buildScanErrorOutcome(code, errorMsg);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 dir-rtl">
      {isAdmin && (
        <AttendanceStatsCards stats={attendanceStats} loading={loadingStats} />
      )}

      {/* Header */}
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-card border border-surface-border p-5
       rounded-2xl shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-subtle text-primary">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-main">
                تسجيل حضور الحصة
              </h2>
              {isSaved && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-success-bg text-status-success flex items-center gap-1 border border-status-success/20">
                  <CheckCircle2 className="w-3 h-3" /> تم اعتماد الحضور
                </span>
              )}
              {isDirty && !isSaved && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-warning-bg text-status-warning flex items-center gap-1 border border-status-warning/20">
                  تغييرات غير محفوظة
                </span>
              )}
              {isSessionEnded && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-danger-bg text-status-danger flex items-center gap-1 border border-status-danger/20">
                  <Lock className="w-3 h-3" /> الحصة منتهية
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {isReadOnly
                ? "تم قفل الحضور لهذا الشيت، اضغط على زر 'تعديل الحضور' للبدء في التعديل."
                : "اختر المجموعة والحصة ثم اضغط على كارت الطالب لتسجيل الحضور"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-muted px-3 py-1.5 rounded-xl border border-surface-border min-w-[180px]">
            <Users className="w-4 h-4 text-primary" />
            <select
              value={selectedGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              disabled={loadingGroups || isReadOnly}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              {loadingGroups ? (
                <option value="">جاري تحميل المجموعات...</option>
              ) : groups.length === 0 ? (
                <option value="">لا توجد مجموعات</option>
              ) : (
                groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name || group.Name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface-muted px-3 py-1.5 rounded-xl border border-surface-border min-w-[180px]">
            <BookOpen className="w-4 h-4 text-primary" />
            <select
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              disabled={loadingSessions || isReadOnly || sessions.length === 0}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none w-full cursor-pointer disabled:opacity-60"
            >
              {loadingSessions ? (
                <option value="">جاري تحميل الحصص...</option>
              ) : sessions.length === 0 ? (
                <option value="">لا توجد حصص للمجموعة</option>
              ) : (
                sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {getSessionLabel(session)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface-muted px-3 py-1.5 rounded-xl border border-surface-border">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input
              type="date"
              value={attendanceDate}
              disabled={isReadOnly}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-text-main focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 bg-status-success-bg text-status-success rounded-xl border border-status-success/20">
              حاضر: {presentCount}
            </span>
            <span className="px-3 py-1.5 bg-status-danger-bg text-status-danger rounded-xl border border-status-danger/20">
              غياب: {absentCount}
            </span>
          </div>
        </div>
      </div>

      {/* Search and save attendance */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-text-muted" />
          <inputSearch
            type="text"
            placeholder="ابحث باسم الطالب أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-surface-border bg-surface-card text-xs text-text-main focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            disabled={!selectedGroupId || !selectedSessionId}
            className="w-full sm:w-auto px-4 py-2.5 bg-surface-card hover:bg-surface-muted text-text-main rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-primary/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-primary" />
            مسح كارت
          </button>

          <ModuleOnly moduleKey="whatsapp">
          <button
            type="button"
            onClick={handleBulkNotifyAbsentees}
            disabled={absentCount === 0}
            title={
              absentCount === 0
                ? "لا يوجد غائبون"
                : "فتح واتساب لإشعار أول غائب ثم متابعة الباقي"
            }
            className="w-full sm:w-auto px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-green-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <WhatsappLogo className="w-4 h-4" />
            إشعار الغائبين
          </button>
          </ModuleOnly>

          {isSaved && !isSessionEnded && (
            <button
              onClick={() => setIsSaved(false)}
              className="px-4 py-2.5 bg-surface-muted hover:bg-surface-border text-text-main rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-surface-border transition-all active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-primary" />
              تعديل الحضور
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={
              isSaving ||
              loadingStudents ||
              students.length === 0 ||
              isReadOnly ||
              !selectedSessionId
            }
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-text-inverse rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isReadOnly ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isReadOnly ? "محفوظ ومغلق" : "حفظ الحضور"}
          </button>
        </div>
      </div>

      {/* loadingStudents */}
      {loadingStudents ? (
        <div className="flex justify-center items-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !selectedGroupId ? (
        <div className="text-center py-12 bg-surface-card rounded-2xl border border-surface-border text-text-muted text-xs">
          برجاء اختيار مجموعة لعرض الطلاب.
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-surface-card rounded-2xl border border-surface-border text-text-muted text-xs">
          لا يوجد طلاب مسجلين في هذه المجموعة.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {students.map((student) => {
            const studentItem = attendanceMap[student.id] || {};
            const isPresent = studentItem.status === ATTENDANCE_STATUS.PRESENT;
            const hasNote = Boolean(
              studentItem.note && studentItem.note.trim() !== "",
            );
            const hasParentPhone = Boolean(
              normalizeEgyptianPhone(student.parentPhoneNumber),
            );

            return (
              <div
                key={student.id}
                onClick={() => toggleAttendance(student.id)}
                className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none ${
                  isReadOnly
                    ? "cursor-not-allowed opacity-90"
                    : "cursor-pointer active:scale-95"
                } ${
                  isPresent
                    ? "bg-status-success-bg/60 border-status-success text-text-main shadow-xs"
                    : "bg-surface-card border-surface-border hover:border-primary/50 text-text-main"
                }`}
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-text-main line-clamp-1">
                    {student.fullName}
                  </h4>
                  <p className="text-[10px] text-text-muted dir-ltr text-right">
                    {student.phone || student.phoneNumber || "لا يوجد رقم"}
                  </p>

                  {hasNote && (
                    <p className="text-[10px] text-amber-600 font-semibold truncate mt-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 dir-rtl">
                      {studentItem.note}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-surface-border/60 flex items-center justify-between gap-1">
                  <span
                    className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      isPresent
                        ? "bg-status-success text-text-inverse"
                        : "bg-surface-muted text-text-muted"
                    }`}
                  >
                    {isPresent ? "حاضر ✓" : "غائب"}
                  </span>

                  {!isPresent && (
                    <ModuleOnly moduleKey="whatsapp">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendAbsence(student);
                      }}
                      disabled={!hasParentPhone}
                      title={
                        hasParentPhone
                          ? "إرسال إشعار غياب عبر واتساب"
                          : "لا يوجد رقم ولي أمر صحيح"
                      }
                      className={`p-1.5 rounded-lg transition ${
                        hasParentPhone
                          ? "hover:bg-green-50 text-green-600 cursor-pointer"
                          : "text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <WhatsappLogo className="w-4 h-4" />
                    </button>
                    </ModuleOnly>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openNotesModal(student);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-muted transition cursor-pointer"
                  >
                    <FilePenLine
                      className={`w-4 h-4 ${
                        hasNote ? "text-amber-500" : "text-slate-400"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize || 30}
        name="الطلاب"
        onPageChange={handlePageChange}
      />

      {confirmModal.isOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-card border border-surface-border w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 dir-rtl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2 text-status-warning">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-text-main">
                  {confirmModal.title}
                </h3>
              </div>
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="text-text-muted hover:text-text-main p-1 rounded-lg hover:bg-surface-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 bg-surface-muted hover:bg-surface-border text-text-main rounded-xl text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-status-danger text-text-inverse rounded-xl text-xs font-bold hover:bg-status-danger/90 transition-colors"
              >
                متابعة والتجاهل
              </button>
            </div>
          </div>
        </div>
      )}

      {isNoteModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-sm text-slate-800">
              ملاحظة الطالب: {selectedStudent?.fullName}
            </h3>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-32 border rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
              placeholder="اكتب الملاحظة هنا (مثال: سيحضر مع مجموعة الثلاثاء الساعة 5)..."
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                onClick={saveNote}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover"
              >
                حفظ الملاحظة
              </button>
            </div>
          </div>
        </div>
      )}

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetect={handleScanDetect}
        isBusy={isScanning}
        scanDisabled={!selectedGroupId || !selectedSessionId}
        scanDisabledReason="اختر المجموعة والحصة قبل ما تبدأ المسح."
      />

      {bulkAbsentQueue.length > 0 && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <WhatsappLogo className="w-5 h-5 text-green-600" />
                متابعة إشعار باقي الغائبين
              </h3>
              <button
                onClick={() => setBulkAbsentQueue([])}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              تم فتح واتساب لأول غائب. اضغط "إرسال" لكل طالب من القائمة لإكمال
              الإشعارات (بدون فتح كل الروابط مرة واحدة).
            </p>

            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {bulkAbsentQueue.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {student.fullName}
                    </p>
                    <p className="text-[10px] text-slate-500 dir-ltr text-right">
                      {student.parentPhoneNumber}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        buildAbsenceWhatsAppLink(student),
                        "_blank",
                        "noopener,noreferrer",
                      );
                      setBulkAbsentQueue((prev) =>
                        prev.filter((s) => s.id !== student.id),
                      );
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                  >
                    <WhatsappLogo className="w-3.5 h-3.5" />
                    إرسال
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex justify-end">
              <button
                onClick={() => setBulkAbsentQueue([])}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
