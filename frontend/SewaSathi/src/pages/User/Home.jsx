import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Reveal from "../../components/User/Reveal";
import heroImage from "../../assets/images/hero-moving.jpg";
import testimonialImage from "../../assets/images/testimonial.jpg";

const POPULAR_SERVICES = [
  {
    name: "Furniture Assembly",
    description: "Expert assembly for beds, desks, shelves, and more.",
    icon: "furniture",
  },
  {
    name: "Home Cleaning",
    description: "Deep cleaning and regular upkeep for every room.",
    icon: "cleaning",
  },
  {
    name: "Mounting",
    description: "TVs, shelves, art, and fixtures mounted securely.",
    icon: "mounting",
  },
  {
    name: "Moving Help",
    description: "Loading, unloading, and heavy lifting assistance.",
    icon: "moving",
  },
  {
    name: "Plumbing",
    description: "Leaks, fixtures, and pipe repairs done right.",
    icon: "plumbing",
  },
  {
    name: "Electrical",
    description: "Wiring, outlets, and lighting installations.",
    icon: "electrical",
  },
  {
    name: "Handyman",
    description: "General repairs and small home improvement tasks.",
    icon: "handyman",
  },
  {
    name: "Painting",
    description: "Interior and exterior painting with a clean finish.",
    icon: "painting",
  },
];

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
  { label: "Background Checked", icon: "shield" },
  { label: "Insurance Covered", icon: "insurance" },
  { label: "Secure Payments", icon: "payment" },
  { label: "Verified Reviews", icon: "reviews" },
  { label: "24/7 Support", icon: "support" },
];

const STATS = [
  { value: "12,500+", label: "Taskers", icon: "users" },
  { value: "3,200+", label: "Services", icon: "services" },
  { value: "50,000+", label: "Happy Customers", icon: "customers" },
  { value: "98%", label: "Satisfaction Rate", icon: "star" },
];

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

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80",
];

const ICONS = {
  furniture: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M4 10h16M6 10V6a2 2 0 012-2h2m4 0h2a2 2 0 012 2v4m-8 0v8m4-8v8"
    />
  ),
  cleaning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  ),
  mounting: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M4 6h16M4 12h16M4 18h7"
    />
  ),
  moving: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  ),
  plumbing: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4v4m8-4v4m-8 4h8"
    />
  ),
  electrical: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
  handyman: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
  ),
  painting: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
    />
  ),
  book: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  ),
  match: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
    />
  ),
  complete: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  ),
  insurance: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  ),
  payment: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  ),
  reviews: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  ),
  support: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
    />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  ),
  services: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  ),
  customers: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  star: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  ),
};

function ServiceIcon({ name, className = "h-6 w-6" }) {
  const path = ICONS[name] ?? ICONS.handyman;

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-5 w-5 ${
            i < rating ? "text-amber-400" : "text-slate-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Home() {
  const [query, setQuery] = useState("");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const currentTestimonial = TESTIMONIALS[activeTestimonial];
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/services?search=${encodeURIComponent(trimmed)}` : "/services");
  };

  return (
    <div className="flex-1 bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(43,140,255,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.06),transparent_50%)]" />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Top-rated professionals at your fingertips
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
                Trusted help{" "}
                <span className="text-brand">is always nearby</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Book verified local professionals for cleaning, repairs, moving,
                and more — safely, simply, and affordably across Nepal.
              </p>

              <form
                className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
                onSubmit={handleSearch}
              >
                <div className="relative flex flex-1 items-center rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <svg
                    className="ml-4 h-5 w-5 shrink-0 text-slate-400"
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
                    className="w-full border-0 bg-transparent py-4 pl-3 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    aria-label="Search for a service"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-brand px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98]"
                >
                  Search
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { label: "Popular: Cleaning", term: "Cleaning" },
                  { label: "Popular: Handyman", term: "Handyman" },
                ].map(({ label, term }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate(`/services?search=${encodeURIComponent(term)}`)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-up-delay">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-slate-300/40 ring-1 ring-slate-200/80">
                <img
                  src={heroImage}
                  alt="Professional movers helping with a delivery"
                  className="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
              </div>

              <div className="absolute -bottom-4 left-4 right-4 mx-auto max-w-sm rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/60 transition hover:-translate-y-0.5 sm:left-6 sm:right-auto sm:max-w-xs">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Over 10,000+ professionals
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      ready to help you today
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="bg-slate-50 py-20 lg:py-24" id="services">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Popular services in your area
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Browse trusted professionals for the most requested home services
              near you.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_SERVICES.map((service, index) => (
              <Reveal
                key={service.name}
                as={Link}
                to="/services"
                delay={index % 4}
                className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
                  <ServiceIcon name={service.icon} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-brand">
                  {service.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-brand opacity-0 transition group-hover:opacity-100">
                  Book now
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-full bg-navy px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-navy-light hover:shadow-xl active:scale-[0.98]"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 lg:py-24" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How SewaSathi works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Get help in three simple steps — from booking to a job well done.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            {HOW_IT_WORKS_STEPS.map((item, index) => (
              <Reveal
                key={item.step}
                delay={index % 4}
                className="group relative rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center transition duration-300 hover:border-brand/20 hover:bg-white hover:shadow-lg hover:shadow-slate-200/60"
              >
                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <span
                    className="absolute right-0 top-1/2 hidden h-px w-8 translate-x-full bg-slate-200 md:block lg:w-16"
                    aria-hidden="true"
                  />
                )}
                <span className="text-sm font-bold text-brand">
                  Step {item.step}
                </span>
                <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:scale-110 group-hover:bg-brand group-hover:text-white">
                  <ServiceIcon name={item.icon} className="h-7 w-7" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Safety / Trust */}
      <section className="bg-navy py-20 lg:py-24" id="safety">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your safety is our highest priority
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              Every tasker is vetted, insured, and reviewed so you can book with
              complete confidence — whether it is a quick fix or a full-day
              project.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/safety"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-navy transition hover:bg-slate-100 active:scale-[0.98] sm:w-auto"
              >
                Our Safety Policy
              </Link>
              <Link
                to="/about"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-600 px-8 py-3.5 text-base font-semibold text-white transition hover:border-slate-400 hover:bg-white/5 active:scale-[0.98] sm:w-auto"
              >
                Learn More
              </Link>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SAFETY_FEATURES.map((feature, index) => (
              <Reveal
                key={feature.label}
                delay={index % 4}
                className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center transition duration-300 hover:border-slate-600 hover:bg-slate-800/80"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand">
                  <ServiceIcon name={feature.icon} className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-medium text-slate-300">
                  {feature.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16" as="div">
            <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/80">
              <img
                src={testimonialImage}
                alt="Happy SewaSathi customer"
                className="aspect-square w-full object-cover transition duration-500 hover:scale-[1.02]"
              />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand">
                What our customers say
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Trusted by thousands across Nepal
              </h2>

              <blockquote className="mt-8 min-h-[120px]">
                <p className="text-xl leading-relaxed text-slate-700 transition-opacity duration-300 sm:text-2xl">
                  &ldquo;{currentTestimonial.quote}&rdquo;
                </p>
              </blockquote>

              <footer className="mt-8">
                <p className="text-lg font-semibold text-slate-900">
                  {currentTestimonial.author}
                </p>
                <p className="text-sm text-slate-500">
                  {currentTestimonial.role}
                </p>
                <div className="mt-3">
                  <StarRating rating={currentTestimonial.rating} />
                </div>
              </footer>

              <div
                className="mt-8 flex gap-2"
                role="tablist"
                aria-label="Testimonials"
              >
                {TESTIMONIALS.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={activeTestimonial === index}
                    aria-label={`View testimonial ${index + 1}`}
                    onClick={() => setActiveTestimonial(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      activeTestimonial === index
                        ? "w-8 bg-brand"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Statistics */}
      <section className="bg-sky-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, index) => (
              <Reveal
                key={stat.label}
                delay={index % 4}
                className="group flex flex-col items-center text-center transition hover:-translate-y-1"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm ring-1 ring-sky-100 transition group-hover:bg-brand group-hover:text-white">
                  <ServiceIcon name={stat.icon} />
                </span>
                <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-base font-medium text-slate-600">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-20 lg:py-24">
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
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-brand shadow-lg transition hover:bg-slate-50 hover:shadow-xl active:scale-[0.98] sm:w-auto"
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
                  {AVATARS.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-10 w-10 rounded-full border-2 border-white object-cover"
                      style={{ zIndex: AVATARS.length - i }}
                    />
                  ))}
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
