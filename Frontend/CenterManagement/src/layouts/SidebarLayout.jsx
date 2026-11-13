import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar.jsx";
import MobileAppBar from "../components/layout/MobileAppBar.jsx";
import MobileBottomNav from "../components/layout/MobileBottomNav.jsx";
import ImpersonationBanner from "../components/ImpersonationBanner.jsx";
import OwnerEmailWarning from "../components/OwnerEmailWarning.jsx";
import SubscriptionBanner from "../components/common/SubscriptionBanner.jsx";
import useAppNavigation from "../hooks/useAppNavigation.js";

export default function SidebarLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const nav = useAppNavigation();
  const closeNav = () => setNavOpen(false);

  return (
    <div className="app-shell">
      <AppSidebar nav={nav} mobileOpen={navOpen} onMobileClose={closeNav} />

      <div className="app-main">
        <MobileAppBar
          title={nav.brandTitle ?? nav.brandName}
          subtitle={nav.identity.title}
          onMenu={() => setNavOpen(true)}
          menuOpen={navOpen}
        />
        <ImpersonationBanner />
        <SubscriptionBanner />
        <OwnerEmailWarning />
        <Outlet />
      </div>

      <MobileBottomNav
        items={nav.visibleNavItems}
        onMore={() => setNavOpen(true)}
      />
    </div>
  );
}
