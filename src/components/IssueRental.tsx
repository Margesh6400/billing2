import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { ClientSelector } from './ClientSelector'
import { FileText, Package, Save, Loader2, Calendar, AlertTriangle } from 'lucide-react'
import { PrintableChallan } from './challans/PrintableChallan'
import { generateJPGChallan, downloadJPGChallan } from '../utils/jpgChallanGenerator'
import { ChallanData } from './challans/types'

type Client = Database['public']['Tables']['clients']['Row']
type Stock = Database['public']['Tables']['stock']['Row']

const PLATE_SIZES = [
  '2 X 3', '21 X 3', '18 X 3', '15 X 3', '12 X 3',
  '9 X 3', 'પતરા', '2 X 2', '2 ફુટ'
]

interface StockValidation {
  size: string
  requested: number
  available: number
}

export function IssueRental() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [challanNumber, setChallanNumber] = useState('')
  const [suggestedChallanNumber, setSuggestedChallanNumber] = useState('')
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [plateNotes, setPlateNotes] = useState<Record<string, string>>({}) // ADD THIS MISSING STATE
  const [overallNote, setOverallNote] = useState('')
  const [stockData, setStockData] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([])
  const [challanData, setChallanData] = useState<ChallanData | null>(null)

  // ... (keep all existing useEffect and functions the same until handleSubmit)

  useEffect(() => {
    fetchStockData()
    generateNextChallanNumber()
  }, [])

  useEffect(() => {
    if (Object.keys(quantities).length > 0) {
      validateStockAvailability()
    }
  }, [quantities, stockData])

  const fetchStockData = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('plate_size')

      if (error) throw error
      setStockData(data || [])
    } catch (error) {
      console.error('Error fetching stock data:', error)
    }
  }

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
    setChallanNumber(value)
    if (!value.trim()) {
      setChallanNumber(suggestedChallanNumber)
    }
  }

  const validateStockAvailability = () => {
    const insufficientStock: StockValidation[] = []
    
    Object.entries(quantities).forEach(([size, quantity]) => {
      if (quantity > 0) {
        const stock = stockData.find(s => s.plate_size === size)
        if (stock && quantity > stock.available_quantity) {
          insufficientStock.push({
            size,
            requested: quantity,
            available: stock.available_quantity
          })
        }
      }
    })
    
    setStockValidation(insufficientStock)
  }

  const handleQuantityChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0
    setQuantities(prev => ({
      ...prev,
      [size]: quantity
    }))
  }

  const checkChallanNumberExists = async (challanNumber: string) => {
    const { data, error } = await supabase
      .from('challans')
      .select('challan_number')
      .eq('challan_number', challanNumber)
      .limit(1)

    return data && data.length > 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!challanNumber.trim()) {
        alert('Please enter a challan number.')
        return
      }

      const exists = await checkChallanNumberExists(challanNumber)
      if (exists) {
        alert('Challan number already exists. Please use a different number.')
        return
      }

      const validItems = PLATE_SIZES.filter(size => quantities[size] > 0)
      
      if (validItems.length === 0) {
        alert('Please enter at least one plate quantity.')
        return
      }

      if (stockValidation.length > 0) {
        if (!overallNote.trim()) {
          alert('Please add a note for items with insufficient stock.')
          return
        }
      }

      const { data: challan, error: challanError } = await supabase
        .from('challans')
        .insert([{
          challan_number: challanNumber,
          client_id: selectedClient!.id,
          challan_date: challanDate
        }])
        .select()
        .single()

      if (challanError) throw challanError

      const lineItems = validItems.map(size => ({
        challan_id: challan.id,
        plate_size: size,
        borrowed_quantity: quantities[size],
        partner_stock_notes: plateNotes[size]?.trim() || null // FIX: Use plateNotes instead of overallNote
      }))

      const { error: lineItemsError } = await supabase
        .from('challan_items')
        .insert(lineItems)

      if (lineItemsError) throw lineItemsError

      // FIXED: Prepare challan data with correct notes
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
          notes: plateNotes[size] || '', // FIX: Use per-plate notes
        })),
        total_quantity: validItems.reduce((sum, size) => sum + quantities[size], 0)
      };

      setChallanData(newChallanData);
      
      // Wait longer for proper rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const jpgDataUrl = await generateJPGChallan(newChallanData);
        downloadJPGChallan(jpgDataUrl, `issue-challan-${challan.challan_number}`);

        setQuantities({})
        setPlateNotes({}) // FIX: Reset plateNotes too
        setOverallNote('')
        setChallanNumber('')
        setSelectedClient(null)
        setStockValidation([])
        setChallanData(null)
        
        alert(`Challan ${challan.challan_number} created and downloaded successfully!`)
        await fetchStockData()
      } catch (error) {
        console.error('JPG generation failed:', error);
        alert('Error generating challan image. The challan was created but could not be downloaded.');
      }
    } catch (error) {
      console.error('Error creating challan:', error)
      alert('Error creating challan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStockInfo = (size: string) => {
    return stockData.find(s => s.plate_size === size)
  }

  const isStockInsufficient = (size: string) => {
    return stockValidation.some(item => item.size === size)
  }

  return (
    <div className="space-y-8">
      {/* FIXED: Better positioned hidden element for JPG generation */}
      <div style={{ 
        position: 'absolute', 
        top: '-10000px', 
        left: '0', 
        width: '800px', 
        height: 'auto',
        backgroundColor: 'white'
      }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`} style={{ 
            transform: 'scale(1)', 
            transformOrigin: 'top left',
            width: '100%'
          }}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Issue Rental (Udhar)</h1>
        <p className="text-gray-600">Create a new rental challan for plate issuance</p>
      </div>

      <ClientSelector 
        onClientSelect={setSelectedClient}
        selectedClient={selectedClient}
      />

      {selectedClient && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Issue Plates
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Challan Number *
                </label>
                <input
                  type="text"
                  value={challanNumber}
                  onChange={(e) => handleChallanNumberChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                  placeholder={`Suggested: ${suggestedChallanNumber}`}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Challan Date *
                </label>
                <input
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
                  required
                />
              </div>
            </div>

            {stockValidation.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Some items have insufficient stock. Please add a note below.</span>
              </div>
            )}

            {/* FIXED: Proper table structure */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Plate Size
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Available Stock
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Quantity to Borrow
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLATE_SIZES.map(size => {
                    const stockInfo = getStockInfo(size)
                    const isInsufficient = isStockInsufficient(size)
                    
                    return (
                      <tr key={size} className={`border-b hover:bg-gray-50 ${isInsufficient ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{size}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${stockInfo ? 'text-gray-600' : 'text-red-500'}`}>
                            {stockInfo ? stockInfo.available_quantity : 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
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
                        </td>
                        <td className="px-4 py-3">
                          {/* FIXED: Moved note field to proper table cell */}
                          <textarea
                            value={plateNotes[size] || ''}
                            onChange={(e) => setPlateNotes(prev => ({
                              ...prev,
                              [size]: e.target.value
                            }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                            rows={2}
                            placeholder="Enter notes..."
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Overall Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Note (Required for insufficient stock items)
              </label>
              <textarea
                value={overallNote}
                onChange={(e) => setOverallNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base resize-none"
                rows={3}
                placeholder="Enter any overall notes for this challan..."
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-center">
                <span className="text-xl font-semibold text-green-900">
                  કુલ પ્લેટ : {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {loading ? 'Creating Challan...' : 'Create Challan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
