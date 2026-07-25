import { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";

const CUSTOMER_STEPS = [
  {
    step: 1,
    title: "Post Your Task",
    description:
      "Describe what you need help with, choose a service category, set your budget, and pick a convenient time. It takes less than 2 minutes to post a task on SewaSathi.",
    bullets: [
      "Choose from 12+ service categories",
      "Add photos and detailed instructions",
      "Set hourly rate or fixed budget",
      "Select preferred date and time",
    ],
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Browse & Hire Verified Workers",
    description:
      "View profiles of verified workers near you. Check their ratings, reviews, skills, and hourly rates. Pick the perfect match for your task.",
    bullets: [
      "View verified badge and clearance status",
      "Compare hourly rates and skills",
      "Read real customer reviews",
      "Message workers before hiring",
    ],
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 11l2 2 4-4" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Secure Payment & Task Completion",
    description:
      "Pay securely through eSewa or Khalti. Your payment is held safely until the task is completed to your satisfaction. Release funds only when you're happy.",
    bullets: [
      "eSewa and Khalti integration",
      "Easy refund for cancelled tasks",
      "Payment held until completion",
      "Digital receipt for every transaction",
    ],
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    step: 4,
    title: "Rate & Review",
    description:
      "After the task is done, leave an honest review and rating. Your feedback helps other customers find great workers and helps workers build their reputation.",
    bullets: [
      "1-to-5 star rating system",
      "Help workers improve",
      "Detailed written reviews",
      "Build community trust",
    ],
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

const WORKER_STEPS = [
  {
    step: 1,
    title: "Create Your Profile",
    description:
      "Sign up as a service provider, add your skills, experience, and service areas. Upload verification documents to earn your trusted badge.",
    bullets: [
      "List your skills and hourly rates",
      "Upload ID and verification documents",
      "Set your availability calendar",
      "Choose service categories you offer",
    ],
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Browse & Apply to Tasks",
    description:
      "Find tasks near you that match your skills. Send proposals with your rate and availability. Get hired by customers who choose you.",
    bullets: [
      "Filter tasks by location and category",
      "Send custom proposals",
      "Message customers before accepting",
      "Build your reputation with each job",
    ],
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Complete Tasks & Get Paid",
    description:
      "Do great work, mark tasks complete, and receive payment securely through eSewa or Khalti once the customer confirms satisfaction.",
    bullets: [
      "Payment held until customer approval",
      "Fast payouts via eSewa or Khalti",
      "Digital receipts for every job",
      "Dispute support when needed",
    ],
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    step: 4,
    title: "Grow Your Reputation",
    description:
      "Earn ratings and reviews from happy customers. Higher ratings help you win more tasks and charge competitive rates.",
    bullets: [
      "Build your verified profile",
      "Showcase reviews on your profile",
      "Get repeat customers",
      "Unlock top-rated badges",
    ],
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    icon: (
      <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

const STATS = [
  {
    value: "< 2 min",
    label: "to post a task",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    value: "24 hrs",
    label: "average response time",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    value: "90%",
    label: "customer satisfaction",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    value: "100%",
    label: "secure payments",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

const FAQS = [
  {
    q: "How much does SewaSathi cost?",
    a: "SewaSathi charges a small 10% platform fee on completed tasks. This covers payment processing, worker verification, customer support, and platform maintenance. There are no hidden fees — you only pay when a task is successfully completed.",
  },
  {
    q: "How are workers verified?",
    a: "Every worker goes through identity verification, background checks, and skill assessment before receiving a verified badge. We also monitor reviews and ratings to maintain quality standards across the platform.",
  },
  {
    q: "What if I'm not satisfied with the work?",
    a: "Your payment is held securely until you confirm the task is complete to your satisfaction. If something isn't right, contact our support team within 48 hours and we'll help resolve the issue, including refunds when appropriate.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. All payments are processed through trusted Nepali gateways eSewa and Khalti. Funds are held in escrow until you approve the completed work, so workers only get paid when you're happy.",
  },
  {
    q: "Can I cancel a task after booking?",
    a: "You can cancel before the worker starts. Cancellation policies vary based on timing — early cancellations are typically free, while last-minute cancellations may incur a small fee to compensate the worker.",
  },
  {
    q: "How do I become a service provider?",
    a: "Click \"Become a Worker\" to create your provider profile. Complete verification, list your skills and rates, and start browsing tasks in your area. Most providers are approved within 24–48 hours.",
  },
];

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function StepCard({ step }) {
  const leftBullets = step.bullets.slice(0, 2);
  const rightBullets = step.bullets.slice(2, 4);

  return (
    <article className="flex flex-col gap-5 sm:flex-row sm:gap-6">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${step.iconBg} ${step.iconText}`}
      >
        {step.icon}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-bold text-slate-900 sm:text-[1.35rem]">
          {step.title}
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-600">
          {step.description}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
          <ul className="space-y-2.5">
            {leftBullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2.5">
            {rightBullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function AccordionFAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {FAQS.map((item, idx) => {
        const open = openIndex === idx;
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-2xl border transition ${
              open ? "border-brand/30 bg-sky-50/40" : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
              onClick={() => setOpenIndex(open ? -1 : idx)}
              aria-expanded={open}
            >
              <span className="text-[0.9375rem] font-semibold text-slate-900 sm:text-base">
                {item.q}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition ${
                  open ? "rotate-180 bg-white" : "bg-slate-100"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {open && (
              <div className="border-t border-slate-200/80 px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                <p className="pt-4 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HowItWorks() {
  const [mode, setMode] = useState("customer");
  const steps = mode === "customer" ? CUSTOMER_STEPS : WORKER_STEPS;

  return (
    <div className="flex-1 bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/80 via-white to-white pb-4 pt-10 sm:pt-14 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,140,255,0.08),transparent_55%)]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Simple, safe and fast
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
            How SewaSathi Works
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Whether you need help or want to offer your services, getting started
            takes just minutes. Here&apos;s how our platform connects Nepal.
          </p>

          {/* Toggle */}
          <div
            className="mx-auto mt-8 inline-flex w-full max-w-md rounded-full bg-slate-100 p-1 sm:max-w-lg"
            role="tablist"
            aria-label="Choose your path"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "customer"}
              onClick={() => setMode("customer")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition sm:px-6 ${
                mode === "customer"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              I Need Help
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "worker"}
              onClick={() => setMode("worker")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition sm:px-6 ${
                mode === "worker"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              I Offer Services
            </button>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 sm:space-y-14">
            {steps.map((step, index) => (
              <Reveal key={`${mode}-${step.step}`}>
                <StepCard step={step} />
                {index < steps.length - 1 && (
                  <div className="mt-12 border-b border-slate-100 sm:mt-14" />
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {STATS.map((stat, index) => (
              <Reveal
                key={stat.value}
                delay={index % 4}
                className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-4 py-6 text-center shadow-sm sm:px-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  {stat.icon}
                </span>
                <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              Everything you need to know about using SewaSathi
            </p>
          </div>

          <div className="mt-10 sm:mt-12">
            <AccordionFAQ />
          </div>
        </div>
      </section>

      {/* CTA — light blue gradient per design */}
      <section className="bg-gradient-to-br from-sky-50 via-sky-100/80 to-blue-50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Join thousands of Nepalis who are getting things done faster, safer,
            and more affordably.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98]"
            >
              Create Free Account
            </Link>
            <Link
              to="/signup/worker"
              className="inline-flex items-center justify-center rounded-full border-2 border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            >
              Become a Worker
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
