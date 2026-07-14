import { Check, X } from 'lucide-react'

const RULES = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

// Only surfaces the requirements still unmet, so the checklist shrinks as the
// user types instead of duplicating the strength meter above it.
export default function PasswordRules({ password }) {
  const value = password || ''
  if (!value) return null

  const unmet = RULES.filter(({ test }) => !test(value))

  if (unmet.length === 0) {
    return (
      <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 animate-fade-in">
        <Check size={13} className="shrink-0" />
        <span>All password requirements met</span>
      </p>
    )
  }

  return (
    <ul className="mt-2 space-y-1" aria-label="Remaining password requirements">
      {unmet.map(({ label }) => (
        <li key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
          <X size={13} className="shrink-0 text-red-400" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
