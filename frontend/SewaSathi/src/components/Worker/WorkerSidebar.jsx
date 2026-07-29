import { Link } from "react-router-dom";
import SideNav from "../ui/SideNav";
import { ChatIcon, ClipboardIcon, GridIcon, HelpIcon, SearchIcon } from "../ui/icons";

/**
 * Worker side rail. Same shell as the customer and admin rails, distinguished
 * by the emerald accent the worker panel already used.
 *
 * Nav structure unchanged — My Profile is still reached from the account menu
 * in the header, not from here.
 */

const NAV_ITEMS = [
  { label: "Overview", to: "/worker", end: true, icon: <GridIcon /> },
  { label: "Browse Tasks", to: "/worker/tasks", icon: <SearchIcon /> },
  { label: "My Jobs", to: "/worker/jobs", icon: <ClipboardIcon /> },
  { label: "Messages", to: "/worker/messages", icon: <ChatIcon /> },
];

function WorkerSidebar({ mobileOpen, onCloseMobile }) {
  return (
    <SideNav
      items={NAV_ITEMS}
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
