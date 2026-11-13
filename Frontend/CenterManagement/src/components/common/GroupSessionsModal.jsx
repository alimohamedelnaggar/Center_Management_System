import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Calendar, Clock, Plus, Trash2, Edit2 } from "@/components/icons";
import AppModal from "@/components/ui/AppModal";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import StatusPill from "@/components/ui/StatusPill";
import { sessionsService } from "../../services/sessionsService";
import { sessionConnection, startSessionConnection } from "../../services/signalr/sessionHub";
import ConfirmModal from "./ConfirmModal";

const DAYS_OF_WEEK = [
  { id: 0, name: "الأحد" },
  { id: 1, name: "الإثنين" },
  { id: 2, name: "الثلاثاء" },
  { id: 3, name: "الأربعاء" },
  { id: 4, name: "الخميس" },
  { id: 5, name: "الجمعة" },
  { id: 6, name: "السبت" },
];

export default function GroupSessionsModal({
  group,
  isOpen,
  onClose,
  readOnly = false,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const groupSessionPrice = () =>
    group?.perSessionPrice ?? group?.PerSessionPrice ?? 0;

  const [formData, setFormData] = useState({
    dayOfWeek: 0,
    startTime: "14:00",
    endTime: "16:00",
    sessionPrice: groupSessionPrice(),
  });

  const groupId = group?.id;

  const fetchSessions = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await sessionsService.getByGroup(groupId);
      setSessions(res.data || res || []);
    } catch (err) {
      toast.error("تعذر جلب مواعيد الحصص", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);


  const resetForm = () => {
    setFormData({
      dayOfWeek: 0,
      startTime: "14:00",
      endTime: "16:00",
      sessionPrice: groupSessionPrice(),
    });
    setEditingSessionId(null);
    setShowForm(false);
  };
  useEffect(() => {
    if (!isOpen || !group) return;
  (()=>{
      fetchSessions();
      resetForm();
    })()
    
    startSessionConnection();

    const handleSessionChange = () => {
      fetchSessions();
    };

    sessionConnection.on("SessionAdded", handleSessionChange);
    sessionConnection.on("SessionUpdated", handleSessionChange);
    sessionConnection.on("SessionDeleted", handleSessionChange);

    return () => {
      sessionConnection.off("SessionAdded", handleSessionChange);
      sessionConnection.off("SessionUpdated", handleSessionChange);
      sessionConnection.off("SessionDeleted", handleSessionChange);
    };
  }, [isOpen, group, fetchSessions]);

  const handleEditClick = (session) => {
    setEditingSessionId(session.id);
    setFormData({
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime ? session.startTime.substring(0, 5) : "14:00",
      endTime: session.endTime ? session.endTime.substring(0, 5) : "16:00",
      sessionPrice: session.sessionPrice,
    });
    setShowForm(true);
  };

  const handleSubmitSession = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formatTime = (timeStr) =>
        timeStr.length === 5 ? `${timeStr}:00` : timeStr;

      if (editingSessionId) {
        const payload = {
          id: editingSessionId,
          groupId: group.id,
          dayOfWeek: parseInt(formData.dayOfWeek),
          startTime: formatTime(formData.startTime),
          endTime: formatTime(formData.endTime),
          sessionPrice: parseFloat(formData.sessionPrice),
        };

        const res = await sessionsService.update(payload); 
        if (res.succeeded || res.data) {
          toast.success("تم تعديل الموعد بنجاح");
          resetForm();
          fetchSessions();
        } else {
          toast.error(res.message || "حدث خطأ أثناء التعديل");
        }
      } else {
        const createPayload = {
          groupId: group.id,
          dayOfWeek: parseInt(formData.dayOfWeek),
          startTime: formatTime(formData.startTime),
          endTime: formatTime(formData.endTime),
          sessionPrice: parseFloat(formData.sessionPrice),
        };

        const res = await sessionsService.create(createPayload);
        if (res.succeeded || res.data) {
          toast.success("تمت إضافة الموعد بنجاح");
          resetForm();
          fetchSessions();
        } else {
          toast.error(res.message || "حدث خطأ أثناء الإضافة");
        }
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "يتعارض هذا الموعد مع حصة أخرى متداخلة"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedSessionId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSessionId) return;
    setIsDeleting(true);
    try {
      await sessionsService.delete(selectedSessionId);
      toast.success("تم حذف الموعد بنجاح");
      setDeleteModalOpen(false);
      setSelectedSessionId(null);
      fetchSessions();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "تعذر الحذف لربطه بسجلات حضور"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AppModal
        open={isOpen}
        onClose={onClose}
        title={`مواعيد حصص: ${group?.name ?? ""}`}
        icon={Calendar}
        testId="group-sessions-modal"
        size="max-w-lg"
        footer={
          <Button variant="secondary" block onClick={onClose}>
            إغلاق
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPill tone="neutral" dot={false}>
              الحصص المسجلة: {sessions.length}
            </StatusPill>

            {!readOnly && !showForm && (
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                data-testid="group-session-add"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                إضافة موعد
              </Button>
            )}
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmitSession}
              data-testid="group-session-form"
              className="space-y-3 rounded-card border border-surface-border bg-surface-muted/50 p-4"
            >
              <div className="flex items-center justify-between border-b border-surface-border pb-2">
                <span className="text-sm font-bold text-primary">
                  {editingSessionId ? "تعديل الموعد" : "إضافة موعد جديد"}
                </span>
              </div>

              <FormField label="اليوم" htmlFor="group-session-day">
                <Select
                  id="group-session-day"
                  value={formData.dayOfWeek}
                  onChange={(e) =>
                    setFormData({ ...formData, dayOfWeek: e.target.value })
                  }
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-2">
                <FormField label="من (البدء)" htmlFor="group-session-start">
                  <Input
                    id="group-session-start"
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="إلى (الانتهاء)" htmlFor="group-session-end">
                  <Input
                    id="group-session-end"
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                  />
                </FormField>
              </div>

              <FormField
                label="سعر الحصة (ج.م)"
                htmlFor="group-session-price"
                helper="يُستخدم لحساب مستحقات الحصص."
              >
                <Input
                  id="group-session-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.sessionPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, sessionPrice: e.target.value })
                  }
                />
              </FormField>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="flex-1"
                  data-testid="group-session-save"
                >
                  {editingSessionId ? "تعديل الموعد" : "حفظ الموعد"}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  إلغاء
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div data-testid="group-sessions-loading" className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-control border border-surface-border bg-surface-muted px-3 py-3"
                >
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div
              data-testid="group-sessions-empty"
              className="rounded-control border border-dashed border-surface-border"
            >
              <EmptyState
                icon={Calendar}
                title="لا توجد مواعيد مسجلة"
                description="أضف موعدًا أسبوعيًا واحدًا على الأقل لهذه المجموعة."
              />
            </div>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pe-1">
              {sessions.map((s) => {
                const dayName = DAYS_OF_WEEK.find(
                  (d) => d.id === s.dayOfWeek,
                )?.name;

                return (
                  <li
                    key={s.id}
                    data-testid={`group-session-${s.id}`}
                    className="flex items-center justify-between gap-2 rounded-control border border-surface-border bg-surface-muted px-3 py-2.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-text-main">
                        <span>{dayName}</span>
                        <span className="text-xs font-normal text-text-muted">
                          • {s.sessionPrice} ج.م
                        </span>
                      </p>
                      <p className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {s.startTime?.substring(0, 5)} -{" "}
                          {s.endTime?.substring(0, 5)}
                        </span>
                      </p>
                    </div>

                    {!readOnly && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(s)}
                          aria-label={`تعديل موعد ${dayName}`}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(s.id)}
                          aria-label={`حذف موعد ${dayName}`}
                          title="حذف"
                          className="text-status-danger hover:bg-status-danger-bg"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AppModal>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الموعد"
        message="هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذه الخطوة."
        confirmText="حذف"
        cancelText="إلغاء"
        loading={isDeleting}
      />
    </>
  );
}
