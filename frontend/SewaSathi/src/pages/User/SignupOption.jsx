import { Link } from "react-router-dom";

function LogoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

function CheckIcon({ className = "h-5 w-5 text-emerald-500" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function TaskIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
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
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

const SIGNUP_OPTIONS = [
  {
    id: "customer",
    title: "I need help with tasks",
    description: "Post a task and get matched with verified professionals near you.",
    Icon: TaskIcon,
    to: "/signup/user",
    cta: "Continue as a Customer",
    accent: {
      badge: "bg-brand",
      ring: "hover:border-brand/40 hover:shadow-brand/10",
      cta: "text-brand group-hover:text-brand-dark",
      check: "text-brand",
    },
    benefits: ["Free to post a task", "Compare verified workers", "Pay only when you're satisfied"],
    footnote: "Ready to use right away",
  },
  {
    id: "worker",
    title: "I want to offer services",
    description: "Create a worker profile, get verified, and start accepting tasks.",
    Icon: BriefcaseIcon,
    to: "/signup/worker",
    cta: "Continue as a Worker",
    accent: {
      badge: "bg-emerald-600",
      ring: "hover:border-emerald-400/50 hover:shadow-emerald-400/10",
      cta: "text-emerald-600 group-hover:text-emerald-700",
      check: "text-emerald-600",
    },
    benefits: ["Set your own rate & schedule", "Build a client base", "Get a verified badge"],
    footnote: "Requires quick admin approval before you can be hired",
  },
];

function SignupOption() {
  return (
    <div className="relative flex min-h-svh flex-col items-center overflow-hidden bg-slate-50 px-4 py-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <Link
        to="/"
        className="relative mb-8 flex items-center gap-2.5 transition hover:opacity-90"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
          <LogoIcon />
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-900">
          SewaSathi
        </span>
      </Link>

      <div className="relative text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
          Join SewaSathi
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Choose the option that best describes you — it only takes a minute.
        </p>
      </div>

      <div className="relative mt-10 grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        {SIGNUP_OPTIONS.map((option) => {
          const Icon = option.Icon;

          return (
            <Link
              key={option.id}
              to={option.to}
              className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${option.accent.ring}`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm ${option.accent.badge}`}
              >
                <Icon />
              </span>

              <h2 className="mt-5 text-lg font-bold text-slate-900">{option.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{option.description}</p>

              <ul className="mt-5 space-y-2.5">
                {option.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckIcon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${option.accent.check}`} />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-1 items-end justify-between gap-2 border-t border-slate-100 pt-5">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold transition ${option.accent.cta}`}>
                  {option.cta}
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-400">{option.footnote}</p>
            </Link>
          );
        })}
      </div>

      <p className="relative mt-8 text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand transition hover:text-brand-dark"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

export default SignupOption;
