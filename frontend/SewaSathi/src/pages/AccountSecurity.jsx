import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import useDesktopNotifications from "../hooks/useDesktopNotifications";
import DashboardHeader from "../components/User/DashboardHeader";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import { Panel } from "../components/ui/Card";
import Button from "../components/ui/Button";
import ToggleSwitch from "../components/ui/ToggleSwitch";
import { BellIcon, ShieldIcon } from "../components/ui/icons";

/**
 * Account security.
 *
 * This page previously rendered no header at all — it started straight at a
 * centred column. Since DashboardLayout is only a sidebar plus a bare Outlet,
 * that left /dashboard/security with no page title and, more seriously, no
 * hamburger button: on a phone the sidebar was unreachable from this route.
 * Adding the shared header fixes both.
 */
export default function AccountSecurity() {
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const desktopAlerts = useDesktopNotifications();
  const { logoutEverywhere } = useAuth();
  const navigate = useNavigate();

  /**
   * Permission is requested from this click and nowhere else. Browsers reject a prompt that
   * is not tied to a user gesture, and Chrome permanently blocks sites that ask on load.
   */
  const toggleDesktopAlerts = async () => {
    if (desktopAlerts.enabled) {
      desktopAlerts.disable();
      return;
    }

    const result = await desktopAlerts.requestPermission();
    if (result === "granted") {
      toast.success("Desktop alerts are on.");
    } else if (result === "denied") {
      toast.info("Your browser blocked notifications for this site.");
    }
  };

  const handleLogoutEverywhere = async () => {
    setSigningOutEverywhere(true);
    try {
      await logoutEverywhere();
      toast.success("Signed out on all devices.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Could not sign out everywhere. Please try again.");
      setSigningOutEverywhere(false);
    }
  };

  return (
    <PageShell header={<DashboardHeader title="Security" />} width="sm">
      <PageHeader
        title="Security"
        description="Control how your account is protected when signing in."
      />

      <Panel className="mt-6" padding="lg">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand">
            <BellIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-ink">Desktop alerts</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Show messages and job updates as desktop notifications when
              SewaSathi is open in a background tab. Nothing is shown while you
              are looking at the page — the bell already covers that.
            </p>

            {!desktopAlerts.supported && (
              <p className="mt-3 text-sm text-ink-faint">
                This browser does not support desktop notifications.
              </p>
            )}

            {desktopAlerts.supported && desktopAlerts.permission === "denied" && (
              <p className="mt-3 text-sm text-ink-faint">
                Notifications are blocked for this site. Re-allow them in your
                browser&apos;s site settings to turn this on.
              </p>
            )}

            {desktopAlerts.supported && desktopAlerts.permission !== "denied" && (
              <div className="mt-4 flex items-center gap-3">
                <ToggleSwitch
                  checked={desktopAlerts.enabled}
                  onChange={toggleDesktopAlerts}
                  label="Desktop alerts"
                  labelHidden
                />
                <span className="text-sm font-medium text-ink-body">
                  {desktopAlerts.enabled ? "On" : "Off"}
                </span>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4" padding="lg">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field bg-surface-sunken text-ink-muted">
            <ShieldIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-ink">Signed-in devices</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Signing in creates a session that renews itself while you are
              active and ends after a period of inactivity. If you think someone
              else has access to your account, sign out everywhere — every device
              will have to sign in again.
            </p>

            <Button
              variant="secondary"
              shape="rounded"
              className="mt-4"
              onClick={handleLogoutEverywhere}
              loading={signingOutEverywhere}
            >
              {signingOutEverywhere ? "Signing out…" : "Sign out everywhere"}
            </Button>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
}
