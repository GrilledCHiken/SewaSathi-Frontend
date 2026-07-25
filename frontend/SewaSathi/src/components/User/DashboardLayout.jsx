import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh bg-slate-50">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <Outlet context={{ openMobileMenu: () => setMobileOpen(true) }} />
      </div>
    </div>
  );
}

export default DashboardLayout;
