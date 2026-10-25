import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, Search, Users, Wallet } from "@/components/icons";

import AssistantSalaryCard from "./AssistantSalaryCard";
import { assistantService } from "../../services/assistantService";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  currentMonthKey,
  getMonthOptions,
  parseMonthKey,
} from "../../utils/months";
import { SALARY_STATUS_FILTERS } from "../../utils/assistants/salaryStatus";

export default function AssistantsSalaryTab({ onPay, onOpenLog, refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());

  const monthOptions = getMonthOptions();
  const { month, year } = parseMonthKey(selectedMonth);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await assistantService.getSalaryStatus({
          month,
          year,
          search,
          status,
        });

        if (active) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          toast.error(
            err?.response?.data?.message || "حدث خطأ أثناء جلب حالة المرتبات",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [month, year, search, status, refreshKey]);

  const totals = items.reduce(
    (acc, item) => ({
      paid: acc.paid + Number(item.paid || 0),
      remaining: acc.remaining + Number(item.remaining || 0),
    }),
    { paid: 0, remaining: 0 },
  );

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-surface-card border border-surface-border rounded-2xl p-4 shadow-sm">
        {/* Month */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full md:w-56 appearance-none rounded-xl border border-surface-border bg-surface-muted text-sm font-bold text-text-main py-2.5 ps-3 pe-9 focus:outline-none focus:border-primary"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />

          <input
            type="text"
            placeholder="ابحث عن مساعد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-surface-border bg-surface-muted text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-44 appearance-none rounded-xl border border-surface-border bg-surface-muted text-sm font-bold text-text-main py-2.5 ps-3 pe-9 focus:outline-none focus:border-primary"
          >
            {SALARY_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Month summary */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
            <div className="p-2.5 rounded-xl bg-primary-subtle text-primary">
              <Users className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[11px] text-text-muted">عدد المساعدين</p>

              <p className="text-sm font-bold text-text-main">
                {items.length} مساعد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
            <div className="p-2.5 rounded-xl bg-status-success-bg text-status-success">
              <Wallet className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[11px] text-text-muted">تم صرفه الشهر</p>

              <p className="text-sm font-bold text-status-success">
                {formatCurrency(totals.paid)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border shadow-sm">
            <div className="p-2.5 rounded-xl bg-status-danger-bg text-status-danger">
              <Wallet className="w-5 h-5" />
            </div>

            <div>
              <p className="text-[11px] text-text-muted">المتبقي</p>

              <p className="text-sm font-bold text-status-danger">
                {formatCurrency(totals.remaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="p-10 text-center rounded-2xl bg-surface-card border border-surface-border text-text-muted font-bold">
          جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-surface-card border border-surface-border text-text-muted font-bold">
          لا يوجد مساعدون مطابقون لخيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <AssistantSalaryCard
              key={item.id}
              item={item}
              onPay={onPay}
              onOpenLog={onOpenLog}
            />
          ))}
        </div>
      )}
    </div>
  );
}
