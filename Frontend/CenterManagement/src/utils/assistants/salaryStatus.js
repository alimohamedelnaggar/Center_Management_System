export const SALARY_STATUS = {
  PAID: "paid",
  PARTIAL: "partial",
  UNPAID: "unpaid",
};

export const SALARY_STATUS_LABELS = {
  [SALARY_STATUS.PAID]: "تم الصرف",
  [SALARY_STATUS.PARTIAL]: "تم دفع جزء",
  [SALARY_STATUS.UNPAID]: "لم يتم الصرف",
};

export const SALARY_STATUS_FILTERS = [
  { value: "all", label: "كل الحالات" },
  { value: SALARY_STATUS.PAID, label: SALARY_STATUS_LABELS[SALARY_STATUS.PAID] },
  {
    value: SALARY_STATUS.PARTIAL,
    label: SALARY_STATUS_LABELS[SALARY_STATUS.PARTIAL],
  },
  {
    value: SALARY_STATUS.UNPAID,
    label: SALARY_STATUS_LABELS[SALARY_STATUS.UNPAID],
  },
];

export function getSalaryStatus(status) {
  const key = SALARY_STATUS_LABELS[status] ? status : SALARY_STATUS.UNPAID;

  return {
    key,
    label: SALARY_STATUS_LABELS[key],
  };
}
