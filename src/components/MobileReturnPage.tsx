import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { ClientSelector } from './ClientSelector';
import { RotateCcw, Package, Save, Loader2, Calendar, User, Hash, MapPin, Search } from 'lucide-react';
import { PrintableChallan } from './challans/PrintableChallan';
import { generateJPGChallan, downloadJPGChallan } from '../utils/jpgChallanGenerator';
import { ChallanData } from './challans/types';
import { T } from '../contexts/LanguageContext';

type Client = Database['public']['Tables']['clients']['Row'];

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
];

export function MobileReturnPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [returnChallanNumber, setReturnChallanNumber] = useState('');
  const [suggestedChallanNumber, setSuggestedChallanNumber] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [plateNotes, setPlateNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);
  const [clientOutstandingPlates, setClientOutstandingPlates] = useState<Record<string, number>>({});

  useEffect(() => {
    generateNextChallanNumber();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientOutstandingPlates();
    }
  }, [selectedClient]);

  const fetchClientOutstandingPlates = async () => {
    if (!selectedClient) return;

    try {
      const { data: challans, error: challansError } = await supabase
        .from('challans')
        .select(`
          challan_items (
            plate_size,
            borrowed_quantity
          )
        `)
        .eq('client_id', selectedClient.id);

      if (challansError) throw challansError;

      const { data: returns, error: returnsError } = await supabase
        .from('returns')
        .select(`
          return_line_items (
            plate_size,
            returned_quantity
          )
        `)
        .eq('client_id', selectedClient.id);

      if (returnsError) throw returnsError;

      const outstanding: Record<string, number> = {};

      challans?.forEach(challan => {
        challan.challan_items.forEach(item => {
          outstanding[item.plate_size] = (outstanding[item.plate_size] || 0) + item.borrowed_quantity;
        });
      });

      returns?.forEach(returnRecord => {
        returnRecord.return_line_items.forEach(item => {
          outstanding[item.plate_size] = (outstanding[item.plate_size] || 0) - item.returned_quantity;
        });
      });

      const filteredOutstanding: Record<string, number> = {};
      Object.entries(outstanding).forEach(([size, qty]) => {
        if (qty > 0) {
          filteredOutstanding[size] = qty;
        }
      });

      setClientOutstandingPlates(filteredOutstanding);
    } catch (error) {
      console.error('Error fetching client outstanding plates:', error);
    }
  };

  const generateNextChallanNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('return_challan_number')
        .order('id', { ascending: false });

      if (error) throw error;

      let maxNumber = 0;
      if (data && data.length > 0) {
        data.forEach(returnChallan => {
          const match = returnChallan.return_challan_number.match(/\d+/);
          if (match) {
            const num = parseInt(match[0]);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        });
      }

      const nextNumber = (maxNumber + 1).toString();
      setSuggestedChallanNumber(nextNumber);
      
      if (!returnChallanNumber) {
        setReturnChallanNumber(nextNumber);
      }
    } catch (error) {
      console.error('Error generating return challan number:', error);
      const fallback = '1';
      setSuggestedChallanNumber(fallback);
      if (!returnChallanNumber) {
        setReturnChallanNumber(fallback);
      }
    }
  };

  const handleChallanNumberChange = (value: string) => {
    setReturnChallanNumber(value);
    
    if (!value.trim()) {
      setReturnChallanNumber(suggestedChallanNumber);
    }
  };

  const handleQuantityChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [size]: quantity
    }));
  };

  const checkReturnChallanNumberExists = async (challanNumber: string) => {
    const { data, error } = await supabase
      .from('returns')
      .select('return_challan_number')
      .eq('return_challan_number', challanNumber)
      .limit(1);

    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedClient) {
        alert('Please select a client.');
        return;
      }

      if (!returnChallanNumber.trim()) {
        alert('Please enter a return challan number.');
        return;
      }

      const exists = await checkReturnChallanNumberExists(returnChallanNumber);
      if (exists) {
        alert('Return challan number already exists. Please use a different number.');
        return;
      }

      const returnEntries = PLATE_SIZES
        .filter(size => quantities[size] > 0)
        .map(size => ({
          plate_size: size,
          returned_quantity: quantities[size],
          damage_notes: plateNotes[size]?.trim() || null,
          partner_stock_notes: plateNotes[size]?.trim() || null
        }));

      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert([{
          return_challan_number: returnChallanNumber,
          client_id: selectedClient.id,
          return_date: returnDate
        }])
        .select()
        .single();

      if (returnError) throw returnError;

      if (returnEntries.length > 0) {
        const lineItems = returnEntries.map(entry => ({
          return_id: returnRecord.id,
          ...entry
        }));

        const { error: lineItemsError } = await supabase
          .from('return_line_items')
          .insert(lineItems);

        if (lineItemsError) throw lineItemsError;
      }

      const newChallanData: ChallanData = {
        type: 'return',
        challan_number: returnRecord.return_challan_number,
        date: returnDate,
        client: {
          id: selectedClient.id,
          name: selectedClient.name,
          site: selectedClient.site || '',
          mobile: selectedClient.mobile_number || ''
        },
        plates: returnEntries.map(entry => ({
          size: entry.plate_size,
          quantity: entry.returned_quantity,
          notes: plateNotes[entry.plate_size] || '',
        })),
        total_quantity: returnEntries.reduce((sum, entry) => sum + entry.returned_quantity, 0)
      };

      setChallanData(newChallanData);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const jpgDataUrl = await generateJPGChallan(newChallanData);
        downloadJPGChallan(jpgDataUrl, `return-challan-${returnRecord.return_challan_number}`);

      } catch (error) {
        console.error('JPG generation failed:', error);
        alert('Error generating challan image. Please try again.');
        return;
      }

      setQuantities({});
      setPlateNotes({});
      setReturnChallanNumber('');
      setSelectedClient(null);
      setChallanData(null);
      setClientOutstandingPlates({});
      
      const message = returnEntries.length > 0 
        ? `Return challan ${returnRecord.return_challan_number} created and downloaded successfully with ${returnEntries.length} items!`
        : `Return challan ${returnRecord.return_challan_number} created and downloaded successfully (no items returned).`;
      
      alert(message);
    } catch (error) {
      console.error('Error creating return:', error);
      alert('Error creating return. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      {/* Compact Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg">
        <h1 className="text-lg font-bold text-center">
          જમા ચલણ (Return Challan)
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Client Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Select Client (Existing Only)
            </h2>
          </div>
          
          <div className="p-4">
            {selectedClient ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Client ID</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedClient.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Name</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedClient.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Site</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedClient.site}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedClient(null);
                    setQuantities({});
                    setPlateNotes({});
                    setClientOutstandingPlates({});
                  }}
                  className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                >
                  Change Client
                </button>
              </div>
            ) : (
              <ReturnClientSelector 
                onClientSelect={(client) => {
                  setSelectedClient(client);
                  setQuantities({});
                  setPlateNotes({});
                }}
              />
            )}
          </div>
        </div>

        {/* Return Form */}
        {selectedClient && Object.keys(clientOutstandingPlates).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">
                  <T>Return Plates</T>
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Return Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Challan Number *
                  </label>
                  <input
                    type="text"
                    value={returnChallanNumber}
                    onChange={(e) => handleChallanNumberChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder={suggestedChallanNumber}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    <T>Return Date</T> *
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Outstanding Plates Table */}
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Plate Size
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Outstanding
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Return Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(clientOutstandingPlates).map(([size, outstandingQty]) => (
                      <tr key={size} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 text-sm">{size}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-medium text-red-600">
                            {outstandingQty}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            max={outstandingQty}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={quantities[size] || ''}
                            onChange={(e) => handleQuantityChange(size, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  નોંધ (Notes)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  rows={2}
                  placeholder="નુકસાન, ખોટ વગેરે માટે નોંધ લખો..."
                />
              </div>

              {/* Total */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-center">
                  <span className="text-lg font-bold text-blue-900">
                    કુલ પ્લેટ્સ: {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {loading ? 'પ્રક્રિયા કરી રહ્યા છીએ...' : 'જમા કરો'}
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedClient && Object.keys(clientOutstandingPlates).length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">This client has no outstanding plates to return.</p>
          </div>
        )}
      </div>

      {/* Bottom Padding */}
      <div className="h-20"></div>
    </div>
  );
}

// Return Client Selector Component
interface ReturnClientSelectorProps {
  onClientSelect: (client: Client) => void;
}

function ReturnClientSelector({ onClientSelect }: ReturnClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('id');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Search existing clients..."
        />
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-4 text-gray-500 text-sm">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            {searchTerm ? 'No clients found' : 'No clients available'}
          </div>
        ) : (
          filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onClientSelect(client)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                  <p className="text-xs text-gray-600 mt-1">ID: {client.id}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xs text-gray-600">{client.site}</p>
                  <p className="text-xs text-gray-500 mt-1">{client.mobile_number}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}