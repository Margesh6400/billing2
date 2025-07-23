import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  Users, 
  FileText, 
  CheckCircle,
  Plus,
  ArrowRight,
  Calendar,
  Activity,
  DollarSign,
  RotateCcw,
  Home,
  Clock,
  BookOpen
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
      const pendingJamaReturns = activeUdharChallans;
      
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

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
    
    return {
      day: dayNames[today.getDay()],
      date: today.getDate(),
      month: monthNames[today.getMonth()],
      year: today.getFullYear(),
      time: timeString
    };
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
      <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
        <div className="p-3 space-y-4">
          <div className="pt-2 text-center">
            <div className="w-48 h-6 mx-auto mb-2 bg-blue-200 rounded animate-pulse"></div>
            <div className="w-32 h-4 mx-auto bg-blue-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white border border-blue-100 rounded-lg shadow-sm animate-pulse"></div>
            ))}
          </div>
          <div className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm animate-pulse">
            <div className="w-32 h-4 mb-3 bg-blue-200 rounded"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-blue-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dateInfo = getGujaratiDate();

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      <div className="p-3 space-y-4">
        {/* Enhanced Date and Time Header */}
        <div className="pt-4 text-center">
          <div className="p-4 mx-2 bg-white border-2 border-blue-100 shadow-lg rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-blue-900">આજનો દિવસ</h1>
            </div>
            
            <div className="p-3 border border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl">
              <div className="text-center">
                <div className="mb-1 text-base font-bold text-blue-800">
                  {dateInfo.day}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                  <span className="font-semibold">{dateInfo.date}</span>
                  <span>{dateInfo.month}</span>
                  <span className="font-semibold">{dateInfo.year}</span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2 text-xs text-blue-600">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{dateInfo.time}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards - Blue Theme */}
        <div>
          <h2 className="flex items-center gap-2 px-1 mb-3 text-base font-semibold text-blue-900">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500">
              <Home className="w-3 h-3 text-white" />
            </div>
            ઝડપી પ્રવેશ
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAccessCard
              to="/issue"
              title="ઉધાર ચલણ"
              subtitle="નવું ઉધાર બનાવો"
              icon={FileText}
              color="from-red-500 to-orange-500"
              count={stats.activeUdharChallans}
            />
            <QuickAccessCard
              to="/return"
              title="જમા ચલણ"
              subtitle="પ્લેટ્સ પરત કરો"
              icon={RotateCcw}
              color="from-green-500 to-emerald-500"
              count={stats.pendingJamaReturns}
            />
              <QuickAccessCard
              to="/ledger"
              title="ખાતાવહી"
              subtitle="ગ્રાહક બાકી જુઓ"
              icon={BookOpen}
              color="from-yellow-500 to-amber-500"
              count={stats.activeUdharChallans}
              />
            <QuickAccessCard
              to="/stock"
              title="સ્ટોક"
              subtitle="ઇન્વેન્ટરી જુઓ"
              icon={Package}
              color="from-purple-500 to-violet-500"
              count={stats.totalStock}
            />
            <QuickAccessCard
              to="/challans"
              title="ચલણ બૂક"
              subtitle="ચલણ વ્યવસ્થા"
              icon={FileText}
              color="from-cyan-500 to-blue-500"
              count={stats.activeUdharChallans}
            />
            <QuickAccessCard
              to="/clients"
              title="ગ્રાહકો"
              subtitle="ગ્રાહક વ્યવસ્થાપન"
              icon={Users}
              color="from-blue-500 to-indigo-500"
              count={stats.totalClients}
            />
          </div>
        </div>

        {/* Recent Activity Feed - Blue Theme */}
        <div className="overflow-hidden bg-white border-2 border-blue-100 shadow-lg rounded-xl">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Activity className="w-4 h-4" />
              તાજેતરની પ્રવૃત્તિ
            </h2>
          </div>
          
          <div className="p-3">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">કોઈ તાજેતરની પ્રવૃત્તિ નથી</p>
                <p className="mt-1 text-xs text-blue-600">નવું ચલણ બનાવવા માટે શરૂ કરો</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={`${activity.type}-${activity.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 transition-all duration-200 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full shadow-sm ${
                        activity.type === 'udhar' 
                          ? 'bg-gradient-to-r from-red-100 to-orange-100 text-red-600 border border-red-200' 
                          : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 border border-green-200'
                      }`}>
                        {activity.type === 'udhar' ? (
                          <FileText className="w-3 h-3" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          #{activity.challan_number}
                        </p>
                        <p className="text-xs text-blue-600">{activity.client_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        activity.status === 'active' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {activity.status === 'active' ? 'ચાલુ' : 'પરત'}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {getTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                <Link
                  to="/challans"
                  className="block py-3 pt-4 mt-4 text-sm font-medium text-center text-blue-600 transition-all duration-200 border-t-2 border-blue-100 rounded-lg hover:text-blue-700 hover:bg-blue-50"
                >
                  બધી પ્રવૃત્તિ જુઓ
                  <ArrowRight className="inline w-3 h-3 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button - Blue Theme */}
        <div className="fixed z-40 bottom-20 right-4 md:hidden">
          <Link
            to="/issue"
            className="flex items-center justify-center p-4 text-white transition-all duration-200 border-2 border-blue-300 rounded-full shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-110"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Enhanced Quick Access Card Component
interface QuickAccessCardProps {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  count: number;
}

function QuickAccessCard({ to, title, subtitle, icon: Icon, color, count }: QuickAccessCardProps) {
  return (
    <Link
      to={to}
      className={`bg-gradient-to-br ${color} text-white p-4 rounded-xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl border border-white/20`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6" />
        <div className="bg-white/20 rounded-full px-2 py-0.5">
          <span className="text-xs font-bold">{count}</span>
        </div>
      </div>
      <div>
        <div className="mb-1 text-sm font-bold">{title}</div>
        <div className="text-xs opacity-90">{subtitle}</div>
      </div>
    </Link>
  );
}
