import { useState } from "react";
import { useAuth } from "../context/useAuth";
import GroupSubNav from "../components/groups/GroupSubNav";
import AddGroupForm from "../components/groups/AddGroupForm";
import GroupsList from "../components/groups/GroupsList";

export default function SettingsPage() {
  const { canManageGroups } = useAuth();
  const [activeTab, setActiveTab] = useState("add"); // 'add' أو 'list'

  // A plain teacher / assistant only browses his own groups, read-only.
  if (!canManageGroups) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 dir-rtl" dir="rtl">
        <div className="pb-2">
          <h2 className="text-lg md:text-xl font-bold text-text-main">
            مجموعاتي
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            استعراض المجموعات المرتبطة بك ومواعيد الحصص
          </p>
        </div>

        <GroupsList readOnly />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 dir-rtl" dir="rtl">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-text-main">إدارة المجموعات</h2>
          <p className="text-xs text-text-muted mt-0.5">
            التحكم في المجموعات الدراسية، إضافة مجموعات جديدة وتعديل المجموعات الحالية
          </p>
        </div>

        {/* Navigation Tabs */}
        <GroupSubNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main View Container */}
      <div className="transition-all duration-300">
        {activeTab === "add" ? (
          <AddGroupForm onSuccess={() => setActiveTab("list")} />
        ) : (
          <GroupsList />
        )}
      </div>
    </div>
  );
}
