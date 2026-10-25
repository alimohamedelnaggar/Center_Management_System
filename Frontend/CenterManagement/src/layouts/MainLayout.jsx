import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-surface-bg text-text-main">
      <Sidebar />
      <main className="flex-1 p-6 ">
        <Outlet />
      </main>
    </div>
  );
}
