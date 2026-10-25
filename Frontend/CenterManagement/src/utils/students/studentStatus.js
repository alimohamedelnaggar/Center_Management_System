export const STATUS_STYLES = {
  Active: "bg-status-success-bg text-status-success",
  Inactive: "bg-surface-muted text-text-muted",
};

export function getStudentStatus(status) {
  return {
    key: status ? "Active" : "Inactive",
    label: status ? "نشط" : "غير نشط",
  };
}