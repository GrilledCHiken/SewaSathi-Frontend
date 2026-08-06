import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import AuthLayout, { AuthFooterLink } from '../components/auth/AuthLayout'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { ArrowRightIcon, EyeIcon, LockIcon, MailIcon } from '../components/ui/icons'
import { routeForRole } from '../utils/authRouting'
import { stashGoogleCredential } from '../utils/signupHandoff'

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const location = useLocation()
  // Captured once on mount: router state survives a refresh, so reading it on every
  // render would re-show a stale banner. Both flows that route here — finishing a signup
  // and finishing a password reset — hand off the same way.
  const [arrivalNotice] = useState(() =>
    location.state?.registered || location.state?.passwordReset ? location.state : null,
  )
  const [email, setEmail] = useState(() => location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { isCustomerAuthenticated, user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (arrivalNotice) {
      window.history.replaceState({}, '')
    }
  }, [arrivalNotice])

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
    try {
      const result = await login({ email: email.trim(), password })
      toast.success('Welcome back!')
      navigate(routeForRole(result.user, from), { replace: true })
    } catch (err) {
      // 403 is a suspended account, which carries its own message; anything else is
      // reported as a credentials failure so a wrong password reveals nothing more.
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (credential) => {
    try {
      const result = await loginWithGoogle({ credential })

      // Verified, but nobody here by that address yet. The account is created on the next
      // screen, once it has the phone number Google does not supply.
      if (result.status === 'profileCompletionRequired') {
        stashGoogleCredential(credential)
        navigate('/signup/google', { replace: true, state: result })
        return
      }

      toast.success('Welcome back!')
      navigate(routeForRole(result.user, from), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.')
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your SewaSathi account"
      notice={
        arrivalNotice &&
        (arrivalNotice.passwordReset ? (
          <Alert tone="success" title="Password updated" role="status">
            Sign in below with your new password.
          </Alert>
        ) : (
          <Alert tone="success" title="Account created successfully!" role="status">
            Sign in below to get started.
            {arrivalNotice.role === 'WORKER' &&
              ' Your worker application will be reviewed by an administrator.'}
          </Alert>
        ))
      }
      footer={
        <AuthFooterLink prompt="Don't have an account?" to="/signup" label="Sign up" />
      }
    >
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Field id="email" label="Email">
          {(field) => (
            <Input
              {...field}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              leadingIcon={<MailIcon className="h-5 w-5" />}
            />
          )}
        </Field>

        <Field
          id="password"
          label="Password"
          // Carries whatever they have already typed, so the reset flow does not open on an
          // empty email field they just filled in.
          

        >
          {(field) => (
            <Input
              {...field}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              leadingIcon={<LockIcon className="h-5 w-5" />}
              trailing={
                <button
                  type="button"
                  className="rounded-field p-1.5 text-ink-faint transition hover:bg-surface-sunken hover:text-ink-body focus-ring"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} className="h-5 w-5" />
                </button>
              }
            />
          )}
        </Field>

<div className='flex justify-end'>
        <Link 
              to="/forgot-password"
              state={{ email: email.trim() }}
              className=" rounded text-sm font-semibold text-brand transition hover:text-brand-dark focus-ring"
            >
              Forgot password?
            </Link>
</div>

        <Button
          type="submit"
          size="lg"
          shape="rounded"
          fullWidth
          loading={loading}
          iconRight={<ArrowRightIcon className="h-5 w-5" />}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
    </AuthLayout>
  )
}

export default Login
