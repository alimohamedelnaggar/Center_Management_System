import ReportsStudentsTab from "../components/reports/ReportsStudentsTab";

/**
 * The student reports page for teachers: accounts, attendance and exams for
 * every student of the teacher's scope. It is a core page (not behind the
 * paid center-reports module) - each report column is gated by its own
 * module, so a teacher always gets what the center actually bought.
 */
export default function StudentReportsPage() {
  return (
    <ReportsStudentsTab
      heading="تقارير الطلاب"
      breadcrumb="الرئيسية / تقارير الطلاب"
    />
  );
}
