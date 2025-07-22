import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/supabase";
import { ClientSelector } from "./ClientSelector";
import { FileText, Package, Save, Loader2, Calendar, AlertTriangle } from "lucide-react";
import { generateJPGChallan, downloadJPGChallan } from "../utils/jpgChallanGenerator";
import { ChallanData } from "./challans/types";
import { T } from "../contexts/LanguageContext";

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
      const { data, error } = await supabase
        .from("challans")
        .select("challan_number")
        .order("id", { ascending: false });
      if (error) throw error;
      let maxNumber = 0;
      data?.forEach(challan => {
        const match = challan.challan_number.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num > maxNumber) maxNumber = num;
        }
      });
      const nextNumber = (maxNumber + 1).toString();
      setSuggestedChallanNumber(nextNumber);
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
        alert("Please enter a challan number.");
        return;
      }

      const exists = await checkChallanNumberExists(challanNumber);
      if (exists) {
        alert("Challan number already exists. Please use a different number.");
        return;
      }

      const validItems = PLATE_SIZES.filter(size => quantities[size] > 0);
      if (validItems.length === 0) {
        alert("Please enter at least one plate quantity.");
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

      alert(`Challan ${challan.challan_number} created and downloaded successfully!`);
      await fetchStockData();
    } catch (error) {
      console.error("Error creating challan:", error);
      alert("Error creating challan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const getStockInfo = (size: string) => stockData.find(s => s.plate_size === size);
  const isStockInsufficient = (size: string) => stockValidation.some(item => item.size === size);

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          <T>Issue Challan</T>
        </h1>
        <p className="text-sm text-gray-600">ઉધાર ચલણ - Create new rental</p>
      </div>

      {/* Client Selection */}
      <ClientSelector
        onClientSelect={setSelectedClient}
        selectedClient={selectedClient}
      />

      {/* Issue Form */}
      {selectedClient && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 px-2 pt-1 pb-4 space-y-3">
          {/* Challan Details */}
          <div className="flex gap-3 flex-wrap items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              <T>Challan Number</T> *
            </label>
            <input
              type="text"
              value={challanNumber}
              onChange={(e) => handleChallanNumberChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="ml-2 w-28 px-2 py-1 border border-gray-300 rounded-lg text-base"
              placeholder={`Suggested: ${suggestedChallanNumber}`}
              required
            />
            <label className="block text-sm font-medium text-gray-700 ml-auto">
              <Calendar className="w-4 h-4 inline" /> <T>Date</T> *
            </label>
            <input
              type="date"
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              required
              className="ml-2 w-32 px-2 py-1 border border-gray-300 rounded-lg text-base"
            />
          </div>

          {/* Stock Warning */}
          {stockValidation.length > 0 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Some items have insufficient stock.</span>
            </div>
          )}

          {/* Plates Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full rounded-lg border">
              <thead>
                <tr className="bg-green-50">
                  <th className="px-2 py-2 text-left text-xs font-semibold">Plate Size</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold">Available</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold">Issue</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {PLATE_SIZES.map(size => {
                  const stockInfo = getStockInfo(size);
                  const isInsufficient = isStockInsufficient(size);
                  return (
                    <tr 
                      key={size} 
                      className={`border-t ${isInsufficient ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-2 py-2 font-medium whitespace-nowrap">{size}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-sm ${isInsufficient ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {stockInfo?.available_quantity || 0}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={quantities[size] || ""}
                          onChange={e => handleQuantityChange(size, e.target.value)}
                          className={`w-14 px-1 py-1 border rounded text-base text-center ${
                            isInsufficient ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {isInsufficient && (
                          <div className="text-xs text-red-600 mt-1">
                            Only {stockValidation.find(item => item.size === size)?.available} available
                          </div>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotal */}
          <div className="mt-4 text-center bg-green-50 py-2 rounded-lg font-semibold text-base text-green-700">
            કુલ પ્લેટ : {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? "Creating..." : <T>Create Challan</T>}
          </button>
    </form>
  )}
    {/* Extra space at the end of the page for mobile UX */}
    <div className="py-8" />
  </div>
  );
}
