import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu, X, LogOut, User, Settings,
  FileText, Users, Package, Receipt, DollarSign, BarChart3, Home, RotateCcw
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAVIGATION_ITEMS = [
  { key: 'dashboard', label: 'ડેશબોર્ડ', icon: Home, path: '/' },
  { key: 'issue', label: 'ઉધાર', icon: FileText, path: '/issue' },
  { key: 'return', label: 'જમા', icon: RotateCcw, path: '/return' },
  { key: 'clients', label: 'ગ્રાહકો', icon: Users, path: '/clients' },
  { key: 'stock', label: 'સ્ટોક', icon: Package, path: '/stock' },
  { key: 'challans', label: 'ચલણ વ્યવસ્થાપન', icon: Receipt, path: '/challans' },
  { key: 'bills', label: 'બિલ', icon: DollarSign, path: '/bills' },
  { key: 'ledger', label: 'ખાતાવહી', icon: BarChart3, path: '/ledger' }
]

// Bottom navigation items - only 4 items as requested
const BOTTOM_NAV_ITEMS = [
  { key: 'dashboard', label: 'હોમ', icon: Home, path: '/' },
  { key: 'issue', label: 'ઉધાર', icon: FileText, path: '/issue' },
  { key: 'return', label: 'જમા', icon: RotateCcw, path: '/return' },
  { key: 'ledger', label: 'ખાતાવહી', icon: BarChart3, path: '/ledger' }
]

export function MobileNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserEmail, setShowUserEmail] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* TOP BAR - Always Visible */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg font-noto-gujarati">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {/* App Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-white leading-tight">
              NO WERE TECH
            </h1>
            <p className="text-xs text-blue-100">સેન્ટરિંગ પ્લેટ્સ ભાડા</p>
          </div>

          {/* User Avatar */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {getUserInitials()}
            </span>
          </div>
        </div>
      </header>

      {/* HAMBURGER MENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] font-noto-gujarati">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h2 className="text-lg font-semibold">મેનુ</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User Info Section */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {getUserInitials()}
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {user?.user_metadata?.name || 'વપરાશકર્તા'}
                  </p>
                  
                  {/* Email Toggle */}
                  <button
                    onClick={() => setShowUserEmail(!showUserEmail)}
                    className="text-xs text-gray-600 hover:text-gray-800 transition-colors mt-1 truncate max-w-full block text-left"
                  >
                    {showUserEmail ? (
                      <span className="truncate">{user?.email}</span>
                    ) : (
                      'ઇમેઇલ બતાવો'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-4">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center space-x-4 px-6 py-4 text-base font-medium transition-colors min-h-[56px] ${
                    isActivePath(item.path)
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Settings & Sign Out */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              <button
                onClick={() => {/* Add settings logic */}}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[48px]"
              >
                <Settings className="w-5 h-5" />
                સેટિંગ્સ
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-4 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[48px]"
              >
                <LogOut className="w-5 h-5" />
                સાઇન આઉટ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TAB BAR (Quick Access) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg font-noto-gujarati">
        <div className="grid grid-cols-4 h-16">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 min-h-[64px] ${
                isActivePath(item.path)
                  ? 'text-blue-600 bg-blue-50 scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActivePath(item.path) ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium truncate px-1">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Top spacing for content */}
      <div className="h-16" />
      
      {/* Bottom spacing for content */}
      <div className="h-16" />
    </>
  )
}