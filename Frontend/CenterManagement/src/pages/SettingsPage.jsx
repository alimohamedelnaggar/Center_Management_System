import { useState } from "react";
import { useAuth } from "../context/useAuth";
import PageHeader from "../components/ui/PageHeader";
import GroupSubNav from "../components/groups/GroupSubNav";
import AddGroupForm from "../components/groups/AddGroupForm";
import GroupsList from "../components/groups/GroupsList";

export default function SettingsPage() {
  const { canManageGroups } = useAuth();
  const [activeTab, setActiveTab] = useState("add"); // 'add' أو 'list'

  // A plain teacher / assistant only browses his own groups, read-only.
  if (!canManageGroups) {
    return (
      <div
        data-testid="settings-page"
        className="dir-rtl mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 md:p-6"
        dir="rtl"
      >
        <PageHeader
          title="مجموعاتي"
          subtitle="استعراض المجموعات المرتبطة بك ومواعيد الحصص."
        />

        <GroupsList readOnly />
      </div>
    );
  }

  return (
    <div
      data-testid="settings-page"
      className="dir-rtl mx-auto w-full min-w-0 max-w-7xl space-y-6 p-4 md:p-6"
      dir="rtl"
    >
      <PageHeader
        title="إدارة المجموعات"
        subtitle="التحكم في المجموعات الدراسية، وإضافة مجموعات جديدة وتعديل المجموعات الحالية."
        actions={<GroupSubNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      />

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
