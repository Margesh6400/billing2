import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { FileText, Package, Save, Loader2 } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']

interface UdharFormProps {
  selectedClient: Client
  onChallanCreated: () => void
}

const PLATE_SIZES = [
  '6 inch',
  '8 inch',
  '10 inch',
  '12 inch',
  '14 inch',
  '16 inch',
  '18 inch',
  '20 inch',
  '24 inch'
]

export function UdharForm({ selectedClient, onChallanCreated }: UdharFormProps) {
  const [challanNumber, setChallanNumber] = useState('')
  const [plateQuantities, setPlateQuantities] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generatingChallan, setGeneratingChallan] = useState(false)

  React.useEffect(() => {
    generateChallanNumber()
  }, [])

  const generateChallanNumber = async () => {
    setGeneratingChallan(true)
    try {
      const { data, error } = await supabase.rpc('generate_challan_number')
      if (error) throw error
      setChallanNumber(data)
    } catch (error) {
      console.error('Error generating challan number:', error)
      // Fallback to timestamp-based number
      const fallback = `CH${Date.now().toString().slice(-8)}`
      setChallanNumber(fallback)
    } finally {
      setGeneratingChallan(false)
    }
  }

  const handleQuantityChange = (size: string, value: string) => {
    const quantity = parseInt(value) || 0
    setPlateQuantities(prev => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Filter out plates with zero quantities
      const validItems = PLATE_SIZES.filter(size => plateQuantities[size] > 0)
      
      if (validItems.length === 0) {
        alert('Please enter at least one plate quantity.')
        return
      }

      // Create the challan
      const { data: challan, error: challanError } = await supabase
        .from('challans')
        .insert([{
          challan_number: challanNumber,
          client_id: selectedClient.id
        }])
        .select()
        .single()

      if (challanError) throw challanError

      // Create line items
      const lineItems = validItems.map(size => ({
        challan_id: challan.id,
        plate_size: size,
        count: plateQuantities[size],
        notes: notes[size] || ''
      }))

      const { error: lineItemsError } = await supabase
        .from('challan_line_items')
        .insert(lineItems)

      if (lineItemsError) throw lineItemsError

      // Reset form
      setPlateQuantities({})
      setNotes({})
      await generateChallanNumber()
      
      alert(`Challan ${challan.challan_number} created successfully!`)
      onChallanCreated()
    } catch (error) {
      console.error('Error creating challan:', error)
      alert('Error creating challan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Issue Plates (Udhar)
        </h2>
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <p className="text-sm font-medium text-green-800">
            Challan #: {generatingChallan ? 'Generating...' : challanNumber}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATE_SIZES.map((size) => (
            <div key={size} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">{size}</label>
              </div>
              
              <div className="space-y-3">
                <div>
                  <input
                    type="number"
                    min="0"
                    value={plateQuantities[size] || ''}
                    onChange={(e) => handleQuantityChange(size, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-medium"
                    placeholder="Qty"
                  />
                </div>
                
                {plateQuantities[size] > 0 && (
                  <div>
                    <textarea
                      value={notes[size] || ''}
                      onChange={(e) => handleNotesChange(size, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                      rows={2}
                      placeholder="Notes (e.g., partner's plates)"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || generatingChallan}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}