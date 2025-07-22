import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { Package, Plus, Edit3, Save, X, AlertTriangle, CheckCircle } from 'lucide-react'

type Stock = Database['public']['Tables']['stock']['Row']

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

export function StockPage() {
  const [stockItems, setStockItems] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Partial<Stock>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlateSize, setNewPlateSize] = useState('')

  useEffect(() => {
    fetchStock()
  }, [])

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('plate_size')

      if (error) throw error
      setStockItems(data || [])
    } catch (error) {
      console.error('Error fetching stock:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: Stock) => {
    setEditingItem(item.id)
    setEditValues({ total_quantity: item.total_quantity })
  }

  const handleSave = async () => {
    if (!editingItem || !editValues) return

    try {
      const currentItem = stockItems.find(item => item.id === editingItem);
      if (!currentItem) return;

      // Calculate new available quantity: total - on_rent
      const newAvailableQuantity = (editValues.total_quantity || currentItem.total_quantity) - currentItem.on_rent_quantity;

      const { error } = await supabase
        .from('stock')
        .update({
          total_quantity: editValues.total_quantity,
          available_quantity: Math.max(0, newAvailableQuantity), // Ensure non-negative
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem)

      if (error) throw error

      setEditingItem(null)
      setEditValues({})
      await fetchStock()
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Error updating stock. Please try again.')
    }
  }

  const handleCancel = () => {
    setEditingItem(null)
    setEditValues({})
  }

  const handleAddPlateSize = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('stock')
        .insert([{
          plate_size: newPlateSize,
          total_quantity: 0,
          available_quantity: 0,
          on_rent_quantity: 0
        }])

      if (error) throw error

      setNewPlateSize('')
      setShowAddForm(false)
      await fetchStock()
    } catch (error) {
      console.error('Error adding plate size:', error)
      alert('Error adding plate size. Please check if it already exists.')
    }
  }

  const getStockStatus = (item: Stock) => {
    const total = item.total_quantity
    if (total === 0) return { status: 'empty', color: 'text-gray-500', bg: 'bg-gray-50' }
    if (item.available_quantity < 10) return { status: 'low', color: 'text-red-600', bg: 'bg-red-50' }
    if (item.available_quantity < 50) return { status: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Management</h1>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Management</h1>
        <p className="text-gray-600">Manage your plate inventory levels</p>
      </div>

      {/* Add New Plate Size */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Overview</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Plate Size
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddPlateSize} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newPlateSize}
                onChange={(e) => setNewPlateSize(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                required
              >
                <option value="">Select plate size to add</option>
                {PLATE_SIZES.filter(size => !stockItems.some(item => item.plate_size === size)).map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newPlateSize}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Stock Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stockItems.map((item) => {
          const stockStatus = getStockStatus(item)
          const isEditing = editingItem === item.id
          
          return (
            <div key={item.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${stockStatus.bg}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className={`w-5 h-5 ${stockStatus.color}`} />
                  <h3 className="text-lg font-semibold text-gray-900">{item.plate_size}</h3>
                </div>
                
                {!isEditing ? (
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={handleSave}
                      className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available (Auto-calculated)
                    </label>
                    {isEditing ? (
                      <div className="text-center py-2 text-gray-500 bg-gray-100 rounded-lg">
                        {Math.max(0, (editValues.total_quantity || 0) - (item.on_rent_quantity || 0))}
                        <div className="text-xs text-gray-400">Total - On Rent</div>
                      </div>
                    ) : (
                      <p className={`text-2xl font-bold ${stockStatus.color}`}>
                        {item.available_quantity}
                        <div className="text-xs text-gray-400">Auto-calculated</div>
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      On Rent (Auto-updated)
                    </label>
                    <p className="text-2xl font-bold text-blue-600">
                      {item.on_rent_quantity}
                      <div className="text-xs text-gray-400">From transactions</div>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Quantity
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editValues.total_quantity || 0}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          total_quantity: parseInt(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-purple-600">{item.total_quantity}</p>
                    )}
                  </div>
                </div>

                {/* Stock Status Indicator */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  {stockStatus.status === 'low' && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 font-medium">Low Stock</span>
                    </>
                  )}
                  {stockStatus.status === 'medium' && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600 font-medium">Medium Stock</span>
                    </>
                  )}
                  {stockStatus.status === 'good' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">Good Stock</span>
                    </>
                  )}
                  {stockStatus.status === 'empty' && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500 font-medium">No Stock</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {stockItems.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No plate sizes configured</p>
          <p className="text-sm text-gray-400 mt-1">Add your first plate size to get started</p>
        </div>
      )}
    </div>
  )
}