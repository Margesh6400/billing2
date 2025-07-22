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
  TrendingUp,
  Download,
  FileDown
} from 'lucide-react';
import { T } from '../../contexts/LanguageContext';
import { PrintableChallan } from '../challans/PrintableChallan';
import { generateJPGChallan, downloadJPGChallan } from '../../utils/jpgChallanGenerator';
import { ChallanData } from '../challans/types';

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
  all_transactions: Array<{
    type: 'udhar' | 'jama';
    id: number;
    number: string;
    date: string;
    client_id: string;
    items: Array<{
      plate_size: string;
      quantity: number;
    }>;
  }>;
}

export function MobileLedgerPage() {
  const [clientLedgers, setClientLedgers] = useState<ClientLedger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);

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

      // Create a comprehensive list of all transactions for the table
      const allTransactions = [
        // Add all Udhar challans
        ...challans.map(challan => ({
          type: 'udhar' as const,
          id: challan.id,
          number: challan.challan_number,
          date: challan.challan_date,
          client_id: challan.client_id,
          items: challan.challan_items.map(item => ({
            plate_size: item.plate_size,
            quantity: item.borrowed_quantity
          }))
        })),
        // Add all Jama returns
        ...returns.map(returnRecord => ({
          type: 'jama' as const,
          id: returnRecord.id,
          number: returnRecord.return_challan_number,
          date: returnRecord.return_date,
          client_id: returnRecord.client_id,
          items: returnRecord.return_line_items.map(item => ({
            plate_size: item.plate_size,
            quantity: item.returned_quantity
          }))
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Process data for each client
      const ledgers: ClientLedger[] = clients.map(client => {
        const clientChallans = challans.filter(c => c.client_id === client.id);
        const clientReturns = returns.filter(r => r.client_id === client.id);
        const clientTransactions = allTransactions.filter(t => t.client_id === client.id);

        // Calculate plate balances - Outstanding = Total Issued - Total Returned
        const plateBalanceMap = new Map<string, PlateBalance>();

        // Process issued quantities from Udhar challans
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

        // Process returned quantities from Jama challans
        clientReturns.forEach(returnRecord => {
          returnRecord.return_line_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size) || {
              plate_size: item.plate_size,
              total_borrowed: 0,
              total_returned: 0,
              outstanding: 0
            };
            existing.total_returned += item.returned_quantity;
            plateBalanceMap.set(item.plate_size, existing);
          });
        });

        // Calculate outstanding for each plate size
        const plate_balances = Array.from(plateBalanceMap.values()).map(balance => ({
          ...balance,
          outstanding: balance.total_borrowed - balance.total_returned
        })).filter(balance => balance.total_borrowed > 0 || balance.total_returned > 0);

        const total_outstanding = plate_balances.reduce((sum, balance) => sum + balance.outstanding, 0);

        // Categorize challans as active or completed (this logic remains for compatibility)
        const active_challans: ActiveChallan[] = [];
        const completed_challans: CompletedChallan[] = [];

        clientChallans.forEach(challan => {
          // Check if this challan has any outstanding plates based on our new calculation
          const challanHasOutstanding = challan.challan_items.some(item => {
            const balance = plateBalanceMap.get(item.plate_size);
            return balance && balance.outstanding > 0;
          });
          
          const days_on_rent = Math.floor((new Date().getTime() - new Date(challan.challan_date).getTime()) / (1000 * 60 * 60 * 24));

          if (challanHasOutstanding) {
            const itemsWithOutstanding = challan.challan_items.map(item => ({
              ...item,
              outstanding: plateBalanceMap.get(item.plate_size)?.outstanding || 0
            }));
            
            active_challans.push({
              challan,
              items: itemsWithOutstanding,
              days_on_rent
            });
          } else if (challan.challan_items.length > 0) {
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
          has_activity,
          all_transactions: clientTransactions
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

  const handleDownloadChallan = async (transaction: any, type: 'udhar' | 'jama') => {
    try {
      const downloadKey = `${type}-${transaction.id}`;
      setDownloading(downloadKey);
      
      // Find the client for this transaction
      const client = clientLedgers.find(ledger => ledger.client.id === transaction.client_id)?.client;
      if (!client) {
        throw new Error('Client not found');
      }

      // Prepare challan data for PDF
      const challanDataForPDF: ChallanData = {
        type: type === 'udhar' ? 'issue' : 'return',
        challan_number: transaction.number,
        date: transaction.date,
        client: {
          id: client.id,
          name: client.name,
          site: client.site || '',
          mobile: client.mobile_number || ''
        },
        plates: transaction.items.map(item => ({
          size: item.plate_size,
          quantity: item.quantity,
          notes: '',
        })),
        total_quantity: transaction.items.reduce((sum, item) => sum + item.quantity, 0)
      };

      setChallanData(challanDataForPDF);
      
      // Wait for the component to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate and download the PDF
      const jpgDataUrl = await generateJPGChallan(challanDataForPDF);
      downloadJPGChallan(jpgDataUrl, `${type}-challan-${challanDataForPDF.challan_number}`);

      setChallanData(null);
    } catch (error) {
      console.error('Error downloading challan:', error);
      alert('Error downloading challan. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleBackupData = async () => {
    try {
      // Prepare CSV data
      const csvRows = [];
      
      // CSV Headers
      const headers = [
        'Client ID',
        'Client Name', 
        'Site',
        'Mobile Number',
        'Total Outstanding Plates',
        'Plate Size',
        'Total Issued',
        'Total Returned',
        'Current Balance',
        'Active Challans Count',
        'Completed Challans Count',
        'Last Activity Date'
      ];
      csvRows.push(headers.join(','));

      // Add data for each client
      clientLedgers.forEach(ledger => {
        if (ledger.plate_balances.length === 0) {
          // Client with no plate activity
          csvRows.push([
            `"${ledger.client.id}"`,
            `"${ledger.client.name}"`,
            `"${ledger.client.site}"`,
            `"${ledger.client.mobile_number}"`,
            '0',
            'No Activity',
            '0',
            '0', 
            '0',
            '0',
            '0',
            'Never'
          ].join(','));
        } else {
          // Client with plate activity - one row per plate size
          ledger.plate_balances.forEach(balance => {
            const lastActivityDate = ledger.all_transactions.length > 0 
              ? new Date(ledger.all_transactions[0].date).toLocaleDateString('en-GB')
              : 'Never';
              
            csvRows.push([
              `"${ledger.client.id}"`,
              `"${ledger.client.name}"`,
              `"${ledger.client.site}"`,
              `"${ledger.client.mobile_number}"`,
              ledger.total_outstanding.toString(),
              `"${balance.plate_size}"`,
              balance.total_borrowed.toString(),
              balance.total_returned.toString(),
              balance.outstanding.toString(),
              ledger.active_challans.length.toString(),
              ledger.completed_challans.length.toString(),
              `"${lastActivityDate}"`
            ].join(','));
          });
        }
      });

      // Create and download CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ledger-backup-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Backup exported successfully!');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup. Please try again.');
    }
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
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      {/* Compact Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          ખાતાવહી (Ledger)
        </h1>
        <p className="text-sm text-gray-600">Client rental history & balances</p>
      </div>

      {/* Backup Button */}
      <div className="flex justify-center">
        <button
          onClick={handleBackupData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <FileDown className="w-4 h-4" />
          <T>Backup Data</T>
        </button>
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
                  <ClientActivityTable 
                    ledger={ledger} 
                    onDownloadChallan={handleDownloadChallan}
                    downloading={downloading}
                  />
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

// New component for the comprehensive activity table
interface ClientActivityTableProps {
  ledger: ClientLedger;
  onDownloadChallan: (transaction: any, type: 'udhar' | 'jama') => void;
  downloading: string | null;
}

function ClientActivityTable({ ledger, onDownloadChallan, downloading }: ClientActivityTableProps) {
  // Get all unique plate sizes from the client's activity (both issued and returned)
  const allPlateSizes = Array.from(new Set([
    ...ledger.plate_balances.map(b => b.plate_size),
    ...ledger.all_transactions.flatMap(t => t.items.map(i => i.plate_size))
  ])).sort();

  // Use the comprehensive transaction list that includes both Udhar and Jama
  const allTransactions = ledger.all_transactions;

  // Get current outstanding balance for each plate size (Issued - Returned)
  const getCurrentBalance = (plateSize: string) => {
    const balance = ledger.plate_balances.find(b => b.plate_size === plateSize);
    return balance?.outstanding || 0;
  };

  // Get quantity for a specific transaction and plate size
  const getTransactionQuantity = (transaction: typeof allTransactions[0], plateSize: string) => {
    const item = transaction.items.find(i => i.plate_size === plateSize);
    return item?.quantity || 0;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          પ્લેટ પ્રવૃત્તિ (Plate Activity)
        </h4>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[80px]">
                પ્લેટ સાઇઝ
                <br />
                <span className="text-xs font-normal">Plate Size</span>
              </th>
              {allPlateSizes.map(size => (
                <th key={size} className="px-2 py-3 text-center font-medium text-gray-700 border-r border-gray-200 min-w-[60px]">
                  {size}
                </th>
              ))}
              <th className="px-2 py-3 text-center font-medium text-gray-700 min-w-[60px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Current Balance Row */}
            <tr className="bg-blue-50 border-b-2 border-blue-200">
              <td className="sticky left-0 bg-blue-50 px-3 py-3 font-medium text-blue-900 border-r border-blue-200">
                વર્તમાન બેલેન્સ
                <br />
                <span className="text-xs font-normal">Current Balance</span>
              </td>
              {allPlateSizes.map(size => {
                const balance = getCurrentBalance(size);
                return (
                  <td key={size} className="px-2 py-3 text-center border-r border-blue-200">
                    <span className={`font-bold text-lg ${
                      balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {balance}
                    </span>
                  </td>
                );
              })}
              <td className="px-2 py-3 text-center">
                -
              </td>
            </tr>

            {/* Challan Rows */}
            {allTransactions.length === 0 ? (
              <tr>
                <td colSpan={allPlateSizes.length + 2} className="px-3 py-6 text-center text-gray-500">
                  કોઈ ચલણ પ્રવૃત્તિ નથી
                  <br />
                  <span className="text-xs">No challan activity</span>
                </td>
              </tr>
            ) : (
              allTransactions.map((transaction, index) => (
                <tr 
                  key={`${transaction.type}-${transaction.id}`}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    transaction.type === 'udhar' ? 'bg-yellow-50' : 'bg-green-50'
                  }`}
                >
                  <td className={`sticky left-0 px-3 py-3 border-r border-gray-200 ${
                    transaction.type === 'udhar' ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        #{transaction.number}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full font-medium inline-block ${
                        transaction.type === 'udhar' 
                          ? 'bg-yellow-200 text-yellow-800' 
                          : 'bg-green-200 text-green-800'
                      }`}>
                        {transaction.type === 'udhar' ? 'ઉધાર' : 'જમા'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(transaction.date).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </td>
                  {allPlateSizes.map(size => {
                    const quantity = getTransactionQuantity(transaction, size);
                    return (
                      <td key={size} className="px-2 py-3 text-center border-r border-gray-200">
                        {quantity > 0 && (
                          <span className={`font-medium ${
                            transaction.type === 'udhar' ? 'text-yellow-700' : 'text-green-700'
                          }`}>
                            {transaction.type === 'udhar' ? '+' : '-'}{quantity}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => onDownloadChallan(transaction, transaction.type)}
                      disabled={downloading === `${transaction.type}-${transaction.id}`}
                      className={`p-1 rounded-full transition-colors ${
                        transaction.type === 'udhar'
                          ? 'text-yellow-600 hover:bg-yellow-100'
                          : 'text-green-600 hover:bg-green-100'
                      } disabled:opacity-50`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
            <span>ઉધાર (Issue)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>જમા (Return)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <span>વર્તમાન બેલેન્સ (Current Balance)</span>
          </div>
        </div>
      </div>
    </div>
  );
}