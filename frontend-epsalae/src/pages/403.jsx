import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react'

export default function Forbidden() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-orange-50 px-4">
      <div className="text-center max-w-lg">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-rose-100">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>

        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
          403
        </h1>

        <h2 className="mt-3 text-2xl font-bold text-gray-800 mb-3">
          Access Denied
        </h2>
        <p className="text-gray-600 mb-8">
          You don't have permission to view this page.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Home size={20} />
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  )
}
