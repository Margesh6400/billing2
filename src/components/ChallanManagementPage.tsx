import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Download, Eye, Search, ChevronDown, ChevronUp, Calendar, User, Hash, FileText, RotateCcw, Edit, Save, X, Trash2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { T, useTranslation } from '../contexts/LanguageContext';
import { generateJPGChallan, downloadJPGChallan } from '../utils/jpgChallanGenerator';
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
      alert('ચલણ વિગતો લોડ કરવામાં ભૂલ.');
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
      alert('ચલણ સફળતાપૂર્વક અપડેટ થયું!');
    } catch (error) {
      console.error('Error updating challan:', error);
      alert('ચલણ અપડેટ કરવામાં ભૂલ. કૃપા કરીને ફરી પ્રયત્ન કરો.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteChallan = async () => {
    if (!editingChallan) return;

    const confirmDelete = confirm(`શું તમે ખરેખર આ ${editingChallan.type} ચલણ ડિલીટ કરવા માંગો છો? આ ક્રિયા પૂર્વવત્ કરી શકાશે નહીં.`);
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
      alert('ચલણ સફળતાપૂર્વક ડિલીટ થયું!');
    } catch (error) {
      console.error('Error deleting challan:', error);
      alert('ચલણ ડિલીટ કરવામાં ભૂલ. કૃપા કરીને ફરી પ્રયત્ન કરો.');
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
      const jpgDataUrl = await generateJPGChallan(challanDataForPDF);
      downloadJPGChallan(jpgDataUrl, `${type}-challan-${challanDataForPDF.challan_number}`);

      setChallanData(null);
    } catch (error) {
      console.error('Error downloading challan:', error);
      alert('ચલણ ડાઉનલોડ કરવામાં ભૂલ. કૃપા કરીને ફરી પ્રયત્ન કરો.');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
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
    <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      {/* Hidden Printable Challan */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        {challanData && (
          <div id={`challan-${challanData.challan_number}`}>
            <PrintableChallan data={challanData} />
          </div>
        )}
      </div>

      <div className="p-3 space-y-4">
        {/* Blue Themed Header */}
        <div className="pt-2 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 mb-2 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="mb-1 text-base font-bold text-gray-900">ચલણ બૂક</h1>
          <p className="text-xs text-blue-600">બધા ચલણોનું સંચાલન</p>
        </div>

        {/* Blue Themed Tab Navigation */}
        <div className="p-2 bg-white border-2 border-blue-100 shadow-lg rounded-xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('udhar')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'udhar'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg transform scale-105'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ઉધાર ચલણ</span>
            </button>
            <button
              onClick={() => setActiveTab('jama')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'jama'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>જમા ચલણ</span>
            </button>
          </div>
        </div>

        {/* Blue Themed Search Bar */}
        <div className="relative">
          <Search className="absolute w-4 h-4 text-blue-400 -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ચલણ નંબર, ગ્રાહક અથવા તારીખ શોધો..."
            className="w-full py-2 pl-10 pr-3 text-sm transition-all duration-200 border-2 border-blue-200 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
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
                  <div key={i} className="p-3 bg-white border border-blue-100 shadow-sm rounded-xl animate-pulse">
                    <div className="w-2/3 h-4 mb-2 bg-blue-200 rounded"></div>
                    <div className="w-1/2 h-3 bg-blue-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : currentChallans.length === 0 ? (
              <div className="py-12 text-center bg-white border-2 border-blue-100 shadow-lg rounded-xl">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  activeTab === 'udhar' ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {activeTab === 'udhar' ? (
                    <FileText className="w-8 h-8 text-red-600" />
                  ) : (
                    <RotateCcw className="w-8 h-8 text-green-600" />
                  )}
                </div>
                <p className="mb-1 font-semibold text-gray-700">
                  {activeTab === 'udhar' 
                    ? 'કોઈ ઉધાર ચલણ મળ્યું નથી' 
                    : 'કોઈ જમા ચલણ મળ્યું નથી'
                  }
                </p>
                <p className="text-xs text-blue-600">
                  {searchTerm 
                    ? 'શોધ માપદંડ બદલીને ફરી પ્રયાસ કરો' 
                    : 'નવું ચલણ બનાવવા માટે શરૂ કરો'
                  }
                </p>
              </div>
            ) : (
              currentChallans.map((challan) => (
                <motion.div
                  key={challan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden transition-all duration-200 bg-white border-2 border-blue-100 shadow-lg rounded-xl hover:shadow-xl hover:border-blue-200"
                >
                  {/* Challan Header */}
                  <div 
                    className="p-3 transition-colors cursor-pointer hover:bg-blue-25"
                    onClick={() => setExpandedChallan(expandedChallan === challan.id ? null : challan.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500">
                            <Hash className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {activeTab === 'udhar' 
                              ? (challan as UdharChallan).challan_number
                              : (challan as JamaChallan).return_challan_number
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1 text-xs text-blue-600">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(
                              activeTab === 'udhar' 
                                ? (challan as UdharChallan).challan_date
                                : (challan as JamaChallan).return_date
                            ), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <User className="w-3 h-3" />
                          <span>{challan.client.name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {activeTab === 'udhar' && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor((challan as UdharChallan).status)}`}>
                            {getStatusText((challan as UdharChallan).status)}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {challan.total_plates} પ્લેટ્સ
                          </span>
                          <div className="flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full">
                            {expandedChallan === challan.id ? (
                              <ChevronUp className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
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
                        className="flex items-center justify-center flex-1 gap-1 px-2 py-2 text-xs font-medium text-blue-700 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                      >
                        <Edit className="w-3 h-3" />
                        એડિટ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedChallan(expandedChallan === challan.id ? null : challan.id);
                        }}
                        className="flex items-center justify-center flex-1 gap-1 px-2 py-2 text-xs font-medium text-blue-700 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                      >
                        <Eye className="w-3 h-3" />
                        જુઓ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(challan, activeTab);
                        }}
                        disabled={downloading === challan.id}
                        className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          activeTab === 'udhar'
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                        } disabled:opacity-50`}
                      >
                        <Download className="w-3 h-3" />
                        {downloading === challan.id ? 'લોડિંગ...' : 'ડાઉનલોડ'}
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
                        className="overflow-hidden border-t-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50"
                      >
                        <div className="p-3 space-y-3">
                          {/* Client Details */}
                          <div className="p-3 bg-white border border-blue-200 rounded-lg">
                            <h4 className="mb-2 text-sm font-medium text-blue-900">ગ્રાહક વિગતો</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-blue-600">ID:</span>
                                <span className="ml-1 font-medium text-gray-900">{challan.client.id}</span>
                              </div>
                              <div>
                                <span className="text-blue-600">સાઇટ:</span>
                                <span className="ml-1 font-medium text-gray-900">{challan.client.site}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-blue-600">મોબાઇલ:</span>
                                <span className="ml-1 font-medium text-gray-900">{challan.client.mobile_number}</span>
                              </div>
                            </div>
                          </div>

                          {/* Plate Details */}
                          <div className="p-3 bg-white border border-blue-200 rounded-lg">
                            <h4 className="mb-2 text-sm font-medium text-blue-900">પ્લેટ વિગતો</h4>
                            <div className="space-y-2">
                              {activeTab === 'udhar' 
                                ? (challan as UdharChallan).challan_items.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between py-1 border-b border-blue-100 last:border-b-0">
                                      <span className="text-xs font-medium text-gray-900">{item.plate_size}</span>
                                      <div className="text-right">
                                        <span className="text-sm font-bold text-red-600">{item.borrowed_quantity}</span>
                                        {item.partner_stock_notes && (
                                          <div className="mt-1 text-xs text-blue-500">{item.partner_stock_notes}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                : (challan as JamaChallan).return_line_items.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between py-1 border-b border-blue-100 last:border-b-0">
                                      <span className="text-xs font-medium text-gray-900">{item.plate_size}</span>
                                      <div className="text-right">
                                        <span className="text-sm font-bold text-green-600">{item.returned_quantity}</span>
                                        {item.damage_notes && (
                                          <div className="mt-1 text-xs text-blue-500">{item.damage_notes}</div>
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

        {/* Blue Themed Edit Modal */}
        {editingChallan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-blue-200">
              <div className="p-4 text-white bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {editingChallan.type === 'udhar' ? 'ઉધાર' : 'જમા'} ચલણ એડિટ કરો
                  </h2>
                  <button
                    onClick={() => setEditingChallan(null)}
                    className="p-2 transition-colors rounded-lg hover:bg-blue-500/20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Basic Details */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-blue-700">
                      ચલણ નંબર
                    </label>
                    <input
                      type="text"
                      value={editingChallan.challan_number}
                      onChange={(e) => setEditingChallan({
                        ...editingChallan,
                        challan_number: e.target.value
                      })}
                      className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-blue-700">
                      તારીખ
                    </label>
                    <input
                      type="date"
                      value={editingChallan.date}
                      onChange={(e) => setEditingChallan({
                        ...editingChallan,
                        date: e.target.value
                      })}
                      className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Client Selection */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-blue-700">
                    ગ્રાહક
                  </label>
                  <select
                    value={editingChallan.client_id}
                    onChange={(e) => setEditingChallan({
                      ...editingChallan,
                      client_id: e.target.value
                    })}
                    className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
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
                  <label className="block mb-2 text-sm font-medium text-blue-700">
                    પ્લેટ માત્રા
                  </label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {PLATE_SIZES.map(size => (
                      <div key={size} className="p-2 border-2 border-blue-200 rounded-lg">
                        <label className="block mb-1 text-xs font-medium text-blue-700">
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
                          className="w-full px-1 py-1 text-xs text-center border border-blue-300 rounded focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-blue-700">
                    નોંધ
                  </label>
                  <textarea
                    value={editingChallan.note}
                    onChange={(e) => setEditingChallan({
                      ...editingChallan,
                      note: e.target.value
                    })}
                    className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    rows={3}
                    placeholder="આ ચલણ માટે કોઈ નોંધ દાખલ કરો..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-4 border-t-2 border-blue-100 sm:flex-row">
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="flex items-center justify-center flex-1 gap-2 px-3 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                  >
                    {editLoading ? (
                      <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    સેવ કરો
                  </button>
                  <button
                    onClick={handleDeleteChallan}
                    disabled={editLoading}
                    className="flex items-center justify-center flex-1 gap-2 px-3 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    ડિલીટ કરો
                  </button>
                  <button
                    onClick={() => setEditingChallan(null)}
                    disabled={editLoading}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                  >
                    રદ કરો
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
