const STATUS_STYLES = {
  Active: "bg-status-success-bg text-status-success",
  Inactive: "bg-surface-muted text-text-muted",
};

export default function StatusBadge({ status }) {
  const key = status ? "Active" : "Inactive";
  const label = status ? "نشط" : "غير نشط";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[key]}`}
    >
      {label}
    </span>
  );
}
