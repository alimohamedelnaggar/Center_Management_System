import { ClipboardList, GraduationCap } from "@/components/icons";
import { useState } from "react";
import ExamManagementTab from "./ExamManagementTab";
import ExamTab from "./ExamTab";

const TABS = [
  { key: "exam", label: "رصد الدرجات", icon: GraduationCap },
  { key: "management", label: "إدارة الدرجات", icon: ClipboardList },
];

export default function ExamsPage() {
  const [activeTab, setActiveTab] = useState("exam");

  return (
    <div dir="rtl" className="min-h-screen bg-surface-bg font-sans text-text-main" >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-text-inverse">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-main">رصد الدرجات</h1>
            <p className="text-sm text-text-muted">إدارة ورصد درجات الطلاب</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-surface-border">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "exam" ? <ExamTab /> : <ExamManagementTab />}
      </div>
    </div>
  );
}
