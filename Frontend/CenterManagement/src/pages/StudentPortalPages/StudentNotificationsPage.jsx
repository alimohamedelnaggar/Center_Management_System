import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "@/components/icons";
import toast from "react-hot-toast";
import Pagination from "../../components/common/Pagination";
import { studentPortalService } from "../../services/studentPortalService";

const PAGE_SIZE = 10;

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await studentPortalService.getNotifications({
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      if (res?.succeeded) {
        setNotifications(res.data?.data ?? []);
        setCurrentPage(res.data?.currentPage ?? page);
        setTotalPages(res.data?.totalPages ?? 1);
        setTotalCount(res.data?.totalCount ?? 0);
      } else {
        toast.error(res?.message ?? "فشل في تحميل الإشعارات");
      }
    } catch {
      toast.error("فشل في تحميل الإشعارات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const handleMarkRead = async (item) => {
    if (item.isRead) return;
    try {
      await studentPortalService.markRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAll = async () => {
    try {
      const res = await studentPortalService.markAllRead();
      if (res?.succeeded) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success(res.message ?? "تم تعليم كل الإشعارات كمقروءة");
      }
    } catch {
      toast.error("تعذّر تحديث الإشعارات");
    }
  };

  return (
    <div className="p-4 md:p-6 font-sans">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">الإشعارات</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            كل التنبيهات الخاصة بك
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-main transition hover:bg-surface-muted"
        >
          <CheckCheck className="h-4 w-4" />
          تعليم الكل كمقروء
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري التحميل...
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell className="h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">لا توجد إشعارات.</p>
          </div>
        )}

        {!loading &&
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMarkRead(item)}
              className={`flex w-full items-start gap-3 border-b border-surface-border px-4 py-4 text-right transition last:border-0 hover:bg-surface-muted ${
                item.isRead ? "opacity-70" : ""
              }`}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-text-main">
                    {item.title}
                  </span>
                  {!item.isRead && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-status-info" />
                  )}
                </span>
                {item.body && (
                  <span className="mt-1 block text-sm text-text-muted">
                    {item.body}
                  </span>
                )}
                <span className="mt-1 block text-[11px] text-text-muted">
                  {formatDateTime(item.createdAt)}
                </span>
              </span>
            </button>
          ))}

        {!loading && notifications.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            name="إشعار"
            onPageChange={loadNotifications}
          />
        )}
      </div>
    </div>
  );
}
