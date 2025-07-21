import { Home, FileText, RotateCcw, Package, Calculator, Menu, Users, Receipt, BookOpen, Globe } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation, T } from '../contexts/LanguageContext'

const navItems = [
  { name: 'Dashboard', icon: Home, path: '/', color: 'bg-blue-500' },
  { name: 'Issue', icon: FileText, path: '/issue', color: 'bg-green-500' },
  { name: 'Return', icon: RotateCcw, path: '/return', color: 'bg-orange-500' },
  { name: 'Clients', icon: Users, path: '/clients', color: 'bg-purple-500' },
  { name: 'Stock', icon: Package, path: '/stock', color: 'bg-indigo-500' },
  { name: 'Challans', icon: Receipt, path: '/challans', color: 'bg-pink-500' },
  { name: 'Bills', icon: Calculator, path: '/bills', color: 'bg-red-500' },
  { name: 'Ledger', icon: BookOpen, path: '/ledger', color: 'bg-yellow-500' }
]

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { language, setLanguage } = useTranslation()

  const toggleLanguage = () => {
    setLanguage(language === 'gu' ? 'en' : 'gu')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-gujarati">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-white">
            <T>NO WERE TECH</T>
          </h1>
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">{language === 'gu' ? 'ગુ' : 'EN'}</span>
          </button>
        </div>
      </header>

      {/* Main Content with top and bottom padding for header and nav */}
      <main className="flex-1 w-full max-w-[393px] px-4 pt-16 pb-20 mx-auto overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-[100]">
        <div className="grid grid-cols-4 h-16 max-w-[393px] mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center h-full min-w-[44px] transition-all duration-200 ${
                  isActive 
                    ? 'text-blue-600 bg-blue-50 scale-105' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="mt-0.5 text-xs font-medium">
                  <T>{item.name}</T>
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
