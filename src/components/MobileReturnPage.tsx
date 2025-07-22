import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Calendar, User, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RentalItem {
  id: string;
  plate_size: string;
  borrowed_quantity: number;
  returned_quantity: number;
  outstanding_quantity: number;
  issue_date: string;
  client_name: string;
  client_id: string;
  challan_number: string;
}

interface MobileReturnPageProps {
  onBack: () => void;
}

export default function MobileReturnPage({ onBack }: MobileReturnPageProps) {
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveRentals();
  }, []);

  const fetchActiveRentals = async () => {
    try {
      const { data, error } = await supabase
        .from('challan_items')
        .select(`
          id,
          plate_size,
          borrowed_quantity,
          returned_quantity,
          challans (
            id,
            challan_number,
            challan_date,
            clients (
              id,
              name
            )
          )
        `)
        .gt('borrowed_quantity', 0)
        .order('id', { ascending: false });

      if (error) throw error;

      const formattedRentals = data?.filter(item => {
        const outstandingQty = (item.borrowed_quantity || 0) - (item.returned_quantity || 0);
        return outstandingQty > 0;
      }).map(item => {
        const outstandingQty = (item.borrowed_quantity || 0) - (item.returned_quantity || 0);
        return {
          id: item.id,
          plate_size: item.plate_size,
          borrowed_quantity: item.borrowed_quantity || 0,
          returned_quantity: item.returned_quantity || 0,
          outstanding_quantity: outstandingQty,
          issue_date: item.challans?.challan_date || '',
          client_name: item.challans?.clients?.name || 'Unknown Client',
          client_id: item.challans?.clients?.id || '',
          challan_number: item.challans?.challan_number || ''
        };
      }) || [];

      setRentals(formattedRentals);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReturnChallanNumber = () => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    return `RET-${timestamp}`;
  };

  const handleReturn = async (challanItemId: string) => {
    setReturning(challanItemId);
    try {
      const rental = rentals.find(r => r.id === challanItemId);
      if (!rental) throw new Error('Rental item not found');

      // Create return record
      const returnChallanNumber = generateReturnChallanNumber();
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .insert({
          return_challan_number: returnChallanNumber,
          client_id: rental.client_id,
          return_date: new Date().toISOString()
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return line item
      const { error: lineItemError } = await supabase
        .from('return_line_items')
        .insert({
          return_id: returnData.id,
          item_name: rental.plate_size,
          quantity: rental.outstanding_quantity
        });

      if (lineItemError) throw lineItemError;

      // Update challan item returned quantity
      const { error: updateError } = await supabase
        .from('challan_items')
        .update({ 
          returned_quantity: rental.borrowed_quantity
        })
        .eq('id', challanItemId);

      if (updateError) throw updateError;

      // Remove from local state
      setRentals(prev => prev.filter(rental => rental.id !== challanItemId));
    } catch (error) {
      console.error('Error returning item:', error);
    } finally {
      setReturning(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDays = (issueDate: string) => {
    const issue = new Date(issueDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - issue.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rentals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Return Items</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {rentals.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Active Rentals</h3>
            <p className="text-gray-500">All items have been returned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map((rental) => (
              <div key={rental.id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 mb-1">{rental.plate_size}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <User className="w-4 h-4 mr-1" />
                      {rental.client_name}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(rental.issue_date)} • {calculateDays(rental.issue_date)} days
                    </div>
                    <div className="text-xs text-gray-500">
                      Challan: {rental.challan_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Outstanding: {rental.outstanding_quantity}</div>
                    <div className="text-xs text-gray-500">Total: {rental.borrowed_quantity}</div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleReturn(rental.id)}
                  disabled={returning === rental.id}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {returning === rental.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Returning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Returned
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}