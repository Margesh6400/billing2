import { MobileNavbar } from './MobileNavbar'

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-gujarati">
      {/* Mobile Navbar */}
      <MobileNavbar />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[393px] px-4 py-4 mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
