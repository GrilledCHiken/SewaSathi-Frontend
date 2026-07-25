import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Reveal from '../../components/User/Reveal'

const POPULAR_SERVICES = [
  {
    name: 'Furniture Assembly',
    description: 'Expert assembly for beds, desks, shelves, and more.',
    icon: 'furniture',
  },
  {
    name: 'Home Cleaning',
    description: 'Deep cleaning and regular upkeep for every room.',
    icon: 'cleaning',
  },
  {
    name: 'Mounting',
    description: 'TVs, shelves, art, and fixtures mounted securely.',
    icon: 'mounting',
  },
  {
    name: 'Moving Help',
    description: 'Loading, unloading, and heavy lifting assistance.',
    icon: 'moving',
  },
  {
    name: 'Plumbing',
    description: 'Leaks, fixtures, and pipe repairs done right.',
    icon: 'plumbing',
  },
  {
    name: 'Electrical',
    description: 'Wiring, outlets, and lighting installations.',
    icon: 'electrical',
  },
  {
    name: 'Handyman',
    description: 'General repairs and small home improvement tasks.',
    icon: 'handyman',
  },
  {
    name: 'Painting',
    description: 'Interior and exterior painting with a clean finish.',
    icon: 'painting',
  },
]

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
}

function ServiceIcon({ name, className = 'h-6 w-6' }) {
  const path = ICONS[name] ?? ICONS.handyman

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
  )
}

const ALL_SERVICES = [
  {
    name: 'Furniture Assembly',
    category: 'Furniture',
    rating: 4.9,
    reviews: 420,
    tasks: 1600,
    workers: 42,
    icon: 'furniture',
  },
  {
    name: 'Home Cleaning',
    category: 'Cleaning',
    rating: 4.8,
    reviews: 610,
    tasks: 2400,
    workers: 58,
    icon: 'cleaning',
  },
  {
    name: 'Mounting & Installation',
    category: 'Mounting',
    rating: 4.9,
    reviews: 330,
    tasks: 1300,
    workers: 37,
    icon: 'mounting',
  },
  {
    name: 'Moving Help',
    category: 'Moving',
    rating: 4.7,
    reviews: 280,
    tasks: 1100,
    workers: 29,
    icon: 'moving',
  },
  {
    name: 'Gardening',
    category: 'Outdoor',
    rating: 4.6,
    reviews: 150,
    tasks: 540,
    workers: 18,
    icon: 'services',
  },
  {
    name: 'Plumbing',
    category: 'Plumbing',
    rating: 4.8,
    reviews: 390,
    tasks: 1500,
    workers: 33,
    icon: 'plumbing',
  },
  {
    name: 'Electrical Work',
    category: 'Electrical',
    rating: 4.8,
    reviews: 365,
    tasks: 1400,
    workers: 31,
    icon: 'electrical',
  },
  {
    name: 'Painting',
    category: 'Painting',
    rating: 4.7,
    reviews: 210,
    tasks: 820,
    workers: 24,
    icon: 'painting',
  },
]

const FILTER_TAGS = ['Cleaning', 'Furniture', 'Plumbing', 'Moving', 'Electrical']

function Services() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [activeTag, setActiveTag] = useState('All')

  const filteredServices = useMemo(() => {
    const query = search.toLowerCase()

    return ALL_SERVICES.filter((service) => {
      const matchesTag =
        activeTag === 'All' || service.category.toLowerCase() === activeTag.toLowerCase()
      const matchesSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query)

      return matchesTag && matchesSearch
    })
  }, [search, activeTag])

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50/90 to-white pb-12 pt-10 sm:pt-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem]">
              Find the Right Service
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Browse all available services on SewaSathi. From furniture assembly to plumbing,
              we have verified professionals ready to help.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-stretch gap-4 sm:items-center sm:gap-5">
            <div className="relative mx-auto w-full max-w-xl">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <svg
                  className="h-5 w-5 text-slate-400"
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
              </div>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services (e.g. cleaning, moving, plumbing)"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm shadow-slate-200/40 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-slate-500">Popular:</span>
              {FILTER_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-3 py-1.5 font-medium transition ${
                    activeTag === tag
                      ? 'border-brand/60 bg-brand/10 text-brand'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveTag('All')}
                className={`rounded-full border px-3 py-1.5 font-medium transition ${
                  activeTag === 'All'
                    ? 'border-slate-900/70 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Most popular */}
      <section className="bg-white pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Most Popular Services
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Trusted by thousands of customers across Nepal
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_SERVICES.slice(0, 4).map((service, index) => (
              <Reveal
                key={service.name}
                delay={index % 4}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <ServiceIcon name={service.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{service.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{service.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* All services */}
      <section className="bg-slate-50 py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">All Services</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredServices.length} services matched your search
              </p>
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98]"
            >
              + Post a Task
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service, index) => (
              <Reveal
                key={service.name}
                delay={index % 4}
                className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <ServiceIcon name={service.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{service.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{service.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-slate-800">
                      {service.rating.toFixed(1)}
                    </span>
                    <span className="text-slate-400">({service.reviews})</span>
                  </div>
                </div>

                <ul className="mt-4 space-y-1 text-xs text-slate-500">
                  <li>
                    <span className="font-medium text-slate-700">
                      {service.tasks.toLocaleString()}
                    </span>{' '}
                    tasks completed
                  </li>
                  <li>
                    <span className="font-medium text-slate-700">{service.workers}</span>{' '}
                    verified workers
                  </li>
                </ul>

                <div className="mt-4 flex items-center justify-between pt-2 text-xs text-slate-500">
                  <span>Starting from NPR 1,000</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
                  >
                    Book Now
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Custom task CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <ServiceIcon name="services" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Can&apos;t Find What You Need?
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Post a custom task and let verified workers come to you. Describe what you need, set
            your budget, and get matched within hours.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98] sm:w-auto"
            >
              Post a Custom Task
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              How It Works
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Services
