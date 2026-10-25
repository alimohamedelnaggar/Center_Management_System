import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, CheckCheck, Info } from "@/components/icons";
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
  const panelRef = useRef(null);

  const loadUnreadCount = async () => {
    try {
      const res = await service.getUnreadCount();
      if (res?.succeeded) setUnread(res.data ?? 0);
    } catch {
      // ignore
    }
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await service.getNotifications({
        pageNumber: 1,
        pageSize: 10,
      });
      if (res?.succeeded) setItems(res.data?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    loadList();
    const onClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleClick = async (item) => {
    if (!item.isRead) {
      try {
        await service.markRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnread((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
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
      // ignore
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-card text-text-muted transition hover:bg-surface-muted hover:text-text-main"
        title="الإشعارات"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-status-danger px-1 text-[11px] font-bold text-text-inverse">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <h3 className="text-sm font-bold text-text-main">الإشعارات</h3>
            <div className="flex items-center gap-3">
              {viewAllPath && (
                <Link
                  to={viewAllPath}
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium text-text-muted transition hover:text-primary"
                >
                  عرض الكل
                </Link>
              )}
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:opacity-80"
              >
                <CheckCheck className="h-3.5 w-3.5" />
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

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">لا توجد إشعارات</p>
              </div>
            )}

            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={`flex w-full items-start gap-3 border-b border-surface-border px-4 py-3 text-right transition last:border-0 hover:bg-surface-muted ${
                    item.isRead ? "opacity-70" : ""
                  }`}
                >
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
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
                      <span className="mt-0.5 block text-xs text-text-muted">
                        {item.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-text-muted">
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
