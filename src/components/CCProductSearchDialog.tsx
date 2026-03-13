import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Connection } from "@/hooks/useConnections";

interface CCProduct {
  id: string;
  code: string;
  name: string;
  barcode?: string;
}

interface CCProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection;
  onSelect: (product: CCProduct) => void;
  onReset: () => void;
  currentCode?: string;
}

export function CCProductSearchDialog({ open, onOpenChange, connection, onSelect, onReset, currentCode }: CCProductSearchDialogProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CCProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  async function handleSearch() {
    setIsLoading(true);
    try {
      // Fetch products from CC via proxy
      const { data, error } = await supabase.functions.invoke("cartoncloud-proxy", {
        body: { connectionId: connection.id, path: "products?page=1&size=100" },
      });
      if (error) throw error;

      const products: CCProduct[] = (Array.isArray(data) ? data : []).map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name || p.code,
        barcode: p.barcode,
      }));

      // Client-side filter
      const filtered = search.trim()
        ? products.filter(p =>
            p.code.toLowerCase().includes(search.toLowerCase()) ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.barcode && p.barcode.includes(search))
          )
        : products;

      setResults(filtered);
      setHasFetched(true);
    } catch (err: any) {
      console.error("CC product search error:", err);
      setResults([]);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Map to CartonCloud Product — {connection.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Search code, name, barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Search"}
          </Button>
        </div>

        {currentCode && (
          <div className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm">
            <span>Current: <strong className="font-mono">{currentCode}</strong></span>
            <Button variant="ghost" size="sm" onClick={() => { onReset(); onOpenChange(false); }}>
              <RotateCcw size={13} /> Reset to default
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto border border-border rounded-md">
          {!hasFetched ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Enter a search term and click Search to find products</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No products found</div>
          ) : (
            results.map(p => (
              <button
                key={p.id}
                className="flex items-center justify-between w-full px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted transition-colors text-left"
                onClick={() => { onSelect(p); onOpenChange(false); }}
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
                </div>
                {p.barcode && <span className="text-xs text-muted-foreground font-mono">{p.barcode}</span>}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
