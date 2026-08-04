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
  SearchIcon,
} from "../ui/icons";

/**
 * Worker side rail. Same shell as the customer and admin rails, distinguished
 * by the emerald accent the worker panel already used.
 *
 * Nav structure unchanged — My Profile is still reached from the account menu
 * in the header, not from here.
 */

const MESSAGES_ROUTE = "/worker/messages";

const NAV_ITEMS = [
  { label: "Overview", to: "/worker", end: true, icon: <GridIcon /> },
  { label: "Browse Tasks", to: "/worker/tasks", icon: <SearchIcon /> },
  { label: "My Jobs", to: "/worker/jobs", icon: <ClipboardIcon /> },
  { label: "Earnings", to: "/worker/earnings", icon: <CardIcon /> },
  { label: "Messages", to: MESSAGES_ROUTE, icon: <ChatIcon /> },
];

function WorkerSidebar({ mobileOpen, onCloseMobile }) {
  // useChat returns null outside a ChatProvider — an unapproved worker never gets one.
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
      subtitle="Worker Dashboard"
      accent="emerald"
      ariaLabel="Worker"
      brandTo="/worker"
      footer={
        <Link
          to="/help"
          onClick={onCloseMobile}
          className="flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white focus-ring-dark"
        >
          <HelpIcon className="h-4 w-4" />
          Help &amp; support
        </Link>
      }
      mobileOpen={mobileOpen}
      onCloseMobile={onCloseMobile}
    />
  );
}

export default WorkerSidebar;
