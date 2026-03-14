import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Connection {
  id: string;
  name: string;
  code: string;
  color: string;
  api_endpoint: string;
  tenant_id: string | null;
  client_id: string | null;
  client_secret: string | null;
  is_active: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  product_sync_mode: string;
  product_auto_import: boolean;
  product_match_strategy: string;
  product_last_synced_at: string | null;
  product_last_sync_matched: number | null;
  product_last_sync_unmatched_cc: number | null;
  product_last_sync_unmatched_portal: number | null;
  cc_customer_id: string | null;
  cc_warehouse_name: string | null;
  soh_refresh_interval: string;
  soh_last_refreshed_at: string | null;
  webhook_secret: string | null;
  org_id: string;
}

export function useConnections() {
  return useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as unknown as Connection[];
    },
  });
}

export function useUpsertConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conn: Partial<Connection> & { id?: string }) => {
      if (conn.id) {
        const { data, error } = await supabase
          .from("connections")
          .update({
            name: conn.name,
            code: conn.code,
            color: conn.color,
            api_endpoint: conn.api_endpoint,
            tenant_id: conn.tenant_id,
            client_id: conn.client_id,
            client_secret: conn.client_secret,
            logo_url: conn.logo_url,
            is_active: conn.is_active,
            cc_customer_id: conn.cc_customer_id,
            cc_warehouse_name: conn.cc_warehouse_name,
          } as any)
          .eq("id", conn.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("connections")
          .insert({
            name: conn.name!,
            code: conn.code!,
            color: conn.color,
            api_endpoint: conn.api_endpoint,
            tenant_id: conn.tenant_id,
            client_id: conn.client_id,
            client_secret: conn.client_secret,
            is_active: conn.is_active,
            logo_url: conn.logo_url,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

export function useUpdateProductSyncSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      product_sync_mode?: string;
      product_auto_import?: boolean;
      product_match_strategy?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.product_sync_mode !== undefined) updates.product_sync_mode = input.product_sync_mode;
      if (input.product_auto_import !== undefined) updates.product_auto_import = input.product_auto_import;
      if (input.product_match_strategy !== undefined) updates.product_match_strategy = input.product_match_strategy;

      const { error } = await supabase
        .from("connections")
        .update(updates)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

export function useUpdateSyncStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      product_last_synced_at: string;
      product_last_sync_matched: number;
      product_last_sync_unmatched_cc: number;
      product_last_sync_unmatched_portal: number;
    }) => {
      const { error } = await supabase
        .from("connections")
        .update({
          product_last_synced_at: input.product_last_synced_at,
          product_last_sync_matched: input.product_last_sync_matched,
          product_last_sync_unmatched_cc: input.product_last_sync_unmatched_cc,
          product_last_sync_unmatched_portal: input.product_last_sync_unmatched_portal,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("cartoncloud-proxy", {
        body: { connectionId, path: "test-connection" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

/** Helper: check if a connection has complete credentials */
export function isConnectionConfigured(conn: Connection): boolean {
  return !!(conn.tenant_id && conn.client_id && conn.client_secret);
}
