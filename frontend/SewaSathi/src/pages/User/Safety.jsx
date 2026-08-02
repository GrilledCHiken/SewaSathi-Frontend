import { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";
import Skeleton from "../../components/ui/Skeleton";
import { usePublicStats } from "../../hooks/usePublicData";
import { formatCount, formatPercent } from "../../utils/formatStats";

// Icons and labels only. The figures come from GET /api/public/stats — these four
// used to be hardcoded, and two of them disagreed with the same numbers on other
// pages: "3,200+" appeared here as customer reviews and on Home as services
// offered, and the satisfaction rate was 98% here against 90% on How It Works.
// Each now has exactly one source, so they cannot drift apart again.
const STAT_CARDS = [
  {
    id: "workers",
    label: "Verified Professionals",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "reviews",
    label: "Customer Reviews",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "cities",
    label: "Cities Covered",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: "satisfaction",
    label: "Satisfaction Rate",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

const VERIFICATION_STEPS = [
  {
    title: "Profile Review",
    description:
      "Every worker profile is manually reviewed by our team to ensure accurate skills, experience, and service descriptions before going live.",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    ),
  },
  {
    title: "Identity Verification",
    description:
      "Workers submit government-issued ID and proof of address. We verify documents against official records to confirm their identity.",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M15 8h2M15 12h2M7 16h10" />
      </svg>
    ),
  },
  {
    title: "Background Check",
    description:
      "We conduct criminal background checks and reference verification to ensure workers meet our safety standards for in-home services.",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Skill Assessment",
    description:
      "Workers complete skill tests and provide portfolio evidence. Only those who pass our quality benchmarks receive the verified badge.",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
];

const TRUST_FEATURES = [
  {
    title: "Secure Payments",
    description: "Pay through eSewa or Khalti with funds held until you approve the work.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Verified Profiles",
    description: "Every worker passes identity, background, and skill verification.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 11l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "24/7 Support",
    description: "Our support team is available around the clock for safety concerns.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    title: "Real Reviews",
    description: "Only customers who completed a task can leave verified reviews.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "In-App Messaging",
    description: "Communicate safely without sharing personal contact details.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Dispute Resolution",
    description: "Fair mediation process if something goes wrong with your task.",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
];

const GUARANTEES = [
  {
    title: "Satisfaction Guarantee",
    description:
      "If you're not happy with the completed work, we'll work with you and the worker to make it right — or provide a refund when appropriate.",
  },
  {
    title: "Money-back Policy",
    description:
      "Eligible refunds are processed quickly through your original payment method when tasks are cancelled or not completed as agreed.",
  },
  {
    title: "Identity Protection",
    description:
      "Your personal information is encrypted and never shared with workers beyond what's needed to complete your task safely.",
  },
  {
    title: "24/7 Support Team",
    description:
      "Reach our dedicated safety team anytime via chat, email, or phone for urgent issues during or after a task.",
  },
  {
    title: "Community Moderation",
    description:
      "We actively monitor reviews, reports, and platform activity to remove bad actors and maintain a trusted community.",
  },
  {
    title: "Insurance Coverage",
    description:
      "Select tasks include liability coverage for accidental damage, giving you extra peace of mind when hiring in-home help.",
  },
];

const SAFETY_FAQS = [
  {
    q: "How do I know a worker is really verified?",
    a: "Look for the green verified badge on their profile. This means they've passed identity verification, background checks, and skill assessment. You can also view their verification date and read reviews from other customers on the platform.",
  },
  {
    q: "What happens if a worker damages my property?",
    a: "Report the incident to our support team within 48 hours with photos and details. For eligible tasks, our insurance coverage may apply. We'll investigate and work toward a fair resolution, which may include compensation.",
  },
  {
    q: "Can I cancel a task after hiring a worker?",
    a: "Yes. You can cancel before the worker starts at no charge. If you cancel after work has begun, a partial fee may apply to compensate the worker for time already spent, depending on how far along the task is.",
  },
  {
    q: "Is my payment and data secure?",
    a: "Absolutely. All payments go through encrypted eSewa and Khalti gateways. Funds are held in escrow until you approve completion. Your data is protected with industry-standard encryption and we never sell your information.",
  },
  {
    q: "What if I have an issue with a job?",
    a: "Contact our 24/7 support team immediately through the app. Don't release payment until the issue is resolved. We'll mediate between you and the worker and can hold funds, issue refunds, or take action against policy violations.",
  },
];

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function SafetyAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {SAFETY_FAQS.map((item, idx) => {
        const open = openIndex === idx;
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-2xl border transition ${
              open ? "border-brand/30 bg-sky-50/40" : "border-line bg-white"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
              onClick={() => setOpenIndex(open ? -1 : idx)}
              aria-expanded={open}
            >
              <span className="text-[0.9375rem] font-semibold text-ink sm:text-base">
                {item.q}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition ${
                  open ? "rotate-180 bg-white" : "bg-surface-sunken"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {open && (
              <div className="border-t border-line px-5 pb-5 sm:px-6 sm:pb-6">
                <p className="pt-4 text-sm leading-relaxed text-ink-muted">
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

export default function Safety() {
  const { stats } = usePublicStats();

  const statValues = {
    workers: formatCount(stats?.verifiedWorkers),
    reviews: formatCount(stats?.reviewCount),
    cities: formatCount(stats?.citiesCovered),
    satisfaction: formatPercent(stats?.satisfactionRate),
  };

  return (
    <div className="flex-1 bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-sky-50/40 to-white pb-6 pt-10 sm:pb-8 sm:pt-14 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.06),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(43,140,255,0.06),transparent_45%)]" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            Verified. Secured. Trusted.
          </p>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
            Safety &amp; Trust at SewaSathi
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Your safety is our highest priority. Every worker is verified,
            payments are secured through trusted Nepali gateways, and our support
            team is here whenever you need help.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-line-soft bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
            {STAT_CARDS.map((stat, index) => (
              <Reveal key={stat.label} delay={index % 4} className="flex flex-col items-center text-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg} ${stat.iconText}`}
                >
                  {stat.icon}
                </span>
                <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {stats ? statValues[stat.id] : <Skeleton className="mx-auto h-8 w-16" />}
                </p>
                <p className="mt-1 text-xs font-medium text-ink-muted sm:text-sm">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Process */}
      <section className="bg-surface-muted/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Our Verification Process"
            subtitle="Every worker on SewaSathi goes through a rigorous multi-step verification before they can accept tasks."
          />

          <div className="mt-10 grid gap-5 sm:mt-12 lg:grid-cols-4 lg:gap-4">
            {VERIFICATION_STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index % 4} className="relative">
                <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:shadow-md">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${step.iconBg} ${step.iconText}`}
                  >
                    {step.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {step.description}
                  </p>
                </article>

                {index < VERIFICATION_STEPS.length - 1 && (
                  <span
                    className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 lg:block"
                    aria-hidden="true"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Trust Features"
            subtitle="Built-in protections that keep every task safe from start to finish."
          />

          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST_FEATURES.map((feature, index) => (
              <Reveal
                key={feature.title}
                delay={index % 4}
                className="flex gap-4 rounded-2xl border border-line-soft bg-surface-muted/50 p-5 transition hover:border-brand/20 hover:bg-white hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  {feature.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="bg-surface-muted/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Our Guarantees"
            subtitle="We stand behind every task with policies designed to protect you."
          />

          <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
            {GUARANTEES.map((item, index) => (
              <Reveal
                key={item.title}
                as="article"
                delay={index % 4}
                className="rounded-2xl border border-line bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Questions */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Safety Questions"
            subtitle="Answers to common questions about staying safe on SewaSathi."
          />

          <div className="mt-10 sm:mt-12">
            <SafetyAccordion />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-sky-50 via-emerald-50/80 to-sky-100/60 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Hire with Confidence
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Verified workers, secure payments, and guarantees that protect you
            every step of the way.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-brand transition hover:bg-brand-dark active:scale-[0.98]"
            >
              Get Started Now
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-full border-2 border-line bg-white px-8 py-3.5 text-base font-semibold text-ink transition hover:border-line-strong hover:bg-surface-muted active:scale-[0.98]"
            >
              Browse Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
