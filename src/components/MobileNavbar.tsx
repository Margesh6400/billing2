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
  { key: 'challans', label: 'ચલણ બૂક', icon: Receipt, path: '/challans' },
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
      {/* TOP BAR - Blue Theme Gradient */}
      <header className="fixed top-0 left-0 right-0 z-50 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-noto-gujarati">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-blue-500/20 active:bg-blue-500/30 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center transform hover:scale-105"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {/* App Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold leading-tight text-white">
              NO WERE TECH
            </h1>
            <p className="text-xs text-blue-100">સેન્ટરિંગ પ્લેટ્સ ભાડા</p>
          </div>

          {/* User Avatar - Enhanced Blue Theme */}
          <div className="flex items-center justify-center w-10 h-10 border-2 border-blue-300 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500">
            <span className="text-sm font-semibold text-white">
              {getUserInitials()}
            </span>
          </div>
        </div>
      </header>

      {/* HAMBURGER MENU OVERLAY - Enhanced Blue Theme */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] font-noto-gujarati">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-blue-900/30 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col border-r-4 border-blue-500">
            {/* Menu Header - Blue Theme */}
            <div className="flex items-center justify-between p-4 text-white shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-lg font-semibold">મેનુ</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-blue-500/20 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center transform hover:scale-105"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User Info Section - Blue Theme */}
            <div className="flex-shrink-0 p-4 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                {/* User Avatar - Enhanced */}
                <div className="flex items-center justify-center w-12 h-12 text-lg font-semibold text-white border-2 border-blue-300 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                  {getUserInitials()}
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-900 truncate">
                    {user?.user_metadata?.name || 'વપરાશકર્તા'}
                  </p>
                  
                  {/* Email Toggle */}
                  <button
                    onClick={() => setShowUserEmail(!showUserEmail)}
                    className="block max-w-full mt-1 text-xs font-medium text-left text-blue-600 truncate transition-colors hover:text-blue-800"
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

            {/* Navigation Items - Enhanced Blue Theme */}
            <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`flex items-center space-x-4 px-6 py-3 text-sm font-medium transition-all duration-200 min-h-[52px] mx-2 my-1 rounded-xl ${
                    isActivePath(item.path)
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105 border-l-4 border-blue-300'
                      : 'text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:shadow-md hover:scale-102'
                  }`}
                >
                  <item.icon className="flex-shrink-0 w-5 h-5" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Settings & Sign Out - Blue Theme */}
            <div className="flex-shrink-0 p-4 space-y-2 border-t-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <button
                onClick={() => {/* Add settings logic */}}
                className="w-full flex items-center space-x-4 px-4 py-3 text-blue-700 hover:bg-blue-100 rounded-xl transition-all duration-200 min-h-[48px] font-medium hover:shadow-md transform hover:scale-105"
              >
                <Settings className="w-5 h-5" />
                સેટિંગ્સ
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-4 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 min-h-[48px] font-medium hover:shadow-md transform hover:scale-105 border border-red-200"
              >
                <LogOut className="w-5 h-5" />
                સાઇન આઉટ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TAB BAR - Enhanced Blue Theme */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-blue-100 shadow-xl font-noto-gujarati">
        <div className="grid h-16 grid-cols-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 min-h-[64px] relative ${
                isActivePath(item.path)
                  ? 'text-blue-600 bg-gradient-to-t from-blue-100 to-blue-50 scale-105 shadow-lg'
                  : 'text-blue-500 hover:text-blue-700 hover:bg-blue-25 hover:scale-102'
              }`}
            >
              {/* Active indicator */}
              {isActivePath(item.path) && (
                <div className="absolute top-0 w-8 h-1 transform -translate-x-1/2 rounded-b-full left-1/2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              )}
              
              <item.icon className={`w-5 h-5 ${isActivePath(item.path) ? 'animate-pulse' : ''}`} />
              <span className={`text-xs font-medium truncate px-1 ${
                isActivePath(item.path) ? 'font-bold' : ''
              }`}>
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
