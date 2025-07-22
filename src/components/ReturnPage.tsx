import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { ClientSelector } from './ClientSelector'
import { RotateCcw, Package, Save, Loader2, Calendar, Eye, EyeOff } from 'lucide-react'
import { PrintableChallan } from './challans/PrintableChallan'
import { generateAndDownloadPDF } from '../utils/pdfGenerator'
import { ChallanData } from './challans/types'

type Client = Database['public']['Tables']['clients']['Row']

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
]

export function ReturnPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [returnChallanNumber, setReturnChallanNumber] = useState('')
  const [suggestedChallanNumber, setSuggestedChallanNumber] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [showNotesColumn, setShowNotesColumn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [challanData, setChallanData] = useState<ChallanData | null>(null)

  useEffect(() => {
    generateNextChallanNumber()
  }, [])

  const generateNextChallanNumber = async () => {
    try {
      // Fetch all existing return challans to find the highest number
      const { data, error } = await supabase
        .from('returns')
        .select('return_challan_number')
        .order('id', { ascending: false })

      if (error) throw error

      let maxNumber = 0
      if (data && data.length > 0) {
        // Extract numeric values from return challan numbers and find the maximum
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

      const nextNumber = (maxNumber + 1).toString()
      setSuggestedChallanNumber(nextNumber)
      
      // Set as default only if current challan number is empty
      if (!returnChallanNumber) {
        setReturnChallanNumber(nextNumber)
      }
    } catch (error) {
      console.error('Error generating return challan number:', error)
      // Fallback to timestamp-based number
      const fallback = Date.now().toString().slice(-6)
      setSuggestedChallanNumber(fallback)
      if (!returnChallanNumber) {
        setReturnChallanNumber(fallback)
      }
    }
  }

  const handleChallanNumberChange = (value: string) => {
    setReturnChallanNumber(value)
    
    // If user clears the input, suggest the next available number
    if (!value.trim()) {
      setReturnChallanNumber(suggestedChallanNumber)
    }
  }

  const handleQuantityChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0
    setQuantities(prev => ({
      ...prev,
      [size]: quantity
    }))
  }

  const handleNotesChange = (size: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [size]: value
    }))
  }

  const checkReturnChallanNumberExists = async (challanNumber: string) => {
    const { data, error } = await supabase
      .from('returns')
      .select('return_challan_number')
      .eq('return_challan_number', challanNumber)
      .limit(1)

    return data && data.length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic validation - only check if client is selected and challan number is provided
      if (!selectedClient) {
        alert('Please select a client.')
        return
      }

      if (!returnChallanNumber.trim()) {
        alert('Please enter a return challan number.')
        return
      }

      // Check if return challan number already exists
      const exists = await checkReturnChallanNumberExists(returnChallanNumber)
      if (exists) {
        alert('Return challan number already exists. Please use a different number.')
        return
      }

      // Process only entries with quantities > 0 (no validation error if none)
      const returnEntries = PLATE_SIZES
        .filter(size => quantities[size] > 0)
        .map(size => ({
          plate_size: size,
          returned_quantity: quantities[size],
          damage_notes: notes[size] || null,
          partner_stock_notes: notes[size] || null
        }))

      // Create the return record (even if no line items)
      const { data: returnRecord, error: returnError } = await supabase
        .from('returns')
        .insert([{
          return_challan_number: returnChallanNumber,
          client_id: selectedClient.id,
          return_date: returnDate
        }])
        .select()
        .single()

      if (returnError) throw returnError

      // Create line items only for quantities > 0
      if (returnEntries.length > 0) {
        const lineItems = returnEntries.map(entry => ({
          return_id: returnRecord.id,
          ...entry
        }))

        const { error: lineItemsError } = await supabase
          .from('return_line_items')
          .insert(lineItems)

        if (lineItemsError) throw lineItemsError
      }

      // Prepare challan data
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

      // Update state to render the challan
      setChallanData(newChallanData);
      
      // Wait for the component to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate and download the PDF
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

      // Reset form
      setQuantities({})
      setNotes({})
      setReturnChallanNumber('')
      setSelectedClient(null)
      setShowNotesColumn(false)
      setChallanData(null)
      
      const message = returnEntries.length > 0 
        ? `Return challan ${returnRecord.return_challan_number} created and downloaded successfully with ${returnEntries.length} items!`
        : `Return challan ${returnRecord.return_challan_number} created and downloaded successfully (no items returned).`
      
      alert(message)
    } catch (error) {
      console.error('Error creating return:', error)
      alert('Error creating return. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan
              data={challanData}
            />
          </div>
        )}
      </div>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Return (Jama)</h1>
        <p className="text-gray-600">Process plate returns with manual data entry</p>
      </div>

      {/* Client Selection */}
      <ClientSelector 
        onClientSelect={setSelectedClient}
        selectedClient={selectedClient}
      />

      {/* Return Form */}
      {selectedClient && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Return Plates
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Return Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Challan Number *
                </label>
                <input
                  type="text"
                  value={returnChallanNumber}
                  onChange={(e) => handleChallanNumberChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder={`Suggested: ${suggestedChallanNumber}`}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Return Date *
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  required
                />
              </div>
            </div>

            {/* Notes Column Toggle */}
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowNotesColumn(!showNotesColumn)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {showNotesColumn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showNotesColumn ? 'Hide' : 'Show'} Notes Column
              </button>
            </div>

            {/* Three-Column Responsive Table */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              <table className="w-full min-w-[600px] md:min-w-full table-auto border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-3 md:px-4 md:py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Plate Size
                    </th>
                    <th className="px-2 py-3 md:px-4 md:py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Quantity Returned
                    </th>
                    <th className={`px-2 py-3 md:px-4 md:py-3 text-left text-sm font-medium text-gray-700 border-b ${showNotesColumn ? 'table-cell' : 'hidden'}`}>
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLATE_SIZES.map(size => (
                    <tr key={size} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-2 md:px-4 md:py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{size}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 md:px-4 md:py-3">
                        <input
                          type="number"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                          value={quantities[size] || ''}
                          onChange={(e) => handleQuantityChange(size, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className={`px-2 py-2 md:px-4 md:py-3 ${showNotesColumn ? 'table-cell' : 'hidden'}`}>
                        <input
                          type="text"
                          placeholder="Damage/loss notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                          value={notes[size] || ''}
                          onChange={(e) => handleNotesChange(size, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {loading ? 'Processing Return...' : 'Submit Return'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}