import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { ChatProvider } from "../../context/ChatContext";

function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // Wraps the whole panel, not just the messages page: the unread badge on the Messages
    // nav item has to keep moving wherever the customer happens to be.
    <ChatProvider>
      <div className="flex min-h-svh bg-surface-muted">
        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
          <Outlet context={{ openMobileMenu: () => setMobileOpen(true) }} />
        </div>
      </div>
    </ChatProvider>
  );
}

export default DashboardLayout;
