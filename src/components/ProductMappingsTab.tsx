import { useState } from "react";
import { useConnections, isConnectionConfigured, type Connection } from "@/hooks/useConnections";
import { useProductMappings, useUpsertProductMapping, useDeleteProductMapping, type DBProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { CCProductSearchDialog } from "@/components/CCProductSearchDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, MinusCircle, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductMappingsTabProps {
  product: DBProduct;
}

export function ProductMappingsTab({ product }: ProductMappingsTabProps) {
  const { data: connections = [], isLoading: connectionsLoading } = useConnections();
  const { data: mappings = [], isLoading: mappingsLoading } = useProductMappings(product.id);
  const upsertMapping = useUpsertProductMapping();
  const deleteMapping = useDeleteProductMapping();

  const [searchConnection, setSearchConnection] = useState<Connection | null>(null);

  const configuredConnections = connections.filter(c => c.is_active && isConnectionConfigured(c));

  if (connectionsLoading || mappingsLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (configuredConnections.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <div className="text-3xl mb-3 opacity-30">🔗</div>
        <div className="font-semibold mb-1">No connections configured</div>
        <div>Set up CartonCloud connections in Settings to map products.</div>
      </div>
    );
  }

  function getMappingForConnection(connId: string) {
    return mappings.find(m => m.connection_id === connId);
  }

  async function handleSelect(conn: Connection, ccProduct: { id: string; code: string; name: string }) {
    try {
      await upsertMapping.mutateAsync({
        product_id: product.id,
        connection_id: conn.id,
        cc_product_code: ccProduct.code,
        cc_product_id: ccProduct.id,
        is_override: true,
      });
      toast({ title: "Mapping updated", description: `Mapped to ${ccProduct.code}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleReset(conn: Connection) {
    try {
      await deleteMapping.mutateAsync({ product_id: product.id, connection_id: conn.id });
      toast({ title: "Mapping reset", description: `Now using default SKU: ${product.sku}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.06em] text-muted-foreground pb-1.5 border-b border-border">
          Per-Connection Product Mapping
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          Each connection defaults to using the portal SKU (<strong className="font-mono">{product.sku}</strong>). Override only if the tenant uses a different product code.
        </div>

        {configuredConnections.map(conn => {
          const mapping = getMappingForConnection(conn.id);
          const isOverride = mapping?.is_override;
          const mappedCode = mapping?.cc_product_code || product.sku;
          const status: "auto" | "override" | "not-found" = mapping
            ? (mapping.is_override ? "override" : "auto")
            : "auto"; // Default: using portal SKU

          return (
            <div key={conn.id} className="flex items-center justify-between px-3.5 py-3 border border-border rounded-md">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: conn.color }} />
                <div>
                  <div className="text-sm font-medium">{conn.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{mappedCode}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status === "auto" && (
                  <span className="flex items-center gap-1 text-xs text-[hsl(142,76%,36%)]">
                    <CheckCircle size={12} /> Auto-matched
                  </span>
                )}
                {status === "override" && (
                  <span className="flex items-center gap-1 text-xs text-[hsl(38,92%,50%)]">
                    <AlertTriangle size={12} /> Override
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSearchConnection(conn)}>
                  <Pencil size={12} /> Change
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {searchConnection && (
        <CCProductSearchDialog
          open={!!searchConnection}
          onOpenChange={(open) => { if (!open) setSearchConnection(null); }}
          connection={searchConnection}
          currentCode={getMappingForConnection(searchConnection.id)?.is_override ? getMappingForConnection(searchConnection.id)?.cc_product_code : undefined}
          onSelect={(ccProduct) => handleSelect(searchConnection, ccProduct)}
          onReset={() => handleReset(searchConnection)}
        />
      )}
    </>
  );
}
