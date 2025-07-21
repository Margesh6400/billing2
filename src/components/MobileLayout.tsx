import { Home, FileText, RotateCcw, Package, Calculator, Menu } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'

const navItems = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Issue', icon: FileText, path: '/issue' },
  { name: 'Return', icon: RotateCcw, path: '/return' },
  { name: 'Stock', icon: Package, path: '/stock' },
  { name: 'Billing', icon: Calculator, path: '/billing' }
]

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-blue-900">NO WERE TECH</h1>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content with top and bottom padding for header and nav */}
      <main className="flex-1 w-full max-w-screen-sm px-4 pt-14 pb-16 mx-auto overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-[100]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full min-w-[48px] ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="mt-1 text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
