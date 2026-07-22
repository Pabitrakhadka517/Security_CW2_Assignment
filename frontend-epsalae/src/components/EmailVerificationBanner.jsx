import { useState } from 'react'
import { Mail, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { authEndpoints } from '@/components/api/userapi'
import { useEmailVerificationStatus } from '@/hooks/useEmailVerificationStatus'

/**
 * Site-wide reminder (not a login block — see backend emailVerification.service
 * for why verification stays informational) shown on every page until the
 * account is verified or the banner is dismissed for this browser session.
 */
export default function EmailVerificationBanner() {
  const { checking, verified } = useEmailVerificationStatus()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('emailVerifyBannerDismissed') === '1')
  const [sending, setSending] = useState(false)

  if (checking || verified || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem('emailVerifyBannerDismissed', '1')
    setDismissed(true)
  }

  const handleResend = async () => {
    setSending(true)
    try {
      const res = await authEndpoints.resendVerification()
      toast.success(res.data?.message || 'Verification email sent')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send verification email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="sticky top-0 z-90 flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white"
    >
      <Mail className="h-4 w-4 shrink-0" />
      <span>Please verify your email address to secure your account.</span>
      <button
        onClick={handleResend}
        disabled={sending}
        className="shrink-0 underline underline-offset-2 hover:no-underline disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Resend verification email'}
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 hover:bg-white/20 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
