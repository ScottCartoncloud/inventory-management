import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, isConnectionConfigured } from "./useConnections";

export interface SaleOrderItem {
  id: string;
  cc_item_id: string;
  cc_numeric_id: string | null;
  cc_product_id: string | null;
  cc_product_code: string | null;
  product_name: string | null;
  product_id: string | null;
  quantity: number;
  unit_of_measure: string | null;
  uom_name: string | null;
  expiry_date: string | null;
  raw_item: unknown;
  created_at: string;
}

export interface SaleOrder {
  id: string;
  org_id: string;
  connection_id: string;
  cc_order_id: string;
  cc_version: number | null;
  order_number: string | null;
  cc_numeric_id: string | null;
  source: string;
  status: string;
  customer_name: string | null;
  deliver_company: string | null;
  deliver_address: string | null;
  deliver_method: string | null;
  collect_company: string | null;
  collect_address: string | null;
  urgent: boolean;
  allow_splitting: boolean;
  invoice_amount: number | null;
  invoice_currency: string | null;
  total_qty: number;
  total_items: number;
  cc_created_at: string | null;
  cc_modified_at: string | null;
  cc_dispatched_at: string | null;
  cc_packed_at: string | null;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
  // Joined
  connection?: { id: string; name: string; color: string } | null;
  items?: SaleOrderItem[];
}

export function useSaleOrders() {
  const queryClient = useQueryClient();
  const { data: connections, isLoading: connectionsLoading } = useConnections();
  const hasConfigured = (connections || []).some(c => c.is_active && isConnectionConfigured(c));

  const query = useQuery({
    queryKey: ["sale-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_orders")
        .select(`
          *,
          connection:connections(id, name, color),
          items:sale_order_items(*)
        `)
        .order("cc_created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SaleOrder[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("sale-orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sale-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const orders = query.data || [];
  const hasRealOrders = orders.length > 0;

  return {
    orders,
    isLoading: connectionsLoading || query.isLoading,
    hasRealOrders,
    isUsingMockData: !hasRealOrders && !hasConfigured && !connectionsLoading,
  };
}
