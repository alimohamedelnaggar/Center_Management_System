import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  Edit3,
  FilePenLine,
  Lock,
  MoreHorizontal,
  Percent,
  Save,
  ScanLine,
  Search,
  ShieldCheck,
  Users,
  WhatsappLogo,
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
  outcomeFromApiResponse,
} from "../../utils/scanOutcome";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_META,
  calculateAttendanceRate,
  formatAttendanceRate,
  getAttendanceStatusMeta,
  normalizeAttendanceStatus,
} from "../../utils/attendance";
import {
  buildTemplateWhatsAppLink,
  hasMessageTemplate,
  MESSAGE_TEMPLATE_KEYS,
} from "../../utils/whatsappTemplates";
import { useMessageTemplates } from "../../hooks/useMessageTemplates";
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
import AppModal from "../../components/ui/AppModal";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FormField from "../../components/ui/FormField";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import StatusPill from "../../components/ui/StatusPill";
import Textarea from "../../components/ui/Textarea";

const STATUS_ICONS = {
  [ATTENDANCE_STATUS.PRESENT]: CalendarCheck,
  [ATTENDANCE_STATUS.ABSENT]: CalendarX,
  [ATTENDANCE_STATUS.LATE]: Clock,
  [ATTENDANCE_STATUS.EXCUSED]: ShieldCheck,
};

const STATUS_ORDER = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.ABSENT,
  ATTENDANCE_STATUS.LATE,
  ATTENDANCE_STATUS.EXCUSED,
];

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
  const { bodies: templateBodies } = useMessageTemplates();
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

  // Which student's four-status menu is open, and the status the bulk action
  // applies to every loaded student.
  const [statusMenuStudentId, setStatusMenuStudentId] = useState(null);
  const [bulkStatus, setBulkStatus] = useState(ATTENDANCE_STATUS.PRESENT);

  // Remaining absentees to notify one-by-one after the bulk action opens the
  // first WhatsApp link (we never open many tabs at once).
  const [bulkAbsentQueue, setBulkAbsentQueue] = useState([]);

  //--------------------------- start status : By Abdullah
  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    excusedToday: 0,
    totalToday: 0,
    presentThisMonth: 0,
    absentThisMonth: 0,
    lateThisMonth: 0,
    excusedThisMonth: 0,
    totalThisMonth: 0,
    attendanceRate: null,
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
            normalizeAttendanceStatus(s.status) ?? ATTENDANCE_STATUS.PRESENT,
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

  const ensureEditable = () => {
    if (isReadOnly) {
      toast.error(
        "الكشف مقفول. اضغط على زر «تعديل الحضور» للبدء في التعديل.",
      );
      return false;
    }

    return true;
  };

  const setStudentStatus = (studentId, status) => {
    if (!ensureEditable()) return;

    const normalized = normalizeAttendanceStatus(status);
    if (!normalized) return;

    setIsDirty(true);
    manualStudentIdsRef.current.add(studentId);
    setAttendanceMap((prev) => {
      const current = prev[studentId] || { status: ATTENDANCE_STATUS.PRESENT, note: "" };

      return {
        ...prev,
        [studentId]: { ...current, status: normalized },
      };
    });
    setStatusMenuStudentId(null);
  };

  /**
   * One click on the card keeps the old present ↔ absent toggle. Late/Excused
   * are chosen from the small menu (or a manual scan that resolves to Late).
   */
  const toggleAttendance = (studentId) => {
    if (!ensureEditable()) return;

    setStatusMenuStudentId(null);
    setIsDirty(true);
    manualStudentIdsRef.current.add(studentId);
    setAttendanceMap((prev) => {
      const current = prev[studentId] || {
        status: ATTENDANCE_STATUS.PRESENT,
        note: "",
      };
      const currentStatus =
        normalizeAttendanceStatus(current.status) ?? ATTENDANCE_STATUS.PRESENT;
      const nextStatus =
        currentStatus === ATTENDANCE_STATUS.PRESENT
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

  const handleBulkSetStatus = () => {
    if (!ensureEditable()) return;
    if (students.length === 0) {
      toast.error("لا يوجد طلاب لتطبيق الحالة عليهم");
      return;
    }

    const status =
      normalizeAttendanceStatus(bulkStatus) ?? ATTENDANCE_STATUS.PRESENT;

    setIsDirty(true);
    students.forEach((student) => manualStudentIdsRef.current.add(student.id));
    setAttendanceMap((prev) => {
      const next = { ...prev };
      students.forEach((student) => {
        next[student.id] = {
          ...(prev[student.id] || { note: "" }),
          status,
        };
      });
      return next;
    });

    toast.success(
      `تم تعيين جميع الطلاب كـ «${getAttendanceStatusMeta(status).label}»`,
    );
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
            status:
              normalizeAttendanceStatus(item.status) ??
              ATTENDANCE_STATUS.ABSENT,
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

  const statusCounts = students.reduce(
    (counts, student) => {
      const status =
        normalizeAttendanceStatus(attendanceMap[student.id]?.status) ??
        ATTENDANCE_STATUS.PRESENT;

      if (status === ATTENDANCE_STATUS.PRESENT) counts.present += 1;
      else if (status === ATTENDANCE_STATUS.ABSENT) counts.absent += 1;
      else if (status === ATTENDANCE_STATUS.LATE) counts.late += 1;
      else if (status === ATTENDANCE_STATUS.EXCUSED) counts.excused += 1;

      return counts;
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  );

  const presentCount = statusCounts.present;
  const absentCount = statusCounts.absent;
  const lateCount = statusCounts.late;
  const excusedCount = statusCounts.excused;
  const sheetAttendanceRate = calculateAttendanceRate({
    ...statusCounts,
    total: students.length,
  });

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
      templateBodies,
    );

  const handleSendAbsence = (student) => {
    if (!hasMessageTemplate(MESSAGE_TEMPLATE_KEYS.absence, templateBodies)) {
      toast.error("تعذر تحميل قالب الرسالة، حاول مرة أخرى");
      return;
    }

    const link = buildAbsenceWhatsAppLink(student);

    if (!link) {
      toast.error("لا يوجد رقم ولي أمر صحيح لهذا الطالب");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleBulkNotifyAbsentees = () => {
    if (!hasMessageTemplate(MESSAGE_TEMPLATE_KEYS.absence, templateBodies)) {
      toast.error("تعذر تحميل قالب الرسالة، حاول مرة أخرى");
      return;
    }

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
        const status =
          normalizeAttendanceStatus(data.status ?? data.Status) ??
          ATTENDANCE_STATUS.PRESENT;

        lastScanRef.current = { id: studentId, at: Date.now() };

        setAttendanceMap((prev) => ({
          ...prev,
          [studentId]: {
            status,
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

      return outcomeFromApiResponse(result, { code });
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
    <div
      data-testid="attendance-page"
      className="dir-rtl mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6"
    >
      {isAdmin && (
        <AttendanceStatsCards stats={attendanceStats} loading={loadingStats} />
      )}

      <PageHeader
        title="تسجيل حضور الحصة"
        subtitle={
          isReadOnly
            ? "تم قفل الكشف. اضغط على زر «تعديل الحضور» للبدء في التعديل."
            : "اختر المجموعة والحصة، ثم اضغط على كارت الطالب للتبديل بين حاضر وغائب."
        }
        actions={
          <>
            {isSaved && !isSessionEnded && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSaved(false)}
                data-testid="attendance-edit"
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                تعديل الحضور
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              disabled={
                loadingStudents ||
                students.length === 0 ||
                isReadOnly ||
                !selectedSessionId
              }
              data-testid="attendance-save"
            >
              {isReadOnly ? (
                <Lock className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {isReadOnly ? "محفوظ ومغلق" : "حفظ الحضور"}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {isSaved && (
          <StatusPill tone="success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            تم اعتماد الحضور
          </StatusPill>
        )}
        {isDirty && !isSaved && (
          <StatusPill tone="warning">تغييرات غير محفوظة</StatusPill>
        )}
        {isSessionEnded && (
          <StatusPill tone="danger">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            الحصة منتهية
          </StatusPill>
        )}
        <StatusPill tone="neutral" dot={false}>
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {students.length} طالب في الكشف
        </StatusPill>
      </div>

      <Card data-testid="attendance-controls">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FormField label="المجموعة" htmlFor="attendance-group">
              <div className="relative">
                <Users
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                  aria-hidden="true"
                />
                <Select
                  id="attendance-group"
                  data-testid="attendance-group"
                  value={selectedGroupId}
                  onChange={(event) => handleGroupChange(event.target.value)}
                  disabled={loadingGroups || isReadOnly}
                  className="pe-10"
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
                </Select>
              </div>
            </FormField>

            <FormField label="الحصة" htmlFor="attendance-session">
              <div className="relative">
                <BookOpen
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                  aria-hidden="true"
                />
                <Select
                  id="attendance-session"
                  data-testid="attendance-session"
                  value={selectedSessionId}
                  onChange={(event) => handleSessionChange(event.target.value)}
                  disabled={
                    loadingSessions || isReadOnly || sessions.length === 0
                  }
                  className="pe-10"
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
                </Select>
              </div>
            </FormField>

            <FormField label="تاريخ الحضور" htmlFor="attendance-date">
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="attendance-date"
                  data-testid="attendance-date"
                  type="date"
                  value={attendanceDate}
                  disabled={isReadOnly}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="pe-10"
                />
              </div>
            </FormField>

            <FormField label="بحث" htmlFor="attendance-search">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="attendance-search"
                  data-testid="attendance-search"
                  type="search"
                  placeholder="ابحث باسم الطالب أو الهاتف..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pe-10"
                />
              </div>
            </FormField>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {STATUS_ORDER.map((status) => {
              const meta = ATTENDANCE_STATUS_META[status];
              const Icon = STATUS_ICONS[status];
              const count =
                status === ATTENDANCE_STATUS.PRESENT
                  ? presentCount
                  : status === ATTENDANCE_STATUS.ABSENT
                    ? absentCount
                    : status === ATTENDANCE_STATUS.LATE
                      ? lateCount
                      : excusedCount;

              return (
                <span
                  key={status}
                  data-testid={`attendance-count-${meta.key}`}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-transparent px-3 py-1.5 ${meta.pillClass}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {meta.shortLabel}: {count}
                </span>
              );
            })}
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-transparent bg-primary-subtle px-3 py-1.5 text-primary">
              <Percent className="h-3.5 w-3.5" aria-hidden="true" />
              النسبة: {formatAttendanceRate(sheetAttendanceRate)}
            </span>
          </div>

          <div className="flex flex-col gap-3 border-t border-surface-border pt-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="rounded-control border border-surface-border bg-surface-muted/60 p-2">
                <span className="mb-1 block text-[11px] font-bold text-text-muted">
                  تسجيل جماعي
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkStatus}
                    onChange={(event) =>
                      setBulkStatus(Number(event.target.value))
                    }
                    disabled={isReadOnly || students.length === 0}
                    aria-label="حالة التسجيل الجماعي"
                    className="min-h-11 cursor-pointer rounded-control border border-surface-border bg-surface-card px-2 text-xs font-bold text-text-main outline-none focus:border-primary disabled:opacity-60"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {ATTENDANCE_STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleBulkSetStatus}
                    disabled={isReadOnly || students.length === 0}
                    data-testid="attendance-bulk-apply"
                  >
                    تطبيق
                  </Button>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                disabled={!selectedGroupId || !selectedSessionId}
                data-testid="attendance-scan"
              >
                <ScanLine className="h-4 w-4 text-primary" aria-hidden="true" />
                مسح كارت
              </Button>

              <ModuleOnly moduleKey="whatsapp">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkNotifyAbsentees}
                  disabled={absentCount === 0}
                  title={
                    absentCount === 0
                      ? "لا يوجد غائبون"
                      : "فتح واتساب لإشعار أول غائب ثم متابعة الباقي"
                  }
                  data-testid="attendance-whatsapp-bulk"
                >
                  <WhatsappLogo className="h-4 w-4" aria-hidden="true" />
                  إشعار الغائبين
                </Button>
              </ModuleOnly>
            </div>
          </div>
        </CardBody>
      </Card>

      {loadingStudents ? (
        <div
          data-testid="attendance-loading"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="rounded-card border border-surface-border bg-surface-card p-4 shadow-soft"
            >
              <Skeleton className="mb-3 h-5 w-2/3" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : !selectedGroupId ? (
        <Card data-testid="attendance-empty-group">
          <EmptyState
            icon={Users}
            title="اختر مجموعة لعرض الطلاب"
            description="اختر المجموعة والحصة والتاريخ من الأعلى، ثم ابدأ تسجيل الحضور."
          />
        </Card>
      ) : students.length === 0 ? (
        <Card data-testid="attendance-empty-students">
          <EmptyState
            icon={CalendarX}
            title="لا يوجد طلاب مسجلون في هذه المجموعة"
            description="أضف طلابًا من صفحة الطلاب ثم ارجع لتسجيل الحضور."
          />
        </Card>
      ) : (
        <div
          data-testid="attendance-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {students.map((student) => {
            const studentItem = attendanceMap[student.id] || {};
            const studentStatus =
              normalizeAttendanceStatus(studentItem.status) ??
              ATTENDANCE_STATUS.PRESENT;
            const statusMeta = ATTENDANCE_STATUS_META[studentStatus];
            const StatusIcon = STATUS_ICONS[studentStatus];
            const isMenuOpen = statusMenuStudentId === student.id;
            const hasNote = Boolean(
              studentItem.note && studentItem.note.trim() !== "",
            );
            const hasParentPhone = Boolean(
              normalizeEgyptianPhone(student.parentPhoneNumber),
            );

            return (
              <article
                key={student.id}
                data-testid={`attendance-student-${student.id}`}
                aria-label={`${student.fullName} - ${statusMeta.label}`}
                onClick={() => toggleAttendance(student.id)}
                className={`relative flex min-h-32 flex-col justify-between gap-3 rounded-card border p-4 transition-all duration-200 select-none ${
                  isReadOnly
                    ? "cursor-not-allowed opacity-90"
                    : "cursor-pointer active:scale-[0.98]"
                } ${statusMeta.panelClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-text-main">
                      {student.fullName}
                    </h4>
                    <p
                      className="mt-0.5 truncate text-xs text-text-muted"
                      dir="ltr"
                    >
                      {student.phone || student.phoneNumber || "لا يوجد رقم"}
                    </p>
                  </div>

                  <span
                    title={`الحالة: ${statusMeta.label} — اضغط على الكارت للتبديل بين حاضر وغائب`}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-pill px-2 py-1 text-xs font-bold ${statusMeta.pillClass}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {statusMeta.label}
                  </span>
                </div>

                {hasNote && (
                  <p className="truncate rounded-control border border-status-warning/30 bg-status-warning-bg px-2 py-1 text-[11px] font-semibold text-status-warning">
                    {studentItem.note}
                  </p>
                )}

                <div className="flex items-center gap-1.5 border-t border-surface-border/60 pt-2.5">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    aria-label={`تغيير حالة ${student.fullName}`}
                    title="متأخر / بعذر"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!ensureEditable()) return;
                      setStatusMenuStudentId(isMenuOpen ? null : student.id);
                    }}
                    className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2 text-[11px] font-bold text-text-main transition-colors hover:bg-surface-muted"
                  >
                    <MoreHorizontal
                      className="h-4 w-4 text-text-muted"
                      aria-hidden="true"
                    />
                    متأخر / بعذر
                  </button>

                  {studentStatus === ATTENDANCE_STATUS.ABSENT && (
                    <ModuleOnly moduleKey="whatsapp">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSendAbsence(student);
                        }}
                        disabled={!hasParentPhone}
                        title={
                          hasParentPhone
                            ? "إرسال إشعار غياب عبر واتساب"
                            : "لا يوجد رقم ولي أمر صحيح"
                        }
                        aria-label={`إشعار واتساب لولي أمر ${student.fullName}`}
                        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border transition ${
                          hasParentPhone
                            ? "cursor-pointer border-status-success/30 bg-status-success-bg text-status-success hover:opacity-80"
                            : "cursor-not-allowed border-surface-border text-text-muted/50"
                        }`}
                      >
                        <WhatsappLogo
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </button>
                    </ModuleOnly>
                  )}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openNotesModal(student);
                    }}
                    title="ملاحظة"
                    aria-label={`ملاحظة ${student.fullName}`}
                    className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control border border-surface-border bg-surface-card transition-colors hover:bg-surface-muted"
                  >
                    <FilePenLine
                      className={`h-4 w-4 ${
                        hasNote ? "text-status-warning" : "text-text-muted"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {isMenuOpen && (
                  <div
                    role="menu"
                    aria-label={`حالة ${student.fullName}`}
                    className="rounded-control border border-surface-border bg-surface-muted/60 p-1"
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {STATUS_ORDER.map((status) => {
                        const meta = ATTENDANCE_STATUS_META[status];
                        const MenuIcon = STATUS_ICONS[status];
                        const isActive = status === studentStatus;

                        return (
                          <button
                            key={status}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isActive}
                            onClick={(event) => {
                              event.stopPropagation();
                              setStudentStatus(student.id, status);
                              setStatusMenuStudentId(null);
                            }}
                            className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-right text-xs font-bold transition-colors hover:bg-surface-muted ${
                              isActive ? meta.pillClass : "text-text-main"
                            }`}
                          >
                            <MenuIcon
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            {meta.label}
                            {isActive && (
                              <CheckCircle2
                                className="me-auto h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
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

      <AppModal
        open={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
        title={confirmModal.title}
        icon={AlertTriangle}
        testId="attendance-confirm"
        size="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setConfirmModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              إلغاء
            </Button>
            <Button variant="danger" size="sm" onClick={confirmModal.onConfirm}>
              متابعة والتجاهل
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-text-muted">
          {confirmModal.message}
        </p>
      </AppModal>

      <AppModal
        open={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={`ملاحظة الطالب: ${selectedStudent?.fullName ?? ""}`}
        icon={FilePenLine}
        testId="attendance-note"
        size="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNoteModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button size="sm" onClick={saveNote} data-testid="attendance-note-save">
              حفظ الملاحظة
            </Button>
          </div>
        }
      >
        <FormField label="الملاحظة" htmlFor="attendance-note-input">
          <Textarea
            id="attendance-note-input"
            data-testid="attendance-note-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            placeholder="اكتب الملاحظة هنا (مثال: سيحضر مع مجموعة الثلاثاء الساعة 5)..."
          />
        </FormField>
      </AppModal>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetect={handleScanDetect}
        isBusy={isScanning}
        scanDisabled={!selectedGroupId || !selectedSessionId}
        scanDisabledReason="اختر المجموعة والحصة قبل بدء المسح."
      />

      <AppModal
        open={bulkAbsentQueue.length > 0}
        onClose={() => setBulkAbsentQueue([])}
        title="متابعة إشعار باقي الغائبين"
        icon={WhatsappLogo}
        testId="attendance-bulk-whatsapp"
        size="max-w-md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkAbsentQueue([])}
            >
              إغلاق
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-text-muted">
            تم فتح واتساب لأول غائب. اضغط «إرسال» لكل طالب من القائمة لإكمال
            الإشعارات (بدون فتح كل الروابط مرة واحدة).
          </p>

          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {bulkAbsentQueue.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between gap-2 rounded-control border border-surface-border bg-surface-muted px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text-main">
                    {student.fullName}
                  </p>
                  <p
                    className="truncate text-xs text-text-muted"
                    dir="ltr"
                  >
                    {student.parentPhoneNumber}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.open(
                      buildAbsenceWhatsAppLink(student),
                      "_blank",
                      "noopener,noreferrer",
                    );
                    setBulkAbsentQueue((prev) =>
                      prev.filter((item) => item.id !== student.id),
                    );
                  }}
                >
                  <WhatsappLogo className="h-3.5 w-3.5" aria-hidden="true" />
                  إرسال
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </AppModal>
    </div>
  );
}
