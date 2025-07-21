import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/supabase';
import { 
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
} from 'lucide-react';
import { T } from '../../contexts/LanguageContext';

type Client = Database['public']['Tables']['clients']['Row'];
type Challan = Database['public']['Tables']['challans']['Row'];
type ChallanItem = Database['public']['Tables']['challan_items']['Row'];
type Return = Database['public']['Tables']['returns']['Row'];
type ReturnLineItem = Database['public']['Tables']['return_line_items']['Row'];

interface PlateBalance {
  plate_size: string;
  total_borrowed: number;
  total_returned: number;
  outstanding: number;
}

interface ActiveChallan {
  challan: Challan;
  items: (ChallanItem & { outstanding: number })[];
  days_on_rent: number;
}

interface CompletedChallan {
  challan: Challan;
  items: ChallanItem[];
  returns: (Return & { return_line_items: ReturnLineItem[] })[];
}

interface ClientLedger {
  client: Client;
  plate_balances: PlateBalance[];
  total_outstanding: number;
  active_challans: ActiveChallan[];
  completed_challans: CompletedChallan[];
  has_activity: boolean;
}

export function MobileLedgerPage() {
  const [clientLedgers, setClientLedgers] = useState<ClientLedger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClientLedgers();
    
    // Set up real-time subscriptions
    const challanSubscription = supabase
      .channel('challans_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challans' }, () => {
        fetchClientLedgers();
      })
      .subscribe();

    const returnsSubscription = supabase
      .channel('returns_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, () => {
        fetchClientLedgers();
      })
      .subscribe();

    return () => {
      challanSubscription.unsubscribe();
      returnsSubscription.unsubscribe();
    };
  }, []);

  const fetchClientLedgers = async () => {
    try {
      // Fetch all clients sorted by ID
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('id');

      if (clientsError) throw clientsError;

      // Fetch all challans with their items
      const { data: challans, error: challansError } = await supabase
        .from('challans')
        .select(`
          *,
          challan_items (*)
        `)
        .order('created_at', { ascending: false });

      if (challansError) throw challansError;

      // Fetch all returns with their line items
      const { data: returns, error: returnsError } = await supabase
        .from('returns')
        .select(`
          *,
          return_line_items (*)
        `)
        .order('created_at', { ascending: false });

      if (returnsError) throw returnsError;

      // Process data for each client
      const ledgers: ClientLedger[] = clients.map(client => {
        const clientChallans = challans.filter(c => c.client_id === client.id);
        const clientReturns = returns.filter(r => r.client_id === client.id);

        // Calculate plate balances
        const plateBalanceMap = new Map<string, PlateBalance>();

        // Process borrowed quantities
        clientChallans.forEach(challan => {
          challan.challan_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size) || {
              plate_size: item.plate_size,
              total_borrowed: 0,
              total_returned: 0,
              outstanding: 0
            };
            existing.total_borrowed += item.borrowed_quantity;
            plateBalanceMap.set(item.plate_size, existing);
          });
        });

        // Process returned quantities
        clientReturns.forEach(returnRecord => {
          returnRecord.return_line_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size);
            if (existing) {
              existing.total_returned += item.returned_quantity;
            }
          });
        });

        // Calculate outstanding for each plate size
        const plate_balances = Array.from(plateBalanceMap.values()).map(balance => ({
          ...balance,
          outstanding: balance.total_borrowed - balance.total_returned
        })).filter(balance => balance.total_borrowed > 0);

        const total_outstanding = plate_balances.reduce((sum, balance) => sum + balance.outstanding, 0);

        // Categorize challans as active or completed
        const active_challans: ActiveChallan[] = [];
        const completed_challans: CompletedChallan[] = [];

        clientChallans.forEach(challan => {
          const itemsWithOutstanding = challan.challan_items.map(item => {
            const returned = clientReturns.reduce((sum, ret) => {
              return sum + ret.return_line_items
                .filter(lineItem => lineItem.plate_size === item.plate_size)
                .reduce((itemSum, lineItem) => itemSum + lineItem.returned_quantity, 0);
            }, 0);
            
            return {
              ...item,
              outstanding: item.borrowed_quantity - Math.min(returned, item.borrowed_quantity)
            };
          });

          const hasOutstanding = itemsWithOutstanding.some(item => item.outstanding > 0);
          const days_on_rent = Math.floor((new Date().getTime() - new Date(challan.challan_date).getTime()) / (1000 * 60 * 60 * 24));

          if (hasOutstanding) {
            active_challans.push({
              challan,
              items: itemsWithOutstanding,
              days_on_rent
            });
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
            });
          }
        });

        const has_activity = clientChallans.length > 0 || clientReturns.length > 0;

        return {
          client,
          plate_balances,
          total_outstanding,
          active_challans,
          completed_challans,
          has_activity
        };
      });

      setClientLedgers(ledgers);
    } catch (error) {
      console.error('Error fetching client ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (clientId: string) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  const filteredLedgers = clientLedgers.filter(ledger =>
    ledger.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.client.site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Compact Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          ખાતાવહી (Ledger)
        </h1>
        <p className="text-sm text-gray-600">Client rental history & balances</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search clients..."
        />
      </div>

      {/* Client Cards - Mobile Optimized */}
      <div className="space-y-3">
        {filteredLedgers.map((ledger) => (
          <div key={ledger.client.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Client Summary Header */}
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpanded(ledger.client.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {ledger.client.name} ({ledger.client.id})
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {ledger.client.site} • {ledger.client.mobile_number}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ledger.total_outstanding > 0 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {ledger.total_outstanding > 0 
                      ? `${ledger.total_outstanding} બાકી` 
                      : 'બધું પરત'
                    }
                  </span>
                  {expandedClient === ledger.client.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedClient === ledger.client.id && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                {!ledger.has_activity ? (
                  <div className="text-center py-6 text-gray-500">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No rental activity yet</p>
                  </div>
                ) : (
                  <>
                    {/* Outstanding Summary */}
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4 text-red-600" />
                        Outstanding Plates:
                      </h4>
                      {Object.keys(ledger.plate_balances.filter(b => b.outstanding > 0)).length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">✅ All plates returned</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {ledger.plate_balances
                            .filter(balance => balance.outstanding > 0)
                            .map((balance) => (
                              <div key={balance.plate_size} className="bg-red-50 border border-red-200 rounded p-2 text-center">
                                <div className="text-xs text-gray-600">{balance.plate_size}</div>
                                <div className="font-bold text-red-600">{balance.outstanding}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Active Rentals */}
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        Active Rentals:
                      </h4>
                      {ledger.active_challans.length === 0 ? (
                        <p className="text-sm text-gray-500">No active rentals</p>
                      ) : (
                        <div className="space-y-2">
                          {ledger.active_challans.map((activeChallan) => (
                            <div key={activeChallan.challan.id} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-sm">#{activeChallan.challan.challan_number}</span>
                                <span className="text-xs text-yellow-600 font-medium">
                                  {activeChallan.days_on_rent} days
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                {activeChallan.items.filter(item => item.outstanding > 0).map((item) => (
                                  <div key={item.id} className="text-xs text-center bg-white rounded p-1">
                                    <div className="text-gray-600">{item.plate_size}</div>
                                    <div className="font-medium text-yellow-700">{item.outstanding}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent History (Limited) */}
                    <div className="bg-white rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Recent Returns:
                      </h4>
                      {ledger.completed_challans.length === 0 ? (
                        <p className="text-sm text-gray-500">No completed rentals</p>
                      ) : (
                        <div className="space-y-2">
                          {ledger.completed_challans.slice(0, 2).map((rental) => (
                            <div key={rental.challan.id} className="bg-green-50 border border-green-200 rounded p-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">#{rental.challan.challan_number}</span>
                                <span className="text-xs text-green-600">
                                  {new Date(rental.challan.challan_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                          {ledger.completed_challans.length > 2 && (
                            <div className="text-center text-xs text-gray-500 py-1">
                              +{ledger.completed_challans.length - 2} more completed
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredLedgers.length === 0 && !loading && (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {searchTerm ? 'No matching clients found' : 'No clients found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}