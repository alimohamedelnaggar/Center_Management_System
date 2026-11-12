import { Plus, Building } from "@/components/icons";
import toast from "react-hot-toast";
import Card, { CardHeader } from "@/components/ui/Card";
import { groupsService } from "../../services/groupsService";
import GroupForm from "./GroupForm";

export default function AddGroupForm({ onSuccess }) {
  const handleSubmit = async (data) => {
    try {
      await groupsService.create({
        Name: data.name,
        MonthlyPrice: data.monthlyPrice,
        PerSessionPrice: data.perSessionPrice,
        SessionsPerMonth: data.sessionsPerMonth,
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
    <Card className="mx-auto max-w-4xl" data-testid="group-add-card">
      <CardHeader
        title="إضافة مجموعة جديدة"
        subtitle="أنشئ مجموعة دراسية جديدة وحدد سعر الشهر وسعر الحصة وجدول المواعيد."
        action={
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-subtle text-primary">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </span>
        }
      />

      <div className="p-4 sm:p-5">
        <GroupForm
          onSubmit={handleSubmit}
          submitLabel="إنشاء المجموعة"
          SubmitIcon={Building}
        />
      </div>
    </Card>
  );
}
