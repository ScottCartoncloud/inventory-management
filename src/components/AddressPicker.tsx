import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSearchAddresses, useIncrementAddressUse, useSaveAddress, type Address } from "@/hooks/useAddresses";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, MapPin, Globe, PenLine } from "lucide-react";

interface PlaceResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface SelectedAddress {
  id?: string;
  company_name: string | null;
  address1: string;
  address2?: string | null;
  suburb: string | null;
  city?: string | null;
  state_code: string | null;
  state_name?: string | null;
  postcode: string | null;
  country_code: string | null;
  country_name?: string | null;
  lat?: number | null;
  lon?: number | null;
  google_place_id?: string | null;
  source: string;
}

interface AddressPickerProps {
  value: SelectedAddress | null;
  onChange: (address: SelectedAddress | null) => void;
  placeholder?: string;
}

function formatAddressLine(addr: SelectedAddress): string {
  return [addr.address1, addr.suburb, addr.state_code, addr.postcode].filter(Boolean).join(", ");
}

export function AddressPicker({ value, onChange, placeholder = "Search addresses…" }: AddressPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [googleResults, setGoogleResults] = useState<PlaceResult[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Manual entry fields
  const [manual, setManual] = useState({
    company_name: "",
    address1: "",
    address2: "",
    suburb: "",
    state_code: "",
    postcode: "",
    country_code: "AU",
  });

  const { data: savedResults = [] } = useSearchAddresses(query);
  const incrementUse = useIncrementAddressUse();
  const saveAddress = useSaveAddress();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Google Places search (debounced)
  const searchGoogle = useCallback(async (q: string) => {
    if (q.length < 3 || !googleAvailable) return;
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-search", {
        body: { query: q, country: "AU" },
      });
      if (error) throw error;
      if (data?.error?.includes("not configured")) {
        setGoogleAvailable(false);
        setGoogleResults([]);
      } else {
        setGoogleResults(data?.results || []);
      }
    } catch {
      setGoogleResults([]);
    } finally {
      setGoogleLoading(false);
    }
  }, [googleAvailable]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 3 && savedResults.length < 3) {
      debounceRef.current = setTimeout(() => searchGoogle(query), 400);
    } else {
      setGoogleResults([]);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, savedResults.length, searchGoogle]);

  async function handleSelectSaved(addr: Address) {
    incrementUse.mutate(addr.id);
    onChange({
      id: addr.id,
      company_name: addr.company_name,
      address1: addr.address1,
      address2: addr.address2,
      suburb: addr.suburb,
      city: addr.city,
      state_code: addr.state_code,
      state_name: addr.state_name,
      postcode: addr.postcode,
      country_code: addr.country_code,
      country_name: addr.country_name,
      lat: addr.lat,
      lon: addr.lon,
      source: addr.source,
    });
    setIsOpen(false);
    setQuery("");
  }

  async function handleSelectGoogle(place: PlaceResult) {
    try {
      const { data } = await supabase.functions.invoke("google-places-search", {
        body: { action: "details", place_id: place.place_id },
      });
      if (data?.structured) {
        const s = data.structured;
        // Save to addresses table
        const saved = await saveAddress.mutateAsync({
          company_name: s.company_name,
          address1: s.address1,
          suburb: s.suburb,
          city: s.city,
          state_name: s.state_name,
          state_code: s.state_code,
          postcode: s.postcode,
          country_name: s.country_name,
          country_code: s.country_code,
          lat: s.lat,
          lon: s.lon,
          google_place_id: place.place_id,
          source: "google_places",
          address_type: "delivery",
        });
        onChange({
          id: saved.id,
          ...s,
          google_place_id: place.place_id,
          source: "google_places",
        });
      }
    } catch {
      // Fallback: use the description
      onChange({
        company_name: place.main_text,
        address1: place.secondary_text || place.description,
        suburb: null,
        state_code: null,
        postcode: null,
        country_code: "AU",
        source: "google_places",
        google_place_id: place.place_id,
      });
    }
    setIsOpen(false);
    setQuery("");
  }

  function handleManualSave() {
    if (!manual.address1) return;
    const addr: SelectedAddress = {
      company_name: manual.company_name || null,
      address1: manual.address1,
      address2: manual.address2 || null,
      suburb: manual.suburb || null,
      state_code: manual.state_code || null,
      postcode: manual.postcode || null,
      country_code: manual.country_code || "AU",
      source: "manual",
    };
    // Save to DB
    saveAddress.mutate({
      company_name: addr.company_name,
      address1: addr.address1,
      address2: addr.address2,
      suburb: addr.suburb,
      state_code: addr.state_code,
      postcode: addr.postcode,
      country_code: addr.country_code,
      source: "manual",
      address_type: "delivery",
    });
    onChange(addr);
    setShowManual(false);
    setIsOpen(false);
    setQuery("");
  }

  // Selected state
  if (value && !showManual) {
    return (
      <div className="border border-border rounded-lg px-4 py-3 bg-card flex items-start justify-between gap-2">
        <div className="min-w-0">
          {value.company_name && (
            <div className="font-medium text-sm truncate">{value.company_name}</div>
          )}
          <div className="text-sm text-muted-foreground truncate">
            {formatAddressLine(value)}
          </div>
        </div>
        <button
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Manual entry form
  if (showManual) {
    return (
      <div className="space-y-3 border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Enter address manually</span>
          <button onClick={() => setShowManual(false)} className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to search
          </button>
        </div>
        <Input placeholder="Company name" value={manual.company_name} onChange={e => setManual(p => ({ ...p, company_name: e.target.value }))} className="h-8 text-sm" />
        <Input placeholder="Address line 1 *" value={manual.address1} onChange={e => setManual(p => ({ ...p, address1: e.target.value }))} className="h-8 text-sm" />
        <Input placeholder="Address line 2" value={manual.address2} onChange={e => setManual(p => ({ ...p, address2: e.target.value }))} className="h-8 text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Suburb" value={manual.suburb} onChange={e => setManual(p => ({ ...p, suburb: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder="State" value={manual.state_code} onChange={e => setManual(p => ({ ...p, state_code: e.target.value }))} className="h-8 text-sm" />
          <Input placeholder="Postcode" value={manual.postcode} onChange={e => setManual(p => ({ ...p, postcode: e.target.value }))} className="h-8 text-sm" />
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={!manual.address1} onClick={handleManualSave}>Use this address</Button>
        </div>
      </div>
    );
  }

  const hasResults = savedResults.length > 0 || googleResults.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 h-9 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.length >= 2 && (
        <Card className="absolute z-50 top-full mt-1 w-full max-h-80 overflow-auto shadow-lg border border-border p-0">
          {/* Saved Addresses */}
          {savedResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted">
                Saved Addresses
              </div>
              {savedResults.map(addr => (
                <button
                  key={addr.id}
                  onClick={() => handleSelectSaved(addr)}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start gap-2.5 border-b border-border last:border-0"
                >
                  <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{addr.company_name || addr.address1}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Used {addr.use_count}×
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatAddressLine({
                        company_name: addr.company_name,
                        address1: addr.address1,
                        suburb: addr.suburb,
                        state_code: addr.state_code,
                        postcode: addr.postcode,
                        country_code: addr.country_code,
                        source: addr.source,
                      })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Google Results */}
          {googleResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted">
                Search Google
              </div>
              {googleResults.map(place => (
                <button
                  key={place.place_id}
                  onClick={() => handleSelectGoogle(place)}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start gap-2.5 border-b border-border last:border-0"
                >
                  <Globe size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{place.main_text}</span>
                      <span className="text-xs text-muted-foreground shrink-0">via Google</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{place.secondary_text}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading / empty */}
          {googleLoading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching Google Places…</div>
          )}
          {!hasResults && !googleLoading && query.length >= 2 && (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">No addresses found</div>
          )}

          {/* Manual entry link */}
          <button
            onClick={() => { setShowManual(true); setIsOpen(false); }}
            className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-2 text-sm text-muted-foreground border-t border-border"
          >
            <PenLine size={14} />
            Enter address manually
          </button>
        </Card>
      )}
    </div>
  );
}
