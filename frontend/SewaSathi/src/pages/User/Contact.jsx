import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Reveal from "../../components/User/Reveal";
import { submitContactMessage } from "../../api/contactApi";

const CONTACT_CARDS = [
  {
    title: "Email Us",
    highlight: "support@sewasathi.com",
    href: "mailto:support@sewasathi.com",
    description:
      "For general inquiries, support, and feedback. We reply within 2 hours.",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="m22 6-10 7L2 6" />
      </svg>
    ),
  },
  {
    title: "Call Us",
    highlight: "+977 1-444-5555",
    href: "tel:+97714445555",
    description:
      "Mon–Fri, 9 AM – 6 PM NPT. For urgent matters, please use the app SOS button.",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    title: "Visit Us",
    highlight: "Kathmandu, Nepal",
    href: "#visit",
    description:
      "Our headquarters is in Thamel, Kathmandu. Drop by during business hours — we'd love to meet you!",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Live Chat",
    highlight: "In-App Messaging",
    href: "/login",
    description:
      "The fastest way to get help. Available on your customer or worker dashboard.",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const SUBJECT_OPTIONS = [
  "General inquiry",
  "Customer support",
  "Worker verification",
  "Payment & billing",
  "Report an issue",
  "Partnership",
  "Other",
];

const FAQS = [
  {
    q: "How do I reach customer support?",
    a: (
      <>
        Email us at{" "}
        <a
          href="mailto:support@sewasathi.com"
          className="font-medium text-brand hover:underline"
        >
          support@sewasathi.com
        </a>{" "}
        or call +977 1-444-5555 during business hours (Mon–Fri, 9 AM – 6 PM
        NPT). For the fastest response, use in-app messaging from your
        dashboard.
      </>
    ),
  },
  {
    q: "What areas does SewaSathi currently serve?",
    a: "SewaSathi is available in 45+ cities across Nepal, including Kathmandu Valley, Pokhara, Biratnagar, Butwal, and many more. We're expanding to new areas regularly — check the app for service availability in your location.",
  },
  {
    q: "How can I become a verified worker?",
    a: "Sign up as a service provider, complete your profile, and submit verification documents. Our team reviews applications within 24–48 hours. Once approved, you'll receive a verified badge and can start accepting tasks.",
  },
  {
    q: "How do payments work?",
    a: "Payments are processed securely through eSewa and Khalti. Funds are held in escrow until the customer confirms the task is complete. Workers receive payment after approval, minus a small platform fee.",
  },
  {
    q: "What if I have a dispute with a worker or customer?",
    a: "Contact our support team within 48 hours of the issue. We'll review messages, task details, and evidence from both parties to reach a fair resolution, which may include refunds or account actions when needed.",
  },
  {
    q: "Is SewaSathi hiring?",
    a: "We're always looking for passionate people to join our team in Kathmandu. Send your CV to careers@sewasathi.com or check our About page for open positions.",
  },
];

const MAX_MESSAGE_LENGTH = 500;

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function ContactAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {FAQS.map((item, idx) => {
        const open = openIndex === idx;
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-2xl border transition ${
              open ? "border-brand/30 bg-sky-50/40" : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpenIndex(open ? -1 : idx)}
              aria-expanded={open}
            >
              <span className="text-[0.9375rem] font-semibold text-slate-900">
                {item.q}
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition ${
                  open ? "rotate-180 bg-white" : "bg-slate-100"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {open && (
              <div className="border-t border-slate-200/80 px-5 pb-5">
                <div className="pt-4 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "message" ? value.slice(0, MAX_MESSAGE_LENGTH) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!form.email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Please enter a valid email address.";
    }
    if (!form.subject) next.subject = "Please select a topic.";
    if (!form.message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await submitContactMessage(form);
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 via-sky-50/30 to-white pb-4 pt-10 sm:pt-14 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,140,255,0.06),transparent_55%)]" />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            <svg className="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            We are here to help
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Get in Touch
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Have a question, feedback, or just want to say hello? Our team is
            ready to help. Reach out through any channel below or send us a
            message directly.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_CARDS.map((card, index) => (
              <Reveal
                key={card.title}
                as="article"
                delay={index % 4}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand/20 hover:shadow-md"
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${card.iconBg} ${card.iconText}`}
                >
                  {card.icon}
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  {card.title}
                </h2>
                <a
                  href={card.href}
                  className="mt-1 text-sm font-semibold text-brand hover:underline"
                >
                  {card.highlight}
                </a>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                  {card.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Form + FAQ */}
      <section className="bg-slate-50/60 py-12 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
            {/* Form */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-100/50 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Send us a Message
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Fill out the form below and we&apos;ll get back to you within 2
                hours during business hours.
              </p>

              {submitted ? (
                <div
                  className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
                  role="status"
                >
                  Thank you! Your message has been sent. We&apos;ll get back to
                  you soon.
                </div>
              ) : (
                <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className={inputClassName}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "contact-name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="contact-name-error" className="mt-1 text-sm text-red-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className={inputClassName}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "contact-email-error" : undefined}
                    />
                    {errors.email && (
                      <p id="contact-email-error" className="mt-1 text-sm text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className={`${inputClassName} ${!form.subject ? "text-slate-400" : ""}`}
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? "contact-subject-error" : undefined}
                    >
                      <option value="">Select a topic...</option>
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p id="contact-subject-error" className="mt-1 text-sm text-red-600">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Message
                    </label>
                    <div className="relative">
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="How can we help you?"
                        className={`${inputClassName} resize-y min-h-[140px] pb-8`}
                        aria-invalid={Boolean(errors.message)}
                        aria-describedby={errors.message ? "contact-message-error" : undefined}
                      />
                      <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">
                        Max {MAX_MESSAGE_LENGTH} characters
                      </span>
                    </div>
                    {errors.message && (
                      <p id="contact-message-error" className="mt-1 text-sm text-red-600">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m22 2-7 20-4-9-9-4 20-2z" />
                      <path d="M22 2 11 13" />
                    </svg>
                    {loading ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* FAQ */}
            <div id="faq" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Quick answers to common questions. Can&apos;t find what you&apos;re
                looking for? Send us a message.
              </p>

              <div className="mt-6">
                <ContactAccordion />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14" />
              <path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1.4 2.8 1.2l3.2 3.2" />
              <path d="m2 14 6 6" />
              <path d="m16 10 6 6" />
            </svg>
          </span>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ready to get help?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Join thousands of Nepalis who trust SewaSathi for safe, reliable
            local services every single day.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.98]"
            >
              Create Free Account
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center justify-center rounded-full border-2 border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            >
              Browse Services
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
