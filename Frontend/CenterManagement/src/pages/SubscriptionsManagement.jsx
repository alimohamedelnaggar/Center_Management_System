import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarClock,
  PlayCircle,
  RefreshCw,
  Settings2,
} from "@/components/icons";
import RenewSubscriptionModal from "../components/common/RenewSubscriptionModal";
import SubscriptionEditModal from "../components/common/SubscriptionEditModal";
import Spinner from "../components/common/Spinner";
import { subscriptionService } from "../services/subscriptionService";

const stateStyles = {
  Active: "bg-status-success-bg text-status-success",
  InGrace: "bg-status-warning-bg text-status-warning",
  Expired: "bg-status-danger-bg text-status-danger",
  Suspended: "bg-surface-muted text-text-muted",
};

const stateLabels = {
  Active: "نشط",
  InGrace: "فترة سماح",
  Expired: "منتهي",
  Suspended: "موقوف",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
};

export default function SubscriptionsManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editCenterId, setEditCenterId] = useState(null);
  const [renewCenter, setRenewCenter] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await subscriptionService.list(search);
      setRows(response?.data ?? []);
    } catch {
      toast.error("تعذر تحميل الاشتراكات");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-main">الاشتراكات</h1>
          <p className="text-sm text-text-muted">
            إدارة اشتراكات المراكز والوحدات المفعّلة لكل مركز.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-text-muted hover:bg-surface-muted"
        >
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none"
        />
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card shadow">
        {loading ? (
          <div className="p-10">
            <Spinner msg="جارٍ تحميل الاشتراكات..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-text-muted">لا توجد مراكز.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-muted text-sm text-text-muted">
                <tr>
                  <th className="p-4 font-medium">المركز</th>
                  <th className="p-4 font-medium">الحالة</th>
                  <th className="p-4 font-medium">الخطة</th>
                  <th className="p-4 font-medium">الفترة</th>
                  <th className="p-4 font-medium">الوحدات</th>
                  <th className="p-4 font-medium">المدفوع / السعر</th>
                  <th className="p-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((center) => {
                  const highlight = center.expiringSoon
                    ? "bg-status-warning-bg/40"
                    : "";
                  const showRenew =
                    center.state === "InGrace" || center.state === "Expired";

                  return (
                    <tr
                      key={center.id}
                      className={`border-t border-surface-border hover:bg-surface-muted/50 ${highlight}`}
                    >
                      <td className="p-4 font-bold text-text-main">
                        {center.name}
                        {center.expiringSoon && (
                          <span className="mr-2 rounded-full bg-status-warning-bg px-2 py-0.5 text-[10px] font-bold text-status-warning">
                            قريب الانتهاء ({center.daysUntilExpiry} يوم)
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            stateStyles[center.state] ?? "bg-surface-muted text-text-muted"
                          }`}
                        >
                          {stateLabels[center.state] ?? center.state}
                          {center.state === "InGrace" && center.daysLeftInGrace > 0
                            ? ` (باقي ${center.daysLeftInGrace} يوم)`
                            : ""}
                        </span>
                      </td>
                      <td className="p-4 text-text-muted">
                        {center.plan || "—"}
                        {center.type ? (
                          <span className="block text-xs text-text-muted">
                            {center.type}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4 text-xs text-text-muted" dir="ltr">
                        <div>{formatDate(center.subscriptionStart)}</div>
                        <div>→ {formatDate(center.subscriptionEnd)}</div>
                      </td>
                      <td className="p-4 text-text-muted">
                        {center.enabledModuleCount} / {center.totalModuleCount}
                      </td>
                      <td className="p-4 text-text-muted" dir="ltr">
                        {Number(center.paidAmount ?? 0).toLocaleString()} /{" "}
                        {Number(center.price ?? 0).toLocaleString()}{" "}
                        {center.currency || ""}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {showRenew && (
                            <button
                              onClick={() => setRenewCenter(center)}
                              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-white hover:bg-primary-hover"
                            >
                              <PlayCircle size={14} /> تجديد
                            </button>
                          )}
                          <button
                            onClick={() => setEditCenterId(center.id)}
                            className="flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary-subtle"
                          >
                            <Settings2 size={14} /> الاشتراك والوحدات
                          </button>
                          <span className="flex items-center gap-1 text-[10px] text-text-muted">
                            <CalendarClock size={12} /> سماح {center.graceDays} يوم
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubscriptionEditModal
        isOpen={editCenterId !== null}
        centerId={editCenterId}
        onClose={() => setEditCenterId(null)}
        onSaved={load}
      />

      <RenewSubscriptionModal
        isOpen={renewCenter !== null}
        center={renewCenter}
        onClose={() => setRenewCenter(null)}
        onRenewed={load}
      />
    </div>
  );
}
