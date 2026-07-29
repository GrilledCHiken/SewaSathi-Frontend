import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import Brandmark from "../ui/Brandmark";
import { CheckIcon } from "../ui/icons";

/**
 * The split auth shell: a navy marketing panel at lg and up, the form on the
 * right, and a mobile logo row when the panel is hidden.
 *
 * Login, SignupOption, UserSignup and WorkerSignup each carried their own copy
 * of this markup along with their own inlined LogoIcon, which is how the four
 * screens drifted apart — different card widths, different aside content, and
 * in one case no aside at all.
 *
 * The aside is overridable because the worker signup wants a different pitch
 * from the customer one, but it defaults to the customer-facing panel that
 * Login already used.
 */

const TRUST_POINTS = [
  "Verified, background-checked professionals",
  "Secure, cashless payments",
  "24/7 customer support",
];

/** Default marketing panel — carried over from Login.jsx unchanged. */
export function DefaultAside({
  heading = (
    <>
      Book trusted help,
      <br />
      in minutes.
    </>
  ),
  blurb = "Connect with verified professionals for cleaning, repairs, moving, and more — all in one place.",
  points = TRUST_POINTS,
  quote = "SewaSathi made finding a reliable cleaner so easy. Professional, on time, and fairly priced.",
  quoteAuthor = "Sita Sharma · Lalitpur",
  quoteInitials = "SS",
}) {
  return (
    <>
      <div className="relative animate-fade-up">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
          {heading}
        </h2>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">
          {blurb}
        </p>

        <ul className="mt-8 space-y-3.5">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-center gap-3 text-sm font-medium text-slate-200"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/25 text-brand-200 ring-1 ring-brand/40">
                <CheckIcon className="h-3 w-3" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {quote && (
        <div className="relative animate-fade-up-delay rounded-panel border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-sm italic leading-relaxed text-slate-200">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-white ring-1 ring-brand/40">
              {quoteInitials}
            </span>
            <p className="text-xs font-semibold text-slate-300">{quoteAuthor}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function AuthLayout({
  title,
  subtitle,
  notice,
  footer,
  /** Row above the title — the signup screens put a Back link and role chip here. */
  topBar,
  width = "max-w-[420px]",
  aside,
  children,
}) {
  return (
    <div className="flex min-h-svh bg-surface-muted">
      {/* Marketing panel — hidden below lg, where the form gets the full width. */}
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-navy lg:flex lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/30 via-navy to-navy" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

        <Brandmark to="/" tone="dark" size="lg" className="relative" />

        {aside ?? <DefaultAside />}
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <Brandmark to="/" size="md" className="mb-8 lg:hidden" />

        <div
          className={cn(
            "w-full animate-fade-up rounded-panel border border-line bg-surface p-8 shadow-e3 sm:p-10",
            width,
          )}
        >
          {topBar && <div className="mb-5">{topBar}</div>}

          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-ink-muted sm:text-base">{subtitle}</p>
            )}
          </div>

          {notice && <div className="mt-6">{notice}</div>}

          {children}
        </div>

        {footer && <div className="mt-8 text-sm text-ink-body">{footer}</div>}
      </div>
    </div>
  );
}

/** The "Already have an account? Sign in" line every auth screen ends with. */
export function AuthFooterLink({ prompt, to, label }) {
  return (
    <p>
      {prompt}{" "}
      <Link
        to={to}
        className="rounded font-semibold text-brand transition hover:text-brand-dark focus-ring"
      >
        {label}
      </Link>
    </p>
  );
}
