import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Download, Eye, Search, ChevronDown, ChevronUp, Calendar, User, Hash, FileText, RotateCcw, Edit, Save, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { T, useTranslation } from '../contexts/LanguageContext';
import { generateAndDownloadPDF } from '../utils/pdfGenerator';
import { PrintableChallan } from './challans/PrintableChallan';
import { ChallanData } from './challans/types';

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

interface Client {
  id: string;
  name: string;
  site: string;
  mobile_number: string;
}

interface UdharChallan {
  id: number;
  challan_number: string;
  challan_date: string;
  status: 'active' | 'completed' | 'partial';
  client: Client;
  challan_items: {
    plate_size: string;
    borrowed_quantity: number;
    partner_stock_notes?: string;
  }[];
  total_plates: number;
}

interface JamaChallan {
  id: number;
  return_challan_number: string;
  return_date: string;
  client: Client;
  return_line_items: {
    plate_size: string;
    returned_quantity: number;
    damage_notes?: string;
  }[];
  total_plates: number;
}

interface EditingChallan {
  id: number;
  type: 'udhar' | 'jama';
  challan_number: string;
  date: string;
  client_id: string;
  plates: Record<string, number>;
  note: string;
}

type TabType = 'udhar' | 'jama';

export function ChallanManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('udhar');
  const [udharChallans, setUdharChallans] = useState<UdharChallan[]>([]);
  const [jamaChallans, setJamaChallans] = useState<JamaChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedChallan, setExpandedChallan] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);
  const { language } = useTranslation();
  const [editingChallan, setEditingChallan] = useState<EditingChallan | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchChallans();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchChallans = async () => {
    try {
      setLoading(true);
      
      // Fetch Udhar Challans (Issue Challans)
      const { data: udharData, error: udharError } = await supabase
        .from('challans')
        .select(`
          id,
          challan_number,
          challan_date,
          status,
          client:clients(id, name, site, mobile_number),
          challan_items(plate_size, borrowed_quantity, partner_stock_notes)
        `)
        .order('challan_date', { ascending: false });

      if (udharError) throw udharError;

      // Transform udhar data
      const transformedUdharData = udharData?.map(challan => ({
        ...challan,
        total_plates: challan.challan_items?.reduce((sum, item) => sum + item.borrowed_quantity, 0) || 0
      })) || [];

      // Fetch Jama Challans (Return Challans)
      const { data: jamaData, error: jamaError } = await supabase
        .from('returns')
        .select(`
          id,
          return_challan_number,
          return_date,
          client:clients(id, name, site, mobile_number),
          return_line_items(plate_size, returned_quantity, damage_notes)
        `)
        .order('return_date', { ascending: false });

      if (jamaError) throw jamaError;

      // Transform jama data
      const transformedJamaData = jamaData?.map(returnChallan => ({
        ...returnChallan,
        total_plates: returnChallan.return_line_items?.reduce((sum, item) => sum + item.returned_quantity, 0) || 0
      })) || [];

      setUdharChallans(transformedUdharData);
      setJamaChallans(transformedJamaData);
    } catch (error) {
      console.error('Error fetching challans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChallan = async (challan: UdharChallan | JamaChallan, type: 'udhar' | 'jama') => {
    try {
      // Fetch detailed challan data
      if (type === 'udhar') {
        const { data, error } = await supabase
          .from('challans')
          .select(`
            *,
            challan_items(*)
          `)
          .eq('id', challan.id)
          .single();

        if (error) throw error;

        const plates: Record<string, number> = {};
        data.challan_items.forEach(item => {
          plates[item.plate_size] = item.borrowed_quantity;
        });

        setEditingChallan({
          id: challan.id,
          type: 'udhar',
          challan_number: data.challan_number,
          date: data.challan_date,
          client_id: data.client_id,
          plates,
          note: data.challan_items[0]?.partner_stock_notes || ''
        });
      } else {
        const { data, error } = await supabase
          .from('returns')
          .select(`
            *,
            return_line_items(*)
          `)
          .eq('id', challan.id)
          .single();

        if (error) throw error;

        const plates: Record<string, number> = {};
        data.return_line_items.forEach(item => {
          plates[item.plate_size] = item.returned_quantity;
        });

        setEditingChallan({
          id: challan.id,
          type: 'jama',
          challan_number: data.return_challan_number,
          date: data.return_date,
          client_id: data.client_id,
          plates,
          note: data.return_line_items[0]?.damage_notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching challan details:', error);
      alert('Error loading challan details.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingChallan) return;

    setEditLoading(true);
    try {
      if (editingChallan.type === 'udhar') {
        // Update challan
        const { error: challanError } = await supabase
          .from('challans')
          .update({
            challan_number: editingChallan.challan_number,
            challan_date: editingChallan.date,
            client_id: editingChallan.client_id
          })
          .eq('id', editingChallan.id);

        if (challanError) throw challanError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('challan_items')
          .delete()
          .eq('challan_id', editingChallan.id);

        if (deleteError) throw deleteError;

        // Insert new items
        const newItems = Object.entries(editingChallan.plates)
          .filter(([_, quantity]) => quantity > 0)
          .map(([plate_size, quantity]) => ({
            challan_id: editingChallan.id,
            plate_size,
            borrowed_quantity: quantity,
            partner_stock_notes: editingChallan.note || null
          }));

        if (newItems.length > 0) {
          const { error: insertError } = await supabase
            .from('challan_items')
            .insert(newItems);

          if (insertError) throw insertError;
        }
      } else {
        // Update return
        const { error: returnError } = await supabase
          .from('returns')
          .update({
            return_challan_number: editingChallan.challan_number,
            return_date: editingChallan.date,
            client_id: editingChallan.client_id
          })
          .eq('id', editingChallan.id);

        if (returnError) throw returnError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('return_line_items')
          .delete()
          .eq('return_id', editingChallan.id);

        if (deleteError) throw deleteError;

        // Insert new items
        const newItems = Object.entries(editingChallan.plates)
          .filter(([_, quantity]) => quantity > 0)
          .map(([plate_size, quantity]) => ({
            return_id: editingChallan.id,
            plate_size,
            returned_quantity: quantity,
            damage_notes: editingChallan.note || null
          }));

        if (newItems.length > 0) {
          const { error: insertError } = await supabase
            .from('return_line_items')
            .insert(newItems);

          if (insertError) throw insertError;
        }
      }

      setEditingChallan(null);
      await fetchChallans();
      alert('Challan updated successfully!');
    } catch (error) {
      console.error('Error updating challan:', error);
      alert('Error updating challan. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteChallan = async () => {
    if (!editingChallan) return;

    const confirmDelete = confirm(`Are you sure you want to delete this ${editingChallan.type} challan? This action cannot be undone.`);
    if (!confirmDelete) return;

    setEditLoading(true);
    try {
      if (editingChallan.type === 'udhar') {
        const { error } = await supabase
          .from('challans')
          .delete()
          .eq('id', editingChallan.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('returns')
          .delete()
          .eq('id', editingChallan.id);

        if (error) throw error;
      }

      setEditingChallan(null);
      await fetchChallans();
      alert('Challan deleted successfully!');
    } catch (error) {
      console.error('Error deleting challan:', error);
      alert('Error deleting challan. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDownload = async (challan: UdharChallan | JamaChallan, type: 'udhar' | 'jama') => {
    try {
      setDownloading(challan.id);
      
      // Prepare challan data for PDF
      const challanDataForPDF: ChallanData = {
        type: type === 'udhar' ? 'issue' : 'return',
        challan_number: type === 'udhar' 
          ? (challan as UdharChallan).challan_number 
          : (challan as JamaChallan).return_challan_number,
        date: type === 'udhar' 
          ? (challan as UdharChallan).challan_date 
          : (challan as JamaChallan).return_date,
        client: {
          id: challan.client.id,
          name: challan.client.name,
          site: challan.client.site || '',
          mobile: challan.client.mobile_number || ''
        },
        plates: type === 'udhar' 
          ? (challan as UdharChallan).challan_items.map(item => ({
              size: item.plate_size,
              quantity: item.borrowed_quantity,
              notes: item.partner_stock_notes || '',
            }))
          : (challan as JamaChallan).return_line_items.map(item => ({
              size: item.plate_size,
              quantity: item.returned_quantity,
              notes: item.damage_notes || '',
            })),
        total_quantity: challan.total_plates
      };

      setChallanData(challanDataForPDF);
      
      // Wait for the component to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate and download the PDF
      const success = await generateAndDownloadPDF(
        `challan-${challanDataForPDF.challan_number}`,
        `${type}-challan-${challanDataForPDF.challan_number}`
      );

      if (!success) {
        throw new Error('Failed to generate PDF');
      }

      setChallanData(null);
    } catch (error) {
      console.error('Error downloading challan:', error);
      alert('Error downloading challan. Please try again.');
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

  const getStatusText = (status: string) => {
    const statusMap = {
      'active': { gu: 'સક્રિય', en: 'Active' },
      'completed': { gu: 'પૂર્ણ', en: 'Completed' },
      'partial': { gu: 'અર્ધ', en: 'Partial' },
      'returned': { gu: 'પરત', en: 'Returned' }
    };
    return statusMap[status as keyof typeof statusMap]?.[language] || status;
  };

  const filteredUdharChallans = udharChallans.filter(challan =>
    challan.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    challan.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    format(new Date(challan.challan_date), 'dd/MM/yyyy').includes(searchTerm)
  );

  const filteredJamaChallans = jamaChallans.filter(challan =>
    challan.return_challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    challan.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    format(new Date(challan.return_date), 'dd/MM/yyyy').includes(searchTerm)
  );

  const currentChallans = activeTab === 'udhar' ? filteredUdharChallans : filteredJamaChallans;

  return (
    <div className="space-y-4 pb-4">
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          <T>Challan Management</T>
        </h1>
        <p className="text-sm text-gray-600">ચલણ વ્યવસ્થાપન - Manage all challans</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('udhar')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'udhar'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm">
              {language === 'gu' ? 'ઉધાર ચલણ' : 'Udhar Challans'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('jama')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'jama'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-sm">
              {language === 'gu' ? 'જમા ચલણ' : 'Jama Challans'}
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={language === 'gu' ? 'ચલણ નંબર, ગ્રાહક અથવા તારીખ શોધો...' : 'Search by challan number, client or date...'}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
      </div>

      {/* Challans List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : currentChallans.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                activeTab === 'udhar' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {activeTab === 'udhar' ? (
                  <FileText className={`w-8 h-8 ${activeTab === 'udhar' ? 'text-green-600' : 'text-blue-600'}`} />
                ) : (
                  <RotateCcw className={`w-8 h-8 ${activeTab === 'udhar' ? 'text-green-600' : 'text-blue-600'}`} />
                )}
              </div>
              <p className="text-gray-500 text-lg font-medium mb-2">
                {activeTab === 'udhar' 
                  ? (language === 'gu' ? 'કોઈ ઉધાર ચલણ મળ્યું નથી' : 'No Udhar challans found')
                  : (language === 'gu' ? 'કોઈ જમા ચલણ મળ્યું નથી' : 'No Jama challans found')
                }
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm 
                  ? (language === 'gu' ? 'શોધ માપદંડ બદલીને ફરી પ્રયાસ કરો' : 'Try changing your search criteria')
                  : (language === 'gu' ? 'નવું ચલણ બનાવવા માટે શરૂ કરો' : 'Start by creating a new challan')
                }
              </p>
            </div>
          ) : (
            currentChallans.map((challan) => (
              <motion.div
                key={challan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Challan Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedChallan(expandedChallan === challan.id ? null : challan.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {activeTab === 'udhar' 
                            ? (challan as UdharChallan).challan_number
                            : (challan as JamaChallan).return_challan_number
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(
                            activeTab === 'udhar' 
                              ? (challan as UdharChallan).challan_date
                              : (challan as JamaChallan).return_date
                          ), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{challan.client.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {activeTab === 'udhar' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor((challan as UdharChallan).status)}`}>
                          {getStatusText((challan as UdharChallan).status)}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          {challan.total_plates} {language === 'gu' ? 'પ્લેટ્સ' : 'plates'}
                        </span>
                        {expandedChallan === challan.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditChallan(challan, activeTab);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedChallan(expandedChallan === challan.id ? null : challan.id);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <T>View</T>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(challan, activeTab);
                      }}
                      disabled={downloading === challan.id}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        activeTab === 'udhar'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      } disabled:opacity-50`}
                    >
                      <Download className="w-4 h-4" />
                      {downloading === challan.id ? (
                        language === 'gu' ? 'ડાઉનલોડ થઈ રહ્યું છે...' : 'Downloading...'
                      ) : (
                        <T>Download</T>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedChallan === challan.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200 bg-gray-50 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {/* Client Details */}
                        <div className="bg-white rounded-lg p-3">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {language === 'gu' ? 'ગ્રાહક વિગતો' : 'Client Details'}
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">{language === 'gu' ? 'ID:' : 'ID:'}</span>
                              <span className="ml-1 font-medium">{challan.client.id}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">{language === 'gu' ? 'સાઇટ:' : 'Site:'}</span>
                              <span className="ml-1 font-medium">{challan.client.site}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">{language === 'gu' ? 'મોબાઇલ:' : 'Mobile:'}</span>
                              <span className="ml-1 font-medium">{challan.client.mobile_number}</span>
                            </div>
                          </div>
                        </div>

                        {/* Plate Details */}
                        <div className="bg-white rounded-lg p-3">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {language === 'gu' ? 'પ્લેટ વિગતો' : 'Plate Details'}
                          </h4>
                          <div className="space-y-2">
                            {activeTab === 'udhar' 
                              ? (challan as UdharChallan).challan_items.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                                    <span className="font-medium">{item.plate_size}</span>
                                    <div className="text-right">
                                      <span className="text-green-600 font-medium">{item.borrowed_quantity}</span>
                                      {item.partner_stock_notes && (
                                        <div className="text-xs text-gray-500 mt-1">{item.partner_stock_notes}</div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              : (challan as JamaChallan).return_line_items.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                                    <span className="font-medium">{item.plate_size}</span>
                                    <div className="text-right">
                                      <span className="text-blue-600 font-medium">{item.returned_quantity}</span>
                                      {item.damage_notes && (
                                        <div className="text-xs text-gray-500 mt-1">{item.damage_notes}</div>
                                      )}
                                    </div>
                                  </div>
                                ))
                            }
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Modal */}
      {editingChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit {editingChallan.type === 'udhar' ? 'Udhar' : 'Jama'} Challan
                </h2>
                <button
                  onClick={() => setEditingChallan(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Challan Number
                    </label>
                    <input
                      type="text"
                      value={editingChallan.challan_number}
                      onChange={(e) => setEditingChallan({
                        ...editingChallan,
                        challan_number: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editingChallan.date}
                      onChange={(e) => setEditingChallan({
                        ...editingChallan,
                        date: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client
                  </label>
                  <select
                    value={editingChallan.client_id}
                    onChange={(e) => setEditingChallan({
                      ...editingChallan,
                      client_id: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plate Quantities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Plate Quantities
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {PLATE_SIZES.map(size => (
                      <div key={size} className="border border-gray-200 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {size}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingChallan.plates[size] || ''}
                          onChange={(e) => setEditingChallan({
                            ...editingChallan,
                            plates: {
                              ...editingChallan.plates,
                              [size]: parseInt(e.target.value) || 0
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    નોંધ (Note)
                  </label>
                  <textarea
                    value={editingChallan.note}
                    onChange={(e) => setEditingChallan({
                      ...editingChallan,
                      note: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Enter any notes for this challan..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {editLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={handleDeleteChallan}
                    disabled={editLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Challan
                  </button>
                  <button
                    onClick={() => setEditingChallan(null)}
                    disabled={editLoading}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}