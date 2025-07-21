import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { Receipt, Search, User, Calendar, DollarSign, Download, Plus } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']
type Bill = Database['public']['Tables']['bills']['Row'] & {
  clients: Client
}

const PLATE_SIZES = [
  '2 X 3',
  '21 X 3',
  '18 X 3',
  '15 X 3',
  '12 X 3',
  '9 X 3',
  'પતરા',
  '2 X 2',
  '2 ફુટ'
]

export function BillingPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBill, setNewBill] = useState({
    period_start: '',
    period_end: '',
    total_amount: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [clientsResult, billsResult] = await Promise.all([
        supabase.from('clients').select('*').order('id'),
        supabase.from('bills').select(`
          *,
          clients (*)
        `).order('created_at', { ascending: false })
      ])

      if (clientsResult.error) throw clientsResult.error
      if (billsResult.error) throw billsResult.error

      setClients(clientsResult.data || [])
      setBills(billsResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) return

    try {
      const { error } = await supabase
        .from('bills')
        .insert([{
          client_id: selectedClient.id,
          period_start: newBill.period_start,
          period_end: newBill.period_end,
          total_amount: newBill.total_amount,
          payment_status: 'pending'
        }])

      if (error) throw error

      setNewBill({ period_start: '', period_end: '', total_amount: 0 })
      setShowCreateForm(false)
      setSelectedClient(null)
      await fetchData()
      alert('Bill created successfully!')
    } catch (error) {
      console.error('Error creating bill:', error)
      alert('Error creating bill. Please try again.')
    }
  }

  const updatePaymentStatus = async (billId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ payment_status: status })
        .eq('id', billId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Error updating payment status.')
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredBills = bills.filter(bill =>
    bill.clients.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.clients.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
        <p className="text-gray-600">Manage client bills and payments</p>
      </div>

      {/* Create New Bill */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Create New Bill</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center"
          >
            <Plus className="w-4 h-4" />
            New Bill
          </button>
        </div>

        {showCreateForm && (
          <div className="space-y-6">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="Search clients..."
                />
              </div>
              
              {searchTerm && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client)
                        setSearchTerm('')
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">ID: {client.id} | {client.site}</p>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedClient && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-900">{selectedClient.name}</p>
                  <p className="text-sm text-blue-700">ID: {selectedClient.id} | {selectedClient.site}</p>
                </div>
              )}
            </div>

            {/* Bill Form */}
            {selectedClient && (
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period Start Date
                    </label>
                    <input
                      type="date"
                      value={newBill.period_start}
                      onChange={(e) => setNewBill({ ...newBill, period_start: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period End Date
                    </label>
                    <input
                      type="date"
                      value={newBill.period_end}
                      onChange={(e) => setNewBill({ ...newBill, period_end: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBill.total_amount}
                    onChange={(e) => setNewBill({ ...newBill, total_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
                  >
                    Create Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setSelectedClient(null)
                      setSearchTerm('')
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Bills List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">All Bills</h2>
        
        <div className="space-y-4">
          {filteredBills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No bills found</p>
            </div>
          ) : (
            filteredBills.map((bill) => (
              <div key={bill.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{bill.clients.name}</h3>
                      <p className="text-sm text-gray-600">ID: {bill.clients.id}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(bill.period_start).toLocaleDateString()} - {new Date(bill.period_end).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <DollarSign className="w-4 h-4" />
                          ₹{bill.total_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <select
                      value={bill.payment_status}
                      onChange={(e) => updatePaymentStatus(bill.id, e.target.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                        bill.payment_status === 'paid' 
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : bill.payment_status === 'overdue'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                    
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}