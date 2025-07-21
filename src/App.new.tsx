import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AuthForm } from './components/AuthForm'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { IssueRental } from './components/IssueRental'
import { ReturnPage } from './components/ReturnPage'
import { LedgerPage } from './components/LedgerPage'
import { StockPage } from './components/StockPage'
import { BillingPage } from './components/BillingPage'
import { ChallanManagementPage } from './components/ChallanManagementPage'
import { BillManagementPage } from './components/BillManagementPage'
import { Loader2 } from 'lucide-react'

function App() {
  const { user, loading } = useAuth()

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
    return <AuthForm mode="signin" onModeChange={() => {}} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/issue" element={<IssueRental />} />
        <Route path="/return" element={<ReturnPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/challans" element={<ChallanManagementPage />} />
        <Route path="/bills" element={<BillManagementPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App;
