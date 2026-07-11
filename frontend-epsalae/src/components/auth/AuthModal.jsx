import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authEndpoints, profileEndpoints } from '../api/userapi'
import { useUserAuth } from '@/components/store/authstore'
import { useCart } from '@/store/cartstore'

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginUser } = useUserAuth()
  const { cart } = useCart()
  const navigate = useNavigate()

  if (!open) return null

  const doLogin = async () => {
    setLoading(true)
    try {
      const res = await authEndpoints.login({ email, password })
      // Backend now returns: { success, message, data: { token, accessToken, user, needsOnboarding } }
      const data = res.data?.data || res.data || {}
      const token = data.token || data.accessToken || res.data?.accessToken || res.data?.token
      const user = data.user || res.data?.user
      const needsOnboarding = data.needsOnboarding ?? res.data?.needsOnboarding

      if (!token) {
        toast.error(res.data?.message || 'Login failed')
        return
      }

      loginUser(token, user)

      // Merge guest cart on backend (best-effort)
      try {
        if (Array.isArray(cart) && cart.length) {
          await profileEndpoints.cart.merge({ items: cart })
        }
      } catch (e) { /* silent */ }

      toast.success('Login successful')
      onSuccess && onSuccess({ needsOnboarding })
      if (needsOnboarding) {
        navigate('/profile-setup')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login error')
    } finally {
      setLoading(false)
    }
  }

  const doRegister = async () => {
    setLoading(true)
    try {
      await authEndpoints.register({ name, email, password })
      toast.success('Registration successful. Please login.')
      setMode('login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md p-6 bg-white rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{mode === 'login' ? 'Sign in' : 'Create account'}</h3>
          <button onClick={onClose} className="text-gray-500" disabled={loading}>Close</button>
        </div>
        {mode === 'login' ? (
          <div className="space-y-4">
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded" />
            <button onClick={doLogin} disabled={loading} className="w-full px-4 py-3 text-white bg-blue-700 rounded disabled:opacity-60">{loading ? 'Signing in…' : 'Sign In'}</button>
            <p className="text-sm text-center">Don't have an account? <button onClick={()=>setMode('register')} className="text-blue-600">Register</button></p>
          </div>
        ) : (
          <div className="space-y-4">
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" className="w-full p-3 border rounded" />
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded" />
            <button onClick={doRegister} disabled={loading} className="w-full px-4 py-3 text-white bg-green-600 rounded disabled:opacity-60">{loading ? 'Creating account…' : 'Create account'}</button>
            <p className="text-sm text-center">Already have an account? <button onClick={()=>setMode('login')} className="text-blue-600">Sign in</button></p>
          </div>
        )}
      </div>
    </div>
  )
}
