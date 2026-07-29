import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";
import Button from "../../components/ui/Button";

/**
 * Placeholder until there are posts to show.
 *
 * Given the gradient wash and blur orbs the rest of the marketing site uses, so
 * a page with nothing on it yet still reads as finished rather than unbuilt.
 */
export default function Blog() {
  return (
    <div className="flex-1 bg-white">
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,140,255,0.08),transparent_55%)]" />
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-panel bg-brand text-white shadow-brand">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>

            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
              Coming soon
            </span>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              The SewaSathi blog is on its way
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              We&apos;re working on articles about home maintenance tips, worker
              spotlights, and updates from the SewaSathi team. Check back soon — or
              explore what&apos;s live today.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button as={Link} to="/services" size="lg">
                Browse Services
              </Button>
              <Button as={Link} to="/contact" variant="secondary" size="lg">
                Contact Us
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
