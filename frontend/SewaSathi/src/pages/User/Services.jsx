import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Reveal from '../../components/User/Reveal'
import ServiceIcon from '../../components/User/ServiceIcon'
import Button from '../../components/ui/Button'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { serviceDisplay } from '../../data/services'
import { usePublicServices } from '../../hooks/usePublicData'
import { routeForRole } from '../../utils/authRouting'
import { formatCount, formatRating, formatRupees } from '../../utils/formatStats'

/** How many category chips the "Popular:" row offers. */
const TAG_COUNT = 5

function Services() {
  // The URL owns the search term, so a filtered list stays shareable and the Back
  // button returns to wherever the visitor came from. Reading it into state instead
  // meant the box and the address bar drifted apart the moment anyone typed.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [activeTag, setActiveTag] = useState('All')
  const { services, loading } = usePublicServices()
  const { user, isCustomerAuthenticated } = useAuth()

  const setSearch = (next) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        // Drop the key rather than leave a bare `?search=` behind.
        if (next) params.set('search', next)
        else params.delete('search')
        return params
      },
      // Per keystroke, so typing a query does not bury the previous page under a
      // dozen history entries.
      { replace: true },
    )
  }

  /**
   * Where a "book this" CTA belongs, given who is reading the page. A visitor has no
   * dashboard to deep-link into yet; a worker or admin has one, but not this one.
   */
  const ctaTarget = (customerPath) => {
    if (isCustomerAuthenticated) return customerPath
    if (user) return routeForRole(user)
    return '/signup'
  }

  // Ranked by real demand, so the chips and the "most popular" row follow what
  // people actually book. Ties keep the catalogue's own order, which means a
  // platform with no bookings yet still shows a sensible, stable list.
  const byPopularity = useMemo(
    () => [...services].sort((a, b) => b.taskCount - a.taskCount),
    [services],
  )

  const filterTags = useMemo(
    () => byPopularity.slice(0, TAG_COUNT).map((service) => service.name),
    [byPopularity],
  )

  const filteredServices = useMemo(() => {
    const query = search.toLowerCase()

    return services.filter((service) => {
      const matchesTag =
        activeTag === 'All' || service.name.toLowerCase() === activeTag.toLowerCase()
      const matchesSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        serviceDisplay(service.name).description.toLowerCase().includes(query)

      return matchesTag && matchesSearch
    })
  }, [services, search, activeTag])

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
              {filterTags.map((tag) => (
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
                Ranked by what customers are booking right now
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={index} lines={1} />
                ))
              : byPopularity.slice(0, 4).map((service, index) => {
                  const display = serviceDisplay(service.name)
                  return (
                    <Reveal
                      key={service.name}
                      delay={index % 4}
                      className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <ServiceIcon name={display.icon} className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 text-sm font-semibold text-ink">{service.name}</h3>
                      <p className="mt-1 text-xs text-ink-muted">{display.description}</p>
                    </Reveal>
                  )
                })}
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
                {loading
                  ? 'Loading services...'
                  : `${filteredServices.length} services matched your search`}
              </p>
            </div>
            <Button as={Link} to={ctaTarget('/dashboard/post-task')} className="mt-1">
              + Post a Task
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
              : filteredServices.map((service, index) => {
                  const display = serviceDisplay(service.name)
                  return (
                    <Reveal
                      key={service.name}
                      delay={index % 4}
                      className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 text-sm shadow-sm transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                            <ServiceIcon name={display.icon} className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-ink">{service.name}</h3>
                            <p className="mt-0.5 text-xs text-ink-muted">
                              {display.description}
                            </p>
                          </div>
                        </div>
                        {/* A category nobody has reviewed has no score. Saying so beats
                            printing a zero that reads as a bad one. */}
                        {service.ratingCount > 0 ? (
                          <div className="flex shrink-0 items-center gap-1 text-xs text-amber-500">
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-semibold text-ink">
                              {formatRating(service.ratingAverage)}
                            </span>
                            <span className="text-ink-faint">
                              ({formatCount(service.ratingCount)})
                            </span>
                          </div>
                        ) : (
                          <span className="shrink-0 text-xs text-ink-faint">No reviews yet</span>
                        )}
                      </div>

                      <ul className="mt-4 space-y-1 text-xs text-ink-muted">
                        <li>
                          <span className="font-medium text-ink-body">
                            {formatCount(service.completedCount)}
                          </span>{' '}
                          tasks completed
                        </li>
                        <li>
                          <span className="font-medium text-ink-body">
                            {formatCount(service.workerCount)}
                          </span>{' '}
                          verified workers
                        </li>
                      </ul>

                      <div className="mt-4 flex items-center justify-between pt-2 text-xs text-ink-muted">
                        {/* The cheapest rate a worker actually advertises for this skill. */}
                        <span>
                          {service.startingRate
                            ? `Starting from ${formatRupees(service.startingRate)}/hr`
                            : 'Rate on request'}
                        </span>
                        {/* Lands on the worker list already filtered to this skill —
                            CustomerBrowseWorkers reads the same `search` param the
                            dashboard header's search box writes. */}
                        <Button
                          as={Link}
                          to={ctaTarget(
                            `/dashboard/workers?search=${encodeURIComponent(service.name)}`,
                          )}
                          variant="secondary"
                          size="xs"
                        >
                          Book Now
                        </Button>
                      </div>
                    </Reveal>
                  )
                })}
          </div>

          {!loading && filteredServices.length === 0 && (
            <p className="mt-8 text-center text-sm text-ink-muted">
              No services matched your search. Try a different term, or post a custom task below.
            </p>
          )}
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
            <Button
              as={Link}
              to={ctaTarget('/dashboard/post-task')}
              size="lg"
              className="w-full sm:w-auto"
            >
              Post a Custom Task
            </Button>
            <Button
              as={Link}
              to="/how-it-works"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              How It Works
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Services
