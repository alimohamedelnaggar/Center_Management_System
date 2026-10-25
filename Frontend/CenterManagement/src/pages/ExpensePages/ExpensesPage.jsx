import { Tags, Wallet } from "@/components/icons";
import { useState } from "react";
import CategoriesTab from "./CategoriesTab";
import ExpensesTab from "./ExpensesTab";

const TABS = [
  { key: "expenses", label: "المصروفات", icon: Wallet },
  { key: "categories", label: "إدارة الفئات", icon: Tags },
];

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("expenses");

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-surface-bg font-sans text-text-main"
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-text-inverse">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-main">المصروفات</h1>
            <p className="text-sm text-text-muted">
              الرئيسية <span className="mx-1">/</span> المصروفات
            </p>
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
        {activeTab === "expenses" ? <ExpensesTab /> : <CategoriesTab />}
      </div>
    </div>
  );
}
