import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LogIn, UserPlus, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Basic validation
    if (!email.trim()) {
      setError('કૃપા કરીને તમારું ઇમેઇલ એડ્રેસ દાખલ કરો')
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError('કૃપા કરીને તમારો પાસવર્ડ દાખલ કરો')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('પાસવર્ડ ઓછામાં ઓછા 6 અક્ષરોનો હોવો જોઈએ')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('પાસવર્ડ અને કન્ફર્મ પાસવર્ડ મેળ ખાતા નથી')
        setLoading(false)
        return
      }
    }

    try {
      const { error } = mode === 'signup' 
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) {
        // Provide more user-friendly error messages in Gujarati
        if (error.message.includes('Invalid login credentials')) {
          setError(mode === 'signin' 
            ? 'ખોટું ઇમેઇલ અથવા પાસવર્ડ. કૃપા કરીને તપાસો અને ફરી પ્રયત્ન કરો.'
            : 'એકાઉન્ટ બનાવવામાં અસમર્થ. કૃપા કરીને ફરી પ્રયત્ન કરો.'
          )
        } else if (error.message.includes('Email not confirmed')) {
          setError('કૃપા કરીને તમારું ઇમેઇલ તપાસો અને સાઇન ઇન કરતા પહેલા કન્ફર્મેશન લિંક પર ક્લિક કરો.')
        } else if (error.message.includes('User already registered')) {
          setError('આ ઇમેઇલ સાથે એકાઉન્ટ પહેલેથી અસ્તિત્વમાં છે. કૃપા કરીને સાઇન ઇન કરો.')
        } else {
          setError(error.message)
        }
      } else if (mode === 'signup') {
        setSuccess('એકાઉન્ટ સફળતાપૂર્વક બનાવવામાં આવ્યું! હવે તમે સાઇન ઇન કરી શકો છો.')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setTimeout(() => onModeChange('signin'), 2000)
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError('કનેક્શન એરર. કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન તપાસો અને ફરી પ્રયત્ન કરો.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 flex items-center justify-center p-4 font-gujarati">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md border border-gray-100">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="text-white font-bold text-xl">NT</div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            NO WERE TECH
          </h1>
          <p className="text-blue-600 font-medium mb-4 text-sm sm:text-base">સેન્ટરિંગ પ્લેટ્સ ભાડા સિસ્ટમ</p>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            {mode === 'signup' ? 'નવું એકાઉન્ટ બનાવો' : 'સ્વાગત છે'}
          </h2>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {mode === 'signup' 
              ? 'તમારા ભાડા વ્યવસાયનું સંચાલન શરૂ કરવા માટે સાઇન અપ કરો' 
              : 'તમારા ડેશબોર્ડને ઍક્સેસ કરવા માટે સાઇન ઇન કરો'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              ઇમેઇલ એડ્રેસ
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
              placeholder="તમારું ઇમેઇલ દાખલ કરો"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              પાસવર્ડ
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="તમારો પાસવર્ડ દાખલ કરો"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">
                પાસવર્ડ ઓછામાં ઓછા 6 અક્ષરોનો હોવો જોઈએ
              </p>
            )}
          </div>

          {/* Confirm Password Field - Only for Sign Up */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                પાસવર્ડ કન્ફર્મ કરો
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                  placeholder="પાસવર્ડ ફરીથી દાખલ કરો"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-5 h-5" />
                એકાઉન્ટ બનાવો
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                સાઇન ઇન કરો
              </>
            )}
          </button>
        </form>

        {/* Mode Switch */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              onModeChange(mode === 'signup' ? 'signin' : 'signup')
              setError('')
              setSuccess('')
              setEmail('')
              setPassword('')
              setConfirmPassword('')
            }}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            {mode === 'signup' ? (
              <>
                <ArrowLeft className="w-4 h-4" />
                પહેલેથી એકાઉન્ટ છે? સાઇન ઇન કરો
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                એકાઉન્ટ નથી? સાઇન અપ કરો
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            સુરક્ષિત અને વિશ્વસનીય પ્લેટ ભાડા વ્યવસ્થાપન
          </p>
        </div>
      </div>
    </div>
  )
}