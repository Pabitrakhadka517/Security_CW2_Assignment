import { useMemo } from 'react'
import zxcvbn from 'zxcvbn'

const BAR_COLORS = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']
const LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']

export default function PasswordStrengthMeter({ password }) {
  const result = useMemo(() => (password ? zxcvbn(password) : null), [password])

  if (!password) return null

  const score = result.score
  // Spec: scores 0 and 1 both render as a single red bar; 2/3/4 render 2/3/4 bars.
  const barsToFill = score <= 1 ? 1 : score
  const suggestions = result.feedback?.suggestions || []

  return (
    <div className="mt-2">
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-colors ${i < barsToFill ? BAR_COLORS[score] : 'bg-slate-100'}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-1.5">{LABELS[score]} password</p>
      {score < 3 && suggestions.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {suggestions.map((s) => (
            <li key={s} className="text-xs text-slate-400 flex gap-1.5">
              <span aria-hidden="true">&bull;</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
