import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Download, Eye, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileCard } from './mobile/MobileComponents';

interface Client {
  id: string;
  name: string;
  site: string;
  mobile_number: string;
  udhar_count: number;
  jama_count: number;
}

interface BaseChallan {
  id: number;
  challan_number: string;
  total_plates: number;
}

interface IssueChallan extends BaseChallan {
  challan_date: string;
  status: 'active' | 'completed' | 'partial';
  challan_items: {
    plate_size: string;
    borrowed_quantity: number;
  }[];
}

interface ReturnChallan extends BaseChallan {
  return_date: string;
  return_line_items: {
    plate_size: string;
    returned_quantity: number;
    damaged_quantity: number;
    lost_quantity: number;
  }[];
}

export function ChallanManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [udharChallans, setUdharChallans] = useState<Record<string, IssueChallan[]>>({});
  const [jamaChallans, setJamaChallans] = useState<Record<string, ReturnChallan[]>>({});
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      let { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          challans:challans(count),
          returns:returns(count)
        `)
        .order('name');

      if (error) throw error;

      const mappedClients = data?.map(client => ({
        ...client,
        udhar_count: client.challans,
        jama_count: client.returns
      })) || [];

      setClients(mappedClients);

      // Set up real-time subscription for client updates
      const subscription = supabase
        .channel('clients')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'clients'
        }, () => {
          fetchClients();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientChallans = async (clientId: string) => {
    try {
      // Fetch issue challans
      const { data: udharData, error: udharError } = await supabase
        .from('challans')
        .select(`
          id,
          challan_number,
          challan_date,
          status,
          total_plates,
          challan_items(plate_size, borrowed_quantity)
        `)
        .eq('client_id', clientId)
        .order('challan_date', { ascending: false });

      if (udharError) throw udharError;

      // Set up real-time subscription for issue challans
      const udharSubscription = supabase
        .channel('issue_challans')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'challans',
          filter: `client_id=eq.${clientId}`
        }, () => {
          fetchClientChallans(clientId);
        })
        .subscribe();

      // Fetch return challans
      const { data: jamaData, error: jamaError } = await supabase
        .from('returns')
        .select(`
          id,
          challan_number,
          return_date,
          total_plates,
          return_line_items(plate_size, returned_quantity, damaged_quantity, lost_quantity)
        `)
        .eq('client_id', clientId)
        .order('return_date', { ascending: false });

      if (jamaError) throw jamaError;

      // Set up real-time subscription for return challans
      const jamaSubscription = supabase
        .channel('return_challans')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'returns',
          filter: `client_id=eq.${clientId}`
        }, () => {
          fetchClientChallans(clientId);
        })
        .subscribe();

      setUdharChallans(prev => ({
        ...prev,
        [clientId]: udharData || []
      }));

      setJamaChallans(prev => ({
        ...prev,
        [clientId]: jamaData || []
      }));

      return () => {
        udharSubscription.unsubscribe();
        jamaSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error fetching challans:', error);
    }
  };

  const handleClientExpand = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      if (!udharChallans[clientId] || !jamaChallans[clientId]) {
        await fetchClientChallans(clientId);
      }
    }
  };

  const handleDownloadChallan = async (type: 'udhar' | 'jama', challanId: number) => {
    try {
      setDownloading(challanId);
      
      // Fetch complete challan data for PDF generation
      const { data: challanData, error } = await supabase
        .from(type === 'udhar' ? 'challans' : 'returns')
        .select(`
          *,
          client:clients(*),
          ${type === 'udhar' ? 'challan_items' : 'return_line_items'}(*)
        `)
        .eq('id', challanId)
        .single();

      if (error) throw error;

      // TODO: Implement PDF generation logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay

    } catch (error) {
      console.error('Error downloading challan:', error);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.mobile_number.includes(searchTerm)
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
            placeholder="Search clients..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Client List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <MobileCard
            key={client.id}
            onClick={() => handleClientExpand(client.id)}
          >
            {/* Client Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">{client.name}</h3>
                <p className="text-sm text-gray-500">
                  {client.site} | {client.mobile_number}
                </p>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-600 mr-2">
                  {client.udhar_count} Udhar | {client.jama_count} Jama
                </span>
                {expandedClient === client.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedClient === client.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-4 overflow-hidden"
                >
                  {/* Udhar Challans */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Udhar Challans (Issue) - {client.udhar_count}
                    </h4>
                    {udharChallans[client.id]?.map((challan) => (
                      <div
                        key={challan.id}
                        className="bg-white rounded-lg p-3 mb-2 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">#{challan.challan_number}</span>
                            <p className="text-sm text-gray-500">
                              {format(new Date(challan.challan_date!), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(challan.status)}`}>
                            {challan.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {challan.total_plates} plates
                          </span>
                          <div className="flex space-x-2">
                            <Link
                              to={`/challans/issue/${challan.id}`}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-full"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDownloadChallan('udhar', challan.id)}
                              disabled={downloading === challan.id}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Jama Challans */}
                  <div className="bg-green-50 rounded-lg p-3">
                    <h4 className="font-medium text-green-900 mb-2">
                      Jama Challans (Return) - {client.jama_count}
                    </h4>
                    {jamaChallans[client.id]?.map((challan) => (
                      <div
                        key={challan.id}
                        className="bg-white rounded-lg p-3 mb-2 shadow-sm"
                      >
                        <div className="flex justify-between mb-2">
                          <div>
                            <span className="font-medium">#{challan.challan_number}</span>
                            <p className="text-sm text-gray-500">
                              {format(new Date(challan.return_date!), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {challan.total_plates} plates returned
                          </span>
                          <div className="flex space-x-2">
                            <Link
                              to={`/challans/return/${challan.id}`}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-full"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDownloadChallan('jama', challan.id)}
                              disabled={downloading === challan.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </MobileCard>
        ))}

        {filteredClients.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No clients found</p>
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
