import { Link } from "react-router-dom";
import { AuthFooterLink } from "../../components/auth/AuthLayout";
import BackLink from "../../components/ui/BackLink";
import Brandmark from "../../components/ui/Brandmark";
import { ArrowRightIcon, CheckIcon } from "../../components/ui/icons";

/**
 * The role chooser.
 *
 * Deliberately not on AuthLayout: that shell centres a single ~420px form
 * card, and this page is a two-up comparison. It shares the tokens, the
 * Brandmark and the icon set instead, which is where the duplication actually
 * was.
 */

function TaskIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function BriefcaseIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

const SIGNUP_OPTIONS = [
  {
    id: "customer",
    title: "I need help with tasks",
    description:
      "Post a task and get matched with verified professionals near you.",
    Icon: TaskIcon,
    to: "/signup/user",
    cta: "Continue as a Customer",
    accent: {
      badge: "bg-brand shadow-brand",
      ring: "hover:border-brand/40",
      glow: "bg-brand/10",
      cta: "text-brand group-hover:text-brand-dark",
      check: "bg-brand-50 text-brand",
    },
    benefits: [
      "Free to post a task",
      "Compare verified workers",
      "Pay only when you're satisfied",
    ],
    footnote: "Ready to use right away",
  },
  {
    id: "worker",
    title: "I want to offer services",
    description:
      "Create a worker profile, get verified, and start accepting tasks.",
    Icon: BriefcaseIcon,
    to: "/signup/worker",
    cta: "Continue as a Worker",
    accent: {
      badge: "bg-emerald-600 shadow-e2",
      ring: "hover:border-emerald-400/50",
      glow: "bg-emerald-400/10",
      cta: "text-emerald-600 group-hover:text-emerald-700",
      check: "bg-emerald-50 text-emerald-600",
    },
    benefits: [
      "Set your own rate & schedule",
      "Build a client base",
      "Get a verified badge",
    ],
    footnote: "Requires quick admin approval before you can be hired",
  },
];

function SignupOption() {
  return (
    <div className="relative flex min-h-svh flex-col items-center overflow-hidden bg-surface-muted px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      {/* Sits above the centred column rather than inside it: the two-up grid is
          what's centred here, and a back link nudged into that flow would drag
          the logo off-axis. */}
      <div className="relative mb-4 flex w-full max-w-3xl">
        <BackLink to="/" />
      </div>

      <Brandmark to="/" size="md" className="relative mb-8" />

      <div className="relative animate-fade-up text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          Join SewaSathi
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Choose the option that best describes you — it only takes a minute.
        </p>
      </div>

      <div className="relative mt-10 grid w-full max-w-3xl animate-fade-up-delay gap-6 sm:grid-cols-2">
        {SIGNUP_OPTIONS.map((option) => {
          const Icon = option.Icon;

          return (
            <Link
              key={option.id}
              to={option.to}
              className={`group relative flex flex-col overflow-hidden rounded-panel border border-line bg-surface p-6 text-left shadow-e1 transition duration-200 ease-out-soft hover:-translate-y-1 hover:shadow-e3 motion-reduce:hover:translate-y-0 focus-ring sm:p-7 ${option.accent.ring}`}
            >
              {/* Corner wash that warms on hover — purely decorative. */}
              <span
                className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-2xl transition-opacity duration-300 ${option.accent.glow} opacity-0 group-hover:opacity-100`}
                aria-hidden="true"
              />

              <span
                className={`relative flex h-12 w-12 items-center justify-center rounded-field text-white ${option.accent.badge}`}
              >
                <Icon />
              </span>

              <h2 className="relative mt-5 text-lg font-bold text-ink">
                {option.title}
              </h2>
              <p className="relative mt-1.5 text-sm leading-relaxed text-ink-muted">
                {option.description}
              </p>

              <ul className="relative mt-5 space-y-2.5">
                {option.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2.5 text-sm text-ink-body"
                  >
                    <span
                      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${option.accent.check}`}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="relative mt-6 flex flex-1 items-end justify-between gap-2 border-t border-line-soft pt-5">
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold transition ${option.accent.cta}`}
                >
                  {option.cta}
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>

              <p className="relative mt-3 text-xs text-ink-faint">
                {option.footnote}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="relative mt-8 text-sm text-ink-body">
        <AuthFooterLink
          prompt="Already have an account?"
          to="/login"
          label="Log in"
        />
      </div>
    </div>
  );
}

export default SignupOption;
