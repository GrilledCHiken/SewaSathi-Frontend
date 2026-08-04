import { useMemo } from "react";
import { Link } from "react-router-dom";
import SideNav from "../ui/SideNav";
import { useChat } from "../../context/ChatContext";
import {
  CardIcon,
  ChatIcon,
  ClipboardIcon,
  GridIcon,
  HelpIcon,
  PlusIcon,
  StarOutlineIcon,
  UsersIcon,
} from "../ui/icons";

/**
 * Customer side rail.
 *
 * The chrome, the mobile off-canvas behaviour and the brand block now live in
 * ui/SideNav, shared with the worker and admin panels. What stays here is the
 * only thing that was ever panel-specific: the nav items.
 *
 * Nav structure is unchanged — same seven destinations, same order, same
 * routes. My Profile and Security are still reached from the account menu in
 * the header rather than from here.
 */

const MESSAGES_ROUTE = "/dashboard/messages";

const NAV_ITEMS = [
  { label: "Overview", to: "/dashboard", end: true, icon: <GridIcon /> },
  { label: "Post Task", to: "/dashboard/post-task", icon: <PlusIcon /> },
  { label: "My Tasks", to: "/dashboard/tasks", icon: <ClipboardIcon /> },
  { label: "Browse Workers", to: "/dashboard/workers", icon: <UsersIcon /> },
  { label: "Messages", to: MESSAGES_ROUTE, icon: <ChatIcon /> },
  { label: "Payments", to: "/dashboard/payments", icon: <CardIcon /> },
  { label: "Reviews", to: "/dashboard/reviews", icon: <StarOutlineIcon /> },
];

function SidebarFooter({ onNavigate }) {
  return (
    <Link
      to="/help"
      onClick={onNavigate}
      className="flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white focus-ring-dark"
    >
      <HelpIcon className="h-4 w-4" />
      Help &amp; support
    </Link>
  );
}

function Sidebar({ mobileOpen, onCloseMobile }) {
  // useChat returns null outside a ChatProvider, which is how this stays safe to render
  // before the dashboard's provider mounts.
  const totalUnread = useChat()?.totalUnread ?? 0;
  const items = useMemo(
    () =>
      NAV_ITEMS.map((item) =>
        item.to === MESSAGES_ROUTE ? { ...item, badge: totalUnread } : item,
      ),
    [totalUnread],
  );

  return (
    <SideNav
      items={items}
      subtitle="Customer Dashboard"
      accent="brand"
      ariaLabel="Dashboard"
      brandTo="/dashboard"
      footer={<SidebarFooter onNavigate={onCloseMobile} />}
      mobileOpen={mobileOpen}
      onCloseMobile={onCloseMobile}
    />
  );
}

export default Sidebar;
