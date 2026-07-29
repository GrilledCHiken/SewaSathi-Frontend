import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";

const SECTIONS = [
  {
    title: "1. Using SewaSathi",
    body: "SewaSathi connects customers who need local services with independent workers who provide them. By creating an account, you agree to use the platform honestly: post accurate task details, communicate respectfully, and pay agreed amounts for completed work.",
  },
  {
    title: "2. Accounts",
    body: "You're responsible for keeping your login credentials secure and for all activity under your account. Worker accounts are reviewed and approved by our team before they can accept tasks; we may suspend accounts that violate these terms or engage in suspicious activity.",
  },
  {
    title: "3. Tasks and Payments",
    body: "Customers post tasks with a budget; workers accept, complete, and mark tasks as done. SewaSathi does not guarantee the quality of work performed by independent workers, though reviews and ratings help maintain accountability across the platform.",
  },
  {
    title: "4. Cancellations",
    body: "Customers may cancel a task while it is still open. Once a worker has been assigned, please coordinate directly through in-app messaging before cancelling to avoid inconvenience.",
  },
  {
    title: "5. Prohibited Conduct",
    body: "Do not use SewaSathi for anything illegal, to harass other users, or to circumvent the platform's review and payment processes. Violations may result in account suspension.",
  },
  {
    title: "6. Changes to These Terms",
    body: "We may update these terms as the platform evolves. Continued use of SewaSathi after changes are posted means you accept the updated terms.",
  },
];

export default function Terms() {
  return (
    <div className="flex-1 bg-white">
      <section className="bg-surface-muted py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-base text-ink-muted">Last updated: January 2026</p>
          </Reveal>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-bold text-ink">{section.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-ink-muted">{section.body}</p>
              </div>
            ))}
          </Reveal>

          <div className="mt-14 rounded-2xl border border-line bg-surface-muted p-6 text-center">
            <p className="text-sm text-ink-muted">
              Questions about these terms?{" "}
              <Link to="/contact" className="font-semibold text-brand hover:underline">
                Contact our team
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
