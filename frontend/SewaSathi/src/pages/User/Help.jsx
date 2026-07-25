import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";

const TOPICS = [
  {
    title: "Getting Started",
    description: "Creating an account, posting your first task, and how matching works.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
    ),
  },
  {
    title: "Payments",
    description: "How task budgets work and what happens once a job is marked complete.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    ),
  },
  {
    title: "Becoming a Worker",
    description: "Signing up, getting approved, and browsing tasks near you.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    ),
  },
  {
    title: "Trust & Safety",
    description: "How worker verification, reviews, and account suspensions work.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
  {
    title: "Messaging",
    description: "Chatting with your customer or worker once a task is assigned.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    ),
  },
  {
    title: "Account & Login",
    description: "Resetting your password, verifying your email, and account lockouts.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ),
  },
];

export default function Help() {
  return (
    <div className="flex-1 bg-white">
      <section className="bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Help Center
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Browse common topics below, or reach out directly if you can&apos;t find what you need.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((topic, index) => (
              <Reveal
                key={topic.title}
                delay={index % 3}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand/20 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    {topic.icon}
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">{topic.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{topic.description}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">Still need help?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Check our{" "}
              <Link to="/contact#faq" className="font-semibold text-brand hover:underline">
                FAQ
              </Link>{" "}
              or send us a message directly.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
