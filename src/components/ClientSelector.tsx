import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Database } from '../lib/supabase'
import { Plus, Search, User, Phone, MapPin, Hash } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']

interface ClientSelectorProps {
  onClientSelect: (client: Client) => void
  selectedClient: Client | null
}

export function ClientSelector({ onClientSelect, selectedClient }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [newClient, setNewClient] = useState({
    id: '',
    name: '',
    site: '',
    mobile_number: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single()

      if (error) throw error

      setClients([data, ...clients])
      onClientSelect(data)
      setShowAddForm(false)
      setNewClient({ id: '', name: '', site: '', mobile_number: '' })
    } catch (error) {
      console.error('Error adding client:', error)
      alert('Error adding client. Please check if the ID is unique.')
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.site.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedClient) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Selected Client
          </h2>
          <button
            onClick={() => onClientSelect(null)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Change Client
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Hash className="w-5 h-5 text-gray-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700">Client ID</label>
                <p className="text-gray-900 font-semibold">{selectedClient.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900 font-semibold">{selectedClient.name}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700">Site</label>
                <p className="text-gray-900 font-semibold">{selectedClient.site}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-500" />
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <p className="text-gray-900 font-semibold">{selectedClient.mobile_number}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Select Client</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 justify-center"
        >
          <Plus className="w-4 h-4" />
          Add New Client
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddClient} className="mb-6 p-6 bg-gray-50 rounded-lg space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Client</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID *
              </label>
              <input
                type="text"
                value={newClient.id}
                onChange={(e) => setNewClient({ ...newClient, id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Enter unique ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Client name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site *
              </label>
              <input
                type="text"
                value={newClient.site}
                onChange={(e) => setNewClient({ ...newClient, site: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Site location"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={newClient.mobile_number}
                onChange={(e) => setNewClient({ ...newClient, mobile_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Mobile number"
                required
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
            >
              Add Client
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mb-4">
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
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No clients found' : 'No clients added yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => onClientSelect(client)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-base">{client.name}</p>
                    <p className="text-sm text-gray-600 mt-1">ID: {client.id}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">{client.site}</p>
                    <p className="text-xs text-gray-500 mt-1">{client.mobile_number}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}