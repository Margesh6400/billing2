import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AuthForm } from './components/AuthForm'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { IssueRental } from './components/IssueRental'
import { ReturnPage } from './components/ReturnPage'
import { LedgerPage } from './components/LedgerPage'
import { StockPage } from './components/StockPage'
import { BillingPage } from './components/BillingPage'
import { Loader2 } from 'lucide-react'

function App() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm mode={authMode} onModeChange={setAuthMode} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'issue':
        return <IssueRental />
      case 'return':
        return <ReturnPage />
      case 'ledger':
        return <LedgerPage />
      case 'stock':
        return <StockPage />
      case 'billing':
        return <BillingPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App