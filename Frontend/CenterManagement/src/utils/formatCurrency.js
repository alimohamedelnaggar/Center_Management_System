export function formatCurrency(value, withCurrency = true) {
  const num = Number(value) || 0;

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);

  return withCurrency ? `${formatted} ج.م` : formatted;
}
