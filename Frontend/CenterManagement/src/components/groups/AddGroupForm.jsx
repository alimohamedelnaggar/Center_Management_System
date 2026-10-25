import { Plus, Building } from "@/components/icons";
import toast from "react-hot-toast";
import { groupsService } from "../../services/groupsService";
import GroupForm from "./GroupForm";

export default function AddGroupForm({ onSuccess }) {
  const handleSubmit = async (data) => {
    try {
      await groupsService.create({
        Name: data.name,
        MonthlyPrice: data.monthlyPrice,
        PerSessionPrice: data.perSessionPrice,
        TeacherId: data.teacherId,
        Schedule: data.schedule,
      });

      toast.success("تمت إضافة المجموعة بنجاح! 🎉");
      if (onSuccess) onSuccess();
    } catch (err) {
      const serverErrorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        (typeof err?.response?.data === "string" ? err?.response?.data : null) ||
        "حدث خطأ أثناء الإضافة، حاول مرة أخرى.";

      toast.error(serverErrorMessage);
      throw err;
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 md:p-6 shadow-xs max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary-subtle text-primary shrink-0">
          <Plus className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-main">
            إضافة مجموعة جديدة
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            أنشئ مجموعة دراسية جديدة وحدد جدول الجلسات بسهولة
          </p>
        </div>
      </div>

      <GroupForm
        onSubmit={handleSubmit}
        submitLabel="إنشاء المجموعة"
        SubmitIcon={Building}
      />
    </div>
  );
}