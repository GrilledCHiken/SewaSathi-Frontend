import { Link } from "react-router-dom";
import Reveal from "../../components/User/Reveal";

const SECTIONS = [
  {
    title: "1. What We Collect",
    body: "When you create an account, we collect your name, email, phone number, and — for workers — your skills, location, and hourly rate. When you post or complete a task, we store the task details and messages exchanged with the other party.",
  },
  {
    title: "2. How We Use It",
    body: "Your information is used to match customers with workers, process task and review history, and keep the platform safe (for example, detecting suspicious accounts). We don't sell your personal data to third parties.",
  },
  {
    title: "3. Messages and Attachments",
    body: "Messages and files you send through in-app chat are visible only to you and the other party on that task, plus platform administrators if needed to resolve a dispute.",
  },
  {
    title: "4. Data Retention",
    body: "We keep account and task history for as long as your account is active. You can request account deletion by contacting support.",
  },
  {
    title: "5. Security",
    body: "Passwords are stored using industry-standard hashing (never in plain text). We use authenticated, encrypted connections between the app and our servers.",
  },
  {
    title: "6. Your Choices",
    body: "You can update your profile information at any time, and can reach out to support with any questions about the data we hold about you.",
  },
];

export default function Privacy() {
  return (
    <div className="flex-1 bg-white">
      <section className="bg-surface-muted py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Privacy Policy
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
              Have a privacy question or request?{" "}
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
