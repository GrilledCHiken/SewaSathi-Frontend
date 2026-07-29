import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import AuthLayout, { AuthFooterLink } from '../components/auth/AuthLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { ArrowRightIcon, EyeIcon, LockIcon, MailIcon } from '../components/ui/icons'

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const location = useLocation()
  // Captured once on mount: router state survives a refresh, so reading it on every
  // render would re-show a stale "account created" banner.
  const [signupNotice] = useState(() => (location.state?.registered ? location.state : null))
  const [email, setEmail] = useState(() => location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { isCustomerAuthenticated, user, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (signupNotice) {
      window.history.replaceState({}, '')
    }
  }, [signupNotice])

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
      // 403 is a suspended account, which carries its own message; anything else is
      // reported as a credentials failure so a wrong password reveals nothing more.
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your SewaSathi account"
      notice={
        signupNotice && (
          <Alert tone="success" title="Account created successfully!" role="status">
            Sign in below to get started.
            {signupNotice.role === 'WORKER' &&
              ' Your worker application will be reviewed by an administrator.'}
          </Alert>
        )
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

        <Field id="password" label="Password">
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
    </AuthLayout>
  )
}

export default Login
