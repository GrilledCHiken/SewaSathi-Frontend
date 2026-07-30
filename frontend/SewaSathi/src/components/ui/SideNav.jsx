import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";
import Brandmark from "./Brandmark";

/**
 * The dashboard side rail, shared by the customer, worker and admin panels.
 *
 * Those three sidebars were byte-identical apart from four things: the nav
 * array, the `aria-label`, the subtitle string and the active-link accent. They
 * were also three separate copies of the same mobile off-canvas mechanism and
 * the same inlined LogoIcon. Restyling one and not the others would have forked
 * the app's chrome, so they now share this.
 *
 * The rail is navy rather than white. This is dark *chrome* on a light app, not
 * a dark theme — it gives the product a spine and stops the dashboard reading
 * as an unstyled admin template.
 *
 * Nav items keep their exact previous shape — `{ label, to, end?, icon }` — so
 * each panel's array moves across unchanged.
 */

/* Full literal class strings — the marker classes are written out as
   `before:bg-*` rather than derived from a base colour at runtime, because
   Tailwind's JIT scans source text and would never see a constructed name. */
const ACCENTS = Object.freeze({
  brand: {
    active: "bg-brand/20 text-white before:bg-brand-300",
    icon: "text-brand-300",
  },
  emerald: {
    active: "bg-emerald-500/20 text-white before:bg-emerald-300",
    icon: "text-emerald-300",
  },
  slate: {
    active: "bg-white/15 text-white before:bg-slate-300",
    icon: "text-slate-300",
  },
});

export default function SideNav({
  items = [],
  subtitle,
  accent = "brand",
  ariaLabel = "Dashboard",
  brandTo = "/",
  sectionLabel = "Menu",
  footer,
  mobileOpen = false,
  onCloseMobile,
}) {
  const tone = ACCENTS[accent] || ACCENTS.brand;

  return (
    <>
      {/* Mobile scrim. Kept as a button so it is reachable and dismissible
          from the keyboard, exactly as the three originals were. */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[var(--dash-sidebar-w)] flex-col",
          "bg-navy-light transition-transform duration-300 ease-out-soft",
          // Desktop: the rail stays in flow (so the content column keeps doing
          // the width math) but pins to the viewport, matching the already
          // sticky dashboard headers. `self-start` is load-bearing — as a
          // stretched flex child the aside is as tall as the whole scrolling
          // page, and a sticky box that fills its container never sticks.
          // `bottom-auto`/`left-auto` undo the mobile drawer's inset.
          "lg:sticky lg:top-0 lg:bottom-auto lg:left-auto",
          "lg:h-svh lg:self-start lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <Brandmark to={brandTo} tone="dark" subtitle={subtitle} />
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
          aria-label={ariaLabel}
        >
          {sectionLabel && (
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {sectionLabel}
            </p>
          )}

          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium",
                  "transition duration-200 ease-out-soft focus-ring-dark",
                  // The 3px rail marker reads as position in the list, which a
                  // background tint alone does not.
                  "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px]",
                  "before:-translate-y-1/2 before:rounded-r-full before:transition-colors",
                  isActive
                    ? cn("font-semibold", tone.active)
                    : "text-slate-400 before:bg-transparent hover:bg-white/5 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? tone.icon : "text-slate-500",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {footer && (
          <div className="mt-auto border-t border-white/10 p-3">{footer}</div>
        )}
      </aside>
    </>
  );
}
