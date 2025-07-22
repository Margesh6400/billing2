import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/supabase";
import { RotateCcw, Package, Save, Loader2, Calendar, User, Hash, MapPin, Search } from "lucide-react";
import { generateJPGChallan, downloadJPGChallan } from "../utils/jpgChallanGenerator";
import { ChallanData } from "./challans/types";
import { T } from "../contexts/LanguageContext";

type Client = Database["public"]["Tables"]["clients"]["Row"];
const PLATE_SIZES = [
  "2 X 3", "21 X 3", "18 X 3", "15 X 3", "12 X 3",
  "9 X 3", "પતરા", "2 X 2", "2 ફુટ",
];

export function MobileReturnPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [returnChallanNumber, setReturnChallanNumber] = useState("");
  const [suggestedChallanNumber, setSuggestedChallanNumber] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [challanData, setChallanData] = useState<ChallanData | null>(null);
  const [clientOutstandingPlates, setClientOutstandingPlates] = useState<Record<string, number>>({});

  useEffect(() => { generateNextChallanNumber(); }, []);
  useEffect(() => { if (selectedClient) fetchOutstanding(); }, [selectedClient]);

  async function fetchOutstanding() {
    try {
      const { data: challans } = await supabase
        .from("challans")
        .select("challan_items (plate_size, borrowed_quantity)")
        .eq("client_id", selectedClient!.id);
      const { data: returns } = await supabase
        .from("returns")
        .select("return_line_items (plate_size, returned_quantity)")
        .eq("client_id", selectedClient!.id);
      const out: Record<string, number> = {};
      challans?.forEach((ch) => ch.challan_items.forEach(item => {
        out[item.plate_size] = (out[item.plate_size] || 0) + item.borrowed_quantity;
      }));
      returns?.forEach((ret) => ret.return_line_items.forEach(item => {
        out[item.plate_size] = (out[item.plate_size] || 0) - item.returned_quantity;
      }));
      // Only keep >0 values
      const filtered: Record<string, number> = {};
      Object.entries(out).forEach(([k, v]) => { if (v > 0) filtered[k] = v; });
      setClientOutstandingPlates(filtered);
    } catch (e) {
      setClientOutstandingPlates({});
    }
  }

  async function generateNextChallanNumber() {
    try {
      const { data } = await supabase
        .from("returns")
        .select("return_challan_number")
        .order("id", { ascending: false });
      let max = 0;
      data?.forEach(d => {
        const m = d.return_challan_number.match(/\d+/);
        if (m) max = Math.max(max, parseInt(m[0]));
      });
      const next = (max + 1).toString();
      setSuggestedChallanNumber(next);
      if (!returnChallanNumber) setReturnChallanNumber(next);
    } catch {
      setSuggestedChallanNumber("1");
      if (!returnChallanNumber) setReturnChallanNumber("1");
    }
  }

  function handleChallanNumberChange(val: string) {
    setReturnChallanNumber(val);
    if (!val.trim()) setReturnChallanNumber(suggestedChallanNumber);
  }
  function handleQuantityChange(size: string, val: string) {
    const q = parseInt(val) || 0;
    setQuantities((prev) => ({ ...prev, [size]: q }));
  }
  function handleNoteChange(size: string, val: string) {
    setNotes(prev => ({ ...prev, [size]: val }));
  }

  async function checkReturnChallanNumberExists(num: string) {
    const { data } = await supabase
      .from("returns")
      .select("return_challan_number")
      .eq("return_challan_number", num)
      .limit(1);
    return data && data.length > 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!selectedClient) { alert("Select a client!"); return; }
      if (!returnChallanNumber.trim()) { alert("Enter return challan number."); return; }
      if (await checkReturnChallanNumberExists(returnChallanNumber)) {
        alert("Return challan number already exists!"); return;
      }
      const returnEntries = Object.entries(clientOutstandingPlates)
        .filter(([size]) => (quantities[size] || 0) > 0)
        .map(([size, outstanding]) => ({
          plate_size: size,
          returned_quantity: quantities[size] || 0,
          damage_notes: notes[size] || null,
        }));
      const { data: returnRecord, error } = await supabase
        .from("returns")
        .insert([{
          return_challan_number: returnChallanNumber,
          client_id: selectedClient.id,
          return_date: returnDate,
        }])
        .select()
        .single();
      if (error) throw error;
      if (returnEntries.length > 0) {
        const lineItems = returnEntries.map(entry => ({
          return_id: returnRecord.id,
          ...entry
        }));
        const { error: lineItemsError } = await supabase.from("return_line_items").insert(lineItems);
        if (lineItemsError) throw lineItemsError;
      }
      const newChallanData: ChallanData = {
        type: "return",
        challan_number: returnRecord.return_challan_number,
        date: returnDate,
        client: {
          id: selectedClient.id,
          name: selectedClient.name,
          site: selectedClient.site || "",
          mobile: selectedClient.mobile_number || "",
        },
        plates: returnEntries.map(e => ({
          size: e.plate_size,
          quantity: e.returned_quantity,
          notes: notes[e.plate_size] || "",
        })),
        total_quantity: returnEntries.reduce((sum, e) => sum + e.returned_quantity, 0),
      };
      setChallanData(newChallanData);
      await new Promise(res => setTimeout(res, 500));
      const jpgDataUrl = await generateJPGChallan(newChallanData);
      downloadJPGChallan(jpgDataUrl, `return-challan-${returnRecord.return_challan_number}`);
      setQuantities({});
      setNotes({});
      setReturnChallanNumber("");
      setSelectedClient(null);
      setChallanData(null);
      setClientOutstandingPlates({});
      alert("Return challan created and downloaded!");
    } catch (error) {
      alert("Error creating return. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Returns only clients with outstanding plates
  function ReturnClientSelector({ onClientSelect }: { onClientSelect: (client: Client) => void; }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      supabase.from("clients").select("*").order("id").then(({ data }) => {
        setClients(data || []); setLoading(false);
      });
    }, []);
    return (
      <div>
        <div className="mb-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-base"
            placeholder="Search existing clients..."
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center py-6 text-gray-500">Loading clients...</div>
          ) : (
            clients.filter(client =>
              client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              client.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (client.site || "").toLowerCase().includes(searchTerm.toLowerCase())
            ).map(client => (
              <button
                key={client.id}
                onClick={() => onClientSelect(client)}
                className="w-full text-left py-3 px-4 border-b text-base hover:bg-blue-50"
              >
                <span className="font-semibold">{client.name}</span>
                <span className="ml-2 text-gray-600 text-sm">ID: {client.id} | {client.site}</span>
                <span className="block text-xs text-blue-700">{client.mobile_number}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- UI STARTS HERE ---
  return (
    <div className="space-y-4 pb-20">
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1"><T>Return Challan</T></h1>
        <p className="text-sm text-gray-600">જમા ચલણ - Process plate returns</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        {!selectedClient ? (
          <ReturnClientSelector onClientSelect={(client) => {
            setSelectedClient(client); setQuantities({}); setNotes({});
          }} />
        ) : (
          <div>
            <div className="mb-2 flex gap-4 flex-wrap items-center border-b pb-2">
              <span className="font-semibold text-gray-900"><User className="inline w-5 h-5" /> {selectedClient.name}</span>
              <span className="text-gray-700 flex items-center text-sm"><Hash className="inline w-4 h-4 mr-1" /> {selectedClient.id}</span>
              <span className="text-gray-700 flex items-center text-sm"><MapPin className="inline w-4 h-4 mr-1" /> {selectedClient.site}</span>
            </div>
            <button
              onClick={() => {
                setSelectedClient(null);
                setQuantities({});
                setNotes({});
                setClientOutstandingPlates({});
              }}
              className="text-blue-500 hover:underline text-sm mb-4"
            >
              ચયન બદલવો (Change)
            </button>
          </div>
        )}
      </div>
      {/* Table for shapes/notes, only for outstanding sizes */}
      {selectedClient && Object.keys(clientOutstandingPlates).length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 px-2 pt-1 pb-4 space-y-3">
          <div className="flex flex-col gap-2">
            <div className="flex gap-3 flex-wrap items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Return Challan No. *</label>
              <input
                type="text"
                value={returnChallanNumber}
                onChange={e => handleChallanNumberChange(e.target.value)}
                onFocus={e => e.target.select()}
                className="ml-2 w-28 px-2 py-1 border border-gray-300 rounded-lg text-base"
                placeholder={`Suggested: ${suggestedChallanNumber}`}
                required
              />
              <label className="block text-sm font-medium text-gray-700 ml-auto">
                <Calendar className="w-4 h-4 inline" /> Date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                required
                className="ml-2 w-32 px-2 py-1 border border-gray-300 rounded-lg text-base"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full rounded-lg border">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-2 py-2 text-left text-xs font-semibold">Plate Size</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold">Outstanding</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold">Returned</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(clientOutstandingPlates).map(([size, outstanding]) => (
                    <tr key={size} className="border-t">
                      <td className="px-2 py-2 font-medium whitespace-nowrap">{size}</td>
                      <td className="px-2 py-2 text-center text-red-700">{outstanding}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0} max={outstanding}
                          value={quantities[size] || ""}
                          onChange={e => handleQuantityChange(size, e.target.value)}
                          className="w-14 px-1 py-1 border border-gray-300 rounded text-base text-center"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <textarea
                          rows={1}
                          className="w-28 border border-gray-300 rounded text-sm px-1 py-0.5"
                          value={notes[size] || ""}
                          onChange={e => handleNoteChange(size, e.target.value)}
                          placeholder="Note"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>          
          </div>
          {/* Subtotal */}
          <div className="mt-4 text-center bg-blue-50 py-2 rounded-lg font-semibold text-base text-blue-700">
            કુલ પ્લેટ : {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? "Processing..." : <T>Submit Return</T>}
          </button>
        </form>
      )}
      {/* No outstanding message */}
      {selectedClient && Object.keys(clientOutstandingPlates).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">This client has no outstanding plates to return.</p>
        </div>
      )}
    </div>
  );
}
