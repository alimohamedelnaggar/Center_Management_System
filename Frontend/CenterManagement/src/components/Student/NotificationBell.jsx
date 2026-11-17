import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, Bell, CheckCheck, RefreshCw } from "@/components/icons";
import { studentPortalService } from "../../services/studentPortalService";
import {
  notificationConnection,
  startNotificationConnection,
} from "../../services/signalr/notificationSignalR";

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

/**
 * Notification dropdown shared by the student and the parent portal.
 *
 * `service` selects which portal's endpoints are used (the parent portal has
 * its own list/unread/read endpoints over the same table); `onSelect` lets the
 * host react to a click — the parent layout for instance jumps to the child the
 * notification belongs to; `viewAllPath` adds the "عرض الكل" entry to the
 * full-page list.
 */
export default function NotificationBell({
  service = studentPortalService,
  onSelect = null,
  viewAllPath = null,
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await service.getUnreadCount();
      if (res?.succeeded) setUnread(res.data ?? 0);
    } catch {
      // The badge is a nice-to-have: a failed count must not block the bell.
    }
  }, [service]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await service.getNotifications({
        pageNumber: 1,
        pageSize: 10,
      });
      if (res?.succeeded) {
        setItems(res.data?.data ?? []);
      } else {
        setError(res?.message || "تعذّر تحميل الإشعارات");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "تعذّر تحميل الإشعارات",
      );
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    startNotificationConnection();
    loadUnreadCount();

    const handler = (notification) => {
      if (!notification) return;
      setItems((prev) => [notification, ...prev].slice(0, 10));
      setUnread((prev) => prev + 1);
      toast.success(notification.title ?? "لديك إشعار جديد");
    };

    notificationConnection.on("NotificationReceived", handler);
    return () => notificationConnection.off("NotificationReceived", handler);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadList();
    const onClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loadList]);

  const handleClick = async (item) => {
    if (!item.isRead) {
      try {
        await service.markRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnread((prev) => Math.max(0, prev - 1));
      } catch {
        toast.error("تعذّر تعليم الإشعار كمقروء");
      }
    }

    onSelect?.(item);
  };

  const handleMarkAll = async () => {
    try {
      await service.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      toast.error("تعذّر تعليم الإشعارات كمقروءة");
    }
  };

  return (
    <div className="relative" ref={panelRef} data-testid="notification-bell">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-control border border-surface-border bg-surface-card text-text-muted transition hover:bg-surface-muted hover:text-text-main"
        title="الإشعارات"
        aria-label={
          unread > 0
            ? `الإشعارات (${unread} غير مقروء)`
            : "الإشعارات"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-panel"
        data-testid="notification-bell-button"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span
            data-testid="notification-unread-count"
            className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-status-danger px-1 text-xs font-bold tabular-nums text-text-inverse"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          role="dialog"
          aria-label="الإشعارات"
          data-testid="notification-panel"
          className="absolute left-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-4 py-3">
            <h3 className="text-sm font-bold text-text-main">الإشعارات</h3>
            <div className="flex flex-wrap items-center gap-3">
              {viewAllPath && (
                <Link
                  to={viewAllPath}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-text-muted transition hover:text-primary"
                >
                  عرض الكل
                </Link>
              )}
              <button
                type="button"
                onClick={handleMarkAll}
                data-testid="notification-mark-all"
                className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary transition hover:opacity-80 disabled:opacity-50"
                disabled={items.length === 0}
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                تعليم الكل كمقروء
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                جاري التحميل...
              </p>
            )}

            {!loading && error && (
              <div
                role="alert"
                data-testid="notification-error"
                className="flex flex-col items-center gap-2 px-4 py-6 text-center"
              >
                <AlertTriangle
                  className="h-7 w-7 text-status-danger"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-text-main">
                  تعذّر تحميل الإشعارات
                </p>
                <p className="text-sm text-text-muted">{error}</p>
                <button
                  type="button"
                  onClick={loadList}
                  data-testid="notification-retry"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  إعادة المحاولة
                </button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell
                  className="h-8 w-8 text-text-muted"
                  aria-hidden="true"
                />
                <p className="text-sm text-text-muted">لا توجد إشعارات</p>
              </div>
            )}

            {!loading &&
              !error &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={`flex min-h-11 w-full items-start gap-3 border-b border-surface-border px-4 py-3 text-right transition last:border-0 hover:bg-surface-muted ${
                    item.isRead ? "opacity-70" : ""
                  }`}
                >
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-text-main">
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-status-info"
                          aria-label="غير مقروء"
                        />
                      )}
                    </span>
                    {item.body && (
                      <span className="mt-0.5 block text-sm text-text-muted">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-text-muted">
                      {formatDate(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
