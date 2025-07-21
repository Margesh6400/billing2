import { MobileNavbar } from './MobileNavbar'

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 font-gujarati">
      {/* Mobile Navbar */}
      <MobileNavbar />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[414px] px-4 py-4 mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
