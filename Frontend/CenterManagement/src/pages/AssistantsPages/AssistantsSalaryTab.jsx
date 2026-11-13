import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, Search, Users, Wallet } from "@/components/icons";

import AssistantSalaryCard from "./AssistantSalaryCard";
import { fieldBaseClass } from "../../components/ui/Input";
import { assistantService } from "../../services/assistantService";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  currentMonthKey,
  getMonthOptions,
  parseMonthKey,
} from "../../utils/months";
import { SALARY_STATUS_FILTERS } from "../../utils/assistants/salaryStatus";

const selectClass = `${fieldBaseClass} appearance-none pe-9 ps-3 text-sm font-bold`;

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
      <div className="flex flex-col gap-3 rounded-card border border-surface-border bg-surface-card p-4 shadow-sm md:flex-row md:items-center">
        {/* Month */}
        <div className="relative">
          <select
            aria-label="شهر المرتبات"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`${selectClass} w-full md:w-56`}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />

          <input
            type="search"
            aria-label="بحث عن مساعد في المرتبات"
            placeholder="ابحث عن مساعد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${fieldBaseClass} pe-10 ps-3`}
          />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            aria-label="حالة المرتب"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${selectClass} w-full md:w-44`}
          >
            {SALARY_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Month summary */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-card border border-surface-border bg-surface-card p-3 shadow-sm">
            <div className="rounded-control bg-primary-subtle p-2.5 text-primary">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs text-text-muted">عدد المساعدين</p>

              <p className="text-sm font-bold text-text-main">
                {items.length} مساعد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-card border border-surface-border bg-surface-card p-3 shadow-sm">
            <div className="rounded-control bg-status-success-bg p-2.5 text-status-success">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs text-text-muted">تم صرفه الشهر</p>

              <p className="text-sm font-bold text-status-success">
                {formatCurrency(totals.paid)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-card border border-surface-border bg-surface-card p-3 shadow-sm">
            <div className="rounded-control bg-status-danger-bg p-2.5 text-status-danger">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs text-text-muted">المتبقي</p>

              <p className="text-sm font-bold text-status-danger">
                {formatCurrency(totals.remaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="rounded-card border border-surface-border bg-surface-card p-10 text-center font-bold text-text-muted">
          جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card border border-surface-border bg-surface-card p-10 text-center font-bold text-text-muted">
          لا يوجد مساعدون مطابقون لخيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
