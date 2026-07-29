import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Reveal from '../../components/User/Reveal'
import ServiceIcon from '../../components/User/ServiceIcon'
import { ALL_SERVICES, FILTER_TAGS, POPULAR_SERVICES } from '../../data/services'

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
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
              Find the Right Service
            </h1>
            <p className="mt-3 text-base text-ink-muted sm:text-lg">
              Browse all available services on SewaSathi. From furniture assembly to plumbing,
              we have verified professionals ready to help.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-stretch gap-4 sm:items-center sm:gap-5">
            <div className="relative mx-auto w-full max-w-xl">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <svg
                  className="h-5 w-5 text-ink-faint"
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
                className="w-full rounded-2xl border border-line bg-white py-3.5 pl-11 pr-4 text-sm text-ink shadow-sm shadow-slate-200/40 placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-ink-muted">Popular:</span>
              {FILTER_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-3 py-1.5 font-medium transition ${
                    activeTag === tag
                      ? 'border-brand/60 bg-brand/10 text-brand'
                      : 'border-line bg-white text-ink-muted hover:border-line-strong'
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
                    : 'border-line bg-white text-ink-muted hover:border-line-strong'
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
              <h2 className="text-xl font-semibold text-ink sm:text-2xl">
                Most Popular Services
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Trusted by thousands of customers across Nepal
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_SERVICES.slice(0, 4).map((service, index) => (
              <Reveal
                key={service.name}
                delay={index % 4}
                className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <ServiceIcon name={service.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{service.name}</h3>
                <p className="mt-1 text-xs text-ink-muted">{service.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* All services */}
      <section className="bg-surface-muted py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink sm:text-2xl">All Services</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {filteredServices.length} services matched your search
              </p>
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-dark active:scale-[0.98]"
            >
              + Post a Task
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service, index) => (
              <Reveal
                key={service.name}
                delay={index % 4}
                className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 text-sm shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <ServiceIcon name={service.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{service.name}</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">{service.category}</p>
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
                    <span className="font-semibold text-ink">
                      {service.rating.toFixed(1)}
                    </span>
                    <span className="text-ink-faint">({service.reviews})</span>
                  </div>
                </div>

                <ul className="mt-4 space-y-1 text-xs text-ink-muted">
                  <li>
                    <span className="font-medium text-ink-body">
                      {service.tasks.toLocaleString()}
                    </span>{' '}
                    tasks completed
                  </li>
                  <li>
                    <span className="font-medium text-ink-body">{service.workers}</span>{' '}
                    verified workers
                  </li>
                </ul>

                <div className="mt-4 flex items-center justify-between pt-2 text-xs text-ink-muted">
                  <span>Starting from NPR 1,000</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-body transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
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
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Can&apos;t Find What You Need?
          </h2>
          <p className="mt-3 text-sm text-ink-muted sm:text-base">
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
              className="inline-flex w-full items-center justify-center rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink-body transition hover:border-line-strong hover:bg-surface-muted sm:w-auto"
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
