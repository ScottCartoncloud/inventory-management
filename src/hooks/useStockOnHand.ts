import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, isConnectionConfigured, type Connection } from "./useConnections";

export interface StockOnHandRow {
  id: string;
  product_id: string;
  connection_id: string;
  cc_product_code: string;
  product_status: string;
  unit_of_measure: string | null;
  qty: number;
  raw_response: any;
  last_updated_at: string;
}

export interface SOHProductSummary {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_category: string;
  product_unit: string;
  product_min_qty: number;
  connections: {
    connection_id: string;
    connection_name: string;
    connection_code: string;
    connection_color: string;
    connection_logo_url: string | null;
    total_qty: number;
    available_qty: number;
    has_non_available: boolean;
    status_breakdown: { status: string; qty: number }[];
  }[];
  total_qty: number;
}

export function useStockOnHand() {
  return useQuery({
    queryKey: ["stock-on-hand"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_on_hand")
        .select("*");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        qty: Number(r.qty) || 0,
      })) as StockOnHandRow[];
    },
  });
}

export function useSOHSummary() {
  const { data: sohRows, isLoading: sohLoading } = useStockOnHand();
  const { data: connections, isLoading: connLoading } = useConnections();

  // Load products separately to join
  const { data: products, isLoading: prodLoading } = useQuery({
    queryKey: ["products-for-soh"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, category, unit, min_qty")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = sohLoading || connLoading || prodLoading;

  const summary: SOHProductSummary[] = [];
  if (!isLoading && products && connections && sohRows) {
    const configuredConns = connections.filter(c => c.is_active && isConnectionConfigured(c));
    const connMap = new Map(configuredConns.map(c => [c.id, c]));

    // Group SOH by product
    const byProduct = new Map<string, StockOnHandRow[]>();
    for (const row of sohRows) {
      const existing = byProduct.get(row.product_id) || [];
      existing.push(row);
      byProduct.set(row.product_id, existing);
    }

    for (const product of products) {
      const rows = byProduct.get(product.id) || [];
      const connGroups = new Map<string, StockOnHandRow[]>();
      for (const row of rows) {
        const existing = connGroups.get(row.connection_id) || [];
        existing.push(row);
        connGroups.set(row.connection_id, existing);
      }

      const connSummaries = configuredConns.map(conn => {
        const connRows = connGroups.get(conn.id) || [];
        const totalQty = connRows.reduce((s, r) => s + r.qty, 0);
        const availableQty = connRows
          .filter(r => r.product_status === "AVAILABLE" || r.product_status === "OK")
          .reduce((s, r) => s + r.qty, 0);
        const hasNonAvailable = connRows.some(r => r.product_status !== "AVAILABLE" && r.product_status !== "OK" && r.qty > 0);

        const statusMap = new Map<string, number>();
        for (const r of connRows) {
          statusMap.set(r.product_status, (statusMap.get(r.product_status) || 0) + r.qty);
        }

        return {
          connection_id: conn.id,
          connection_name: conn.name,
          connection_code: conn.code,
          connection_color: conn.color,
          connection_logo_url: conn.logo_url,
          total_qty: totalQty,
          available_qty: availableQty,
          has_non_available: hasNonAvailable,
          status_breakdown: Array.from(statusMap.entries()).map(([status, qty]) => ({ status, qty })),
        };
      });

      const totalQty = connSummaries.reduce((s, c) => s + c.total_qty, 0);

      // Only include products that have SOH data OR are mapped to connections
      summary.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_category: product.category,
        product_unit: product.unit,
        product_min_qty: product.min_qty,
        connections: connSummaries,
        total_qty: totalQty,
      });
    }
  }

  return { summary, isLoading, hasData: (sohRows?.length ?? 0) > 0, connections: connections || [] };
}

export function useRefreshSOH() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("cartoncloud-soh", {
        body: { connectionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-on-hand"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

export function useRefreshAllSOH() {
  const qc = useQueryClient();
  const { data: connections } = useConnections();

  return useMutation({
    mutationFn: async () => {
      const configured = (connections || []).filter(
        c => c.is_active && isConnectionConfigured(c) && c.cc_customer_id
      );
      if (configured.length === 0) throw new Error("No connections with Customer ID configured");

      const results = await Promise.allSettled(
        configured.map(async conn => {
          const { data, error } = await supabase.functions.invoke("cartoncloud-soh", {
            body: { connectionId: conn.id },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          return { connection: conn, result: data };
        })
      );

      const successes = results.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
      const failures = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];

      return {
        successes: successes.map(s => s.value),
        failures: failures.map((f, i) => ({
          connection: configured[results.indexOf(f)],
          error: f.reason?.message || "Unknown error",
        })),
        totalMatched: successes.reduce((s, r) => s + (r.value.result?.summary?.matched_to_portal || 0), 0),
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-on-hand"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

/** Get the SOH freshness status based on oldest refresh time */
export function getSOHFreshnessStatus(connections: Connection[]): "fresh" | "stale" | "old" | "never" {
  const configured = connections.filter(c => c.is_active && isConnectionConfigured(c));
  if (configured.length === 0) return "never";

  const refreshTimes = configured
    .map(c => c.soh_last_refreshed_at)
    .filter(Boolean) as string[];

  if (refreshTimes.length === 0) return "never";

  const oldest = Math.min(...refreshTimes.map(t => new Date(t).getTime()));
  const minutesAgo = (Date.now() - oldest) / 60000;

  if (minutesAgo <= 15) return "fresh";
  if (minutesAgo <= 60) return "stale";
  return "old";
}

export function getSOHFreshnessLabel(connections: Connection[]): string {
  const configured = connections.filter(c => c.is_active && isConnectionConfigured(c));
  const refreshTimes = configured
    .map(c => c.soh_last_refreshed_at)
    .filter(Boolean) as string[];

  if (refreshTimes.length === 0) return "No SOH data — click Refresh";

  const oldest = Math.min(...refreshTimes.map(t => new Date(t).getTime()));
  const minutesAgo = Math.floor((Date.now() - oldest) / 60000);

  if (minutesAgo < 1) return "Last refreshed just now";
  if (minutesAgo < 60) return `Last refreshed ${minutesAgo} min ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  return `Last refreshed ${hoursAgo}h ago`;
}
