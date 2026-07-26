import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { resendVerification } from '../api/authApi'
import SocialSignIn from '../components/SocialSignIn'
import { useAuth } from '../context/AuthContext'

function LogoIcon({ className = '' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s-6.5-4.35-9-8.2C1.5 9.5 3.5 5 7.5 5c2.1 0 3.5 1.2 4.5 2.5C13 6.2 14.4 5 16.5 5 20.5 5 22.5 9.5 21 12.8 18.5 16.65 12 21 12 21z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function MailVerifiedIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <path d="M8 12.5l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="text-white/15" fill="currentColor" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  )
}

const TRUST_POINTS = [
  'Verified, background-checked professionals',
  'Secure, cashless payments',
  '24/7 customer support',
]

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const location = useLocation()
  // Captured once on mount: router state survives a refresh, so reading it on every
  // render would re-show a stale "account created" banner.
  const [signupNotice] = useState(() => (location.state?.registered ? location.state : null))
  const [email, setEmail] = useState(() => location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // Set when sign-in was refused purely because the address is unconfirmed, which is
  // recoverable in place rather than a dead end.
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)
  const [resending, setResending] = useState(false)
  const { isCustomerAuthenticated, user, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (signupNotice) {
      window.history.replaceState({}, '')
    }
  }, [signupNotice])

  // A failed social sign-in redirects back here with the reason in the query string.
  useEffect(() => {
    const oauthError = new URLSearchParams(location.search).get('error')
    if (oauthError) {
      toast.error(oauthError)
      window.history.replaceState({}, '', '/login')
    }
  }, [location.search])

  const from = location.state?.from?.pathname || '/dashboard'

  if (isCustomerAuthenticated) {
    return <Navigate to={from} replace />
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />
  }

  if (user?.role === 'WORKER') {
    return <Navigate to="/worker" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setUnverifiedEmail(null)
    try {
      const result = await login({ email: email.trim(), password })

      // Two-factor is on, or this device has not been seen before: the password was
      // right but a code has been emailed and must be entered before a session exists.
      if (result.status === 'challenge') {
        navigate('/verify-otp', {
          replace: true,
          state: {
            challengeToken: result.challengeToken,
            challengeReason: result.challengeReason,
            email: email.trim(),
            from,
          },
        })
        return
      }

      const sessionUser = result.user
      toast.success('Welcome back!')
      if (sessionUser.role === 'ADMIN') {
        navigate('/admin', { replace: true })
      } else if (sessionUser.role === 'CUSTOMER') {
        navigate(from, { replace: true })
      } else if (sessionUser.role === 'WORKER') {
        navigate('/worker', { replace: true })
      }
    } catch (err) {
      // 403 here means the password was correct but the address was never confirmed.
      // Surfacing a resend action beats repeating "invalid email or password", which
      // would send the user off hunting for a problem with their credentials.
      if (err.response?.status === 403) {
        setUnverifiedEmail(email.trim())
        toast.error(err.response?.data?.message || 'Please verify your email address first.')
      } else {
        toast.error(err.response?.data?.message || 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    try {
      await resendVerification(unverifiedEmail)
      toast.success('Verification email sent. Check your inbox.')
    } catch {
      toast.error('Could not send the email. Please try again shortly.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-svh bg-slate-50">
      {/* Left marketing panel — hidden on small screens */}
      <aside className="relative hidden w-[44%] shrink-0 overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/30 via-navy to-navy" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5 transition hover:opacity-90">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand shadow-lg shadow-brand/30">
            <LogoIcon />
          </span>
          <span className="text-xl font-bold tracking-tight text-white">SewaSathi</span>
        </Link>

        <div className="relative animate-fade-up">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            Book trusted help,
            <br />
            in minutes.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">
            Connect with verified professionals for cleaning, repairs, moving, and more — all in
            one place.
          </p>

          <ul className="mt-8 space-y-3.5">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                <CheckIcon />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative animate-fade-up-delay rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-sm italic leading-relaxed text-slate-200">
            “SewaSathi made finding a reliable cleaner so easy. Professional, on time, and fairly
            priced.”
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-dark ring-1 ring-brand/40">
              <span className="text-white">SS</span>
            </span>
            <p className="text-xs font-semibold text-slate-300">Sita Sharma · Lalitpur</p>
          </div>
        </div>
      </aside>

      {/* Right column — the actual form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2.5 transition opacity-100 hover:opacity-90 lg:hidden"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand">
            <LogoIcon />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">SewaSathi</span>
        </Link>

        <div className="w-full max-w-[420px] animate-fade-up rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Sign in to your SewaSathi account
            </p>
          </div>

          {signupNotice && (
            <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <p className="font-semibold">Account created successfully!</p>
              <p className="mt-1">
                We&apos;ve emailed you a link to confirm your address. Click it, then sign in below.
                {signupNotice.role === 'WORKER' &&
                  ' Your worker application will be reviewed after that.'}
              </p>
            </div>
          )}

          {unverifiedEmail && (
            <div className="mt-6 rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <p className="font-semibold">Confirm your email to continue</p>
              <p className="mt-1">
                We sent a verification link to <strong>{unverifiedEmail}</strong>. Click it to
                activate your account, then sign in.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="mt-3 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
                Email
              </label>
              <div className="group relative mt-2">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-brand">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
                  <MailVerifiedIcon />
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-brand transition hover:text-brand-dark"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="group relative mt-2">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-brand">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 transition hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRightIcon />}
            </button>
          </form>

          {/*
            Replaces a "Phone Number" button that was never wired to anything. Renders
            nothing at all unless the backend reports configured OAuth providers.
          */}
          <SocialSignIn />
        </div>

        <p className="mt-8 text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand transition hover:text-brand-dark">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
