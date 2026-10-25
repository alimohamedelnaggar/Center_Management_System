import * as XLSX from 'xlsx';

export const exportFinanceToExcel = (data, fileName = "Financial_Report") => {
  if (!data || !data.length) return;

  const formattedData = data.map((item, index) => ({
    "م": index + 1,
    "اسم الطالب": item.studentName || item.StudentName,
    "المجموعة": item.groupName || item.GroupName,
    "نوع الاشتراك": item.subscriptionType === 1 ? "بالحصة" : "شهري",
    "المبلغ": item.amount || item.LastPaymentAmount || 0,
    "تاريخ الدفع": item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('ar-EG') : 'غير مدفوع',
    "الفترة / الحصة": item.billingPeriod || item.sessionName || '-',
    "الملاحظات": item.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير المالي");
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0,10)}.xlsx`);
};