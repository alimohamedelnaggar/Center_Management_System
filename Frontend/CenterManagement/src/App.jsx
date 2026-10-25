import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./components/Auth/LoginComponent/Login";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Spinner from "./components/common/Spinner";
import ModuleGuard from "./components/common/ModuleGuard";
import StudentPortalGate from "./components/common/StudentPortalGate";
import SidebarLayout from "./layouts/SidebarLayout";
import ExamPage from "./pages/EaxmPages/ExamPage";
import AttendanceSheet from "./pages/AttendancePages/AttendanceSheet";
import ScannerPage from "./pages/AttendancePages/ScannerPage";
import StudentQrCardsPage from "./pages/StudentPages/StudentQrCardsPage";
import StudentReportsPage from "./pages/StudentReportsPage";
import StudentCardLookupPage from "./pages/PublicPages/StudentCardLookupPage";
import ExpensesPage from "./pages/ExpensePages/ExpensesPage";
import IncomesPage from "./pages/IncomePages/IncomesPage";
import FinancePage from "./pages/FinancePage";
import OverduePage from "./pages/OverduePage";
import NotFound from "./pages/NotFound";
import ReportsPage from "./pages/ReportsPage";
import CenterReportsPage from "./pages/CenterReportsPage";

import AdminDashboard from "./pages/AdminDashboard";
import AssistantManagement from "./pages/AssistantManagement";
import SettingsPage from "./pages/SettingsPage";
import StudentManagement from "./pages/StudentPage/StudentManagement";
import QuestionBankPage from "./pages/QuestionBankPages/QuestionBankPage";
import ExamsPage from "./pages/QuestionExamPages/ExamsPage";
import ExamPaperPrintPage from "./pages/QuestionExamPages/ExamPaperPrintPage";
import StudyNotesPage from "./pages/StudyNotePages/StudyNotesPage";
import Profile from "./pages/Profile";
import CentersManagement from "./pages/CentersManagement";
import SubscriptionsManagement from "./pages/SubscriptionsManagement";
import PlatformStatistics from "./pages/PlatformStatistics";
import AuditLogPage from "./pages/AuditLogPage";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import CenterSettingsPage from "./pages/CenterSettingsPage";
import TeachersManagement from "./pages/TeachersManagement";
import MySubscriptionPage from "./pages/MySubscriptionPage";
import BulkParentAccountsPage from "./pages/BulkParentAccountsPage";
import { useAuth } from "./context/useAuth";
import { homeFor } from "./utils/homeRoute";
import { ROUTE_GUARDS } from "./constants/routeGuards";
import { moduleForPath } from "./constants/modules";
import StudentLayout from "./layouts/StudentLayout";
import StudentDashboardPage from "./pages/StudentPortalPages/StudentDashboardPage";
import StudentExamsPage from "./pages/StudentPortalPages/StudentExamsPage";
import StudentExamAttemptPage from "./pages/StudentPortalPages/StudentExamAttemptPage";
import StudentResultsPage from "./pages/StudentPortalPages/StudentResultsPage";
import StudentNotificationsPage from "./pages/StudentPortalPages/StudentNotificationsPage";
import StudentProfilePage from "./pages/StudentPortalPages/StudentProfilePage";
import StudentAttendancePage from "./pages/StudentPortalPages/StudentAttendancePage";
import StudentPaymentsPage from "./pages/StudentPortalPages/StudentPaymentsPage";
import StudentNotesPage from "./pages/StudentPortalPages/StudentNotesPage";
import ParentPortalGate from "./components/common/ParentPortalGate";
import ParentLayout from "./layouts/ParentLayout";
import ParentDashboardPage from "./pages/ParentPortalPages/ParentDashboardPage";
import ParentChildDetailsPage from "./pages/ParentPortalPages/ParentChildDetailsPage";
import ParentNotificationsPage from "./pages/ParentPortalPages/ParentNotificationsPage";

/**
 * Module-gated route element. The guard module is looked up from the shared
 * NAV_ITEMS table (via moduleForPath) so the sidebar and the router can never
 * disagree about which module a path belongs to. Core paths pass straight
 * through.
 */
function ModuleRoute({ path, children }) {
  const moduleKey = moduleForPath(path);
  if (!moduleKey || moduleKey === "core") return children;
  return <ModuleGuard moduleKey={moduleKey}>{children}</ModuleGuard>;
}

/**
 * Land an owner on the multi-teacher "إدارة المدرسين" page only when the center
 * actually supports multiple teachers; a solo center lands on the dashboard.
 * Waits for centerType so we never redirect into a page that is about to 404.
 */
function CenterLanding() {
  const { centerTypeLoaded, isSoloCenter } = useAuth();
  if (!centerTypeLoaded) return <Spinner msg="جاري التحميل" />;
  return <Navigate to={isSoloCenter ? "/dashboard" : "/teachers"} replace />;
}

/**
 * Owners and solo teachers get the center-wide report; a regular teacher keeps
 * the own-groups page.
 */
function ReportsEntry() {
  const { role, isSoloTeacher } = useAuth();
  if (role === "CenterOwner" || isSoloTeacher) {
    return <Navigate to="/center-reports" replace />;
  }
  return <ReportsPage />;
}

/**
 * Sends each role to its home, but if that home belongs to a module the center
 * no longer has, falls back to a page that is always available (profile).
 */
function HomeRedirect() {
  const { role, hasModule } = useAuth();
  const home = homeFor(role);
  const moduleKey = moduleForPath(home);

  if (moduleKey && !hasModule(moduleKey)) {
    return <Navigate to="/profile" replace />;
  }

  return <Navigate to={home} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Public: a parent scans the card QR with the phone camera. */}
      <Route path="/student-card/:code" element={<StudentCardLookupPage />} />
      <Route path="/student-card" element={<StudentCardLookupPage />} />

      {/* First sign-in with a temporary password: forces a change before use. */}
      <Route element={<ProtectedRoute allowWhilePasswordChange />}>
        <Route path="/force-password" element={<ForcePasswordChange />} />
        <Route path="/change-password" element={<ForcePasswordChange />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["Assistant", "CenterOwner", "SuperAdmin", "Teacher"]} />}>
        <Route element={<SidebarLayout />}>
          <Route path="/" element={<HomeRedirect />} />

          {/* Operational tools: assistants and teachers only. */}
          <Route element={<ProtectedRoute allowedRoles={["Assistant", "Teacher"]} />}>
            <Route path="/dashboard" element={<StudentManagement />} />
            <Route path="/attendance" element={<ModuleRoute path="/attendance"><AttendanceSheet /></ModuleRoute>} />
            <Route path="/scanner" element={<ModuleRoute path="/scanner"><ScannerPage /></ModuleRoute>} />
            <Route path="/grades" element={<ModuleRoute path="/grades"><ExamPage /></ModuleRoute>} />
            <Route path="/question-bank" element={<ModuleRoute path="/question-bank"><QuestionBankPage /></ModuleRoute>} />
            <Route path="/exams" element={<ModuleRoute path="/exams"><ExamsPage /></ModuleRoute>} />
            <Route path="/notes" element={<ModuleRoute path="/notes"><StudyNotesPage /></ModuleRoute>} />
          </Route>

          {/* Reports + groups: managers and teachers (assistant gets read-only groups). */}
          <Route element={<ProtectedRoute allowedRoles={["CenterOwner", "Teacher"]} />}>
            <Route path="/reports" element={<ModuleRoute path="/reports"><ReportsEntry /></ModuleRoute>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["CenterOwner", "Teacher", "Assistant"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="/profile" element={<Profile />} />

          {/* Income: managers and teachers (scoped to their own groups). */}
          <Route
            element={<ProtectedRoute allowedRoles={["CenterOwner", "Teacher"]} />}
          >
            <Route path="/income" element={<ModuleRoute path="/income"><IncomesPage /></ModuleRoute>} />
          </Route>

          {/* Finance + expenses: managers only; solo teachers manage their own money. */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["CenterOwner"]} allowSoloTeacher />
            }
          >
            <Route path="/finance" element={<ModuleRoute path="/finance"><FinancePage /></ModuleRoute>} />
            <Route path="/expense" element={<ModuleRoute path="/expense"><ExpensesPage /></ModuleRoute>} />
          </Route>

          {/* Overdue students: admins (whole center), teachers and assistants
              (scoped to their own groups). */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["CenterOwner", "Teacher", "Assistant"]} />
            }
          >
            <Route path="/overdue" element={<ModuleRoute path="/overdue"><OverduePage /></ModuleRoute>} />
          </Route>

          {/* Center administration: owners and solo teachers. */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["CenterOwner"]} allowSoloTeacher />
            }
          >
            <Route path="/center-settings" element={<CenterSettingsPage />} />
            <Route path="/assistants" element={<AssistantManagement />} />
            <Route path="/my-subscription" element={<MySubscriptionPage />} />
            {/* Center-wide report: policy CenterAdmin (owner / solo teacher). */}
            <Route path="/center-reports" element={<ModuleRoute path="/center-reports"><CenterReportsPage /></ModuleRoute>} />
          </Route>

          {/* Multi-teacher only: hidden/blocked while the center is solo. */}
          <Route
            element={
              <ProtectedRoute {...ROUTE_GUARDS["/teachers"]} />
            }
          >
            <Route path="/teachers" element={<TeachersManagement />} />
          </Route>

          {/* Bulk parent accounts: one page that prepares the parent login of
              every student of a group (or of the whole center) at once. */}
          <Route
            element={
              <ProtectedRoute {...ROUTE_GUARDS["/bulk-parent-accounts"]} />
            }
          >
            <Route
              path="/bulk-parent-accounts"
              element={
                <ModuleRoute path="/bulk-parent-accounts">
                  <BulkParentAccountsPage />
                </ModuleRoute>
              }
            />
          </Route>

          {/* Center-wide statistics: owners and solo teachers, in every center
              type (the backend allows both). */}
          <Route
            element={
              <ProtectedRoute {...ROUTE_GUARDS["/adminDashboard"]} />
            }
          >
            <Route path="/adminDashboard" element={<AdminDashboard />} />
          </Route>

          {/* Platform administration: SuperAdmin only. */}
          <Route element={<ProtectedRoute allowedRoles={["SuperAdmin"]} />}>
            <Route path="/centers" element={<CentersManagement />} />
            <Route path="/subscriptions" element={<SubscriptionsManagement />} />
            <Route path="/platform" element={<PlatformStatistics />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/admin" element={<Navigate to="/centers" replace />} />
          </Route>
        </Route>

        {/* Printable exam paper (no sidebar) */}
        <Route path="/exams/:id/paper" element={<ExamPaperPrintPage />} />

        {/* Student QR cards (assistants and teachers) */}
        <Route element={<ProtectedRoute allowedRoles={["Assistant", "Teacher"]} />}>
            <Route path="/qr-cards" element={<ModuleRoute path="/qr-cards"><StudentQrCardsPage /></ModuleRoute>} />
        </Route>

        {/* Student reports (accounts / attendance / exams): teachers only - the
            report endpoints are not open to assistants. A core page: every
            column is gated by its own module inside the page. */}
        <Route element={<ProtectedRoute {...ROUTE_GUARDS["/student-reports"]} />}>
            <Route path="/student-reports" element={<StudentReportsPage />} />
        </Route>

        {/* Role landing redirects */}
        <Route element={<ProtectedRoute allowedRoles={["CenterOwner"]} />}>
          <Route path="/center/dashboard" element={<CenterLanding />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["Teacher"]} />}>
          <Route path="/teacher/dashboard" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Student portal */}
      <Route element={<ProtectedRoute allowedRoles={["Student"]} />}>
        {/* Whole portal is off when the center has no `student_portal` module. */}
        <Route element={<StudentPortalGate />}>
          <Route element={<StudentLayout />}>
            <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/student/dashboard" element={<ModuleRoute path="/student/dashboard"><StudentDashboardPage /></ModuleRoute>} />
            <Route path="/student/exams" element={<ModuleRoute path="/student/exams"><StudentExamsPage /></ModuleRoute>} />
            <Route path="/student/results" element={<ModuleRoute path="/student/results"><StudentResultsPage /></ModuleRoute>} />
            <Route path="/student/attendance" element={<ModuleRoute path="/student/attendance"><StudentAttendancePage /></ModuleRoute>} />
            <Route path="/student/payments" element={<ModuleRoute path="/student/payments"><StudentPaymentsPage /></ModuleRoute>} />
            <Route path="/student/notes" element={<ModuleRoute path="/student/notes"><StudentNotesPage /></ModuleRoute>} />
            <Route path="/student/notifications" element={<ModuleRoute path="/student/notifications"><StudentNotificationsPage /></ModuleRoute>} />
            <Route path="/student/profile" element={<ModuleRoute path="/student/profile"><StudentProfilePage /></ModuleRoute>} />
          </Route>

          {/* Full-screen exam attempt (no sidebar) */}
          <Route path="/student/attempt/:attemptId" element={<StudentExamAttemptPage />} />
        </Route>
      </Route>

      {/* Parent portal */}
      <Route element={<ProtectedRoute allowedRoles={["Parent"]} />}>
        {/* Whole portal is off when the center has no `parent_portal` module. */}
        <Route element={<ParentPortalGate />}>
          <Route element={<ParentLayout />}>
            <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="/parent/dashboard" element={<ModuleRoute path="/parent/dashboard"><ParentDashboardPage /></ModuleRoute>} />
            <Route path="/parent/notifications" element={<ModuleRoute path="/parent/notifications"><ParentNotificationsPage /></ModuleRoute>} />
            {/* Per-child details; each section is guarded by its own module
                in-page (attendance / grades / online_exams / payments). */}
            <Route path="/parent/children/:studentId" element={<ParentChildDetailsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
