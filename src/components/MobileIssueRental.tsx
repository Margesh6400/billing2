import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/supabase";
import { 
  FileText, 
  Package, 
  Save, 
  Loader2, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  User,
  Hash,
  MapPin,
  Search,
  Plus,
  ArrowLeft
} from "lucide-react";
import { generateJPGChallan, downloadJPGChallan } from "../utils/jpgChallanGenerator";
import { ChallanData } from "./challans/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Stock = Database["public"]["Tables"]["stock"]["Row"];

const PLATE_SIZES = [
  "2 X 3", "21 X 3", "18 X 3", "15 X 3", "12 X 3",
  "9 X 3", "પતરા", "2 X 2", "2 ફુટ"
];

interface StockValidation {
  size: string;
  requested: number;
  available: number;
}

export function MobileIssueRental() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [challanNumber, setChallanNumber] = useState("");
  const [suggestedChallanNumber, setSuggestedChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stockData, setStockData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockValidation, setStockValidation] = useState<StockValidation[]>([]);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);

  useEffect(() => { fetchStockData(); generateNextChallanNumber(); }, []);
  useEffect(() => { if (Object.keys(quantities).length > 0) validateStockAvailability(); }, [quantities, stockData]);

  async function fetchStockData() {
    try {
      const { data, error } = await supabase.from("stock").select("*").order("plate_size");
      if (error) throw error;
      setStockData(data || []);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  }

  async function generateNextChallanNumber() {
    try {
      // Get the most recent challan number (last one created)
      const { data, error } = await supabase
        .from("challans")
        .select("challan_number")
        .order("id", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      let nextNumber = "1"; // Default if no challans exist
      
      if (data && data.length > 0) {
        const lastChallanNumber = data[0].challan_number;
        
        // Extract prefix and trailing number using regex
        // This regex finds: (any characters)(trailing digits)
        const match = lastChallanNumber.match(/^(.*)(\d+)$/);
        
        if (match) {
          const prefix = match[1]; // Characters before number (e.g., "KO", "ABC", or "")
          const lastNumber = parseInt(match[2]); // The trailing number part
          const incrementedNumber = lastNumber + 1;
          
          // Keep the same number of digits with leading zeros if needed
          const digitCount = match[2].length;
          const paddedNumber = incrementedNumber.toString().padStart(digitCount, '0');
          
          nextNumber = prefix + paddedNumber;
        } else {
          // If no trailing number found, append "1" 
          nextNumber = lastChallanNumber + "1";
        }
      }
      
      setSuggestedChallanNumber(nextNumber);
      
      // Auto-fill only if field is empty
      if (!challanNumber) setChallanNumber(nextNumber);
      
    } catch (error) {
      console.error("Error generating challan number:", error);
      const fallback = "1";
      setSuggestedChallanNumber(fallback);
      if (!challanNumber) setChallanNumber(fallback);
    }
  }

  function handleChallanNumberChange(value: string) {
    setChallanNumber(value);
    if (!value.trim()) setChallanNumber(suggestedChallanNumber);
  }

  function validateStockAvailability() {
    const insufficientStock: StockValidation[] = [];
    Object.entries(quantities).forEach(([size, quantity]) => {
      if (quantity > 0) {
        const stock = stockData.find(s => s.plate_size === size);
        if (stock && quantity > stock.available_quantity) {
          insufficientStock.push({
            size,
            requested: quantity,
            available: stock.available_quantity
          });
        }
      }
    });
    setStockValidation(insufficientStock);
  }

  function handleQuantityChange(size: string, value: string) {
    const quantity = parseInt(value) || 0;
    setQuantities(prev => ({ ...prev, [size]: quantity }));
  }

  function handleNoteChange(size: string, value: string) {
    setNotes(prev => ({ ...prev, [size]: value }));
  }

  async function checkChallanNumberExists(challanNumber: string) {
    const { data, error } = await supabase
      .from("challans")
      .select("challan_number")
      .eq("challan_number", challanNumber)
      .limit(1);
    return data && data.length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!challanNumber.trim()) {
        alert("ચલણ નંબર દાખલ કરો.");
        return;
      }

      const exists = await checkChallanNumberExists(challanNumber);
      if (exists) {
        alert("ચલણ નંબર પહેલેથી અસ્તિત્વમાં છે. બીજો નંબર વાપરો.");
        return;
      }

      const validItems = PLATE_SIZES.filter(size => quantities[size] > 0);
      if (validItems.length === 0) {
        alert("ઓછામાં ઓછી એક પ્લેટની માત્રા દાખલ કરો.");
        return;
      }

      const { data: challan, error: challanError } = await supabase
        .from("challans")
        .insert([{
          challan_number: challanNumber,
          client_id: selectedClient!.id,
          challan_date: challanDate
        }])
        .select()
        .single();

      if (challanError) throw challanError;

      const lineItems = validItems.map(size => ({
        challan_id: challan.id,
        plate_size: size,
        borrowed_quantity: quantities[size],
        partner_stock_notes: notes[size]?.trim() || null
      }));

      const { error: lineItemsError } = await supabase
        .from("challan_items")
        .insert(lineItems);

      if (lineItemsError) throw lineItemsError;

      const newChallanData: ChallanData = {
        type: "issue",
        challan_number: challan.challan_number,
        date: challanDate,
        client: {
          id: selectedClient!.id,
          name: selectedClient!.name,
          site: selectedClient!.site || "",
          mobile: selectedClient!.mobile_number || ""
        },
        plates: validItems.map(size => ({
          size,
          quantity: quantities[size],
          notes: notes[size] || "",
        })),
        total_quantity: validItems.reduce((sum, size) => sum + quantities[size], 0)
      };

      setChallanData(newChallanData);
      await new Promise(resolve => setTimeout(resolve, 500));

      const jpgDataUrl = await generateJPGChallan(newChallanData);
      downloadJPGChallan(jpgDataUrl, `issue-challan-${challan.challan_number}`);

      setQuantities({});
      setNotes({});
      setChallanNumber("");
      setSelectedClient(null);
      setStockValidation([]);
      setChallanData(null);
      setShowClientSelector(false);

      alert(`ચલણ ${challan.challan_number} સફળતાપૂર્વક બનાવવામાં આવ્યું અને ડાઉનલોડ થયું!`);
      await fetchStockData();
    } catch (error) {
      console.error("Error creating challan:", error);
      alert("ચલણ બનાવવામાં ભૂલ. કૃપા કરીને ફરી પ્રયત્ન કરો.");
    } finally {
      setLoading(false);
    }
  }

  // Enhanced Client Selector Component with Client ID Field
  function CompactClientSelector() {
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newClientData, setNewClientData] = useState({
      id: "",
      name: "",
      site: "",
      mobile_number: ""
    });

    useEffect(() => {
      fetchClients();
    }, []);

    async function fetchClients() {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .order("id");
        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    }

    async function handleAddClient() {
      if (!newClientData.id.trim()) {
        alert("ગ્રાહક ID દાખલ કરો");
        return;
      }
      if (!newClientData.name.trim()) {
        alert("ગ્રાહકનું નામ દાખલ કરો");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("clients")
          .insert([newClientData])
          .select()
          .single();

        if (error) throw error;

        setClients(prev => [...prev, data]);
        setNewClientData({ id: "", name: "", site: "", mobile_number: "" });
        setShowAddForm(false);
        alert("નવો ગ્રાહક ઉમેરવામાં આવ્યો!");
      } catch (error) {
        console.error("Error adding client:", error);
        alert("ગ્રાહક ઉમેરવામાં ભૂલ થઈ. કદાચ આ ID પહેલેથી અસ્તિત્વમાં છે.");
      }
    }

    const filteredClients = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.site || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showAddForm) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-900">નવો ગ્રાહક ઉમેરો</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* CLIENT ID FIELD - Added as requested */}
            <div>
              <label className="block mb-1 text-xs font-medium text-blue-700">
                ગ્રાહક ID *
              </label>
              <input
                type="text"
                placeholder="ગ્રાહક ID દાખલ કરો (જેમ કે: A001)"
                value={newClientData.id}
                onChange={e => setNewClientData(prev => ({ ...prev, id: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-200 focus:border-red-400"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-blue-700">
                ગ્રાહકનું નામ *
              </label>
              <input
                type="text"
                placeholder="ગ્રાહકનું નામ દાખલ કરો"
                value={newClientData.name}
                onChange={e => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-200 focus:border-red-400"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-blue-700">
                સાઇટ
              </label>
              <input
                type="text"
                placeholder="સાઇટનું નામ દાખલ કરો"
                value={newClientData.site}
                onChange={e => setNewClientData(prev => ({ ...prev, site: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-200 focus:border-red-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-medium text-blue-700">
                મોબાઇલ નંબર
              </label>
              <input
                type="tel"
                placeholder="મોબાઇલ નંબર દાખલ કરો"
                value={newClientData.mobile_number}
                onChange={e => setNewClientData(prev => ({ ...prev, mobile_number: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-200 focus:border-red-400"
              />
            </div>
          </div>

          <button
            onClick={handleAddClient}
            className="w-full py-2 text-xs font-medium text-white transition-colors bg-green-500 rounded hover:bg-green-600"
          >
            ગ્રાહક ઉમેરો
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-red-500" />
            <h3 className="text-xs font-medium text-gray-900">ગ્રાહક પસંદ કરો</h3>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
          >
            <Plus className="w-3 h-3" />
            નવો ઉમેરો
          </button>
        </div>

        <div className="relative">
          <Search className="absolute w-3 h-3 text-gray-400 -translate-y-1/2 left-2 top-1/2" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-red-200 focus:border-red-400 transition-all"
            placeholder="ગ્રાહક શોધો..."
          />
        </div>

        <div className="p-1 space-y-1 overflow-y-auto border border-gray-200 rounded max-h-80 bg-gray-50">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-4 h-4 mx-auto mb-2 text-red-500 animate-spin" />
              <p className="text-xs text-gray-500">લોડ થઈ રહ્યું છે...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <User className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-medium">કોઈ ગ્રાહક મળ્યો નથી</p>
              <p className="mt-1 text-xs">શોધ શબ્દ બદલીને પ્રયત્ન કરો</p>
            </div>
          ) : (
            filteredClients.map(client => (
              <button
                key={client.id}
                onClick={() => {
                  setSelectedClient(client);
                  setShowClientSelector(false);
                }}
                className="w-full p-2 text-xs text-left transition-all bg-white border border-gray-200 rounded shadow-sm hover:border-red-300 hover:bg-red-50 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full shadow-sm bg-gradient-to-r from-red-400 to-orange-500">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Hash className="w-2 h-2" />
                        {client.id}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-2 h-2" />
                        {client.site}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-red-600">{client.mobile_number}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  const getStockInfo = (size: string) => stockData.find(s => s.plate_size === size);
  const isStockInsufficient = (size: string) => stockValidation.some(item => item.size === size);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="p-3 space-y-3">
        {/* Compact Header */}
        <div className="pt-2 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 mb-2 rounded-full shadow-lg bg-gradient-to-r from-red-500 to-orange-500">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="mb-1 text-base font-bold text-gray-900">ઉધાર ચલણ</h1>
          <p className="text-xs text-gray-600">નવો ભાડો બનાવો</p>
        </div>

        {/* Enhanced Client Selection with Larger Search Window */}
        <div className="overflow-hidden bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500">
            <h2 className="flex items-center gap-1 text-xs font-bold text-white">
              <User className="w-3 h-3" />
              ગ્રાહક
            </h2>
          </div>
          
          <div className="p-2">
            {!selectedClient || showClientSelector ? (
              <CompactClientSelector />
            ) : (
              <div className="space-y-2">
                <div className="p-2 border border-red-200 rounded bg-gradient-to-r from-red-50 to-orange-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full bg-gradient-to-r from-red-500 to-orange-500">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-gray-900">{selectedClient.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="flex items-center gap-0.5">
                          <Hash className="w-2 h-2" />
                          {selectedClient.id}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2 h-2" />
                          {selectedClient.site}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowClientSelector(true)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  ગ્રાહક બદલવો
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Issue Form */}
        {selectedClient && !showClientSelector && (
          <form onSubmit={handleSubmit} className="overflow-hidden bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500">
              <h2 className="flex items-center gap-1 text-xs font-bold text-white">
                <Package className="w-3 h-3" />
                પ્લેટ ઇશ્યૂ
              </h2>
            </div>

            <div className="p-2 space-y-2">
              {/* Compact Form Header */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    ચલણ નંબર *
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => handleChallanNumberChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-200 focus:border-red-400"
                    placeholder={suggestedChallanNumber}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    તારીખ *
                  </label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    required
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-red-200 focus:border-red-400"
                  />
                </div>
              </div>

              {/* Stock Warning */}
              {stockValidation.length > 0 && (
                <div className="flex items-center gap-1 p-1 border rounded text-amber-700 bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">અપૂરતો સ્ટોક</span>
                </div>
              )}

              {/* Compact Table */}
              <div className="overflow-x-auto">
                <table className="w-full overflow-hidden text-xs rounded">
                  <thead>
                    <tr className="text-white bg-gradient-to-r from-red-500 to-orange-500">
                      <th className="px-1 py-1 font-medium text-left">સાઇઝ</th>
                      <th className="px-1 py-1 font-medium text-center">સ્ટોક</th>
                      <th className="px-1 py-1 font-medium text-center">ઇશ્યૂ</th>
                      <th className="px-1 py-1 font-medium text-center">નોંધ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLATE_SIZES.map((size, index) => {
                      const stockInfo = getStockInfo(size);
                      const isInsufficient = isStockInsufficient(size);
                      return (
                        <tr key={size} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${isInsufficient ? 'bg-red-50' : ''}`}>
                          <td className="px-1 py-1 font-medium">{size}</td>
                          <td className="px-1 py-1 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded font-bold ${
                              isInsufficient ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {stockInfo?.available_quantity || 0}
                            </span>
                          </td>
                          <td className="px-1 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              value={quantities[size] || ""}
                              onChange={e => handleQuantityChange(size, e.target.value)}
                              className={`w-10 px-0.5 py-0.5 border rounded text-center ${
                                isInsufficient ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="0"
                            />
                            {isInsufficient && (
                              <div className="text-xs text-red-600 mt-0.5">
                                માત્ર {stockValidation.find(item => item.size === size)?.available}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1 text-center">
                            <input
                              type="text"
                              className="w-16 px-0.5 py-0.5 border border-gray-300 rounded"
                              value={notes[size] || ""}
                              onChange={e => handleNoteChange(size, e.target.value)}
                              placeholder="નોંધ"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Compact Total */}
              <div className="p-2 bg-red-100 border border-red-200 rounded">
                <div className="text-center">
                  <span className="text-xs font-medium text-red-800">કુલ પ્લેટ્સ: </span>
                  <span className="text-base font-bold text-red-700">
                    {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Compact Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-full gap-1 py-2 text-xs font-medium text-white transition-all rounded bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    બનાવી રહ્યા છીએ...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    ઉધાર ચલણ બનાવો
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
