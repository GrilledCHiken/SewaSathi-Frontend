import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import PasswordChecklist from '../../components/PasswordChecklist'
import { parseSignupError, sanitizePhone, validateSignupForm } from '../../utils/validation'
import AuthLayout, { AuthFooterLink } from '../../components/auth/AuthLayout'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import { routeForRole } from '../../utils/authRouting'
import { stashGoogleCredential } from '../../utils/signupHandoff'
import BackLink from '../../components/ui/BackLink'
import Button from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import {
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../../components/ui/icons'

function TaskIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function UserSignup() {
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const { registerCustomer, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleGoogleCredential = async (credential) => {
    try {
      const result = await loginWithGoogle({ credential })

      if (result.status === 'profileCompletionRequired') {
        stashGoogleCredential(credential)
        navigate('/signup/google', { replace: true, state: result })
        return
      }

      // Already had an account. Nothing was created, so this is a sign-in, not a signup.
      toast.success('Welcome back!')
      navigate(routeForRole(result.user), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.')
    }
  }

  const update = (field) => (e) => {
    const value = field === 'phone' ? sanitizePhone(e.target.value) : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev))
  }

  const toggleAgreed = (e) => {
    setAgreed(e.target.checked)
    setErrors((prev) => (prev.agreed ? { ...prev, agreed: '' } : prev))
  }

  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextErrors = validateSignupForm(form, { agreed })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setPasswordTouched(true)
      return
    }

    const email = form.email.trim()

    setLoading(true)
    try {
      
      const challenge = await registerCustomer({
        fullName: form.fullName.trim(),
        email,
        phone: form.phone.trim(),
        password: form.password,
      })
      toast.success(`We sent a 6-digit code to ${email}.`)
      navigate('/signup/verify', {
        replace: true,
        state: { ...challenge, email, role: 'CUSTOMER' },
      })
    } catch (err) {
      
      const { field, message } = parseSignupError(err)
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: message }))
      }
      toast.error(message || 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordToggle = (
    <button
      type="button"
      className="rounded-field p-1.5 text-ink-faint transition hover:bg-surface-sunken hover:text-ink-body focus-ring"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      <EyeIcon open={showPassword} className="h-5 w-5" />
    </button>
  )

  return (
    <AuthLayout
      width="max-w-lg"
      title="Create your account"
      subtitle="Post tasks and get matched with verified workers in minutes."
      topBar={
        <div className="flex items-center justify-between gap-3">
          <BackLink to="/signup" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <TaskIcon />
            Customer Account
          </span>
        </div>
      }
      footer={<AuthFooterLink prompt="Already have an account?" to="/login" label="Log in" />}
    >
      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <Field id="fullName" label="Full Name" error={errors.fullName}>
          {(field) => (
            <Input
              {...field}
              type="text"
              value={form.fullName}
              onChange={update('fullName')}
              placeholder="Ram Bahadur"
              autoComplete="name"
              maxLength={150}
              required
              leadingIcon={<UserIcon className="h-5 w-5" />}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email" error={errors.email}>
            {(field) => (
              <Input
                {...field}
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={255}
                required
                leadingIcon={<MailIcon className="h-5 w-5" />}
              />
            )}
          </Field>

          <Field id="phone" label="Phone Number" error={errors.phone}>
            {(field) => (
              <Input
                {...field}
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={update('phone')}
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                maxLength={10}
                required
                leadingIcon={<PhoneIcon className="h-5 w-5" />}
              />
            )}
          </Field>
        </div>

        <div>
          <Field id="password" label="Password" error={errors.password}>
            {(field) => (
              <Input
                {...field}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                onFocus={() => setPasswordTouched(true)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                leadingIcon={<LockIcon className="h-5 w-5" />}
                trailing={passwordToggle}
              />
            )}
          </Field>
          <PasswordChecklist
            value={form.password}
            accent="brand"
            show={passwordTouched || form.password.length > 0}
          />
        </div>

        <Field
          id="confirmPassword"
          label="Confirm Password"
          error={errors.confirmPassword}
        >
          {(field) => (
            <>
              <Input
                {...field}
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Repeat your password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                leadingIcon={<LockIcon className="h-5 w-5" />}
                trailing={
                  passwordsMatch ? (
                    <span className="pr-2 text-success" aria-hidden="true">
                      <CheckIcon className="h-5 w-5" />
                    </span>
                  ) : null
                }
            />
            

              {!errors.confirmPassword && passwordsMismatch && (
                <p className="mt-1.5 text-xs font-medium text-warning-ink">
                  Passwords don&apos;t match yet.
                </p>
              )}
            </>
          )}
        </Field>

        <div className="pt-1">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={toggleAgreed}
              required
              aria-invalid={Boolean(errors.agreed)}
              aria-describedby={errors.agreed ? 'agreed-error' : undefined}
              className="mt-1 h-4 w-4 shrink-0 rounded border-line-strong text-brand focus:ring-brand/30"
            />
            <span className="text-sm leading-relaxed text-ink-body">
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-brand hover:text-brand-dark">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-medium text-brand hover:text-brand-dark">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.agreed && (
            <p id="agreed-error" className="mt-1.5 text-sm font-medium text-danger">
              {errors.agreed}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          shape="rounded"
          fullWidth
          loading={loading}
          iconRight={<ArrowRightIcon className="h-5 w-5" />}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      
      <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
    </AuthLayout>
  )
}

export default UserSignup
