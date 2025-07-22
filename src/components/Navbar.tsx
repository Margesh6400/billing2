import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home, FileText, Users, Package, Receipt, DollarSign, 
  Menu, X, LogOut, ChevronRight
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/', color: 'bg-blue-500' },
  { id: 'issue', label: 'Issue', icon: FileText, path: '/issue', color: 'bg-green-500' },
  { id: 'clients', label: 'Clients', icon: Users, path: '/clients', color: 'bg-purple-500' },
  { id: 'stock', label: 'Stock', icon: Package, path: '/stock', color: 'bg-orange-500' },
  { id: 'challans', label: 'Challans', icon: Receipt, path: '/challans', color: 'bg-indigo-500' },
  { id: 'bills', label: 'Bills', icon: DollarSign, path: '/bills', color: 'bg-red-500' },
]

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { signOut } = useAuth()
  const location = useLocation()

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* DESKTOP NAVIGATION - Modern Grid Layout */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden bg-white border-b shadow-sm lg:block">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-black text-gray-900">
                <span className="text-blue-600">Plate</span>Rental
              </h1>
              
              {/* Navigation Pills */}
              <div className="flex items-center space-x-2">
                {NAVIGATION_ITEMS.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`
                      group relative flex items-center space-x-2 px-4 py-2 rounded-full
                      transition-all duration-200 hover:scale-105
                      ${isActivePath(item.path)
                        ? `${item.color} text-white shadow-lg`
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="flex items-center px-4 py-2 space-x-2 text-gray-600 transition-colors rounded-full hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm lg:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 transition-colors rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          
          <h1 className="text-lg font-black">
            <span className="text-blue-600">Plate</span>Rental
          </h1>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* MOBILE SLIDE-OUT MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 border-b h-14 bg-gray-50 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-200"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Navigation Cards */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center justify-between p-4 rounded-xl
                    transition-all duration-200 hover:scale-[1.02]
                    ${isActivePath(item.path)
                      ? `${item.color} text-white shadow-lg`
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      p-2 rounded-lg
                      ${isActivePath(item.path) ? 'bg-white/20' : 'bg-white'}
                    `}>
                      <item.icon className={`h-5 w-5 ${isActivePath(item.path) ? 'text-white' : item.color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="text-base font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50" />
                </Link>
              ))}
              
              {/* Sign Out Card */}
              <button
                onClick={signOut}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-base font-medium">Sign Out</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-50" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg lg:hidden">
        <div className="grid h-16 grid-cols-6">
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`
                flex flex-col items-center justify-center space-y-1
                transition-all duration-200
                ${isActivePath(item.path)
                  ? 'text-blue-600 scale-110'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="px-1 text-xs font-medium truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Spacer */}
      <div className="hidden h-16 lg:block" />
      
      {/* Mobile Bottom Spacer */}
      <div className="h-16 lg:hidden" />
    </>
  )
}
