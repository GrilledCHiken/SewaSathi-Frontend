import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Reveal from "../../components/User/Reveal";
import SectionHeading from "../../components/User/SectionHeading";
import ServiceIcon from "../../components/User/ServiceIcon";
import StarRating from "../../components/User/StarRating";
import { POPULAR_SERVICES } from "../../data/services";
import heroImage from "../../assets/images/hero-moving.jpg";
import testimonialImage from "../../assets/images/testimonial.jpg";

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Book a Service",
    description:
      "Tell us what you need, pick a time, and get matched with verified professionals near you.",
    icon: "book",
  },
  {
    step: 2,
    title: "Get Matched",
    description:
      "We connect you with background-checked taskers who fit your schedule and budget.",
    icon: "match",
  },
  {
    step: 3,
    title: "Task Completed",
    description:
      "Relax while the job gets done. Pay securely only when you are satisfied.",
    icon: "complete",
  },
];

const SAFETY_FEATURES = [
  {
    label: "Background Checked",
    description: "Identity and record verification before a tasker's first job.",
    icon: "shield",
  },
  {
    label: "Insurance Covered",
    description: "Every booking is protected against damage and accidents.",
    icon: "insurance",
  },
  {
    label: "Secure Payments",
    description: "Pay through eSewa or Khalti — funds release only on completion.",
    icon: "payment",
  },
  {
    label: "Verified Reviews",
    description: "Ratings come only from customers with a completed booking.",
    icon: "reviews",
  },
  {
    label: "24/7 Support",
    description: "Our Kathmandu-based team is reachable any hour, any day.",
    icon: "support",
  },
];

const STATS = [
  { value: "12,500+", label: "Verified taskers" },
  { value: "3,200+", label: "Services offered" },
  { value: "50,000+", label: "Happy customers" },
  { value: "98%", label: "Satisfaction rate" },
];

const POPULAR_SEARCHES = ["Cleaning", "Handyman", "Plumbing", "Moving"];

const TESTIMONIALS = [
  {
    quote:
      "SewaSathi made finding a reliable cleaner so easy. Professional, on time, and fairly priced — exactly what I needed in Kathmandu.",
    author: "Sita Sharma",
    role: "Homeowner, Lalitpur",
    rating: 5,
  },
  {
    quote:
      "I booked a handyman for mounting my TV. The whole process took minutes and the work was flawless.",
    author: "Rajesh Thapa",
    role: "Apartment Resident, Kathmandu",
    rating: 5,
  },
  {
    quote:
      "As a busy professional, having verified help for moving and cleaning has been a game changer.",
    author: "Anita Gurung",
    role: "Business Owner, Pokhara",
    rating: 5,
  },
];

const TASKER_BENEFITS = [
  {
    title: "Set your own rates",
    description: "You price your work. We never take a cut of your tips.",
  },
  {
    title: "Work when you want",
    description: "Accept only the jobs that fit your week — no minimum hours.",
  },
  {
    title: "Get paid securely",
    description: "Payments land in your wallet within 24 hours of completion.",
  },
];

// Matches the deterministic avatar palette used across the dashboard
// (src/components/tasks/taskUi.jsx).
const AVATAR_PALETTE = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
];

const initialsOf = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const serviceHref = (name) => `/services?search=${encodeURIComponent(name)}`;

function CheckIcon({ className = "h-5 w-5" }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }) {
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/services?search=${encodeURIComponent(trimmed)}` : "/services");
  };

  const featuredServices = POPULAR_SERVICES.filter((s) => s.featured);
  const compactServices = POPULAR_SERVICES.filter((s) => !s.featured);

  return (
    <div className="flex-1 bg-white">
      {/* ---------------------------------------------------------------- */}
      {/* Hero */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(43,140,255,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.06),transparent_50%)]" />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
            {/* Copy column — 7 of 12 */}
            <div className="animate-fade-up lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200/80">
                <svg
                  className="h-4 w-4 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                4.8 average rating · Trusted by 50,000+ across Nepal
              </span>

              <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4rem]">
                Trusted help{" "}
                <span className="text-brand">is always nearby</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
                Book verified local professionals for cleaning, repairs, moving,
                and more — safely, simply, and affordably across Nepal.
              </p>

              <form
                className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
                onSubmit={handleSearch}
              >
                <div className="relative flex flex-1 items-center rounded-2xl border border-line bg-white shadow-sm shadow-slate-200/50 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <svg
                    className="ml-4 h-5 w-5 shrink-0 text-ink-faint"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What service do you need?"
                    className="w-full border-0 bg-transparent py-4 pl-3 pr-4 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0"
                    aria-label="Search for a service"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-brand px-8 py-4 text-base font-semibold text-white shadow-brand transition hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98]"
                >
                  Search
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted">Popular:</span>
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => navigate(serviceHref(term))}
                    className="rounded-full border border-line bg-surface-muted px-4 py-1.5 text-sm font-medium text-ink-body transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Image column — 5 of 12 */}
            <div className="relative animate-fade-up-delay lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-e3 ring-1 ring-line">
                <img
                  src={heroImage}
                  alt="Professional movers helping with a delivery"
                  className="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
              </div>

              {/* Floating anchor — top left */}
              <div className="absolute -left-3 top-6 rounded-2xl border border-line-soft bg-white px-4 py-3 shadow-xl shadow-e2 sm:-left-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={5} className="h-4 w-4" />
                  <span className="text-sm font-bold text-ink">4.8</span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-ink-muted">
                  from 12,000+ reviews
                </p>
              </div>

              {/* Floating anchor — bottom */}
              <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-line-soft bg-white p-4 shadow-xl shadow-e2 transition hover:-translate-y-0.5 sm:left-auto sm:-right-4 sm:max-w-[16rem]">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Over 10,000+ professionals
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      ready to help you today
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stat band — closes the hero */}
          <div className="grid grid-cols-2 gap-y-8 border-t border-line/70 py-10 sm:grid-cols-4 sm:divide-x sm:divide-line lg:py-12">
            {STATS.map((stat, index) => (
              <Reveal
                key={stat.label}
                delay={index % 4}
                className="px-2 text-center sm:px-6"
              >
                <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Popular services — bento grid */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-surface-muted py-20 lg:py-28" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-end sm:justify-between sm:gap-8">
            <SectionHeading
              align="left"
              eyebrow="What we do"
              title="Popular services in your area"
              description="Browse trusted professionals for the most requested home services near you."
            />
            <Reveal className="mt-6 shrink-0 sm:mt-0 sm:pb-2">
              <Link
                to="/services"
                className="group inline-flex items-center gap-1.5 text-base font-semibold text-brand transition hover:text-brand-dark"
              >
                View all services
                <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {/* Two featured cards — half width each on lg */}
            {featuredServices.map((service, index) => (
              <Reveal
                key={service.name}
                as={Link}
                to={serviceHref(service.name)}
                delay={index}
                className="group flex flex-col rounded-2xl border border-line bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10 sm:col-span-2 lg:col-span-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                    <ServiceIcon name={service.icon} className="h-7 w-7" />
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Most booked
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-ink transition group-hover:text-brand">
                  {service.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                  {service.description}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <StarRating rating={5} className="h-3.5 w-3.5" />
                    <span className="font-semibold text-ink">
                      {service.rating}
                    </span>
                    · {service.reviews} reviews
                  </span>
                  <span className="text-xs font-medium text-ink-muted">
                    {service.workers} pros available
                  </span>
                </div>
              </Reveal>
            ))}

            {/* Six compact cards — a third of the row each on lg */}
            {compactServices.map((service, index) => (
              <Reveal
                key={service.name}
                as={Link}
                to={serviceHref(service.name)}
                delay={index % 4}
                className="group flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10 lg:col-span-2"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                  <ServiceIcon name={service.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink transition group-hover:text-brand">
                  {service.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition group-hover:opacity-100">
                  Book now
                  <ArrowIcon />
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-white py-20 lg:py-28" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Simple by design"
            title="How SewaSathi works"
            description="Get help in three simple steps — from booking to a job well done."
          />

          <div className="relative mt-16">
            {/* Single dashed connector, center-of-icon to center-of-icon.
                Sits behind the opaque cards, so the dashes only show in the
                gutters. 3.75rem = card p-8 (2rem) + half the h-14 tile. */}
            <span
              className="absolute left-[16.6%] right-[16.6%] top-[3.75rem] hidden border-t border-dashed border-line-strong md:block"
              aria-hidden="true"
            />

            <div className="relative grid gap-8 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((item, index) => (
                <Reveal
                  key={item.step}
                  delay={index % 4}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-white p-8 transition duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-lg hover:shadow-e2"
                >
                  {/* Oversized ghost numeral for scale contrast */}
                  <span
                    className="pointer-events-none absolute -top-2 right-4 text-7xl font-extrabold leading-none text-slate-100 transition group-hover:text-brand/10"
                    aria-hidden="true"
                  >
                    {String(item.step).padStart(2, "0")}
                  </span>

                  <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                    <ServiceIcon name={item.icon} className="h-7 w-7" />
                  </span>
                  <h3 className="relative mt-6 text-xl font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-ink-muted">
                    {item.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Safety / Trust */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-navy py-20 lg:py-28" id="safety">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading
                align="left"
                tone="dark"
                eyebrow="Safety first"
                title="Your safety is our highest priority"
                description="Every tasker is vetted, insured, and reviewed so you can book with complete confidence — whether it is a quick fix or a full-day project."
              />
              <Reveal className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/safety"
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-navy transition hover:bg-surface-sunken active:scale-[0.98]"
                >
                  Our Safety Policy
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center rounded-full border border-slate-600 px-8 py-3.5 text-base font-semibold text-white transition hover:border-slate-400 hover:bg-white/5 active:scale-[0.98]"
                >
                  Learn More
                </Link>
              </Reveal>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {SAFETY_FEATURES.map((feature, index) => (
                <Reveal
                  key={feature.label}
                  delay={index % 4}
                  className={`rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition duration-300 hover:border-slate-600 hover:bg-slate-800/80 ${
                    index === SAFETY_FEATURES.length - 1 ? "sm:col-span-2" : ""
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand">
                    <ServiceIcon name={feature.icon} className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-base font-semibold text-white">
                    {feature.label}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
                    {feature.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Testimonials */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="relative lg:col-span-5">
              <div className="overflow-hidden rounded-3xl shadow-xl shadow-e2 ring-1 ring-line">
                <img
                  src={testimonialImage}
                  alt="Happy SewaSathi customer"
                  className="aspect-square w-full object-cover transition duration-500 hover:scale-[1.02]"
                />
              </div>

              <div className="absolute -bottom-5 left-5 right-5 rounded-2xl border border-line-soft bg-white p-4 shadow-xl shadow-e2 sm:right-auto sm:max-w-[17rem]">
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-extrabold tracking-tight text-ink">
                    4.8
                  </p>
                  <div>
                    <StarRating rating={5} className="h-4 w-4" />
                    <p className="mt-1 text-xs font-medium text-ink-muted">
                      from 12,000+ verified reviews
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="lg:col-span-7">
              <SectionHeading
                align="left"
                eyebrow="What our customers say"
                title="Trusted by thousands across Nepal"
              />

              <div className="mt-8 space-y-4">
                {TESTIMONIALS.map((item, index) => (
                  <Reveal
                    key={item.author}
                    delay={index % 4}
                    className="rounded-2xl border border-line bg-white p-6 shadow-sm transition duration-300 hover:border-brand/30 hover:shadow-md"
                  >
                    <StarRating rating={item.rating} className="h-4 w-4" />
                    <blockquote className="mt-3 text-base leading-relaxed text-ink-body">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>
                    <footer className="mt-4 flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          AVATAR_PALETTE[index % AVATAR_PALETTE.length]
                        }`}
                        aria-hidden="true"
                      >
                        {initialsOf(item.author)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {item.author}
                        </p>
                        <p className="text-xs text-ink-muted">{item.role}</p>
                      </div>
                    </footer>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Become a tasker — the second audience */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-emerald-50/40 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <Reveal className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                  For service professionals
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  Earn on your schedule
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-ink-muted">
                  Join 12,500+ taskers already building a business on SewaSathi.
                  You choose the jobs, the hours, and the price.
                </p>
              </Reveal>

              <div className="mt-8 space-y-5">
                {TASKER_BENEFITS.map((benefit, index) => (
                  <Reveal
                    key={benefit.title}
                    delay={index % 4}
                    className="flex gap-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-ink">
                        {benefit.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        {benefit.description}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  to="/signup/worker"
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30 active:scale-[0.98] sm:w-auto"
                >
                  Become a Tasker
                </Link>
                <Link
                  to="/work-with-us"
                  className="group inline-flex items-center gap-1.5 text-base font-semibold text-ink-body transition hover:text-emerald-700"
                >
                  See how earning works
                  <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </Reveal>
            </div>

            {/* Composed earnings card — shows the product, no image asset needed */}
            <Reveal delay={1} className="relative">
              <div className="rounded-3xl border border-line bg-white p-6 shadow-2xl shadow-emerald-900/5 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      This week
                    </p>
                    <p className="mt-1.5 text-4xl font-extrabold tracking-tight text-ink">
                      Rs 18,400
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    100% completion
                  </span>
                </div>

                <div className="mt-6 space-y-3 border-t border-line-soft pt-6">
                  {[
                    { name: "Home Cleaning", meta: "Lalitpur · 3 hrs", amount: "Rs 4,200", icon: "cleaning" },
                    { name: "Furniture Assembly", meta: "Baneshwor · 2 hrs", amount: "Rs 3,600", icon: "furniture" },
                    { name: "TV Mounting", meta: "Patan · 1 hr", amount: "Rs 2,100", icon: "mounting" },
                  ].map((job) => (
                    <div key={job.name} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <ServiceIcon name={job.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {job.name}
                        </p>
                        <p className="text-xs text-ink-muted">{job.meta}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-emerald-600">
                        {job.amount}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
                  <span className="text-xs font-medium text-ink-muted">
                    Next payout
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    In 2 days
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Final CTA */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal
            as="div"
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand via-brand to-cyan-500 px-6 py-16 text-center shadow-2xl shadow-brand/20 sm:px-12 lg:py-20"
          >
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
                Join thousands of happy customers who trust SewaSathi for reliable
                home services across Nepal.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/services"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-brand shadow-lg transition hover:bg-surface-muted hover:shadow-xl active:scale-[0.98] sm:w-auto"
                >
                  Book a Service
                </Link>
                <Link
                  to="/signup/worker"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-[0.98] sm:w-auto"
                >
                  Become a Tasker
                </Link>
              </div>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <div className="flex -space-x-3">
                  {TESTIMONIALS.map((item, i) => (
                    <span
                      key={item.author}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${
                        AVATAR_PALETTE[i % AVATAR_PALETTE.length]
                      }`}
                      style={{ zIndex: TESTIMONIALS.length - i }}
                      aria-hidden="true"
                    >
                      {initialsOf(item.author)}
                    </span>
                  ))}
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/20 text-xs font-bold text-white backdrop-blur"
                    aria-hidden="true"
                  >
                    50k
                  </span>
                </div>
                <p className="text-sm font-medium text-white/90">
                  Join <span className="font-semibold text-white">50,000+</span>{" "}
                  satisfied users
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export default Home;
