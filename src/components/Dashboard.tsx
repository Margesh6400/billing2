// language=typescript
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  TrendingUp, 
  Package, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface DashboardStats {
  totalClients: number
  activeRentals: number
  pendingReturns: number
  totalStock: number
  lowStockItems: number
  pendingBills: number
  totalRevenue: number
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeRentals: 0,
    pendingReturns: 0,
    totalStock: 0,
    lowStockItems: 0,
    pendingBills: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        clientsResult,
        challansResult,
        stockResult,
        billsResult
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('challans').select('id, status'),
        supabase.from('stock').select('*'),
        supabase.from('bills').select('total_amount, payment_status')
      ])

      const totalClients = clientsResult.count || 0
      const activeRentals = challansResult.data?.filter(c => c.status === 'active').length || 0
      const pendingReturns = activeRentals // Same as active rentals for now
      
      const stockData = stockResult.data || []
      const totalStock = stockData.reduce((sum, item) => sum + item.available_quantity, 0)
      const lowStockItems = stockData.filter(item => item.available_quantity < 10).length

      const billsData = billsResult.data || []
      const pendingBills = billsData.filter(bill => bill.payment_status === 'pending').length
      const totalRevenue = billsData
        .filter(bill => bill.payment_status === 'paid')
        .reduce((sum, bill) => sum + (bill.total_amount || 0), 0)

      setStats({
        totalClients,
        activeRentals,
        pendingReturns,
        totalStock,
        lowStockItems,
        pendingBills,
        totalRevenue
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Rentals',
      value: stats.activeRentals,
      icon: FileText,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Pending Returns',
      value: stats.pendingReturns,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Total Stock',
      value: stats.totalStock,
      icon: Package,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Pending Bills',
      value: stats.pendingBills,
      icon: DollarSign,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Loading business overview...</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl animate-pulse">
              <div className="w-3/4 h-4 mb-4 bg-gray-200 rounded"></div>
              <div className="w-1/2 h-8 bg-gray-200 rounded"></div>
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your plate rental business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <div key={index} className="p-6 transition-shadow bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button className="p-4 text-center transition-colors border-2 border-blue-300 border-dashed rounded-lg hover:border-blue-400 hover:bg-blue-50">
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium text-blue-600">New Rental</p>
          </button>
          <button className="p-4 text-center transition-colors border-2 border-green-300 border-dashed rounded-lg hover:border-green-400 hover:bg-green-50">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm font-medium text-green-600">Process Return</p>
          </button>
          <button className="p-4 text-center transition-colors border-2 border-purple-300 border-dashed rounded-lg hover:border-purple-400 hover:bg-purple-50">
            <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium text-purple-600">Update Stock</p>
          </button>
          <button className="p-4 text-center transition-colors border-2 border-orange-300 border-dashed rounded-lg hover:border-orange-400 hover:bg-orange-50">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-sm font-medium text-orange-600">Generate Bill</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Activity</h2>
        <div className="space-y-4">
          {stats.activeRentals > 0 ? (
            <div className="py-8 text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Recent activity will appear here</p>
              <p className="text-sm">Start by creating your first rental</p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Create your first rental to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}