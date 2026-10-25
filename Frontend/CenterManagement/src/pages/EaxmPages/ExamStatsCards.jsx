import { BarChart3, ClipboardCheck, Clock3, Users } from "@/components/icons";

export default function ExamStatsCards({ stats, loading }) {
  const cards = [
    {
      title: "طلاب الامتحان",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: "bg-primary-subtle text-primary",
    },
    {
      title: "تم رصدهم",
      value: stats?.gradedStudents ?? 0,
      icon: ClipboardCheck,
      color: "bg-status-success-bg text-status-success",
    },
    {
      title: "المتبقي",
      value: stats?.remainingStudents ?? 0,
      icon: Clock3,
      color: "bg-status-warning-bg text-status-warning",
    },
    {
      title: "متوسط الدرجات",
      value: `${stats?.averageMark ?? 0}%`,
      icon: BarChart3,
      color: "bg-status-info-bg text-status-info",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">{card.title}</p>

                {loading ? (
                  <div className="mt-3 h-8 w-20 animate-pulse rounded bg-surface-muted" />
                ) : (
                  <h2 className="mt-2 text-3xl font-bold text-text-main">
                    {card.value}
                  </h2>
                )}
              </div>

              <div
                className={`h-14 w-14 rounded-xl flex items-center justify-center ${card.color}`}
              >
                <Icon className="w-7 h-7" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
