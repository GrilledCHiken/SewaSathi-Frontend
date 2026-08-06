import { Link } from 'react-router-dom'
import Brandmark from '../ui/Brandmark'

const COMPANY_LINKS = [
  { label: 'Browse Services', href: '/services', real: true },
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

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-ink-faint">
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
  return (
    <footer className="mt-16 bg-[#05070a] text-ink-faint">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))] lg:gap-16">
          <div>
            <Brandmark to="/" size="md" tone="dark" />

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-faint">
              Nepal&apos;s most trusted local service marketplace. Connecting verified
              workers with people who need help safely, simply, and affordably.
            </p>
          </div>

          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Support" links={SUPPORT_LINKS} />
        </div>

        <div className="mt-10 h-px bg-slate-800" />

        <div className="mt-6 flex flex-col gap-4 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 SewaSathi. All rights reserved. Built for Nepal.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-ink-muted">Secured by</span>
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
