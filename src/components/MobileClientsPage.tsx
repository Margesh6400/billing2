import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Plus, Search, User, Phone, MapPin, Hash, Edit3, Trash2, Save, X } from 'lucide-react';
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
      alert('Client added successfully!');
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Error adding client. Please check if the ID is unique.');
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
      alert('Client updated successfully!');
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(clients.filter(client => client.id !== clientId));
      alert('Client deleted successfully!');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error deleting client. They may have existing transactions.');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.site.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          <T>Clients</T>
        </h1>
        <p className="text-sm text-gray-600">ગ્રાહકો - Manage your clients</p>
      </div>

      {/* Search and Add */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Search clients..."
          />
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <T>Add New</T> Client
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Client</h3>
          <form onSubmit={handleAddClient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <T>Client ID</T> *
              </label>
              <input
                type="text"
                value={newClient.id}
                onChange={(e) => setNewClient({ ...newClient, id: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Enter unique ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <T>Name</T> *
              </label>
              <input
                type="text"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Client name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <T>Site</T> *
              </label>
              <input
                type="text"
                value={newClient.site}
                onChange={(e) => setNewClient({ ...newClient, site: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Site location"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <T>Mobile Number</T> *
              </label>
              <input
                type="tel"
                value={newClient.mobile_number}
                onChange={(e) => setNewClient({ ...newClient, mobile_number: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Mobile number"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                <T>Save</T>
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                <T>Cancel</T>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{searchTerm ? 'No clients found' : 'No clients added yet'}</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              {editingClient === client.id ? (
                <EditClientForm
                  client={client}
                  onSave={(updatedData) => handleUpdateClient(client.id, updatedData)}
                  onCancel={() => setEditingClient(null)}
                />
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Hash className="w-4 h-4" />
                          <span>ID: {client.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{client.site}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{client.mobile_number}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingClient(client.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <T>Name</T>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <T>Site</T>
        </label>
        <input
          type="text"
          value={formData.site}
          onChange={(e) => setFormData({ ...formData, site: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <T>Mobile Number</T>
        </label>
        <input
          type="tel"
          value={formData.mobile_number}
          onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          required
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <T>Save</T>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          <T>Cancel</T>
        </button>
      </div>
    </form>
  );
}