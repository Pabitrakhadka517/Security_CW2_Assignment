import { Check, X } from 'lucide-react'

const RULES = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function PasswordRules({ password }) {
  const value = password || ''

  return (
    <ul className="mt-2 space-y-1">
      {RULES.map(({ label, test }) => {
        const passed = test(value)
        return (
          <li key={label} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
            {passed ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0" />}
            <span>{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
