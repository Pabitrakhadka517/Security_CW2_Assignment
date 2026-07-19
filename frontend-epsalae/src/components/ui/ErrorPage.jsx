import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

/**
 * Shared full-page error state (404, 403, and any future 5xx page) so every
 * "you can't be here" screen shares one on-brand treatment instead of each
 * inventing its own color scheme. Redirect countdown is opt-in — a page like
 * 403 shouldn't auto-navigate the user away before they've read why access
 * was denied.
 */
export default function ErrorPage({
  code,
  icon: Icon,
  title,
  description,
  redirectSeconds = 0,
}) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(redirectSeconds)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!redirectSeconds || paused) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate, paused, redirectSeconds])

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--page-bg) px-4">
      <div className="w-full max-w-lg text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1E293B]/8 ring-4 ring-[#047857]/10 shadow-inner">
          <Icon className="h-9 w-9 text-[#047857]" aria-hidden="true" />
        </div>

        <p className="text-7xl font-black leading-none text-[#1E293B]">
          {code}
        </p>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{description}</p>

        {/* Hover anywhere in this block (countdown pill or the buttons the
            user is about to click) pauses the redirect — it must never
            navigate out from under someone mid-decision. */}
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {redirectSeconds > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1E293B]/8 px-4 py-2 text-[#1E293B]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E293B] text-xs font-bold text-white">
                {countdown}
              </span>
              <span className="text-sm font-medium">Redirecting to homepage…</span>
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E293B] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-[#0B1220]"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
