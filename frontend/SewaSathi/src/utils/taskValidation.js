// Post-a-task validation. Kept separate from utils/validation.js, which is deliberately
// scoped to signup/auth. The rules here mirror what CreateTaskRequest + TaskService enforce
// on the server, so a form that passes should never come back with a 400.

export const SERVICE_CATEGORIES = [
  'Furniture Assembly',
  'Mounting',
  'Cleaning',
  'Moving Help',
  'Gardening',
  'Delivery Help',
  'Painting',
  'Electrician',
  'Plumbing',
  'Outdoor Help',
  'Heavy Lifting',
  'Home Repair',
  'Office Support',
  'Other',
]

export const TIME_PREFERENCES = ['Flexible', 'Morning', 'Afternoon', 'Evening']

// Lengths are one step tighter than the DB columns on Task (title 150, category 60,
// description 2000, city 60, location 200) so a trimmed value can never overflow.
export const MIN_TITLE = 5
export const MAX_TITLE = 150
export const MIN_DESCRIPTION = 20
export const MAX_DESCRIPTION = 2000
export const MAX_CITY = 60
export const MAX_LOCATION = 100

// The budget column is precision 10 / scale 2, so anything at or above 100,000,000 - or with
// a third decimal - is a database error rather than a validation one. These ceilings keep the
// value well inside that, and the floors stop NPR 1 tasks.
export const MIN_BUDGET = 100
export const MAX_BUDGET = 1_000_000
export const MIN_HOURLY_RATE = 50
export const MAX_HOURLY_RATE = 100_000

// How far ahead a due date may be set.
export const MAX_DUE_DATE_YEARS = 1

// Fields the form renders an inline error slot for - passed to parseFieldError so a server
// message can only ever be pinned under an input the user can actually act on.
export const TASK_ERROR_FIELDS = [
  'title',
  'category',
  'description',
  'city',
  'location',
  'budget',
  'hourlyRate',
  'dueDate',
  'timePreference',
]

// Built from local date parts rather than toISOString(), which converts to UTC first: in Nepal
// (UTC+05:45) that returns yesterday's date at any local time before 05:45, which would let the
// picker offer - and validate() accept - a date that is already in the past.
const toISODate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const todayISO = () => toISODate(new Date())

export const maxDueDateISO = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + MAX_DUE_DATE_YEARS)
  return toISODate(date)
}

const formatAmount = (value) => value.toLocaleString('en-US')

/**
 * Parses a money field. Deliberately stricter than Number(): the pattern rejects "-500",
 * "1e5" (which Number happily turns into 100000), "1.999" (the column only keeps two
 * decimals) and "abc" through the same path, so every bad input gets the same message.
 */
export const parseAmount = (raw = '') => {
  const trimmed = String(raw).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, value: null }
  }
  return { ok: true, value: Number(trimmed) }
}

const validateAmount = (raw, { min, max, label }) => {
  const { ok, value } = parseAmount(raw)
  if (!ok) {
    return `Enter a valid ${label} in numbers only (up to 2 decimal places).`
  }
  if (value < min) {
    return `${label[0].toUpperCase()}${label.slice(1)} must be at least NPR ${formatAmount(min)}.`
  }
  if (value > max) {
    return `${label[0].toUpperCase()}${label.slice(1)} cannot be more than NPR ${formatAmount(max)}.`
  }
  return null
}

/**
 * Returns an errors object keyed by field name - same shape validateSignupForm returns, so the
 * page keeps its existing `errors` state contract. Empty object means the form is valid.
 */
export const validateTaskForm = (form) => {
  const errors = {}

  const title = form.title.trim()
  if (!title) {
    errors.title = 'Please enter a task title.'
  } else if (title.length < MIN_TITLE) {
    errors.title = `Title must be at least ${MIN_TITLE} characters.`
  } else if (title.length > MAX_TITLE) {
    errors.title = `Title cannot be longer than ${MAX_TITLE} characters.`
  }

  if (!form.category) {
    errors.category = 'Please select a service category.'
  } else if (!SERVICE_CATEGORIES.includes(form.category)) {
    errors.category = 'Please select a category from the list.'
  }

  const description = form.description.trim()
  if (!description) {
    errors.description = 'Please describe your task.'
  } else if (description.length < MIN_DESCRIPTION) {
    errors.description = `Please add a bit more detail - at least ${MIN_DESCRIPTION} characters.`
  } else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Description cannot be longer than ${MAX_DESCRIPTION} characters.`
  }

  const city = form.city.trim()
  if (!city) {
    errors.city = 'Please enter a city.'
  } else if (city.length > MAX_CITY) {
    errors.city = `City cannot be longer than ${MAX_CITY} characters.`
  }

  const location = form.location.trim()
  if (!location) {
    errors.location = 'Please enter a specific location.'
  } else if (location.length > MAX_LOCATION) {
    errors.location = `Location cannot be longer than ${MAX_LOCATION} characters.`
  }

  if (!form.budget.trim()) {
    errors.budget = 'Please enter a budget.'
  } else {
    const message = validateAmount(form.budget, {
      min: MIN_BUDGET,
      max: MAX_BUDGET,
      label: 'budget',
    })
    if (message) errors.budget = message
  }

  // Optional, but once something is typed it has to be usable - Number("abc") is NaN, which
  // used to serialise to null and drop the value without telling anyone.
  if (form.hourlyRate.trim()) {
    const message = validateAmount(form.hourlyRate, {
      min: MIN_HOURLY_RATE,
      max: MAX_HOURLY_RATE,
      label: 'hourly rate',
    })
    if (message) {
      errors.hourlyRate = message
    } else if (!errors.budget) {
      const rate = parseAmount(form.hourlyRate).value
      const budget = parseAmount(form.budget).value
      if (budget !== null && rate > budget) {
        errors.hourlyRate = 'Hourly rate cannot be more than the total budget.'
      }
    }
  }

  // Optional. Comparing the raw YYYY-MM-DD strings is safe - that format sorts
  // lexicographically - and avoids parsing them back into timezone-sensitive Dates.
  if (form.dueDate) {
    if (form.dueDate < todayISO()) {
      errors.dueDate = 'Due date cannot be in the past.'
    } else if (form.dueDate > maxDueDateISO()) {
      errors.dueDate = `Due date cannot be more than ${MAX_DUE_DATE_YEARS} year ahead.`
    }
  }

  if (!TIME_PREFERENCES.includes(form.timePreference)) {
    errors.timePreference = 'Please choose a time preference.'
  }

  return errors
}
