import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(5)
  const [isHovering, setIsHovering] = useState(false)

  // Auto redirect countdown
  useEffect(() => {
    if (isHovering) return // Pause countdown when hovering on buttons
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate, isHovering])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-green-50 px-4">
      <div className="text-center max-w-lg">
        {/* Animated 404 */}
        <div className="relative mb-8">
          {/* Floating shopping bags animation */}
          <div className="absolute -top-10 left-1/4 animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }}>
            <ShoppingBag className="w-8 h-8 text-teal-300" />
          </div>
          <div className="absolute -top-5 right-1/4 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>
            <ShoppingBag className="w-6 h-6 text-green-300" />
          </div>
          <div className="absolute top-0 right-1/3 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }}>
            <ShoppingBag className="w-5 h-5 text-teal-200" />
          </div>
          
          {/* 404 Number with animation */}
          <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-green-500 animate-pulse">
            404
          </h1>
          
          {/* Search icon in the 0 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Search className="w-12 h-12 text-white opacity-50 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Oops! Page Not Found
        </h2>
        <p className="text-gray-600 mb-2">
          Looks like you've wandered into unknown territory.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Countdown */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full text-teal-700">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold animate-pulse">
              {countdown}
            </div>
            <span className="text-sm">Redirecting to homepage...</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all transform hover:scale-105"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-green-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-green-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Home size={20} />
            Go to Homepage
          </button>
        </div>

        {/* Fun message */}
        <p className="mt-10 text-xs text-gray-400">
          💡 While you're here, why not explore our amazing products?
        </p>

        {/* Decorative elements */}
        <div className="absolute bottom-10 left-10 w-20 h-20 bg-teal-100 rounded-full opacity-50 animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-20 right-10 w-16 h-16 bg-green-100 rounded-full opacity-50 animate-ping" style={{ animationDuration: '4s' }}></div>
      </div>
    </div>
  )
}
