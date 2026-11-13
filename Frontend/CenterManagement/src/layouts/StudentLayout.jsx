import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import StudentSidebar, {
  visibleStudentNavItems,
} from "../components/StudentSidebar";
import MobileAppBar from "../components/layout/MobileAppBar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import NotificationBell from "../components/Student/NotificationBell";
import { studentPortalService } from "../services/studentPortalService";
import { useAuth } from "../context/useAuth";

export default function StudentLayout() {
  const [profile, setProfile] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const { hasCenterModule } = useAuth();
  const navItems = visibleStudentNavItems(hasCenterModule);
  const closeNav = () => setNavOpen(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await studentPortalService.getProfile();
        if (active && res?.succeeded) setProfile(res.data);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const subtitle = profile?.groups?.length
    ? profile.groups.join(" • ")
    : "مرحباً بك في بوابة الطالب";

  return (
    <div data-testid="student-shell" className="app-shell">
      <StudentSidebar mobileOpen={navOpen} onMobileClose={closeNav} />

      <div className="app-main">
        <MobileAppBar
          title={profile?.fullName ?? "طالب"}
          subtitle={subtitle}
          onMenu={() => setNavOpen(true)}
          menuOpen={navOpen}
          actions={<NotificationBell />}
        />

        <header className="sticky top-0 z-30 hidden items-center justify-between gap-3 border-b border-surface-border bg-surface-card px-4 py-3 md:flex md:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-main">
              {profile?.fullName ?? "طالب"}
            </p>
            <p className="truncate text-sm text-text-muted">{subtitle}</p>
          </div>

          <NotificationBell />
        </header>

        <Outlet />
      </div>

      <MobileBottomNav
        items={navItems}
        onMore={() => setNavOpen(true)}
      />
    </div>
  );
}
