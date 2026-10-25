import { PlusCircle, ListFilter } from "@/components/icons";

export default function GroupSubNav({ activeTab, setActiveTab }) {
  return (
    <div className="bg-surface-card border border-surface-border p-1.5 rounded-2xl shadow-xs flex items-center justify-center sm:justify-start gap-1 sm:gap-2 max-w-xl mx-auto md:mx-0">
      <button
        onClick={() => setActiveTab("add")}
        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
          activeTab === "add"
            ? "bg-primary text-text-inverse shadow-sm"
            : "text-text-muted hover:text-text-main hover:bg-surface-muted"
        }`}
      >
        <PlusCircle className="w-4 h-4 shrink-0" />
        <span>إضافة مجموعة جديدة</span>
      </button>

      <button
        onClick={() => setActiveTab("list")}
        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
          activeTab === "list"
            ? "bg-primary text-text-inverse shadow-sm"
            : "text-text-muted hover:text-text-main hover:bg-surface-muted"
        }`}
      >
        <ListFilter className="w-4 h-4 shrink-0" />
        <span>المجموعات الحالية</span>
      </button>
    </div>
  );
}