import { PlusCircle, ListFilter } from "@/components/icons";
import Tabs from "@/components/ui/Tabs";

const TABS = [
  { id: "add", label: "إضافة مجموعة جديدة", icon: PlusCircle },
  { id: "list", label: "المجموعات الحالية", icon: ListFilter },
];

export default function GroupSubNav({ activeTab, setActiveTab }) {
  return (
    <div
      data-testid="group-subnav"
      className="mx-auto w-full min-w-0 max-w-xl overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-soft md:mx-0"
    >
      <Tabs
        tabs={TABS}
        activeId={activeTab}
        onChange={setActiveTab}
        className="border-b-0 px-1"
      />
    </div>
  );
}
