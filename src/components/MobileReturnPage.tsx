import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { ClientSelector } from './ClientSelector';
import { RotateCcw, Package, Save, Loader2, Calendar, Eye, EyeOff, User, Hash, MapPin, Search } from 'lucide-react';
import { PrintableChallan } from './challans/PrintableChallan';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
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
      // Fetch all challans for this client
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

      // Fetch all returns for this client
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

      // Calculate outstanding plates per size
      const outstanding: Record<string, number> = {};

      // Add borrowed quantities
      challans?.forEach(challan => {
        challan.challan_items.forEach(item => {
          outstanding[item.plate_size] = (outstanding[item.plate_size] || 0) + item.borrowed_quantity;
        });
      });

      // Subtract returned quantities
      returns?.forEach(returnRecord => {
        returnRecord.return_line_items.forEach(item => {
          outstanding[item.plate_size] = (outstanding[item.plate_size] || 0) - item.returned_quantity;
        });
      });

      // Filter out zero or negative values
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
      // Fetch all existing return challans to find the highest numeric value
      const { data, error } = await supabase
        .from('returns')
        .select('return_challan_number')
        .order('id', { ascending: false });

      if (error) throw error;

      let maxNumber = 0;
      if (data && data.length > 0) {
        // Extract all numeric values and find the absolute maximum
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

      // Always increment by 1 from the highest found number
      const nextNumber = (maxNumber + 1).toString();
      setSuggestedChallanNumber(nextNumber);
      
      // Set as default only if current challan number is empty
      if (!returnChallanNumber) {
        setReturnChallanNumber(nextNumber);
      }
    } catch (error) {
      console.error('Error generating return challan number:', error);
      // Fallback to timestamp-based number
      const fallback = '1';
      setSuggestedChallanNumber(fallback);
      if (!returnChallanNumber) {
        setReturnChallanNumber(fallback);
      }
    }
  };

  const handleChallanNumberChange = (value: string) => {
    setReturnChallanNumber(value);
    
    // If user clears the input, suggest the next available number
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
          damage_notes: null,
          partner_stock_notes: null
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
          notes: '',
        })),
        total_quantity: returnEntries.reduce((sum, entry) => sum + entry.returned_quantity, 0)
      };

      setChallanData(newChallanData);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const success = await generateAndDownloadPDF(
          `challan-${returnRecord.return_challan_number}`,
          `return-challan-${returnRecord.return_challan_number}`
        );

        if (!success) {
          throw new Error('Failed to generate PDF');
        }
      } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Error generating PDF. Please try again.');
        return;
      }

      setQuantities({});
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
    <div className="space-y-4 pb-4">
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          <T>Return Challan</T>
        </h1>
        <p className="text-sm text-gray-600">જમા ચલણ - Process plate returns</p>
      </div>

      {/* Client Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Select Client (Existing Only)
          </h2>
        </div>
        
        {selectedClient ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Hash className="w-5 h-5 text-gray-500" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client ID</label>
                  <p className="text-gray-900 font-semibold">{selectedClient.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900 font-semibold">{selectedClient.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Site</label>
                  <p className="text-gray-900 font-semibold">{selectedClient.site}</p>
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
              className="text-blue-600 hover:text-blue-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Change Client
            </button>
          </div>
        ) : (
          <ReturnClientSelector 
            onClientSelect={(client) => {
              setSelectedClient(client);
            }}
          />
        )}
      </div>

      {/* Return Form */}
      {selectedClient && Object.keys(clientOutstandingPlates).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              <T>Return Plates</T>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Return Details */}
            <div className="grid grid-cols-1 gap-4 bg-gray-50 rounded-lg p-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Challan Number *
                </label>
                <input
                  type="text"
                  value={returnChallanNumber}
                  onChange={(e) => handleChallanNumberChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder={`Suggested: ${suggestedChallanNumber}`}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <T>Return Date</T> *
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  required
                />
              </div>
            </div>

            {/* Outstanding Plates List */}
            <div className="space-y-3">
              {Object.entries(clientOutstandingPlates).map(([size, outstandingQty]) => (
                <div key={size} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{size}</span>
                    </div>
                    <span className="text-xs text-red-600 font-medium">
                      Outstanding: {outstandingQty}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <T>Quantity Returned</T>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={outstandingQty}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        value={quantities[size] || ''}
                        onChange={(e) => handleQuantityChange(size, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    
                    {/* Individual Note Field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        નોંધ (Note)
                      </label>
                      <textarea
                        value={plateNotes[size] || ''}
                        onChange={(e) => setPlateNotes(prev => ({
                          ...prev,
                          [size]: e.target.value
                        }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                        rows={2}
                        placeholder="Enter notes for damage, loss, etc..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-center">
                <span className="text-lg font-semibold text-blue-900">
                  કુલ પ્લેટ : {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? 'Processing...' : <T>Submit Return</T>}
            </button>
          </form>
        </div>
      )}

      {selectedClient && Object.keys(clientOutstandingPlates).length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">This client has no outstanding plates to return.</p>
        </div>
      )}
    </div>
  );
}

// New component for return client selection (without add client option)
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
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Search existing clients..."
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No clients found' : 'No clients available'}
          </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}