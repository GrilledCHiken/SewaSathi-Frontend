import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";

export default function WorkWithUs() {
  return (
    <div className="flex-1 bg-white">
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Work with SewaSathi
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              We&apos;re not hiring for corporate roles right now, but there&apos;s always room for
              skilled professionals on the platform. If you offer cleaning, repairs, moving,
              painting, or another home service, sign up as a worker and start accepting tasks.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup/worker"
                className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
              >
                Become a Worker
              </Link>
              <a
                href="mailto:careers@sewasathi.com"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Interested in a corporate role? Email us
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
