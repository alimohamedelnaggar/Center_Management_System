import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar.jsx";
import ImpersonationBanner from "../components/ImpersonationBanner.jsx";
import SubscriptionBanner from "../components/common/SubscriptionBanner.jsx";

export default function SidebarLayout() {
  return (
    <div className="flex min-h-screen bg-surface-bg text-text-main">
      <AppSidebar />

      <main className="min-w-0 flex-1">
        <ImpersonationBanner />
        <SubscriptionBanner />
        <Outlet />
      </main>
    </div>
  );
}
