import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const CODE_LENGTH = 6

function ShieldIcon() {
  return (
    <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 3l7 3v6c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.5 12.5l1.8 1.8 3.4-3.6" />
    </svg>
  )
}

/**
 * Second half of a challenged sign-in.
 *
 * Reached only via router state from the login screen — the challenge token is held in
 * memory rather than the URL, so it cannot leak through browser history, bookmarks, or a
 * Referer header.
 */
function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { verifyOtp } = useAuth()

  // Captured once: router state is cleared below so a refresh cannot replay the challenge.
  const [challenge] = useState(() => location.state ?? null)
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const inputsRef = useRef([])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  if (!challenge?.challengeToken) {
    return <Navigate to="/login" replace />
  }

  const code = digits.join('')

  const submit = async (value) => {
    if (value.length !== CODE_LENGTH || submitting) return
    setSubmitting(true)
    try {
      const sessionUser = await verifyOtp(challenge.challengeToken, value)
      toast.success('Welcome back!')
      const target =
        sessionUser.role === 'ADMIN' ? '/admin'
        : sessionUser.role === 'WORKER' ? '/worker'
        : challenge.from || '/dashboard'
      navigate(target, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'That code is incorrect or has expired.')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputsRef.current[0]?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (index, raw) => {
    const value = raw.replace(/\D/g, '')
    if (!value) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)))
      return
    }

    // Typing or pasting several digits at once fills forward from this box rather than
    // dropping everything but the first character.
    const next = [...digits]
    for (let i = 0; i < value.length && index + i < CODE_LENGTH; i += 1) {
      next[index + i] = value[i]
    }
    setDigits(next)

    const landed = Math.min(index + value.length, CODE_LENGTH - 1)
    inputsRef.current[landed]?.focus()

    const joined = next.join('')
    if (joined.length === CODE_LENGTH && !joined.includes('')) {
      submit(joined)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10">
          <ShieldIcon />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-navy">Enter your code</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {challenge.challengeReason || 'We need to confirm it is really you.'} We emailed a
          6-digit code
          {challenge.email ? (
            <>
              {' '}to <strong className="text-slate-800">{challenge.email}</strong>
            </>
          ) : null}
          . It expires in 5 minutes.
        </p>

        <form
          className="mt-7"
          onSubmit={(e) => {
            e.preventDefault()
            submit(code)
          }}
        >
          <div className="flex justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                // Index as key is correct here: the array is a fixed six positional slots
                // that are never inserted into or reordered.
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={submitting}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                className="h-14 w-full rounded-xl border border-slate-300 text-center text-2xl font-semibold text-navy outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25 disabled:bg-slate-50"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting || code.length !== CODE_LENGTH}
            className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Verify and sign in'}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Sewa Sathi will never ask for this code by phone, chat, or email. If you did not try to
          sign in, change your password instead.
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          Didn&apos;t get it?{' '}
          <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
            Sign in again to request a new code
          </Link>
        </p>
      </div>
    </div>
  )
}

export default VerifyOtp
