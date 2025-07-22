import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { ClientSelector } from './ClientSelector';
import { FileText, Package, Save, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { PrintableChallan } from './challans/PrintableChallan';
import { generateJPGChallan, downloadJPGChallan } from '../utils/jpgChallanGenerator';
import { ChallanData } from './challans/types';
import { T } from '../contexts/LanguageContext';

type Client = Database['public']['Tables']['clients']['Row'];
type Stock = Database['public']['Tables']['stock']['Row'];

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

interface StockValidation {
  size: string;
  requested: number;
  available: number;
}

export function MobileIssueRental() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [challanNumber, setChallanNumber] = useState('');
  const [suggestedChallanNumber, setSuggestedChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [plateNotes, setPlateNotes] = useState<Record<string, string>>({});
  const [stockData, setStockData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([]);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);

  useEffect(() => {
    fetchStockData();
    generateNextChallanNumber();
  }, []);

  useEffect(() => {
    if (Object.keys(quantities).length > 0) {
      validateStockAvailability();
    }
  }, [quantities, stockData]);

  const fetchStockData = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('plate_size');

      if (error) throw error;
      setStockData(data || []);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    }
  };

  const generateNextChallanNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('challans')
        .select('challan_number')
        .order('id', { ascending: false })

      if (error) throw error

      let maxNumber = 0
      if (data && data.length > 0) {
        data.forEach(challan => {
          const match = challan.challan_number.match(/\d+/)
          if (match) {
            const num = parseInt(match[0])
            if (num > maxNumber) {
              maxNumber = num
            }
          }
        })
      }

      const nextNumber = (maxNumber + 1).toString()
      setSuggestedChallanNumber(nextNumber)
      
      if (!challanNumber) {
        setChallanNumber(nextNumber)
      }
    } catch (error) {
      console.error('Error generating challan number:', error)
      const fallback = '1'
      setSuggestedChallanNumber(fallback)
      if (!challanNumber) {
        setChallanNumber(fallback)
      }
    }
  }

  const handleChallanNumberChange = (value: string) => {
    setChallanNumber(value);
    
    if (!value.trim()) {
      setChallanNumber(suggestedChallanNumber);
    }
  };

  const validateStockAvailability = () => {
    const insufficientStock: StockValidation[] = [];
    
    Object.entries(quantities).forEach(([size, quantity]) => {
      if (quantity > 0) {
        const stock = stockData.find(s => s.plate_size === size);
        if (stock && quantity > stock.available_quantity) {
          insufficientStock.push({
            size,
            requested: quantity,
            available: stock.available_quantity
          });
        }
      }
    });
    
    setStockValidation(insufficientStock);
  };

  const handleQuantityChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [size]: quantity
    }));
  };

  const checkChallanNumberExists = async (challanNumber: string) => {
    const { data, error } = await supabase
      .from('challans')
      .select('challan_number')
      .eq('challan_number', challanNumber)
      .limit(1);

    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!challanNumber.trim()) {
        alert('Please enter a challan number.');
        return;
      }

      const exists = await checkChallanNumberExists(challanNumber);
      if (exists) {
        alert('Challan number already exists. Please use a different number.');
        return;
      }

      const validItems = PLATE_SIZES.filter(size => quantities[size] > 0);
      
      if (validItems.length === 0) {
        alert('Please enter at least one plate quantity.');
        return;
      }

      const { data: challan, error: challanError } = await supabase
        .from('challans')
        .insert([{
          challan_number: challanNumber,
          client_id: selectedClient!.id,
          challan_date: challanDate
        }])
        .select()
        .single();

      if (challanError) throw challanError;

      const lineItems = validItems.map(size => ({
        challan_id: challan.id,
        plate_size: size,
        borrowed_quantity: quantities[size],
        partner_stock_notes: plateNotes[size]?.trim() || null
      }));

      const { error: lineItemsError } = await supabase
        .from('challan_items')
        .insert(lineItems);

      if (lineItemsError) throw lineItemsError;

      const newChallanData: ChallanData = {
        type: 'issue',
        challan_number: challan.challan_number,
        date: challanDate,
        client: {
          id: selectedClient!.id,
          name: selectedClient!.name,
          site: selectedClient!.site || '',
          mobile: selectedClient!.mobile_number || ''
        },
        plates: validItems.map(size => ({
          size,
          quantity: quantities[size],
          notes: plateNotes[size] || '',
        })),
        total_quantity: validItems.reduce((sum, size) => sum + quantities[size], 0)
      };

      setChallanData(newChallanData);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const jpgDataUrl = await generateJPGChallan(newChallanData);
        downloadJPGChallan(jpgDataUrl, `issue-challan-${challan.challan_number}`);

        setQuantities({});
        setPlateNotes({});
        setChallanNumber('');
        setSelectedClient(null);
        setStockValidation([]);
        setChallanData(null);
        
        alert(`Challan ${challan.challan_number} created and downloaded successfully!`);
        await fetchStockData();
      } catch (error) {
        console.error('JPG generation failed:', error);
        alert('Error generating challan image. The challan was created but could not be downloaded.');
      }
    } catch (error) {
      console.error('Error creating challan:', error);
      alert('Error creating challan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStockInfo = (size: string) => {
    return stockData.find(s => s.plate_size === size);
  };

  const isStockInsufficient = (size: string) => {
    return stockValidation.some(item => item.size === size);
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
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 shadow-lg">
        <h1 className="text-lg font-bold text-center">
          ઉધાર ચલણ (Issue Challan)
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Client Selection */}
        <ClientSelector 
          onClientSelect={setSelectedClient}
          selectedClient={selectedClient}
        />

        {/* Rental Form */}
        {selectedClient && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-green-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-gray-900">
                  <T>Issue Plates</T>
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Challan Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <T>Challan Number</T> *
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => handleChallanNumberChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    placeholder={suggestedChallanNumber}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    <T>Date</T> *
                  </label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Stock Warning */}
              {stockValidation.length > 0 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">કેટલીક વસ્તુઓમાં અપૂરતો સ્ટોક છે</span>
                </div>
              )}

              {/* Plates Table */}
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Plate Size
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {PLATE_SIZES.map(size => {
                      const stockInfo = getStockInfo(size);
                      const isInsufficient = isStockInsufficient(size);
                      
                      return (
                        <tr key={size} className={`${isInsufficient ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 text-sm">{size}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-sm ${stockInfo ? 'text-gray-600' : 'text-red-500'}`}>
                              {stockInfo ? stockInfo.available_quantity : 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              className={`w-full px-2 py-1 border rounded text-center text-sm ${
                                isInsufficient 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                              }`}
                              value={quantities[size] || ''}
                              onChange={(e) => handleQuantityChange(size, e.target.value)}
                              placeholder="0"
                            />
                            {isInsufficient && (
                              <p className="text-xs text-red-600 mt-1 text-center">
                                મર્યાદા: {stockValidation.find(item => item.size === size)?.available}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  નોંધ (Notes)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                  rows={2}
                  placeholder="કોઈ ખાસ નોંધ લખો..."
                />
              </div>

              {/* Total */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-center">
                  <span className="text-lg font-bold text-green-900">
                    કુલ પ્લેટ્સ: {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {loading ? 'બનાવી રહ્યા છીએ...' : 'ચલણ બનાવો'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Padding */}
      <div className="h-20"></div>
    </div>
  );
}