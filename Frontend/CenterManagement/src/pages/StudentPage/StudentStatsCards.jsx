import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
} from "@/components/icons";

function StudentStatsCards({ stats, loading }) {
  const cards = [
    {
      title: "إجمالي الطلاب",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      iconBg: "bg-primary-subtle",
      iconColor: "text-primary",
    },
    {
      title: "الطلاب النشطين",
      value: stats?.activeStudents ?? 0,
      icon: UserCheck,
      iconBg: "bg-status-success-bg",
      iconColor: "text-status-success",
    },
    {
      title: "الطلاب غير النشطين",
      value: stats?.inactiveStudents ?? 0,
      icon: UserX,
      iconBg: "bg-status-danger-bg",
      iconColor: "text-status-danger",
    },
    {
      title: "طلاب هذا الشهر",
      value: stats?.newStudentsThisMonth ?? 0,
      icon: UserPlus,
      iconBg: "bg-status-info-bg",
      iconColor: "text-status-info",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">
                  {card.title}
                </p>

                {loading ? (
                  <div className="mt-3 h-8 w-20 animate-pulse rounded bg-surface-muted" />
                ) : (
                  <h2 className="mt-2 text-3xl font-medium text-text-main">
                    {card.value.toLocaleString()}
                  </h2>
                )}
              </div>

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon className={`h-7 w-7 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StudentStatsCards;