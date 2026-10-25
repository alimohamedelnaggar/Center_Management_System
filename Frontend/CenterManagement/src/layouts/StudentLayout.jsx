import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import NotificationBell from "../components/Student/NotificationBell";
import { studentPortalService } from "../services/studentPortalService";

export default function StudentLayout() {
  const [profile, setProfile] = useState(null);

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

  return (
    <div className="flex min-h-screen bg-surface-bg text-text-main">
      <StudentSidebar />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-surface-border bg-surface-card px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-main">
              {profile?.fullName ?? "طالب"}
            </p>
            <p className="truncate text-xs text-text-muted">
              {profile?.groups?.length
                ? profile.groups.join(" • ")
                : "مرحباً بك في بوابة الطالب"}
            </p>
          </div>

          <NotificationBell />
        </header>

        <Outlet />
      </main>
    </div>
  );
}
