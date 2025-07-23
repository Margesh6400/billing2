import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Plus, Search, User, Phone, MapPin, Hash, Edit3, Trash2, Save, X, Users } from 'lucide-react';
import { T } from '../contexts/LanguageContext';

type Client = Database['public']['Tables']['clients']['Row'];

export function MobileClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    id: '',
    name: '',
    site: '',
    mobile_number: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('id');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single();

      if (error) throw error;

      setClients([data, ...clients]);
      setShowAddForm(false);
      setNewClient({ id: '', name: '', site: '', mobile_number: '' });
      alert('ગ્રાહક સફળતાપૂર્વક ઉમેરવામાં આવ્યો!');
    } catch (error) {
      console.error('Error adding client:', error);
      alert('ગ્રાહક ઉમેરવામાં ભૂલ. કૃપા કરીને તપાસો કે ID અનન્ય છે.');
    }
  };

  const handleUpdateClient = async (clientId: string, updatedData: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updatedData)
        .eq('id', clientId);

      if (error) throw error;

      setClients(clients.map(client => 
        client.id === clientId ? { ...client, ...updatedData } : client
      ));
      setEditingClient(null);
      alert('ગ્રાહક સફળતાપૂર્વક અપડેટ થયો!');
    } catch (error) {
      console.error('Error updating client:', error);
      alert('ગ્રાહક અપડેટ કરવામાં ભૂલ.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('શું તમે ખરેખર આ ગ્રાહકને ડિલીટ કરવા માંગો છો?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(clients.filter(client => client.id !== clientId));
      alert('ગ્રાહક સફળતાપૂર્વક ડિલીટ થયો!');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('ગ્રાહક ડિલીટ કરવામાં ભૂલ. તેમના અસ્તિત્વમાં ટ્રાન્ઝેક્શન હોઈ શકે છે.');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
        <div className="p-3 space-y-3">
          <div className="pt-2 text-center">
            <div className="w-32 h-5 mx-auto mb-1 bg-blue-200 rounded animate-pulse"></div>
            <div className="w-40 h-3 mx-auto bg-blue-200 rounded animate-pulse"></div>
          </div>
          {[...Array(5)].map((_, i) => (
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
            <Users className="w-5 h-5 text-white" />
          </div>
          <h1 className="mb-1 text-base font-bold text-gray-900">ગ્રાહકો</h1>
          <p className="text-xs text-blue-600">તમારા ગ્રાહકોનું સંચાલન</p>
        </div>

        {/* Blue Themed Search and Add Controls */}
        <div className="overflow-hidden bg-white border-2 border-blue-100 shadow-lg rounded-xl">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Search className="w-4 h-4" />
              શોધો અને ઉમેરો
            </h2>
          </div>
          
          <div className="p-3 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute w-4 h-4 text-blue-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-3 text-sm transition-all duration-200 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder="ગ્રાહકો શોધો..."
              />
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center justify-center w-full gap-2 py-2 text-sm font-medium text-white transition-all duration-200 transform rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              નવો ગ્રાહક ઉમેરો
            </button>
          </div>
        </div>

        {/* Blue Themed Add Form */}
        {showAddForm && (
          <div className="overflow-hidden bg-white border-2 border-blue-100 shadow-lg rounded-xl">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500">
              <h3 className="text-sm font-bold text-white">નવો ગ્રાહક ઉમેરો</h3>
            </div>
            
            <form onSubmit={handleAddClient} className="p-3 space-y-3">
              <div>
                <label className="block mb-1 text-xs font-medium text-blue-700">
                  ગ્રાહક ID *
                </label>
                <input
                  type="text"
                  value={newClient.id}
                  onChange={(e) => setNewClient({ ...newClient, id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="અનન્ય ID દાખલ કરો"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-blue-700">
                  નામ *
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="ગ્રાહકનું નામ"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-blue-700">
                  સાઇટ *
                </label>
                <input
                  type="text"
                  value={newClient.site}
                  onChange={(e) => setNewClient({ ...newClient, site: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="સાઇટ સ્થાન"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-blue-700">
                  મોબાઇલ નંબર *
                </label>
                <input
                  type="tel"
                  value={newClient.mobile_number}
                  onChange={(e) => setNewClient({ ...newClient, mobile_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  placeholder="મોબાઇલ નંબર"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                >
                  સેવ કરો
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 text-sm font-medium text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600"
                >
                  રદ કરો
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Blue Themed Clients List */}
        <div className="space-y-3">
          {filteredClients.length === 0 ? (
            <div className="py-8 text-center bg-white border-2 border-blue-100 shadow-lg rounded-xl">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-200 to-indigo-200">
                <User className="w-8 h-8 text-blue-400" />
              </div>
              <p className="mb-1 font-medium text-gray-700">
                {searchTerm ? 'કોઈ ગ્રાહક મળ્યો નથી' : 'હજુ સુધી કોઈ ગ્રાહક ઉમેરવામાં આવ્યો નથી'}
              </p>
              <p className="text-xs text-blue-600">
                {searchTerm ? 'શોધ શબ્દ બદલીને પ્રયત્ન કરો' : 'નવા ગ્રાહકો ઉમેરવાનું શરૂ કરો'}
              </p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div key={client.id} className="overflow-hidden transition-all duration-200 bg-white border-2 border-blue-100 shadow-lg rounded-xl hover:shadow-xl hover:border-blue-200">
                {editingClient === client.id ? (
                  <EditClientForm
                    client={client}
                    onSave={(updatedData) => handleUpdateClient(client.id, updatedData)}
                    onCancel={() => setEditingClient(null)}
                  />
                ) : (
                  <>
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          {client.name}
                        </h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingClient(client.id)}
                            className="p-1.5 text-white hover:bg-blue-400/20 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-1.5 text-white hover:bg-red-400/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <Hash className="w-3 h-3" />
                        <span className="font-medium">ID: {client.id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <MapPin className="w-3 h-3" />
                        <span>{client.site}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <Phone className="w-3 h-3" />
                        <span>{client.mobile_number}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface EditClientFormProps {
  client: Client;
  onSave: (data: Partial<Client>) => void;
  onCancel: () => void;
}

function EditClientForm({ client, onSave, onCancel }: EditClientFormProps) {
  const [formData, setFormData] = useState({
    name: client.name,
    site: client.site,
    mobile_number: client.mobile_number
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500">
        <h3 className="text-sm font-bold text-white">ગ્રાહક એડિટ કરો</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-blue-700">
            નામ *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-blue-700">
            સાઇટ *
          </label>
          <input
            type="text"
            value={formData.site}
            onChange={(e) => setFormData({ ...formData, site: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-blue-700">
            મોબાઇલ નંબર *
          </label>
          <input
            type="tel"
            value={formData.mobile_number}
            onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            required
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex items-center justify-center flex-1 gap-1 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <Save className="w-3 h-3" />
            સેવ કરો
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center flex-1 gap-1 py-2 text-sm font-medium text-white transition-colors bg-gray-500 rounded-lg hover:bg-gray-600"
          >
            <X className="w-3 h-3" />
            રદ કરો
          </button>
        </div>
      </form>
    </>
  );
}
