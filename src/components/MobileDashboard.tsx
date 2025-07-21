import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Calendar,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Bell,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface DashboardStats {
  activeUdharChallans: number;
  pendingJamaReturns: number;
  onRentPlates: number;
  totalClients: number;
  lowStockItems: number;
  overdueChallans: number;
}

interface RecentActivity {
  id: number;
  type: 'udhar' | 'jama';
  challan_number: string;
  client_name: string;
  created_at: string;
  status: string;
}

interface LowStockAlert {
  plate_size: string;
  available_quantity: number;
  threshold: number;
}

interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  humidity: number;
}

export function MobileDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeUdharChallans: 0,
    pendingJamaReturns: 0,
    onRentPlates: 0,
    totalClients: 0,
    lowStockItems: 0,
    overdueChallans: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [weather] = useState<WeatherData>({
    temperature: 28,
    condition: 'sunny',
    humidity: 65
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats in parallel
      const [
        clientsResult,
        challansResult,
        stockResult,
        returnsResult
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('challans').select('id, status, challan_date, challan_number, client:clients(name)', { count: 'exact' }),
        supabase.from('stock').select('*'),
        supabase.from('returns').select('id, return_challan_number, client:clients(name), created_at', { count: 'exact' })
      ]);

      // Calculate stats
      const totalClients = clientsResult.count || 0;
      const activeUdharChallans = challansResult.data?.filter(c => c.status === 'active').length || 0;
      const pendingJamaReturns = activeUdharChallans; // Assuming pending returns = active challans
      
      const stockData = stockResult.data || [];
      const onRentPlates = stockData.reduce((sum, item) => sum + item.on_rent_quantity, 0);
      const lowStockItems = stockData.filter(item => item.available_quantity < 10).length;
      
      // Calculate overdue challans (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueChallans = challansResult.data?.filter(c => 
        c.status === 'active' && new Date(c.challan_date) < thirtyDaysAgo
      ).length || 0;

      setStats({
        activeUdharChallans,
        pendingJamaReturns,
        onRentPlates,
        totalClients,
        lowStockItems,
        overdueChallans
      });

      // Set recent activity
      const recentChallans = challansResult.data?.slice(0, 3).map(c => ({
        id: c.id,
        type: 'udhar' as const,
        challan_number: c.challan_number,
        client_name: c.client?.name || 'Unknown',
        created_at: c.challan_date,
        status: c.status
      })) || [];

      const recentReturns = returnsResult.data?.slice(0, 2).map(r => ({
        id: r.id,
        type: 'jama' as const,
        challan_number: r.return_challan_number,
        client_name: r.client?.name || 'Unknown',
        created_at: r.created_at,
        status: 'returned'
      })) || [];

      setRecentActivity([...recentChallans, ...recentReturns].slice(0, 5));

      // Set low stock alerts
      const lowStock = stockData
        .filter(item => item.available_quantity < 10)
        .map(item => ({
          plate_size: item.plate_size,
          available_quantity: item.available_quantity,
          threshold: 10
        }));
      setLowStockAlerts(lowStock);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = () => {
    switch (weather.condition) {
      case 'sunny': return <Sun className="w-6 h-6 text-yellow-500" />;
      case 'cloudy': return <Cloud className="w-6 h-6 text-gray-500" />;
      case 'rainy': return <CloudRain className="w-6 h-6 text-blue-500" />;
      default: return <Sun className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getGujaratiDate = () => {
    const today = new Date();
    const dayNames = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
    const monthNames = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
    
    return `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}, ${today.getFullYear()}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'હમણાં જ';
    if (diffInHours < 24) return `${diffInHours} કલાક પહેલાં`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} દિવસ પહેલાં`;
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header with Weather */}
      <div className="flex justify-between items-start pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            સેન્ટરિંગ પ્લેટ્સ ભાડા
          </h1>
          <p className="text-sm text-gray-600">{getGujaratiDate()}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            {getWeatherIcon()}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{weather.temperature}°C</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {weather.humidity}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats.overdueChallans > 0 || lowStockAlerts.length > 0) && (
        <div className="space-y-3">
          {stats.overdueChallans > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">
                    {stats.overdueChallans} ચલણ મુદત વીતી ગઈ છે!
                  </p>
                  <p className="text-sm text-red-700">
                    પ્લેટ્સ પરત કરવાનો સમય થયો છે
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          
          {lowStockAlerts.map((alert, index) => (
            <motion.div
              key={alert.plate_size}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    {alert.plate_size} પ્લેટ્સ સ્ટોક ઓછો છે!
                  </p>
                  <p className="text-sm text-yellow-700">
                    માત્ર {alert.available_quantity} પ્લેટ્સ બાકી છે
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Key Metrics Cards - Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max md:grid md:grid-cols-3 lg:grid-cols-5 md:min-w-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white min-w-[160px] md:min-w-0"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-100" />
              <span className="text-2xl font-bold">{stats.activeUdharChallans}</span>
            </div>
            <p className="text-sm text-blue-100">ઉધાર ચાલતી છે</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white min-w-[160px] md:min-w-0"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-red-100" />
              <span className="text-2xl font-bold">{stats.pendingJamaReturns}</span>
            </div>
            <p className="text-sm text-red-100">બાકી જમા</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white min-w-[160px] md:min-w-0"
          >
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-purple-100" />
              <span className="text-2xl font-bold">{stats.onRentPlates}</span>
            </div>
            <p className="text-sm text-purple-100">ભાડે પ્લેટ્સ</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white min-w-[160px] md:min-w-0"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-green-100" />
              <span className="text-2xl font-bold">{stats.totalClients}</span>
            </div>
            <p className="text-sm text-green-100">કુલ ગ્રાહકો</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white min-w-[160px] md:min-w-0"
          >
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-yellow-100" />
              <span className="text-2xl font-bold">{stats.lowStockItems}</span>
            </div>
            <p className="text-sm text-yellow-100">કમસ્ટોક પ્લેટ્સ</p>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          ઝડપી ક્રિયાઓ
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/issue"
            className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transition-all duration-200 min-h-[80px]"
          >
            <FileText className="w-6 h-6" />
            <span className="text-sm font-medium text-center">ઉધાર ચલણ બનાવો</span>
          </Link>
          
          <Link
            to="/return"
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 min-h-[80px]"
          >
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm font-medium text-center">જમા ચલણ બનાવો</span>
          </Link>
          
          <Link
            to="/clients"
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:from-purple-600 hover:to-purple-700 transition-all duration-200 min-h-[80px]"
          >
            <Users className="w-6 h-6" />
            <span className="text-sm font-medium text-center">નવો ગ્રાહક</span>
          </Link>
          
          <Link
            to="/stock"
            className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 min-h-[80px]"
          >
            <Package className="w-6 h-6" />
            <span className="text-sm font-medium text-center">સ્ટોક સુધારો</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          તાજેતરની પ્રવૃત્તિ
        </h2>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">કોઈ તાજેતરની પ્રવૃત્તિ નથી</p>
            <p className="text-xs mt-1">નવું ચલણ બનાવવા માટે શરૂ કરો</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={`${activity.type}-${activity.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'udhar' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {activity.type === 'udhar' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      #{activity.challan_number}
                    </p>
                    <p className="text-xs text-gray-600">{activity.client_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'active' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {activity.status === 'active' ? 'ચલતી છે' : 'પરત'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {getTimeAgo(activity.created_at)}
                  </p>
                </div>
              </motion.div>
            ))}
            
            <Link
              to="/challans"
              className="block text-center py-3 text-blue-600 hover:text-blue-700 font-medium text-sm border-t border-gray-200 mt-4 pt-4"
            >
              બધી પ્રવૃત્તિ જુઓ
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <Link
          to="/issue"
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
}