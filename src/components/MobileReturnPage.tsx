import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Calendar, User, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RentalItem {
  id: string;
  item_name: string;
  quantity: number;
  issue_date: string;
  client_name: string;
  client_id: string;
  rate: number;
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
        .from('rentals')
        .select(`
          id,
          item_name,
          quantity,
          issue_date,
          rate,
          clients (
            id,
            name
          )
        `)
        .eq('status', 'active')
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const formattedRentals = data?.map(rental => ({
        id: rental.id,
        item_name: rental.item_name,
        quantity: rental.quantity,
        issue_date: rental.issue_date,
        rate: rental.rate,
        client_name: rental.clients?.name || 'Unknown Client',
        client_id: rental.clients?.id || ''
      })) || [];

      setRentals(formattedRentals);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (rentalId: string) => {
    setReturning(rentalId);
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ 
          status: 'returned',
          return_date: new Date().toISOString()
        })
        .eq('id', rentalId);

      if (error) throw error;

      // Remove from local state
      setRentals(prev => prev.filter(rental => rental.id !== rentalId));
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
                    <h3 className="font-medium text-gray-800 mb-1">{rental.item_name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <User className="w-4 h-4 mr-1" />
                      {rental.client_name}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(rental.issue_date)} • {calculateDays(rental.issue_date)} days
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Qty: {rental.quantity}</div>
                    <div className="text-sm font-medium text-gray-800">₹{rental.rate}/day</div>
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