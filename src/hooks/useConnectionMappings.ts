import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConnectionMapping {
  id: string;
  product_id: string;
  connection_id: string;
  cc_product_code: string;
  cc_product_id: string | null;
  cc_product_name: string | null;
  is_override: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export function useConnectionMappings(connectionId?: string) {
  return useQuery({
    queryKey: ["connection_mappings", connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_mappings")
        .select("*, products(sku, name)")
        .eq("connection_id", connectionId!);
      if (error) throw error;
      return data as (ConnectionMapping & { products: { sku: string; name: string } })[];
    },
  });
}
