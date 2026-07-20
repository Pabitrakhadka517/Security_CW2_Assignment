// src/pages/PaymentResult.jsx
// Landing page for eSewa's post-payment redirect (see payment.controller.ts
// #esewaCallback). By the time the browser gets here, the backend has
// already independently verified the transaction with eSewa server-to-server
// — this page only ever reflects that already-settled outcome, it never
// trusts anything client-side about the payment itself.
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Package, Home, MessageCircle } from 'lucide-react'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const status = searchParams.get('status')
  const orderId = searchParams.get('orderId')
  const isPaid = status === 'paid'

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-linear-to-b from-white to-gray-50">
      <div className="w-full max-w-md p-6 sm:p-8 text-center bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className={`inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full ${isPaid ? 'bg-emerald-100' : 'bg-red-100'}`}>
          {isPaid
            ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            : <XCircle className="w-8 h-8 text-red-500" />}
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900">
          {isPaid ? 'Payment Successful!' : 'Payment Failed'}
        </h1>

        {orderId && (
          <p className="mt-2 text-sm text-gray-500">
            Order <span className="font-mono font-semibold text-gray-700">#{orderId}</span>
          </p>
        )}

        <p className="mt-3 text-sm text-gray-500">
          {isPaid
            ? 'Your eSewa payment was confirmed and your order is now being processed.'
            : "Your eSewa payment didn't go through — it may have been cancelled or declined. Reserved stock has been released and this order was cancelled."}
        </p>

        <div className="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-2">
          <button
            onClick={() => navigate('/track-order', { state: { orderId } })}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white transition bg-[#1E293B] rounded-xl hover:bg-[#0B1220]"
          >
            <Package className="w-4 h-4" /> {isPaid ? 'Track Order' : 'View Order'}
          </button>
          <button
            onClick={() => navigate(isPaid ? '/products' : '/cart')}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white transition bg-[#047857] rounded-xl hover:bg-[#065f46]"
          >
            <Home className="w-4 h-4" /> {isPaid ? 'Shop More' : 'Back to Cart'}
          </button>
        </div>

        {!isPaid && (
          <a href="https://wa.me/9779857089898" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            <MessageCircle className="w-4 h-4" /> Need help? Contact us on WhatsApp
          </a>
        )}

        {!orderId && (
          <p className="mt-5 text-xs text-gray-400">
            Lost? Head back to <Link to="/" className="underline hover:text-gray-600">the homepage</Link>.
          </p>
        )}
      </div>
    </div>
  )
}
