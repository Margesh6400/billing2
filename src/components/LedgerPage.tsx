import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { 
  BookOpen, 
  Search, 
  User, 
  Package, 
  Clock, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  Phone,
  MapPin,
  Hash,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']
type Challan = Database['public']['Tables']['challans']['Row']
type ChallanItem = Database['public']['Tables']['challan_items']['Row']
type Return = Database['public']['Tables']['returns']['Row']
type ReturnLineItem = Database['public']['Tables']['return_line_items']['Row']

interface PlateBalance {
  plate_size: string
  total_borrowed: number
  total_returned: number
  outstanding: number
}

interface ActiveChallan {
  challan: Challan
  items: (ChallanItem & { outstanding: number })[]
  days_on_rent: number
}

interface CompletedChallan {
  challan: Challan
  items: ChallanItem[]
  returns: (Return & { return_line_items: ReturnLineItem[] })[]
}

interface ClientLedger {
  client: Client
  plate_balances: PlateBalance[]
  total_outstanding: number
  active_challans: ActiveChallan[]
  completed_challans: CompletedChallan[]
  has_activity: boolean
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

export function LedgerPage() {
  const [clientLedgers, setClientLedgers] = useState<ClientLedger[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const clientsPerPage = 10

  useEffect(() => {
    fetchClientLedgers()
    
    // Set up real-time subscriptions
    const challanSubscription = supabase
      .channel('challans_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challans' }, () => {
        fetchClientLedgers()
      })
      .subscribe()

    const returnsSubscription = supabase
      .channel('returns_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, () => {
        fetchClientLedgers()
      })
      .subscribe()

    return () => {
      challanSubscription.unsubscribe()
      returnsSubscription.unsubscribe()
    }
  }, [])

  const fetchClientLedgers = async () => {
    try {
      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('id')

      if (clientsError) throw clientsError

      // Fetch all challans with their items
      const { data: challans, error: challansError } = await supabase
        .from('challans')
        .select(`
          *,
          challan_items (*)
        `)
        .order('created_at', { ascending: false })

      if (challansError) throw challansError

      // Fetch all returns with their line items
      const { data: returns, error: returnsError } = await supabase
        .from('returns')
        .select(`
          *,
          return_line_items (*)
        `)
        .order('created_at', { ascending: false })

      if (returnsError) throw returnsError

      // Process data for each client
      const ledgers: ClientLedger[] = clients.map(client => {
        const clientChallans = challans.filter(c => c.client_id === client.id)
        const clientReturns = returns.filter(r => r.client_id === client.id)

        // Calculate plate balances
        const plateBalanceMap = new Map<string, PlateBalance>()

        // Process borrowed quantities
        clientChallans.forEach(challan => {
          challan.challan_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size) || {
              plate_size: item.plate_size,
              total_borrowed: 0,
              total_returned: 0,
              outstanding: 0
            }
            existing.total_borrowed += item.borrowed_quantity
            plateBalanceMap.set(item.plate_size, existing)
          })
        })

        // Process returned quantities
        clientReturns.forEach(returnRecord => {
          returnRecord.return_line_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size)
            if (existing) {
              existing.total_returned += item.returned_quantity
            }
          })
        })

        // Calculate outstanding for each plate size
        const plate_balances = Array.from(plateBalanceMap.values()).map(balance => ({
          ...balance,
          outstanding: balance.total_borrowed - balance.total_returned
        })).filter(balance => balance.total_borrowed > 0)

        const total_outstanding = plate_balances.reduce((sum, balance) => sum + balance.outstanding, 0)

        // Categorize challans as active or completed
        const active_challans: ActiveChallan[] = []
        const completed_challans: CompletedChallan[] = []

        clientChallans.forEach(challan => {
          const itemsWithOutstanding = challan.challan_items.map(item => {
            const returned = clientReturns.reduce((sum, ret) => {
              return sum + ret.return_line_items
                .filter(lineItem => lineItem.plate_size === item.plate_size)
                .reduce((itemSum, lineItem) => itemSum + lineItem.returned_quantity, 0)
            }, 0)
            
            return {
              ...item,
              outstanding: item.borrowed_quantity - Math.min(returned, item.borrowed_quantity)
            }
          })

          const hasOutstanding = itemsWithOutstanding.some(item => item.outstanding > 0)
          const days_on_rent = Math.floor((new Date().getTime() - new Date(challan.challan_date).getTime()) / (1000 * 60 * 60 * 24))

          if (hasOutstanding) {
            active_challans.push({
              challan,
              items: itemsWithOutstanding,
              days_on_rent
            })
          } else if (itemsWithOutstanding.length > 0) {
            completed_challans.push({
              challan,
              items: challan.challan_items,
              returns: clientReturns.filter(ret => 
                ret.return_line_items.some(lineItem => 
                  challan.challan_items.some(challanItem => 
                    challanItem.plate_size === lineItem.plate_size
                  )
                )
              )
            })
          }
        })

        const has_activity = clientChallans.length > 0 || clientReturns.length > 0

        return {
          client,
          plate_balances,
          total_outstanding,
          active_challans,
          completed_challans,
          has_activity
        }
      })

      setClientLedgers(ledgers)
    } catch (error) {
      console.error('Error fetching client ledgers:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients)
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId)
    } else {
      newExpanded.add(clientId)
    }
    setExpandedClients(newExpanded)
  }

  const filteredLedgers = clientLedgers.filter(ledger =>
    ledger.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.client.site.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredLedgers.length / clientsPerPage)
  const startIndex = (currentPage - 1) * clientsPerPage
  const paginatedLedgers = filteredLedgers.slice(startIndex, startIndex + clientsPerPage)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ledger (Khata Wahi)</h1>
          <p className="text-gray-600">Loading client ledgers...</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ledger (Khata Wahi)</h1>
        <p className="text-gray-600">Client rental history and outstanding balances</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Search clients by name, ID, or site..."
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clientLedgers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {clientLedgers.filter(l => l.total_outstanding > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">
                {clientLedgers.reduce((sum, l) => sum + l.total_outstanding, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Cleared Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {clientLedgers.filter(l => l.total_outstanding === 0 && l.has_activity).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Ledgers */}
      <div className="space-y-4">
        {paginatedLedgers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {searchTerm ? 'No matching clients found' : 'No clients found'}
            </p>
          </div>
        ) : (
          paginatedLedgers.map((ledger) => {
            const isExpanded = expandedClients.has(ledger.client.id)
            const statusColor = ledger.total_outstanding === 0 && ledger.has_activity ? 'green' : 
                               ledger.total_outstanding > 0 ? 'red' : 'gray'
            
            return (
              <div key={ledger.client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Client Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleClientExpansion(ledger.client.id)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        statusColor === 'green' ? 'bg-green-50' :
                        statusColor === 'red' ? 'bg-red-50' : 'bg-gray-50'
                      }`}>
                        <User className={`w-6 h-6 ${
                          statusColor === 'green' ? 'text-green-600' :
                          statusColor === 'red' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{ledger.client.name}</h3>
                        <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Hash className="w-4 h-4" />
                            {ledger.client.id}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {ledger.client.site}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {ledger.client.mobile_number}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Outstanding Plates</p>
                        <p className={`text-2xl font-bold ${
                          statusColor === 'green' ? 'text-green-600' :
                          statusColor === 'red' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {ledger.total_outstanding}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!ledger.has_activity && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            No Activity
                          </span>
                        )}
                        {ledger.total_outstanding === 0 && ledger.has_activity && (
                          <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                            All Cleared
                          </span>
                        )}
                        {ledger.total_outstanding > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                            Outstanding
                          </span>
                        )}
                        {isExpanded ? 
                          <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    {!ledger.has_activity ? (
                      <div className="text-center py-8 text-gray-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No rental activity yet</p>
                        <p className="text-sm mt-1">This client hasn't made any rentals</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Outstanding Plates by Size */}
                        {ledger.plate_balances.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-600" />
                              Outstanding Plates by Size
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {ledger.plate_balances.map((balance) => (
                                <div key={balance.plate_size} className={`p-3 rounded-lg border ${
                                  balance.outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                                }`}>
                                  <p className="text-sm font-medium text-gray-900">{balance.plate_size}</p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Borrowed: {balance.total_borrowed}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Returned: {balance.total_returned}
                                  </p>
                                  <p className={`text-lg font-bold mt-1 ${
                                    balance.outstanding > 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {balance.outstanding}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Active Rentals */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-yellow-600" />
                              Active Rentals ({ledger.active_challans.length})
                            </h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {ledger.active_challans.length === 0 ? (
                                <p className="text-gray-500 text-sm">No active rentals</p>
                              ) : (
                                ledger.active_challans.map((activeChallan) => (
                                  <div key={activeChallan.challan.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-medium text-gray-900">#{activeChallan.challan.challan_number}</p>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-500">
                                          {new Date(activeChallan.challan.challan_date).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-yellow-600 font-medium">
                                          {activeChallan.days_on_rent} days on rent
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {activeChallan.items.filter(item => item.outstanding > 0).map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                          <span className="text-gray-600">{item.plate_size}</span>
                                          <span className="text-yellow-700 font-medium">
                                            Outstanding: {item.outstanding}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Completed Rentals */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Completed Rentals ({ledger.completed_challans.length})
                            </h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {ledger.completed_challans.length === 0 ? (
                                <p className="text-gray-500 text-sm">No completed rentals</p>
                              ) : (
                                ledger.completed_challans.map((completedChallan) => (
                                  <div key={completedChallan.challan.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                      <p className="font-medium text-gray-900">#{completedChallan.challan.challan_number}</p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(completedChallan.challan.challan_date).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      {completedChallan.items.map((item) => (
                                        <p key={item.id} className="text-sm text-gray-600">
                                          {item.plate_size}: {item.borrowed_quantity} plates
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-2 border rounded-lg ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}