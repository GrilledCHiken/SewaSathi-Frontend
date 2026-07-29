import { PASSWORD_RULES, getPasswordRuleState } from '../utils/validation'

function TickIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

function DotIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="7" strokeWidth={2} />
    </svg>
  )
}

const accentText = {
  brand: 'text-brand',
  emerald: 'text-emerald-600',
}

function PasswordChecklist({ value = '', accent = 'brand', show = true }) {
  if (!show) return null

  const state = getPasswordRuleState(value)
  const metClass = accentText[accent] ?? accentText.brand

  return (
    <ul
      role="status"
      aria-live="polite"
      className="mt-2.5 grid gap-x-3 gap-y-1.5 sm:grid-cols-2"
    >
      {PASSWORD_RULES.map((rule) => {
        const met = state[rule.id]
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs transition ${
              met ? `font-medium ${metClass}` : 'text-ink-faint'
            }`}
          >
            {met ? (
              <TickIcon className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <DotIcon className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default PasswordChecklist
