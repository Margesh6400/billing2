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
  Activity,
  DollarSign,
  BarChart3,
  RotateCcw
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
  pendingBills: number;
  totalRevenue: number;
  totalStock: number;
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
    overdueChallans: 0,
    pendingBills: 0,
    totalRevenue: 0,
    totalStock: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [weather] = useState<WeatherData>({
    temperature: 32,
    condition: 'sunny',
    humidity: 45
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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
        returnsResult,
        billsResult
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('challans').select('id, status, challan_date, challan_number, client:clients(name)', { count: 'exact' }),
        supabase.from('stock').select('*'),
        supabase.from('returns').select('id, return_challan_number, client:clients(name), created_at', { count: 'exact' }),
        supabase.from('bills').select('total_amount, payment_status', { count: 'exact' })
      ]);

      // Calculate stats
      const totalClients = clientsResult.count || 0;
      const activeUdharChallans = challansResult.data?.filter(c => c.status === 'active').length || 0;
      const pendingJamaReturns = activeUdharChallans; // Assuming pending returns = active challans
      
      const stockData = stockResult.data || [];
      const onRentPlates = stockData.reduce((sum, item) => sum + item.on_rent_quantity, 0);
      const lowStockItems = stockData.filter(item => item.available_quantity < 10).length;
      const totalStock = stockData.reduce((sum, item) => sum + item.total_quantity, 0);
      
      // Calculate overdue challans (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const overdueChallans = challansResult.data?.filter(c => 
        c.status === 'active' && new Date(c.challan_date) < thirtyDaysAgo
      ).length || 0;

      // Calculate bills stats
      const billsData = billsResult.data || [];
      const pendingBills = billsData.filter(bill => bill.payment_status === 'pending').length;
      const totalRevenue = billsData
        .filter(bill => bill.payment_status === 'paid')
        .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

      setStats({
        activeUdharChallans,
        pendingJamaReturns,
        onRentPlates,
        totalClients,
        lowStockItems,
        overdueChallans,
        pendingBills,
        totalRevenue,
        totalStock
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
    const today = currentTime;
    const dayNames = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
    const monthNames = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
    
    const timeString = today.toLocaleTimeString('en-IN', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    return `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}, ${today.getFullYear()} · ${timeString}`;
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
      {/* Time and Date Header */}
      <div className="text-center pt-4">
        <h1 className="text-lg font-bold text-gray-900 mb-2">
          નીલકંઠ પ્લેટ ડેપો
        </h1>
        <p className="text-base text-gray-700 font-medium mb-4">
          {getGujaratiDate()}
        </p>
      </div>

      {/* Weather Widget */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon()}
            <div>
              <div className="text-2xl font-bold">31°C</div>
              <div className="text-sm opacity-90">Mostly cloudy</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">સુરત</div>
            <div className="text-sm opacity-90 flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {weather.humidity}% ભેજ
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 px-1">
          ઝડપી પ્રવેશ
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickAccessCard
            to="/issue"
            title="ઉધાર ચલણ બનાવો"
            subtitle="નવું ઉધાર"
            icon={FileText}
            color="from-green-500 to-green-600"
          />
          <QuickAccessCard
            to="/return"
            title="જમા ચલણ બનાવો"
            subtitle="પ્લેટ્સ પરત"
            icon={RotateCcw}
            color="from-blue-500 to-blue-600"
          />
          <QuickAccessCard
            to="/stock"
            title="સ્ટોક વ્યવસ્થાપન"
            subtitle="ઇન્વેન્ટરી જુઓ"
            icon={Package}
            color="from-purple-500 to-purple-600"
          />
          <QuickAccessCard
            to="/bills"
            title="બિલ બનાવો"
            subtitle="નવું બિલ"
            icon={DollarSign}
            color="from-orange-500 to-orange-600"
          />
        </div>
      </div>

      {/* Summary Metrics - Horizontal Scroll */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 px-1">
          વ્યવસાયિક સારાંશ
        </h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            <MetricCard
              title="કુલ ગ્રાહકો"
              value={stats.totalClients}
              icon={Users}
              color="from-blue-500 to-blue-600"
            />
            <MetricCard
              title="સક્રિય ભાડા"
              value={stats.activeUdharChallans}
              icon={FileText}
              color="from-green-500 to-green-600"
            />
            <MetricCard
              title="બાકી વળતર"
              value={stats.pendingJamaReturns}
              icon={Clock}
              color="from-yellow-500 to-yellow-600"
            />
            <MetricCard
              title="કુલ સ્ટોક"
              value={stats.totalStock}
              icon={Package}
              color="from-purple-500 to-purple-600"
            />
            <MetricCard
              title="ઓછો સ્ટોક"
              value={stats.lowStockItems}
              icon={AlertTriangle}
              color="from-red-500 to-red-600"
            />
            <MetricCard
              title="બાકી બિલ"
              value={stats.pendingBills}
              icon={DollarSign}
              color="from-orange-500 to-orange-600"
            />
            <MetricCard
              title="કુલ આવક"
              value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
              icon={TrendingUp}
              color="from-indigo-500 to-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Alerts Section - Moved down */}
      {(stats.overdueChallans > 0 || lowStockAlerts.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 px-1">
            ચેતવણીઓ
          </h2>
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
        </div>
      )}

      {/* Recent Activity Feed - Moved to bottom */}
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

// New component for metric cards
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: string;
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white min-w-[140px] shadow-lg`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 text-white opacity-80" />
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-sm text-white opacity-90 font-medium">{title}</p>
    </motion.div>
  );
}

// New component for quick access cards
interface QuickAccessCardProps {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
}

function QuickAccessCard({ to, title, subtitle, icon: Icon, color }: QuickAccessCardProps) {
  return (
    <Link
      to={to}
      className={`bg-gradient-to-br ${color} text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-200 min-h-[100px] shadow-lg`}
    >
      <Icon className="w-8 h-8" />
      <div className="text-center">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs opacity-90">{subtitle}</div>
      </div>
    </Link>
  );
}