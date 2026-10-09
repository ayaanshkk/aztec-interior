"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";

const DOOR_TYPES = ["Carcass Only", "Slab", "Lacquered Slab", "Timber"];

const FIXED_CATEGORIES = [
  "Kitchen", "Bedrooms", "Appliances", "Handles", "Accessories",
  "Fillers & End Panels", "Fittings", "Sink and Tap", "Worktops", "Doors",
];

const SECTION_TO_CATEGORY: Record<string, string> = {
  "Appliances": "Appliances",
  "Sink and Tap": "Sink and Tap",
  "Fillers & End Panels": "Fillers & End Panels",
  "Fillers and End Panels": "Fillers & End Panels",
  "Accessories": "Accessories",
  "Handles": "Handles",
  "Worktops": "Worktops",
  "Fittings": "Fittings",
  "Doors": "Doors",
};

const FILLER_SECTIONS = new Set(["Fillers and End Panels", "Fillers & End Panels"]);

const FILLER_TYPE_TO_DOOR_TYPE: Record<string, string> = {
  "Basic Slab":        "Slab",
  "Acrylic Gloss/Matt": "Lacquered Slab",
  "Timber":            "Timber",
};

function resolveDoorType(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (DOOR_TYPES.includes(raw)) return raw;
  return FILLER_TYPE_TO_DOOR_TYPE[raw];
}

function detectCategory(section?: string, roomType?: string): string {
  if (section && SECTION_TO_CATEGORY[section]) return SECTION_TO_CATEGORY[section];
  if (section === "Miscellaneous") return "";
  if (!section || section === "Furniture") {
    if (roomType === "Kitchen") return "Kitchen";
    if (roomType === "Bedrooms" || roomType === "Bedroom") return "Bedrooms";
  }
  return "";
}

export interface PricelistEntry {
  itemCode: string;
  description: string;
  amount?: number;
  section?: string;
  doorTypeAtEntry?: string;
}

interface ItemState {
  included: boolean;
  code: string;
  name: string;
  category: string;
  newCategory: string;
  prices: Record<string, string>;
  width: string;
  height: string;
  depth: string;
}

export interface AddToPricelistModalProps {
  open: boolean;
  /** Called when user explicitly clicks "Add & Continue" or "Skip All & Continue" — proceed with save */
  onProceed: () => void;
  /** Called when user dismisses via X without taking action — do NOT save */
  onDismiss: () => void;
  entries: PricelistEntry[];
  doorType?: string;
  fillerType?: string;
  roomType?: string;
}

export default function AddToPricelistModal({
  open, onProceed, onDismiss, entries, doorType, fillerType, roomType,
}: AddToPricelistModalProps) {
  const [itemStates, setItemStates] = useState<ItemState[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError("");
    setItemStates(entries.map(entry => {
      const isFillerSection = FILLER_SECTIONS.has(entry.section || "");
      const rawDt = isFillerSection ? fillerType : (entry.doorTypeAtEntry || doorType);
      const activeDt = resolveDoorType(rawDt);
      const initPrices: Record<string, string> = {};
      if (activeDt && entry.amount && entry.amount > 0) {
        initPrices[activeDt] = String(entry.amount);
      }
      return {
        included: true,
        code: entry.itemCode,
        name: entry.description || entry.itemCode,
        category: detectCategory(entry.section, roomType),
        newCategory: "",
        prices: initPrices,
        width: "",
        height: "",
        depth: "",
      };
    }));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (idx: number, patch: Partial<ItemState>) =>
    setItemStates(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const updatePrice = (idx: number, dt: string, value: string) =>
    setItemStates(prev => prev.map((s, i) => i === idx ? { ...s, prices: { ...s.prices, [dt]: value } } : s));

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      const calls: Promise<any>[] = [];
      itemStates.forEach((s) => {
        if (!s.included) return;
        const cat = s.category === "__new__" ? s.newCategory.trim() : s.category;
        if (!cat) return;
        Object.entries(s.prices).forEach(([dt, price]) => {
          if (!price || parseFloat(price) <= 0) return;
          calls.push(
            // @ts-ignore
            api.createPricelistItem({
              category: cat,
              item_code: s.code,
              item_name: s.name || s.code,
              description: `${s.name || s.code} - ${dt}`,
              base_price: parseFloat(price),
              door_type: dt,
              width: s.width ? parseInt(s.width) : null,
              height: s.height ? parseInt(s.height) : null,
              depth: s.depth ? parseInt(s.depth) : null,
              unit: "each",
            })
          );
        });
      });
      if (calls.length > 0) await Promise.all(calls);
      setDone(true);
      setTimeout(() => onProceed(), 1000);
    } catch (e: any) {
      setError(e.message || "Failed to add items");
    } finally {
      setSaving(false);
    }
  };

  const includedCount = itemStates.filter(s => s.included).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base font-semibold">Add to Pricelist</DialogTitle>
          {!done && (
            <p className="text-xs text-gray-500 mt-0.5">
              {entries.length} item{entries.length !== 1 ? "s" : ""} weren't found in the pricelist. Tick the ones you'd like to add.
            </p>
          )}
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-sm font-medium text-gray-700">Added successfully — saving...</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 space-y-3 py-2 pr-1">
              {itemStates.map((s, idx) => {
                const entry = entries[idx];
                const isFillerSection = FILLER_SECTIONS.has(entry.section || "");
                const rawDt = isFillerSection ? fillerType : (entry.doorTypeAtEntry || doorType);
                const activeDt = resolveDoorType(rawDt);
                const catFixed = !!(entry.section && SECTION_TO_CATEGORY[entry.section]);

                return (
                  <div key={idx} className={`border rounded-xl p-4 space-y-3 transition-all ${s.included ? "border-gray-200" : "border-gray-100 opacity-50"}`}>
                    {/* Row header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => updateItem(idx, { included: !s.included })}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${s.included ? "bg-gray-900 border-gray-900 text-white" : "border-gray-300 hover:border-gray-500"}`}
                        >
                          {s.included && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span className="font-mono text-sm font-semibold text-gray-800">{entry.itemCode}</span>
                        {entry.description && <span className="text-xs text-gray-400 truncate">— {entry.description}</span>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-50 px-2 py-0.5 rounded-full">{entry.section || "Furniture"}</span>
                    </div>

                    {s.included && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Code</Label>
                            <Input value={s.code} onChange={e => updateItem(idx, { code: e.target.value })} className="h-8 text-sm font-mono" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Description</Label>
                            <Input value={s.name} onChange={e => updateItem(idx, { name: e.target.value })} className="h-8 text-sm" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-500">Category *</Label>
                            {catFixed && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">auto-detected</span>}
                            {!s.category && !catFixed && <span className="text-xs text-amber-600">Please select</span>}
                          </div>
                          <select
                            value={s.category}
                            onChange={e => updateItem(idx, { category: e.target.value })}
                            className={`w-full h-8 px-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white ${!s.category ? "border-amber-300" : "border-gray-200"}`}
                          >
                            <option value="">Select category...</option>
                            {FIXED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="__new__">+ Create new category</option>
                          </select>
                          {s.category === "__new__" && (
                            <Input autoFocus value={s.newCategory} onChange={e => updateItem(idx, { newCategory: e.target.value })} placeholder="New category name..." className="h-8 text-sm mt-1" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Prices (£)</Label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {DOOR_TYPES.map(dt => (
                              <div key={dt} className={`rounded-lg p-1.5 space-y-1 ${activeDt === dt ? "ring-1 ring-gray-800 bg-gray-50" : ""}`}>
                                <Label className={`text-xs block truncate ${activeDt === dt ? "font-semibold text-gray-800" : "text-gray-400"}`}>{dt}</Label>
                                <Input
                                  type="number" min="0" step="0.01"
                                  value={s.prices[dt] || ""}
                                  onChange={e => updatePrice(idx, dt, e.target.value)}
                                  placeholder="0.00"
                                  className="h-7 text-xs px-2"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {(["W", "H", "D"] as const).map(label => {
                            const key = label === "W" ? "width" : label === "H" ? "height" : "depth";
                            return (
                              <div key={label} className="space-y-0.5">
                                <Label className="text-xs text-gray-400">{label} (mm)</Label>
                                <Input type="number" value={(s as any)[key]} onChange={e => updateItem(idx, { [key]: e.target.value })} placeholder="0" className="h-7 text-xs" />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2 border-t flex-shrink-0">
              <Button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 h-9 text-sm bg-gray-900 hover:bg-gray-800 text-white"
              >
                {saving ? "Adding..." : includedCount > 0 ? `Add ${includedCount} Item${includedCount !== 1 ? "s" : ""} & Save` : "Save"}
              </Button>
              <Button variant="outline" onClick={onProceed} disabled={saving} className="h-9 text-sm px-5">
                Skip All & Save
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
