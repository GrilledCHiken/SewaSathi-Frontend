// Shared form-validation helpers. Kept framework-free so the signup pages (and later
// Login / ResetPassword) all check the same rules the backend enforces.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Nepali mobile numbers: 10 digits starting with 97 or 98.
export const NEPAL_MOBILE_REGEX = /^9[78]\d{8}$/

export const MAX_FULL_NAME_LENGTH = 150

// Single source of truth for the password policy - drives both the live checklist
// and the on-submit check, so the two can never disagree.
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter (a-z)', test: (value) => /[a-z]/.test(value) },
  { id: 'digit', label: 'One number (0-9)', test: (value) => /\d/.test(value) },
  { id: 'special', label: 'One special character (!@#$…)', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

export const getPasswordRuleState = (value = '') =>
  PASSWORD_RULES.reduce((state, rule) => {
    state[rule.id] = rule.test(value)
    return state
  }, {})

export const isPasswordStrong = (value = '') => PASSWORD_RULES.every((rule) => rule.test(value))

// Strips everything but digits and caps the length, so the phone field can only ever
// hold something the pattern check could accept. A leading 977 is only treated as the
// country code when there are too many digits for it to be the number itself - 9771234567
// is a valid 10-digit number in its own right.
export const sanitizePhone = (value = '') => {
  let digits = value.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('977')) {
    digits = digits.slice(3)
  }
  return digits.slice(0, 10)
}

// Fields the signup forms render an inline error slot for. A server message is only
// attached to the field when it names one of these, so an unrelated error can never
// leave a message pinned under an input the user cannot act on.
const SERVER_ERROR_FIELDS = ['fullName', 'email', 'phone', 'password']

/**
 * Turns a failed signup response into { field, message } so the error lands under the
 * input that caused it rather than only in a toast.
 *
 * The backend's bean-validation handler formats its 400 body as "email: <message>" -
 * useful, but the raw field name should not be shown to a user. A 409 has no prefix and
 * is always about the email address, since that is the only unique column.
 */
export const parseSignupError = (err) => {
  const raw = err?.response?.data?.message
  if (!raw) {
    return { field: null, message: null }
  }

  if (err.response?.status === 409) {
    return { field: 'email', message: raw }
  }

  const match = /^(\w+):\s*(.+)$/s.exec(raw)
  if (match && SERVER_ERROR_FIELDS.includes(match[1])) {
    return { field: match[1], message: match[2] }
  }

  return { field: null, message: raw }
}

export const validateSignupForm = (form, { agreed } = {}) => {
  const errors = {}

  const fullName = form.fullName.trim()
  if (!fullName) {
    errors.fullName = 'Please enter your full name.'
  } else if (fullName.length < 2) {
    errors.fullName = 'Please enter your full name.'
  } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
    errors.fullName = `Full name cannot be longer than ${MAX_FULL_NAME_LENGTH} characters.`
  }

  const email = form.email.trim()
  if (!email) {
    errors.email = 'Please enter your email.'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please enter a valid email address.'
  }

  const phone = form.phone.trim()
  if (!phone) {
    errors.phone = 'Please enter your phone number.'
  } else if (!NEPAL_MOBILE_REGEX.test(phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number starting with 97 or 98.'
  }

  if (!form.password) {
    errors.password = 'Please create a password.'
  } else if (!isPasswordStrong(form.password)) {
    errors.password = 'Password does not meet all the requirements below.'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  if (!agreed) {
    errors.agreed = 'Please accept the Terms of Service to continue.'
  }

  return errors
}
