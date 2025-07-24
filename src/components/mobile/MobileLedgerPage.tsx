import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/supabase';
import { 
  Search, 
  User, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Download,
  FileDown,
  Phone,
  MapPin,
  BookOpen
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

interface ClientLedger {
  client: Client;
  plate_balances: PlateBalance[];
  total_outstanding: number;
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

const PLATE_SIZES = [
  '2 X 3', '21 X 3', '18 X 3', '15 X 3', '12 X 3',
  '9 X 3', 'પતરા', '2 X 2', '2 ફુટ'
];

export function MobileLedgerPage() {
  const [clientLedgers, setClientLedgers] = useState<ClientLedger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);

  useEffect(() => {
    fetchClientLedgers();
    
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
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('id');

      if (clientsError) throw clientsError;

      const { data: challans, error: challansError } = await supabase
        .from('challans')
        .select(`*, challan_items (*)`)
        .order('created_at', { ascending: false });

      if (challansError) throw challansError;

      const { data: returns, error: returnsError } = await supabase
        .from('returns')
        .select(`*, return_line_items (*)`)
        .order('created_at', { ascending: false });

      if (returnsError) throw returnsError;

      const ledgers: ClientLedger[] = clients.map(client => {
        const clientChallans = challans.filter(c => c.client_id === client.id);
        const clientReturns = returns.filter(r => r.client_id === client.id);

        const plateBalanceMap = new Map<string, PlateBalance>();
        
        // Initialize ALL plate sizes (even if no activity)
        PLATE_SIZES.forEach(size => {
          plateBalanceMap.set(size, {
            plate_size: size,
            total_borrowed: 0,
            total_returned: 0,
            outstanding: 0
          });
        });

        clientChallans.forEach(challan => {
          challan.challan_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size);
            if (existing) {
              existing.total_borrowed += item.borrowed_quantity;
            }
          });
        });

        clientReturns.forEach(returnRecord => {
          returnRecord.return_line_items.forEach(item => {
            const existing = plateBalanceMap.get(item.plate_size);
            if (existing) {
              existing.total_returned += item.returned_quantity;
            }
          });
        });

        // Always return ALL plate sizes in correct order
        const plate_balances = PLATE_SIZES.map(size => {
          const balance = plateBalanceMap.get(size)!;
          return {
            ...balance,
            outstanding: balance.total_borrowed - balance.total_returned
          };
        });

        const total_outstanding = plate_balances.reduce((sum, balance) => sum + balance.outstanding, 0);

        const allTransactions = [
          ...clientChallans.map(challan => ({
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
          ...clientReturns.map(returnRecord => ({
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

        const has_activity = clientChallans.length > 0 || clientReturns.length > 0;

        return {
          client,
          plate_balances,
          total_outstanding,
          has_activity,
          all_transactions: allTransactions
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
      
      const client = clientLedgers.find(ledger => ledger.client.id === transaction.client_id)?.client;
      if (!client) throw new Error('Client not found');

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
      await new Promise(resolve => setTimeout(resolve, 500));

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
      const csvRows = [];
      const headers = [
        'Client ID', 'Client Name', 'Site', 'Mobile Number', 'Total Outstanding Plates',
        'Plate Size', 'Total Issued', 'Total Returned', 'Current Balance',
        'Total Transactions', 'Last Activity Date'
      ];
      csvRows.push(headers.join(','));

      clientLedgers.forEach(ledger => {
        if (!ledger.has_activity) {
          csvRows.push([
            `"${ledger.client.id}"`, `"${ledger.client.name}"`, `"${ledger.client.site}"`,
            `"${ledger.client.mobile_number}"`, '0', 'No Activity', '0', '0', '0', '0', 'Never'
          ].join(','));
        } else {
          ledger.plate_balances.forEach(balance => {
            const lastActivityDate = ledger.all_transactions.length > 0 
              ? new Date(ledger.all_transactions[0].date).toLocaleDateString('en-GB')
              : 'Never';
              
            csvRows.push([
              `"${ledger.client.id}"`, `"${ledger.client.name}"`, `"${ledger.client.site}"`,
              `"${ledger.client.mobile_number}"`, ledger.total_outstanding.toString(),
              `"${balance.plate_size}"`, balance.total_borrowed.toString(),
              balance.total_returned.toString(), balance.outstanding.toString(),
              ledger.all_transactions.length.toString(), `"${lastActivityDate}"`
            ].join(','));
          });
        }
      });

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
      <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
        <div className="p-3 space-y-3">
          <div className="pt-2 text-center">
            <div className="w-32 h-5 mx-auto mb-1 bg-blue-200 rounded animate-pulse"></div>
            <div className="w-40 h-3 mx-auto bg-blue-200 rounded animate-pulse"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 bg-white border border-blue-100 rounded-lg shadow-sm animate-pulse">
              <div className="w-2/3 h-4 mb-2 bg-blue-200 rounded"></div>
              <div className="w-1/2 h-3 bg-blue-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      <div className="p-3 space-y-4">
        {/* Blue Themed Header */}
        <div className="pt-2 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 mb-2 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="mb-1 text-base font-bold text-gray-900">ખાતાવહી</h1>
          <p className="text-xs text-blue-600">ગ્રાહક ભાડા ઇતિહાસ</p>
        </div>

        {/* Blue Themed Backup Button */}
        <div className="flex justify-center">
          <button
            onClick={handleBackupData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all duration-200 transform rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105"
          >
            <FileDown className="w-4 h-4" />
            બેકઅપ
          </button>
        </div>

        {/* Blue Themed Search Bar */}
        <div className="relative">
          <Search className="absolute w-4 h-4 text-blue-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-3 text-sm transition-all duration-200 bg-white border-2 border-blue-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
            placeholder="ગ્રાહક શોધો..."
          />
        </div>

        {/* Blue Themed Client Cards */}
        <div className="space-y-2">
          {filteredLedgers.map((ledger) => (
            <div key={ledger.client.id} className="overflow-hidden transition-all duration-200 bg-white border-2 border-blue-100 shadow-lg rounded-xl hover:shadow-xl hover:border-blue-200">
              {/* Blue Themed Client Header */}
              <div 
                className="p-3 transition-colors cursor-pointer hover:bg-blue-50"
                onClick={() => toggleExpanded(ledger.client.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full shadow-sm bg-gradient-to-r from-blue-500 to-indigo-500">
                        {ledger.client.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {ledger.client.name} ({ledger.client.id})
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 ml-8">
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{ledger.client.site}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Phone className="w-3 h-3" />
                        <span>{ledger.client.mobile_number}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                      ledger.total_outstanding > 0 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    }`}>
                      {ledger.total_outstanding > 0 
                        ? `${ledger.total_outstanding} બાકી` 
                        : 'પૂર્ણ'
                      }
                    </span>
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                      {expandedClient === ledger.client.id ? (
                        <ChevronUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blue Themed Expanded Details */}
              {expandedClient === ledger.client.id && (
                <div className="border-t-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  {!ledger.has_activity ? (
                    <div className="p-6 text-center text-gray-500">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200">
                        <Package className="w-6 h-6 text-blue-400" />
                      </div>
                      <p className="text-sm font-medium">કોઈ પ્રવૃત્તિ નથી</p>
                    </div>
                  ) : (
                    <AllSizesActivityTable 
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
            <div className="py-8 text-center bg-white border-2 border-blue-100 shadow-lg rounded-xl">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200">
                <User className="w-8 h-8 text-blue-400" />
              </div>
              <p className="mb-1 text-sm font-semibold text-gray-700">
                {searchTerm ? 'કોઈ ગ્રાહક મળ્યો નથી' : 'કોઈ ગ્રાહક નથી'}
              </p>
              <p className="text-xs text-blue-600">
                {searchTerm ? 'શોધ શબ્દ બદલીને પ્રયત્ન કરો' : 'નવા ગ્રાહકો ઉમેરો'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modified Activity Table - Shows ALL Plate Sizes (Even Blank Ones)
interface AllSizesActivityTableProps {
  ledger: ClientLedger;
  onDownloadChallan: (transaction: any, type: 'udhar' | 'jama') => void;
  downloading: string | null;
}

function AllSizesActivityTable({ ledger, onDownloadChallan, downloading }: AllSizesActivityTableProps) {
  // CHANGED: Use ALL plate sizes instead of filtering to active ones
  const allPlateSizes = PLATE_SIZES; // Show all sizes regardless of activity

  const getCurrentBalance = (plateSize: string) => {
    const balance = ledger.plate_balances.find(b => b.plate_size === plateSize);
    return balance?.outstanding || 0;
  };

  const getTransactionQuantity = (transaction: typeof ledger.all_transactions[0], plateSize: string) => {
    const item = transaction.items.find(i => i.plate_size === plateSize);
    return item?.quantity || 0;
  };

  return (
    <div className="p-3">
      {/* Blue Themed Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500">
          <Package className="w-3 h-3 text-white" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900">પ્લેટ પ્રવૃત્તિ</h4>
      </div>
      
      {/* Table with ALL Plate Sizes */}
      <div className="overflow-hidden bg-white border-2 border-blue-100 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white bg-gradient-to-r from-blue-500 to-indigo-500">
                <th className="sticky left-0 bg-gradient-to-r from-blue-500 to-indigo-500 px-1 py-1.5 text-left font-bold min-w-[60px]">
                  <div className="text-xs">ચલણ નં.</div>
                </th>
                <th className="px-1 py-1.5 text-center font-bold min-w-[60px] border-l border-blue-400">
                  <div className="text-xs">તારીખ</div>
                </th>
                <th className="px-1 py-1.5 text-center font-bold min-w-[60px] border-l border-blue-400">
                  <div className="text-xs">કુલ</div>
                </th>
                {allPlateSizes.map(size => (
                  <th key={size} className="px-1 py-1.5 text-center font-bold min-w-[50px] border-l border-blue-400">
                    <div className="text-xs">{size}</div>
                  </th>
                ))}
                <th className="px-1 py-1.5 text-center font-bold min-w-[50px] border-l border-blue-400">
                  <div className="text-xs">ડાઉનલોડ</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Current Balance Row - Shows ALL sizes */}
              <tr className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100">
                <td className="sticky left-0 bg-gradient-to-r from-blue-100 to-indigo-100 px-1 py-1.5 font-bold text-blue-900 border-r border-blue-200">
                  <div className="text-xs">વર્તમાન બેલેન્સ</div>
                </td>
                <td className="px-1 py-1.5 text-center border-l border-blue-200">
                  <div className="text-xs font-semibold text-blue-700">-</div>
                </td>
                <td className="px-1 py-1.5 text-center border-l border-blue-200">
                  <div className="text-xs font-semibold text-blue-700">{ledger.plate_balances.reduce((sum, balance) => sum + Math.abs(balance.outstanding), 0)}</div>
                </td>
                {/* CHANGED: Show ALL plate sizes, even blank ones */}
                {allPlateSizes.map(size => {
                  const balance = getCurrentBalance(size);
                  return (
                    <td key={size} className="px-1 py-1.5 text-center border-l border-blue-200">
                      {balance !== 0 ? (
                        <span className={`font-bold text-sm ${
                          balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {balance}
                        </span>
                      ) : (
                        <span className="text-xs text-blue-400">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-1 py-1.5 text-center border-l border-blue-200">
                  <div className="text-xs font-semibold text-blue-700">-</div>
                </td>
              </tr>

              {/* Transaction Rows - Shows ALL sizes */}
              {ledger.all_transactions.length === 0 ? (
                <tr>
                  <td colSpan={allPlateSizes.length + 3} className="px-1 py-4 text-center text-blue-500">
                    <div className="text-xs">કોઈ ચલણ નથી</div>
                  </td>
                </tr>
              ) : (
                ledger.all_transactions.map((transaction) => (
                  <tr 
                    key={`${transaction.type}-${transaction.id}`}
                    className={`border-b border-blue-100 hover:bg-blue-25 transition-colors ${
                      transaction.type === 'udhar' ? 'bg-yellow-50' : 'bg-green-50'
                    }`}
                  >
                    <td className={`sticky left-0 px-1 py-0.5 border-r border-blue-100 ${
                      transaction.type === 'udhar' ? 'bg-yellow-50' : 'bg-green-50'
                    }`}>
                      <div className="text-xs font-semibold text-gray-900">
                        #{transaction.number}
                      </div>
                    </td>
                    
                    <td className="px-1 py-0.5 text-center border-l border-blue-100">
                      <div className="text-xs font-medium text-blue-600">
                        {(() => {
                          const d = new Date(transaction.date);
                          const day = d.getDate().toString().padStart(2, '0');
                          const month = (d.getMonth() + 1).toString().padStart(2, '0');
                          const year = d.getFullYear().toString().slice(-2);
                          return `${day}/${month}/${year}`;
                        })()}
                      </div>
                    </td>
                    
                    <td className="px-1 py-0.5 text-center border-l border-blue-100">
                      <div className="text-xs font-medium text-blue-600">
                        {transaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </div>
                    </td>

                    {/* CHANGED: Show ALL plate sizes, leave blank if no quantity */}
                    {allPlateSizes.map(size => {
                      const quantity = getTransactionQuantity(transaction, size);
                      return (
                        <td key={size} className="px-1 py-0.5 text-center border-l border-blue-100">
                          {quantity > 0 ? (
                            <span className={`font-bold text-sm ${
                              transaction.type === 'udhar' ? 'text-yellow-700' : 'text-green-700'
                            }`}>
                              {transaction.type === 'udhar' ? '+' : '-'}{quantity}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="px-1 py-0.5 text-center border-l border-blue-100">
                      <button
                        onClick={() => onDownloadChallan(transaction, transaction.type)}
                        disabled={downloading === `${transaction.type}-${transaction.id}`}
                        className={`p-0.5 rounded-full transition-all duration-200 hover:shadow-md ${
                          transaction.type === 'udhar'
                            ? 'text-yellow-600 hover:bg-yellow-200 hover:text-yellow-700'
                            : 'text-green-600 hover:bg-green-200 hover:text-green-700'
                        } disabled:opacity-50`}
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Blue Themed Legend */}
        <div className="p-3 border-t-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-sm"></div>
              <span className="font-medium text-blue-700">ઉધાર (Issue)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400 rounded-full shadow-sm"></div>
              <span className="font-medium text-blue-700">જમા (Return)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-400 rounded-full shadow-sm"></div>
              <span className="font-medium text-blue-700">વર્તમાન બેલેન્સ (Balance)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
