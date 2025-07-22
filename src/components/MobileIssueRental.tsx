import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { ClientSelector } from './ClientSelector';
import { FileText, Package, Save, Loader2, Calendar, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { PrintableChallan } from './challans/PrintableChallan';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
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
      // Fetch all existing issue challans to find the highest numeric value
      const { data, error } = await supabase
        .from('challans')
        .select('challan_number')
        .order('id', { ascending: false })

      if (error) throw error

      let maxNumber = 0
      if (data && data.length > 0) {
        // Extract all numeric values and find the absolute maximum
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

      // Always increment by 1 from the highest found number
      const nextNumber = (maxNumber + 1).toString()
      setSuggestedChallanNumber(nextNumber)
      
      // Set as default only if current challan number is empty
      if (!challanNumber) {
        setChallanNumber(nextNumber)
      }
    } catch (error) {
      console.error('Error generating challan number:', error)
      // Fallback to timestamp-based number
      const fallback = '1'
      setSuggestedChallanNumber(fallback)
      if (!challanNumber) {
        setChallanNumber(fallback)
      }
    }
  }

  const handleChallanNumberChange = (value: string) => {
    setChallanNumber(value);
    
    // If user clears the input, suggest the next available number
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

      if (stockValidation.length > 0) {
        // Allow issuing with insufficient stock without requiring notes
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
        const success = await generateAndDownloadPDF(
          `challan-${challan.challan_number}`,
          `issue-challan-${challan.challan_number}`
        );

        if (!success) {
          throw new Error('Failed to generate PDF');
        }

        setQuantities({});
        setPlateNotes({});
        setChallanNumber('');
        setSelectedClient(null);
        setStockValidation([]);
        setChallanData(null);
        
        alert(`Challan ${challan.challan_number} created and downloaded successfully!`);
        await fetchStockData();
      } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Error generating PDF. The challan was created but could not be downloaded.');
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
          <T>Issue Challan</T>
        </h1>
        <p className="text-sm text-gray-600">ઉધાર ચલણ - Create new rental</p>
      </div>

      {/* Client Selection */}
      <ClientSelector 
        onClientSelect={setSelectedClient}
        selectedClient={selectedClient}
      />

      {/* Rental Form */}
      {selectedClient && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              <T>Issue Plates</T>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Challan Details */}
            <div className="grid grid-cols-1 gap-4 bg-gray-50 rounded-lg p-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <T>Challan Number</T> *
                </label>
                <input
                  type="text"
                  value={challanNumber}
                  onChange={(e) => handleChallanNumberChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                  placeholder={`Suggested: ${suggestedChallanNumber}`}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <T>Date</T> *
                </label>
                <input
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                  required
                />
              </div>
            </div>

            {/* Stock Validation Warning */}
            {stockValidation.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Some items have insufficient stock.</span>
              </div>
            )}

            {/* Plates List */}
            <div className="space-y-3">
              {PLATE_SIZES.map(size => {
                const stockInfo = getStockInfo(size);
                const isInsufficient = isStockInsufficient(size);
                
                return (
                  <div key={size} className={`border rounded-lg p-3 ${isInsufficient ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{size}</span>
                      </div>
                      {stockInfo && (
                        <span className="text-xs text-gray-500">
                          Available: {stockInfo.available_quantity}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <T>Quantity to Borrow</T>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-base ${
                          isInsufficient 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                        }`}
                        value={quantities[size] || ''}
                        onChange={(e) => handleQuantityChange(size, e.target.value)}
                        placeholder="0"
                      />
                      {isInsufficient && (
                        <p className="text-xs text-red-600 mt-1">
                          Insufficient stock (Available: {stockValidation.find(item => item.size === size)?.available})
                        </p>
                      )}
                      
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
                          placeholder="Enter notes for this plate size..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtotal */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-center">
                <span className="text-xl font-semibold text-green-900">
                  કુલ પ્લેટ : {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? 'Creating...' : <T>Create Challan</T>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}