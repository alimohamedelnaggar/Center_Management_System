import {
  BarChart3,
  LayoutGrid,
  UserCog,
} from "@/components/icons";
import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import ReportsGroupsTab from "../components/reports/ReportsGroupsTab";
import ReportsOverviewTab from "../components/reports/ReportsOverviewTab";
import ReportsTeachersTab from "../components/reports/ReportsTeachersTab";

// The student reports moved to their own page (/student-reports) so every
// teacher can reach them without the paid center-reports module.
const ALL_TABS = {
  overview: { key: "overview", title: "نظرة عامة", icon: BarChart3 },
  teachers: { key: "teachers", title: "المدرسون", icon: UserCog },
  groups: { key: "groups", title: "المجموعات", icon: LayoutGrid },
};

const TABS_BY_ROLE = {
  SuperAdmin: ["overview", "teachers", "groups"],
  CenterOwner: ["overview", "teachers", "groups"],
  Assistant: ["overview", "groups"],
  Teacher: ["overview", "groups"],
};

export default function ReportsPage() {
  const { role } = useAuth();

  const tabs = useMemo(() => {
    const keys = TABS_BY_ROLE[role] || ["overview"];
    return keys.map((key) => ALL_TABS[key]).filter(Boolean);
  }, [role]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "overview");
  const current = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-main">التقارير</h1>
          <p className="mt-1 text-xs text-text-muted">الرئيسية / التقارير</p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-surface-border bg-surface-card p-2 shadow-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = current?.key === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-primary text-text-inverse shadow-sm"
                    : "text-text-muted hover:bg-surface-muted hover:text-text-main"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {current?.key === "overview" && <ReportsOverviewTab />}
      {current?.key === "teachers" && <ReportsTeachersTab />}
      {current?.key === "groups" && <ReportsGroupsTab />}
    </div>
  );
}
