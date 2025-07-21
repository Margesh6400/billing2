import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Package, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  ArrowRight
} from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';
import { T } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalClients: number;
  activeRentals: number;
  pendingReturns: number;
  totalStock: number;
  lowStockItems: number;
  pendingBills: number;
  totalRevenue: number;
}

export function MobileDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeRentals: 0,
    pendingReturns: 0,
    totalStock: 0,
    lowStockItems: 0,
    pendingBills: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
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
      ]);

      const totalClients = clientsResult.count || 0;
      const activeRentals = challansResult.data?.filter(c => c.status === 'active').length || 0;
      const pendingReturns = activeRentals;
      
      const stockData = stockResult.data || [];
      const totalStock = stockData.reduce((sum, item) => sum + item.available_quantity, 0);
      const lowStockItems = stockData.filter(item => item.available_quantity < 10).length;

      const billsData = billsResult.data || [];
      const pendingBills = billsData.filter(bill => bill.payment_status === 'pending').length;
      const totalRevenue = billsData
        .filter(bill => bill.payment_status === 'paid')
        .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

      setStats({
        totalClients,
        activeRentals,
        pendingReturns,
        totalStock,
        lowStockItems,
        pendingBills,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/clients'
    },
    {
      title: 'Active Rentals',
      value: stats.activeRentals,
      icon: FileText,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/challans'
    },
    {
      title: 'Pending Returns',
      value: stats.pendingReturns,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      link: '/return'
    },
    {
      title: 'Total Stock',
      value: stats.totalStock,
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/stock'
    }
  ];

  const quickActions = [
    {
      title: 'Issue',
      subtitle: 'ઉધાર ચલણ',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      link: '/issue'
    },
    {
      title: 'Return',
      subtitle: 'જમા ચલણ',
      icon: CheckCircle,
      color: 'from-blue-500 to-blue-600',
      link: '/return'
    },
    {
      title: 'Stock',
      subtitle: 'સ્ટોક',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      link: '/stock'
    },
    {
      title: 'Bills',
      subtitle: 'બિલ',
      icon: DollarSign,
      color: 'from-red-500 to-red-600',
      link: '/bills'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          <T>Dashboard</T>
        </h1>
        <p className="text-gray-600 text-sm">
          <T>Centering Plates Rental Service</T>
        </p>
      </div>

      {/* Weather Widget */}
      <WeatherWidget />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="block group"
          >
            <div className={`${stat.bgColor} rounded-xl p-4 border border-gray-100 group-hover:shadow-md transition-all duration-200 group-active:scale-95`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  <T>{stat.title}</T>
                </p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <T>Quick Actions</T>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="block group"
            >
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 group-hover:shadow-md transition-all duration-200 group-active:scale-95">
                <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${action.color} mb-2`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    <T>{action.title}</T>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {action.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <T>Recent Activity</T>
        </h2>
        <div className="space-y-3">
          {stats.activeRentals > 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Recent activity will appear here</p>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1">Create your first rental to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                <T>Low Stock Items</T>
              </p>
              <p className="text-sm text-amber-700">
                {stats.lowStockItems} items need restocking
              </p>
            </div>
            <Link
              to="/stock"
              className="ml-auto bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              <T>View</T>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}