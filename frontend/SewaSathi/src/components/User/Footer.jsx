import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { subscribeToNewsletter } from '../../api/newsletterApi'

const SERVICES_LINKS = [
  { label: 'Furniture Assembly', href: '/services', real: true },
  { label: 'Home Cleaning', href: '/services', real: true },
  { label: 'Mounting', href: '/services', real: true },
  { label: 'Moving Help', href: '/services', real: true },
  { label: 'Plumbing', href: '/services', real: true },
  { label: 'Electrical', href: '/services', real: true },
]

const COMPANY_LINKS = [
  { label: 'About Us', href: '/about', real: true },
  { label: 'How It Works', href: '/how-it-works', real: true },
  { label: 'Safety & Trust', href: '/safety', real: true },
  { label: 'Work With Us', href: '/work-with-us', real: true },
  { label: 'Blog', href: '/blog', real: true },
]

const SUPPORT_LINKS = [
  { label: 'Help Center', href: '/help', real: true },
  { label: 'Contact Us', href: '/contact', real: true },
  { label: 'FAQ', href: '/contact#faq', real: true },
  { label: 'Terms of Service', href: '/terms', real: true },
  { label: 'Privacy Policy', href: '/privacy', real: true },
]

function LogoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 11.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VerifiedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <path
        d="M8 12.5l2.5 2.5L16 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-slate-400">
        {links.map((link) =>
          link.real ? (
            <li key={link.label}>
              <Link to={link.href} className="transition hover:text-slate-100">
                {link.label}
              </Link>
            </li>
          ) : (
            <li key={link.label}>
              <a href={link.href} className="transition hover:text-slate-100">
                {link.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setSubscribing(true)
    try {
      await subscribeToNewsletter(newsletterEmail.trim())
      toast.success("You're subscribed! Watch your inbox for updates.")
      setNewsletterEmail('')
    } catch {
      toast.error('Could not subscribe right now. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <footer className="mt-16 bg-[#05070a] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-16">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
                <LogoIcon />
              </span>
              <span className="text-lg font-semibold text-white">
                SewaSathi
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Nepal&apos;s most trusted local service marketplace. Connecting verified
              workers with people who need help — safely, simply, and affordably.
            </p>

            <div className="mt-8">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                STAY UPDATED
              </span>
              <form
                className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"
                onSubmit={handleSubscribe}
              >
                <div className="flex flex-1 items-center gap-2 border-b border-slate-700 pb-2">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    aria-label="Email for newsletter"
                    required
                    className="flex-1 border-0 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
                  />
                  <span className="inline-flex items-center">
                    <VerifiedIcon />
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={subscribing}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {subscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>

          <FooterColumn title="Services" links={SERVICES_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Support" links={SUPPORT_LINKS} />
        </div>

        <div className="mt-10 h-px bg-slate-800" />

        <div className="mt-6 flex flex-col gap-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 SewaSathi. All rights reserved. Built for Nepal.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Secured by</span>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200">
                eSewa
              </span>
              <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200">
                Khalti
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
