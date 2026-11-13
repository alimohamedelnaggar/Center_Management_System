import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "@/components/icons";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import Pagination from "../../components/common/Pagination";
import {
  PortalEmpty,
  PortalLoading,
  PortalStatus,
} from "../../components/portal/PortalUI";
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
    <div
      data-testid="student-notifications-page"
      className="p-4 font-sans md:p-6"
    >
      <PageHeader
        className="mb-5"
        title="الإشعارات"
        subtitle="كل التنبيهات الخاصة بك"
        actions={
          <Button variant="secondary" onClick={handleMarkAll}>
            <CheckCheck className="h-4 w-4" />
            تعليم الكل كمقروء
          </Button>
        }
      />

      {loading && <PortalLoading icon={Loader2} />}

      {!loading && notifications.length === 0 && (
        <PortalEmpty icon={Bell} title="لا توجد إشعارات." />
      )}

      {!loading && notifications.length > 0 && (
        <div className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-soft">
          <ul className="divide-y divide-surface-border">
            {notifications.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleMarkRead(item)}
                  className={`flex w-full items-start gap-3 px-4 py-4 text-right transition hover:bg-surface-muted sm:px-5 ${
                    item.isRead ? "opacity-80" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <Bell className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-base font-bold leading-6 text-text-main">
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <PortalStatus tone="info">جديد</PortalStatus>
                      )}
                    </span>
                    {item.body && (
                      <span className="mt-1 block break-words text-sm leading-6 text-text-muted">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-1.5 block text-xs text-text-muted">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            name="إشعار"
            onPageChange={loadNotifications}
          />
        </div>
      )}
    </div>
  );
}
