import { useEffect, useState } from "react";
import {
  Trash2,
  Folder,
  Edit,
  Calendar,
  Users,
  Clock,
} from "@/components/icons";
import AppModal from "@/components/ui/AppModal";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
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

// The group form numbers the week from Saturday (0) to Friday (6); the API
// returns .NET DayOfWeek (0 = Sunday). Keep the two mappings in one place.
const apiDayToFormDay = (dayOfWeek) => (Number(dayOfWeek) + 1) % 7;

const readSchedule = (group) =>
  (group?.schedule || group?.Schedule || [])
    .map((slot) => ({
      dayIndex: apiDayToFormDay(slot.dayOfWeek ?? slot.DayOfWeek ?? 0),
      startTime: String(slot.startTime ?? slot.StartTime ?? "").slice(0, 5),
      endTime: String(slot.endTime ?? slot.EndTime ?? "").slice(0, 5),
    }))
    .filter((slot) => slot.startTime && slot.endTime)
    .sort((a, b) => a.dayIndex - b.dayIndex);

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
    perSessionPrice: 0,
    sessionsPerMonth: 8,
    teacherId: "",
    schedule: [],
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
      monthlyPrice: group.monthlyPrice ?? group.MonthlyPrice ?? 0,
      perSessionPrice: group.perSessionPrice ?? group.PerSessionPrice ?? 0,
      sessionsPerMonth:
        group.sessionsPerMonth ?? group.SessionsPerMonth ?? 8,
      // Preload the currently linked teacher so a multi-center edit cannot
      // silently drop the TeacherGroup link.
      teacherId: group.teacherId || group.TeacherId || "",
      // Preload the real session rows so editing a price does not wipe the
      // weekly schedule.
      schedule: readSchedule(group),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (data) => {
    try {
      const payload = {
        Id: editGroupData.id,
        Name: data.name,
        MonthlyPrice: Number(data.monthlyPrice) || 0,
        PerSessionPrice: Number(data.perSessionPrice) || 0,
        SessionsPerMonth: Number(data.sessionsPerMonth) || 8,
        Schedule: (data.schedule || []).map((slot) => ({
          DayIndex: slot.dayIndex,
          StartTime: slot.startTime,
          EndTime: slot.endTime,
        })),
      };

      // Solo centers let the backend link the center teacher automatically; a
      // multi center must keep/send the chosen teacher explicitly.
      if (!isSoloCenter && data.teacherId) {
        payload.TeacherId = data.teacherId;
      }

      await groupsService.update(payload);

      toast.success("تم تعديل بيانات المجموعة بنجاح!");
      setIsEditOpen(false);
      fetchGroups(page);
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
      // The hub payload only carries the name and prices; merge it so the
      // schedule and the student counter are not dropped from the card.
      setGroups((prevGroups) =>
        prevGroups.map((g) =>
          g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g,
        ),
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
      <div
        data-testid="groups-loading"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardBody className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-11 w-full" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {groups.length === 0 ? (
        <Card data-testid="groups-empty">
          <EmptyState
            icon={Folder}
            title={readOnly ? "لا توجد مجموعات مرتبطة بك" : "لا توجد مجموعات بعد"}
            description={
              readOnly
                ? "ستظهر المجموعات هنا بمجرد ربط حسابك بها."
                : "أضف أول مجموعة من تبويب «إضافة مجموعة جديدة» للبدء."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const schedule = group.schedule || group.Schedule || [];
            return (
              <Card
                key={group.id}
                data-testid={`group-card-${group.id}`}
                className="flex flex-col justify-between transition-colors hover:border-primary/40"
              >
                <CardBody className="flex flex-1 flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
                        <Folder className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-text-main">
                          {group.name || group.Name}
                        </h4>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
                          <Users className="h-3 w-3 text-primary" aria-hidden="true" />
                          {group.totalStudentsCount || 0} طالب
                        </span>
                      </div>
                    </div>

                    {!readOnly && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(group)}
                          aria-label={`تعديل مجموعة ${group.name || group.Name}`}
                          title="تعديل"
                          data-testid={`group-edit-${group.id}`}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteModal(group.id)}
                          aria-label={`حذف مجموعة ${group.name || group.Name}`}
                          title="حذف"
                          className="text-status-danger hover:bg-status-danger-bg"
                          data-testid={`group-delete-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-control border border-surface-border bg-surface-muted/60 px-3 py-2.5">
                      <span className="text-xs font-medium text-text-muted">
                        سعر الاشتراك
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-text-main">
                        {group.monthlyPrice ?? group.MonthlyPrice ?? 0}
                        <span className="text-[10px] text-text-muted">
                          ج.م / شهريًا
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-control border border-surface-border bg-surface-muted/60 px-3 py-2.5">
                      <span className="text-xs font-medium text-text-muted">
                        سعر الحصة
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-text-main">
                        {group.perSessionPrice ?? group.PerSessionPrice ?? 0}
                        <span className="text-[10px] text-text-muted">
                          ج.م / بالحصة
                        </span>
                      </span>
                    </div>

                    <div className="rounded-control border border-surface-border bg-surface-muted/60 px-3 py-2.5">
                      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
                        <Calendar className="h-3 w-3 text-primary" aria-hidden="true" />
                        أيام الحصص
                      </span>
                      {schedule.length > 0 ? (
                        <ul className="space-y-1">
                          {schedule.map((slot, idx) => (
                            <li
                              key={`${slot.dayOfWeek ?? slot.DayOfWeek}-${idx}`}
                              className="flex items-center justify-between text-xs font-semibold text-text-main"
                            >
                              <span>
                                {DAYS_AR[slot.dayOfWeek ?? slot.DayOfWeek] ?? "-"}
                              </span>
                              <span className="flex items-center gap-1 text-text-muted">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {slot.startTime ?? slot.StartTime} -{" "}
                                {slot.endTime ?? slot.EndTime}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-text-muted">
                          لا توجد مواعيد مسجلة
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    block
                    onClick={() => handleOpenSessions(group)}
                    data-testid={`group-sessions-${group.id}`}
                  >
                    <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                    مواعيد الحصص
                  </Button>
                </CardBody>
              </Card>
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

      <AppModal
        open={!readOnly && isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="تعديل بيانات المجموعة"
        icon={Edit}
        testId="group-edit-modal"
        size="max-w-lg"
      >
        <GroupForm
          key={editGroupData.id ?? "new"}
          initialData={editGroupData}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditOpen(false)}
          submitLabel="حفظ التعديلات"
        />
      </AppModal>

      <GroupSessionsModal
        group={selectedGroupForSessions}
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        readOnly={readOnly}
      />
    </div>
  );
}
