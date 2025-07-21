import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Package, Plus, Edit3, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { T } from '../contexts/LanguageContext';

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

export function MobileStockPage() {
  const [stockItems, setStockItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Stock>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlateSize, setNewPlateSize] = useState('');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('plate_size');

      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Stock) => {
    setEditingItem(item.id);
    setEditValues(item);
  };

  const handleSave = async () => {
    if (!editingItem || !editValues) return;

    try {
      const { error } = await supabase
        .from('stock')
        .update({
          total_quantity: editValues.total_quantity,
          available_quantity: editValues.available_quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem);

      if (error) throw error;

      setEditingItem(null);
      setEditValues({});
      await fetchStock();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const handleAddPlateSize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('stock')
        .insert([{
          plate_size: newPlateSize,
          total_quantity: 0,
          available_quantity: 0,
          on_rent_quantity: 0
        }]);

      if (error) throw error;

      setNewPlateSize('');
      setShowAddForm(false);
      await fetchStock();
    } catch (error) {
      console.error('Error adding plate size:', error);
      alert('Error adding plate size. Please check if it already exists.');
    }
  };

  const getStockStatus = (item: Stock) => {
    const total = item.total_quantity;
    if (total === 0) return { status: 'empty', color: 'text-gray-500', bg: 'bg-gray-50', icon: AlertTriangle };
    if (item.available_quantity < 10) return { status: 'low', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    if (item.available_quantity < 50) return { status: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          <T>Stock</T>
        </h1>
        <p className="text-sm text-gray-600">સ્ટોક - Manage inventory levels</p>
      </div>

      {/* Add New Plate Size */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Overview</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Size
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddPlateSize} className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <select
                value={newPlateSize}
                onChange={(e) => setNewPlateSize(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  <T>Cancel</T>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Stock Grid */}
      <div className="space-y-3">
        {stockItems.map((item) => {
          const stockStatus = getStockStatus(item);
          const isEditing = editingItem === item.id;
          const StatusIcon = stockStatus.icon;
          
          return (
            <div key={item.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${stockStatus.bg}`}>
              <div className="flex items-center justify-between mb-3">
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

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <T>Available</T>
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editValues.available_quantity || 0}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          available_quantity: parseInt(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                      />
                    ) : (
                      <p className={`text-2xl font-bold ${stockStatus.color}`}>
                        {item.available_quantity}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <T>On Rent</T>
                    </label>
                    <p className="text-2xl font-bold text-blue-600">{item.on_rent_quantity}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <T>Total Quantity</T>
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

                {/* Stock Status Indicator */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <StatusIcon className={`w-4 h-4 ${stockStatus.color.replace('text-', 'text-')}`} />
                  <span className={`text-sm font-medium ${stockStatus.color}`}>
                    {stockStatus.status === 'low' && 'Low Stock'}
                    {stockStatus.status === 'medium' && 'Medium Stock'}
                    {stockStatus.status === 'good' && 'Good Stock'}
                    {stockStatus.status === 'empty' && 'No Stock'}
                  </span>
                </div>
              </div>
            </div>
          );
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
  );
}