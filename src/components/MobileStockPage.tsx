import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Package, Plus, Edit3, Save, X, AlertTriangle, CheckCircle, Search } from 'lucide-react';
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

interface StockRowProps {
  plateSize: string;
  stockData: Stock | undefined;
  onUpdate: (plateSize: string, values: Partial<Stock>) => Promise<void>;
}

function StockRow({ plateSize, stockData, onUpdate }: StockRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    total_quantity: stockData?.total_quantity || 0
  });

  const handleSave = async () => {
    try {
      await onUpdate(plateSize, { total_quantity: editValues.total_quantity });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditValues({
      total_quantity: stockData?.total_quantity || 0
    });
    setIsEditing(false);
  };

  const getAvailabilityColor = (available: number) => {
    if (available > 20) return 'bg-green-100 text-green-800';
    if (available > 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-3 py-3 font-medium text-gray-900">{plateSize}</td>
      
      {isEditing ? (
        <>
          <td className="px-3 py-3">
            <input
              type="number"
              min="0"
              value={editValues.total_quantity}
              onChange={(e) => setEditValues(prev => ({
                ...prev, 
                total_quantity: parseInt(e.target.value) || 0
              }))}
              className="w-20 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </td>
          <td className="px-3 py-3 text-center text-gray-500">
            {stockData?.available_quantity || 0}
            <div className="text-xs text-gray-400">Auto-calculated</div>
          </td>
          <td className="px-3 py-3 text-center text-blue-600 font-medium">
            {stockData?.on_rent_quantity || 0}
          </td>
          <td className="px-3 py-3">
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-3 text-center font-medium text-purple-600">
            {stockData?.total_quantity || 0}
          </td>
          <td className="px-3 py-3">
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(stockData?.available_quantity || 0)}`}>
              {stockData?.available_quantity || 0}
            </span>
          </td>
          <td className="px-3 py-3 text-center font-medium text-blue-600">
            {stockData?.on_rent_quantity || 0}
          </td>
          <td className="px-3 py-3">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

export function MobileStockPage() {
  const [stockItems, setStockItems] = useState<Stock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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

  const handleUpdateStock = async (plateSize: string, values: Partial<Stock>) => {
    try {
      const stockItem = stockItems.find(item => item.plate_size === plateSize);
      if (!stockItem) return;

      // Calculate new available quantity based on total - on_rent
      const newAvailableQuantity = (values.total_quantity || stockItem.total_quantity) - stockItem.on_rent_quantity;

      const { error } = await supabase
        .from('stock')
        .update({
          total_quantity: values.total_quantity,
          available_quantity: Math.max(0, newAvailableQuantity), // Ensure non-negative
          updated_at: new Date().toISOString()
        })
        .eq('id', stockItem.id);

      if (error) throw error;

      await fetchStock();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock. Please try again.');
    }
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

  const stockMap = stockItems.reduce((acc, item) => {
    acc[item.plate_size] = item;
    return acc;
  }, {} as Record<string, Stock>);

  const filteredPlateSizes = PLATE_SIZES.filter(size =>
    size.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <p className="text-sm text-gray-600">સ્ટોક - Inventory Management</p>
      </div>

      {/* Search and Add Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="Search plate sizes..."
            />
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <T>Add New</T> Size
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAddPlateSize} className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <select
                value={newPlateSize}
                onChange={(e) => setNewPlateSize(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                required
              >
                <option value="">Select plate size to add</option>
                {PLATE_SIZES.filter(size => !stockMap[size]).map(size => (
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

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Stock Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">Click Edit to update quantities</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">
                  Plate Size
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">
                  Total Stock
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">
                  Available
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">
                  On Rent
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlateSizes.map((plateSize) => (
                <StockRow
                  key={plateSize}
                  plateSize={plateSize}
                  stockData={stockMap[plateSize]}
                  onUpdate={handleUpdateStock}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPlateSizes.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm ? 'No matching plate sizes found' : 'No plate sizes configured'}
          </p>
        </div>
      )}
    </div>
  );
}