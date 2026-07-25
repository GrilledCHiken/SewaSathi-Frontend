import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";
import missionImage from "../../assets/images/hero-moving.jpg";

const CORE_VALUES = [
  {
    title: "Safety First",
    description:
      "Every worker is verified and every payment is protected so you can book help with complete confidence.",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Community Driven",
    description:
      "Built for Nepalis, by Nepalis — we grow when local workers and neighbors succeed together.",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Transparency",
    description:
      "Clear pricing, honest reviews, and open communication — no surprises, ever.",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  {
    title: "Accessibility",
    description:
      "Quality local services should be affordable and available to everyone across Nepal.",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

const TIMELINE = [
  {
    year: "2021",
    title: "Founded in Kathmandu",
    description:
      "SewaSathi was born from a simple idea: make it easy for Nepalis to find trusted local help for everyday tasks.",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    year: "2022",
    title: "First 1,000 Tasks Completed",
    description:
      "Our community grew quickly as customers and workers discovered a safer way to connect across the valley.",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  {
    year: "2023",
    title: "Expanded to 20+ Cities",
    description:
      "We brought verified local services to Pokhara, Biratnagar, Butwal, and dozens more communities nationwide.",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    year: "2024",
    title: "eSewa & Khalti Integration",
    description:
      "Secure payments through Nepal's most trusted digital wallets made transactions seamless for everyone.",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
      </svg>
    ),
  },
  {
    year: "2025",
    title: "12,500+ Verified Workers",
    description:
      "Our rigorous verification program set a new standard for trust in Nepal's local services marketplace.",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    year: "2026",
    title: "Building Nepal's Future",
    description:
      "Today we're connecting thousands of Nepalis every month — and we're just getting started.",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

const TEAM = [
  {
    name: "Anil Sharma",
    role: "Founder & CEO",
    bio: "Former tech entrepreneur passionate about solving everyday problems for Nepali households through technology.",
    gradient: "from-brand to-sky-400",
  },
  {
    name: "Priya Gurung",
    role: "Head of Operations",
    bio: "Operations expert with 8+ years building scalable service platforms across South Asia.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    name: "Rajesh Thapa",
    role: "Head of Technology",
    bio: "Full-stack engineer focused on building secure, reliable systems that work for all of Nepal.",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    name: "Sita Karki",
    role: "Head of Community",
    bio: "Community builder dedicated to growing a trusted network of workers and happy customers.",
    gradient: "from-rose-500 to-pink-400",
  },
];

function initialsOf(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PLATFORM_STATS = [
  { value: "45+", label: "Cities Served" },
  { value: "12+", label: "Categories" },
  { value: "12.5K+", label: "Users" },
  { value: "98%", label: "Happy Customers" },
];

function SectionLabel({ children }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
      {children}
    </p>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function AboutUs() {
  return (
    <div className="flex-1 bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white py-14 sm:py-16 lg:py-20">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-200/25 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <SectionLabel>About SewaSathi</SectionLabel>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
            Connecting Nepal,{" "}
            <span className="text-brand">one task at a time</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            SewaSathi is Nepal&apos;s trusted local services marketplace — connecting
            verified workers with people who need help, safely, simply, and
            affordably across the country.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-slate-50/60 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-slate-300/40 ring-1 ring-slate-200/80">
              <img
                src={missionImage}
                alt="SewaSathi team and community at work"
                className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
              />
            </div>

            <div>
              <SectionLabel>Our Mission</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Empowering communities through trust
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                We believe everyone in Nepal deserves access to reliable, affordable
                local help — whether it&apos;s fixing a leak, assembling furniture, or
                deep-cleaning a home. SewaSathi makes that possible by building a
                platform where trust comes first.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                By verifying every worker, securing every payment, and putting
                community at the center of everything we do, we&apos;re creating
                opportunities for skilled Nepalis while making life easier for
                thousands of families.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center justify-center rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98]"
                >
                  Read More
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 text-base font-semibold text-slate-700 transition hover:text-brand"
                >
                  Contact Us
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionLabel>What We Stand For</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Core Values
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_VALUES.map((value, index) => (
              <Reveal
                key={value.title}
                as="article"
                delay={index % 4}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${value.iconBg} ${value.iconText}`}
                >
                  {value.icon}
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {value.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Journey / Timeline */}
      <section className="bg-slate-50/60 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionLabel>Our Journey</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              From idea to impact
            </h2>
          </div>

          <div className="relative mt-12 sm:mt-14">
            <div
              className="absolute left-[19px] top-2 bottom-2 w-px bg-brand/25 sm:left-5"
              aria-hidden="true"
            />

            <ul className="space-y-10 sm:space-y-12">
              {TIMELINE.map((item) => (
                <Reveal key={item.year} as="li" className="relative flex gap-5 sm:gap-6">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md shadow-brand/30">
                    {item.icon}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-brand">{item.year}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionLabel>The Team Behind It</SectionLabel>
            <SectionHeading
              title="Meet Our Team"
              subtitle="Passionate Nepalis building the future of local services — one connection at a time."
            />
          </div>

          <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member, index) => (
              <Reveal
                key={member.name}
                as="article"
                delay={index % 4}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <div
                  className={`flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br ${member.gradient}`}
                  role="img"
                  aria-label={`Photo of ${member.name}`}
                >
                  <span className="text-4xl font-bold text-white/90">
                    {initialsOf(member.name)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-sm font-semibold text-brand">
                    {member.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {member.bio}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-brand py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/85 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Join the movement
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Whether you need help or want to offer your skills, SewaSathi is the
            place to connect with your community.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98]"
            >
              Get Started
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 text-base font-semibold text-slate-700 transition hover:text-brand"
            >
              Contact Us
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
