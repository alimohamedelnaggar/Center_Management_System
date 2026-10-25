import { useEffect, useState } from "react";
import {
  Trash2,
  Folder,
  Loader2,
  Edit,
  X,
  Calendar,
  Users,
  Clock,
} from "@/components/icons";
import { groupsService } from "../../services/groupsService";
import { useAuth } from "../../context/useAuth";
import toast from "react-hot-toast";
import ConfirmModal from "../common/ConfirmModal";
import {
  groupConnection,
  startGroupConnection,
} from "../../services/signalr/groupHub";
import GroupSessionsModal from "../common/GroupSessionsModal";
import Pagination from "../common/Pagination";
import GroupForm from "./GroupForm";

// .NET DayOfWeek: 0 = Sunday .. 6 = Saturday
const DAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function GroupsList({ readOnly = false }) {
  const { isSoloCenter } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedGroupForSessions, setSelectedGroupForSessions] =
    useState(null);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [totalGroups, setTotalGroups] = useState(0);
  const handleOpenSessions = (group) => {
    setSelectedGroupForSessions(group);
    setIsSessionsModalOpen(true);
  };

  const [editGroupData, setEditGroupData] = useState({
    id: null,
    name: "",
    monthlyPrice: 0,
    sessionsPerMonth: 8,
    teacherId: "",
  });
  const PAGE_SIZE = 6;
  const fetchGroups = async (pageNumber) => {
    try {
      setLoading(true);
      const response = await groupsService.getAll(pageNumber, PAGE_SIZE);

      const itemsList = response.items || response.data || response || [];
      const total = response.totalPages || response.pageCount || 1;
      const count = response.totalCount || response.totalItems || 0;

      setGroups(Array.isArray(itemsList) ? itemsList : []);
      setTotalPages(total);
      setTotalGroups(count);
    } catch (err) {
      toast.error("حدث خطأ أثناء تحميل المجموعات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (group) => {
    setEditGroupData({
      id: group.id,
      name: group.name || group.Name || "",
      monthlyPrice: group.monthlyPrice || 0,
      sessionsPerMonth: group.sessionsPerMonth || 8,
      // Preload the currently linked teacher so a multi-center edit cannot
      // silently drop the TeacherGroup link.
      teacherId: group.teacherId || group.TeacherId || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (data) => {
    try {
      const payload = {
        Id: editGroupData.id,
        Name: data.name,
        MonthlyPrice: Number(data.monthlyPrice) || 0,
        SessionsPerMonth: Number(data.sessionsPerMonth) || 8,
      };

      // Solo centers let the backend link the center teacher automatically; a
      // multi center must keep/send the chosen teacher explicitly.
      if (!isSoloCenter && data.teacherId) {
        payload.TeacherId = data.teacherId;
      }

      await groupsService.update(payload);

      toast.success("تم تعديل بيانات المجموعة بنجاح!");
      setIsEditOpen(false);
    } catch (err) {
      toast.error("حدث خطأ أثناء تعديل بيانات المجموعة");
      console.error(err);
      throw err;
    }
  };

  const openDeleteModal = (id) => {
    setSelectedGroupId(id);
    setIsDeleteOpen(true);
  };

  useEffect(() => {
    (() => {
      fetchGroups(page);
    })();
  }, [page]);

  const handleDelete = async () => {
    if (!selectedGroupId) return;

    try {
      setIsDeleting(true);
      await groupsService.delete(selectedGroupId);
      setIsDeleteOpen(false);
      setSelectedGroupId(null);
      fetchGroups(page);
    } catch (err) {
      toast.error("عفواً، تعذر حذف المجموعة");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    startGroupConnection();

    groupConnection.on("GroupAdded", (newGroup) => {
      setGroups((prevGroups) => [newGroup, ...prevGroups]);
      toast.success(
        `تمت إضافة مجموعة جديدة: ${newGroup.name || newGroup.Name}`,
      );
    });

    groupConnection.on("GroupUpdated", (updatedGroup) => {
      setGroups((prevGroups) =>
        prevGroups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)),
      );
      toast.success(
        `تم تحديث بيانات المجموعة: ${updatedGroup.name || updatedGroup.Name}`,
      );
    });

    groupConnection.on("GroupDeleted", (deletedId) => {
      setGroups((prevGroups) => prevGroups.filter((g) => g.id !== deletedId));
      toast.success("تم حذف المجموعة بنجاح");
    });

    return () => {
      groupConnection.off("GroupAdded");
      groupConnection.off("GroupUpdated");
      groupConnection.off("GroupDeleted");
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {groups.length === 0 ? (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-12 text-center">
          <Folder className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-muted font-semibold text-sm">
            {readOnly
              ? "لا توجد مجموعات مرتبطة بك حالياً."
              : "لا توجد مجموعات حالياً. قم بإضافة مجموعة جديدة للبدء."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const schedule = group.schedule || group.Schedule || [];
            return (
              <div
                key={group.id}
                className="bg-surface-card border border-surface-border p-4 sm:p-5 rounded-2xl shadow-xs hover:border-primary/40 transition-all duration-200 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 rounded-xl bg-primary-subtle text-primary shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-text-main truncate">
                        {group.name || group.Name}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted mt-0.5">
                        <Users className="w-3 h-3 text-primary" />
                        {group.totalStudentsCount || 0} طالب
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(group)}
                        className="p-2 text-text-muted hover:text-primary hover:bg-primary-subtle rounded-xl transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(group.id)}
                        className="p-2 text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-xl transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="bg-surface-muted/60 border border-surface-border/60 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">
                      سعر الاشتراك
                    </span>
                    <span className="text-xs font-bold text-text-main flex items-center gap-1">
                      {group.monthlyPrice}{" "}
                      <span className="text-[10px] text-text-muted">
                        ج.م / شهرياً
                      </span>
                    </span>
                  </div>

                  <div className="bg-surface-muted/60 border border-surface-border/60 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-text-muted font-medium">
                      سعر الحصة
                    </span>
                    <span className="text-xs font-bold text-text-main flex items-center gap-1">
                      {group.perSessionPrice ?? 0}{" "}
                      <span className="text-[10px] text-text-muted">
                        ج.م / بالحصة
                      </span>
                    </span>
                  </div>

                  <div className="bg-surface-muted/60 border border-surface-border/60 p-3 rounded-xl">
                    <span className="text-[11px] text-text-muted font-medium flex items-center gap-1 mb-1.5">
                      <Calendar className="w-3 h-3 text-primary" />
                      أيام الحصص
                    </span>
                    {schedule.length > 0 ? (
                      <ul className="space-y-1">
                        {schedule.map((slot, idx) => (
                          <li
                            key={`${slot.dayOfWeek}-${idx}`}
                            className="flex items-center justify-between text-[11px] font-semibold text-text-main"
                          >
                            <span>{DAYS_AR[slot.dayOfWeek] ?? "-"}</span>
                            <span className="text-text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-[11px] text-text-muted">
                        لا توجد مواعيد مسجلة
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenSessions(group)}
                  className="w-full bg-surface-card hover:bg-primary hover:text-text-inverse border border-surface-border hover:border-primary text-text-main transition-all duration-200 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer group"
                >
                  <Calendar className="w-4 h-4 text-primary group-hover:text-text-inverse transition-colors" />
                  <span>مواعيد الحصص</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && groups.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalGroups}
          pageSize={6}
          name="مجموعة"
          onPageChange={(newPage) => setPage(newPage)}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="حذف المجموعة"
        message="هل أنت متأكد من رغبتك في حذف هذه المجموعة؟ سيتم مسح جميع البيانات المرتبطة بها."
        confirmText="تأكيد الحذف"
      />

      {!readOnly && isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-card rounded-2xl p-5 md:p-6 border border-surface-border w-full max-w-lg shadow-xl relative animate-in fade-in zoom-in duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2.5 text-primary">
                <div className="p-2 rounded-xl bg-primary-subtle">
                  <Edit className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-text-main">
                  تعديل بيانات المجموعة
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <GroupForm
              initialData={editGroupData}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditOpen(false)}
              submitLabel="حفظ التعديلات"
            />
          </div>
        </div>
      )}

      <GroupSessionsModal
        group={selectedGroupForSessions}
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        readOnly={readOnly}
      />
    </div>
  );
}
