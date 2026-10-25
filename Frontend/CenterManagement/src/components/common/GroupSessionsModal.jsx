import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Calendar, Clock, Plus, Trash2, X, Loader2, Edit2 } from "@/components/icons";
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

  const [formData, setFormData] = useState({
    dayOfWeek: 0,
    startTime: "14:00",
    endTime: "16:00",
    sessionPrice: group?.monthlyPrice || 0,
  });

  const groupId = group?.id;

  const fetchSessions = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const res = await sessionsService.getByGroup(groupId);
      setSessions(res.data || res || []);
    } catch (err) {
      toast.error("تعذر جلب مواعيد الحصص",err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);


  const resetForm = () => {
    setFormData({
      dayOfWeek: 0,
      startTime: "14:00",
      endTime: "16:00",
      sessionPrice: group?.monthlyPrice || 0,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface-card rounded-2xl p-5 border border-surface-border w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-text-muted hover:text-text-main"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-primary mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          مواعيد حصص: {group?.name}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-muted">
            الحصص المسجلة ({sessions.length})
          </span>
          {!readOnly && !showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="text-xs bg-primary hover:bg-primary-hover text-text-inverse px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة موعد
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmitSession}
            className="bg-surface-muted/50 border border-surface-border p-3.5 rounded-xl mb-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-2 mb-1">
              <span className="text-xs font-bold text-primary">
                {editingSessionId ? "تعديل الموعد" : "إضافة موعد جديد"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1">
                اليوم
              </label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) =>
                  setFormData({ ...formData, dayOfWeek: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-text-main text-xs focus:outline-none focus:border-primary"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">
                  من (البدء)
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-text-main text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">
                  إلى (الانتهاء)
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-text-main text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1">
                سعر الحصة (ج.م)
              </label>
              <input
                type="number"
                required
                value={formData.sessionPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sessionPrice: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-surface-border bg-surface-card text-text-main text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary-hover text-text-inverse py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-70"
              >
                {isSubmitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {editingSessionId ? "تعديل الموعد" : "حفظ الموعد"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 border border-surface-border rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-card"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-6 text-text-muted text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" /> جاري التحميل...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-6 bg-surface-muted rounded-xl border border-surface-border text-text-muted text-xs">
            لا توجد مواعيد حصص مسجلة لهذه المجموعة.
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 bg-surface-muted rounded-xl border border-surface-border text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-primary flex items-center gap-1.5">
                    <span>
                      {DAYS_OF_WEEK.find((d) => d.id === s.dayOfWeek)?.name}
                    </span>
                    <span className="text-text-muted font-normal">
                      • {s.sessionPrice} ج.م
                    </span>
                  </div>
                  <div className="text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {s.startTime?.substring(0, 5)} -{" "}
                      {s.endTime?.substring(0, 5)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!readOnly && (
                    <>
                      <button
                        onClick={() => handleEditClick(s)}
                        className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-card rounded-lg transition"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteClick(s.id)}
                        className="p-1.5 text-status-danger hover:bg-status-danger-bg rounded-lg transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-surface-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 border border-surface-border rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-muted"
          >
            إغلاق
          </button>
        </div>
      </div>

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
    </div>
  );
}