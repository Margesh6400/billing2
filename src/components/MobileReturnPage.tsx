import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { ClientSelector } from './ClientSelector';
import { RotateCcw, Package, Save, Loader2, Calendar, Eye, EyeOff } from 'lucide-react';
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
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNotesColumn, setShowNotesColumn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);

  useEffect(() => {
    generateNextChallanNumber();
  }, []);

  const generateNextChallanNumber = async () => {
    try {
      // Fetch all existing return challans to find the highest numeric value
      const { data, error } = await supabase
        .from('returns')
        .select('return_challan_number')
        .order('id', { ascending: false })

      if (error) throw error

      let maxNumber = 0
      if (data && data.length > 0) {
        // Extract all numeric values and find the absolute maximum
        data.forEach(returnChallan => {
          const match = returnChallan.return_challan_number.match(/\d+/)
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
      if (!returnChallanNumber) {
        setReturnChallanNumber(nextNumber)
      }
    } catch (error) {
      console.error('Error generating return challan number:', error)
      // Fallback to timestamp-based number
      const fallback = '1'
      setSuggestedChallanNumber(fallback)
      if (!returnChallanNumber) {
        setReturnChallanNumber(fallback)
      }
    }
  }

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

  const handleNotesChange = (size: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [size]: value
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
          damage_notes: notes[size] || null,
          partner_stock_notes: notes[size] || null
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
          notes: entry.damage_notes || '',
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
      setNotes({});
      setReturnChallanNumber('');
      setSelectedClient(null);
      setShowNotesColumn(false);
      setChallanData(null);
      
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
      <ClientSelector 
        onClientSelect={setSelectedClient}
        selectedClient={selectedClient}
      />

      {/* Return Form */}
      {selectedClient && (
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

            {/* Notes Column Toggle */}
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowNotesColumn(!showNotesColumn)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                {showNotesColumn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showNotesColumn ? 'Hide' : 'Show'} Notes
              </button>
            </div>

            {/* Plates List */}
            <div className="space-y-3">
              {PLATE_SIZES.map(size => (
                <div key={size} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{size}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <T>Quantity Returned</T>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        value={quantities[size] || ''}
                        onChange={(e) => handleQuantityChange(size, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    
                    {showNotesColumn && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <T>Notes</T>
                        </label>
                        <input
                          type="text"
                          placeholder="Damage/loss notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                          value={notes[size] || ''}
                          onChange={(e) => handleNotesChange(size, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
    </div>
  );
}