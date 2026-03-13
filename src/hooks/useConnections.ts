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
      return data as Connection[];
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
          })
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
