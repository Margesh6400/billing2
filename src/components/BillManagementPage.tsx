import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Download, Eye, Search } from 'lucide-react';

interface Bill {
  id: number;
  bill_number: string;
  client_id: string;
  client: {
    name: string;
  };
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  generated_at: string;
}

export function BillManagementPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          client:clients(name)
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (billId: number) => {
    try {
      setDownloading(billId);
      // TODO: Implement PDF generation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
    } catch (error) {
      console.error('Error downloading bill:', error);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Search Header */}
      <div className="sticky top-16 bg-gray-50 z-40 -mx-4 px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search bills by number or client..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.map((bill) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-900">Bill #{bill.bill_number}</h3>
                <p className="text-sm text-gray-500">{bill.client.name}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.payment_status)}`}>
                {bill.payment_status.charAt(0).toUpperCase() + bill.payment_status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Period</p>
                <p className="font-medium">{format(new Date(bill.billing_period_start), 'dd/MM/yyyy')} - {format(new Date(bill.billing_period_end), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p className="text-gray-500">Amount</p>
                <p className="font-medium">₹{bill.total_amount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Link
                to={`/bills/${bill.id}`}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              >
                <Eye className="w-5 h-5" />
              </Link>
              <button
                onClick={() => handleDownload(bill.id)}
                disabled={downloading === bill.id}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredBills.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No bills found</p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
