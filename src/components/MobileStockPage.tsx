import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Package, Plus, Edit3, Save, X, AlertTriangle, CheckCircle, Search, BarChart3 } from 'lucide-react';
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
      alert('સ્ટોક અપડેટ કરવામાં ભૂલ. કૃપા કરીને ફરી પ્રયત્ન કરો.');
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
    <tr className="transition-colors border-b border-blue-100 hover:bg-blue-25">
      <td className="px-2 py-1.5 font-medium text-gray-900 text-xs">{plateSize}</td>
      
      {isEditing ? (
        <>
          <td className="px-2 py-1.5">
            <input
              type="number"
              min="0"
              value={editValues.total_quantity}
              onChange={(e) => setEditValues(prev => ({
                ...prev, 
                total_quantity: parseInt(e.target.value) || 0
              }))}
              className="w-16 px-1 py-1 text-xs text-center border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </td>
          <td className="px-2 py-1.5 text-center text-gray-500">
            <span className="text-xs">{stockData?.available_quantity || 0}</span>
            <div className="text-xs text-blue-400">ઓટો</div>
          </td>
          <td className="px-2 py-1.5 text-center text-blue-600 font-medium text-xs">
            {stockData?.on_rent_quantity || 0}
          </td>
          <td className="px-2 py-1.5">
            <div className="flex space-x-1">
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs text-white transition-colors bg-green-500 rounded hover:bg-green-600"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs text-white transition-colors bg-gray-500 rounded hover:bg-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-2 py-1.5 text-center font-medium text-purple-600 text-xs">
            {stockData?.total_quantity || 0}
          </td>
          <td className="px-2 py-1.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAvailabilityColor(stockData?.available_quantity || 0)}`}>
              {stockData?.available_quantity || 0}
            </span>
          </td>
          <td className="px-2 py-1.5 text-center font-medium text-blue-600 text-xs">
            {stockData?.on_rent_quantity || 0}
          </td>
          <td className="px-2 py-1.5">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
            >
              <Edit3 className="w-3 h-3" />
              એડિટ
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

      const newAvailableQuantity = (values.total_quantity || stockItem.total_quantity) - stockItem.on_rent_quantity;

      const { error } = await supabase
        .from('stock')
        .update({
          total_quantity: values.total_quantity,
          available_quantity: Math.max(0, newAvailableQuantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', stockItem.id);

      if (error) throw error;

      await fetchStock();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('સ્ટોક અપડેટ કરવામાં ભૂલ. કૃપા કરીને ફરી પ્રયત્ન કરો.');
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
      alert('નવો પ્લેટ સાઇઝ ઉમેરવામાં આવ્યો!');
    } catch (error) {
      console.error('Error adding plate size:', error);
      alert('પ્લેટ સાઇઝ ઉમેરવામાં ભૂલ. કદાચ તે પહેલેથી અસ્તિત્વમાં છે.');
    }
  };

  const stockMap = stockItems.reduce((acc, item) => {
    acc[item.plate_size] = item;
    return acc;
  }, {} as Record<string, Stock>);

  const filteredPlateSizes = PLATE_SIZES.filter(size =>
    size.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals for subtotal row
  const calculateTotals = () => {
    const filteredStockItems = filteredPlateSizes
      .map(size => stockMap[size])
      .filter(Boolean);

    return {
      totalStock: filteredStockItems.reduce((sum, item) => sum + (item?.total_quantity || 0), 0),
      totalAvailable: filteredStockItems.reduce((sum, item) => sum + (item?.available_quantity || 0), 0),
      totalOnRent: filteredStockItems.reduce((sum, item) => sum + (item?.on_rent_quantity || 0), 0)
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
        <div className="p-3 space-y-3">
          <div className="pt-2 text-center">
            <div className="w-32 h-5 mx-auto mb-1 bg-blue-200 rounded animate-pulse"></div>
            <div className="w-40 h-3 mx-auto bg-blue-200 rounded animate-pulse"></div>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3 bg-white border border-blue-100 rounded-lg shadow-sm animate-pulse">
              <div className="w-2/3 h-4 mb-2 bg-blue-200 rounded"></div>
              <div className="w-1/2 h-3 bg-blue-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      <div className="p-3 space-y-4">
        {/* Blue Themed Header */}
        <div className="pt-2 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 mb-2 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="mb-1 text-base font-bold text-gray-900">સ્ટોક</h1>
          <p className="text-xs text-blue-600">ઇન્વેન્ટરી મેનેજમેન્ટ</p>
        </div>

        {/* Blue Themed Stock Table */}
        <div className="overflow-hidden bg-white border-2 border-blue-100 shadow-lg rounded-xl">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Package className="w-4 h-4" />
              સ્ટોક મેનેજમેન્ટ
            </h2>
            <p className="mt-1 text-xs text-blue-100">માત્રા અપડેટ કરવા માટે એડિટ કલિક કરો</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-100 to-indigo-100">
                  <th className="px-2 py-2 font-bold text-left text-blue-900">
                    પ્લેટ સાઇઝ
                  </th>
                  <th className="px-2 py-2 font-bold text-center text-blue-900">
                    કુલ સ્ટોક
                  </th>
                  <th className="px-2 py-2 font-bold text-center text-blue-900">
                    ઉપલબ્ધ
                  </th>
                  <th className="px-2 py-2 font-bold text-center text-blue-900">
                    ભાડે આપેલ
                  </th>
                  <th className="px-2 py-2 font-bold text-center text-blue-900">
                    ક્રિયા
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
                
                {/* Subtotal Row */}
                <tr className="border-t-4 border-green-300 bg-gradient-to-r from-green-100 to-emerald-100">
                  <td className="px-2 py-2 text-xs font-bold text-green-900 border-r-2 border-green-300">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      કુલ જોડ (Subtotal)
                    </div>
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-center text-green-800 border-r border-green-200 bg-purple-50">
                    {totals.totalStock}
                  </td>
                  <td className="px-2 py-2 text-center border-r border-green-200">
                    <span className="px-2 py-1 text-sm font-bold text-green-800 bg-green-200 rounded-full">
                      {totals.totalAvailable}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-center text-blue-800 border-r border-green-200 bg-blue-50">
                    {totals.totalOnRent}
                  </td>
                  <td className="px-2 py-2 text-xs font-medium text-center text-green-700">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {filteredPlateSizes.length === 0 && (
          <div className="p-8 text-center bg-white border-2 border-blue-100 shadow-lg rounded-xl">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200">
              <Package className="w-8 h-8 text-blue-400" />
            </div>
            <p className="mb-1 font-medium text-gray-700">
              {searchTerm ? 'કોઈ મેચિંગ પ્લેટ સાઇઝ મળ્યો નથી' : 'કોઈ પ્લેટ સાઇઝ કોન્ફિગર નથી'}
            </p>
            <p className="text-xs text-blue-600">
              {searchTerm ? 'શોધ શબ્દ બદલીને પ્રયત્ન કરો' : 'નવા પ્લેટ સાઇઝ ઉમેરો'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
