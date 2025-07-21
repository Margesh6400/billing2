import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  Menu, 
  X, 
  Home, 
  FileText, 
  RotateCcw, 
  BookOpen, 
  Package, 
  Receipt, 
  LogOut,
  User
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { signOut, user } = useAuth()

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: Home },
    { name: 'Issue Rental', id: 'issue', icon: FileText },
    { name: 'Return', id: 'return', icon: RotateCcw },
    { name: 'Ledger', id: 'ledger', icon: BookOpen },
    { name: 'Stock', id: 'stock', icon: Package },
    { name: 'Billing', id: 'billing', icon: Receipt },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  const handleNavClick = (pageId: string) => {
    onPageChange(pageId)
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navigation */}
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-blue-600">NO WERE TECH</h1>
                <p className="text-xs text-gray-500">Plate Rental System</p>
              </div>
              
              {/* Desktop Navigation Links */}
              <div className="hidden md:ml-8 md:flex md:space-x-1">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`${
                      currentPage === item.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } inline-flex items-center gap-2 px-3 py-2 border-b-2 text-sm font-medium transition-colors`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`${
                    currentPage === item.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } w-full text-left block pl-3 pr-4 py-3 border-l-4 text-base font-medium flex items-center gap-3 transition-colors`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </button>
              ))}
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left pl-3 pr-4 py-3 border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 text-base font-medium flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}