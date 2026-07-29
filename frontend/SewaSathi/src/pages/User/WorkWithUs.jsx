import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";
import Button from "../../components/ui/Button";
import { CheckIcon } from "../../components/ui/icons";

const WORKER_PERKS = [
  "Set your own rates and working hours",
  "Get paid securely within 24 hours of completion",
  "Build a verified profile and a repeat client base",
];

/**
 * "Careers" page for a platform with no corporate openings. Rather than an
 * apology, it points skilled workers at the thing we actually are hiring for.
 */
export default function WorkWithUs() {
  return (
    <div className="flex-1 bg-white">
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_55%)]" />
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-panel bg-emerald-600 text-white shadow-e2">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Work with SewaSathi
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              We&apos;re not hiring for corporate roles right now, but there&apos;s
              always room for skilled professionals on the platform. If you offer
              cleaning, repairs, moving, painting, or another home service, sign up
              as a worker and start accepting tasks.
            </p>

            <ul className="mx-auto mt-8 max-w-md space-y-3 text-left">
              {WORKER_PERKS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-3 rounded-card border border-line bg-white p-3.5 text-sm text-ink-body shadow-e1"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button as={Link} to="/signup/worker" variant="emerald" size="lg">
                Become a Worker
              </Button>
              <Button
                as="a"
                href="mailto:careers@sewasathi.com"
                variant="secondary"
                size="lg"
              >
                Email us about corporate roles
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
