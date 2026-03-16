import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Address {
  id: string;
  org_id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address1: string;
  address2: string | null;
  suburb: string | null;
  city: string | null;
  state_name: string | null;
  state_code: string | null;
  postcode: string | null;
  country_name: string | null;
  country_code: string | null;
  lat: number | null;
  lon: number | null;
  source: string;
  cc_address_id: string | null;
  google_place_id: string | null;
  use_count: number;
  last_used_at: string | null;
  address_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("is_active", true)
        .order("use_count", { ascending: false });
      if (error) throw error;
      return data as Address[];
    },
  });
}

export function useSearchAddresses(query: string) {
  return useQuery({
    queryKey: ["addresses", "search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const pattern = `%${query}%`;
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("is_active", true)
        .or(`company_name.ilike.${pattern},suburb.ilike.${pattern},address1.ilike.${pattern},postcode.ilike.${pattern}`)
        .order("use_count", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Address[];
    },
  });
}

export function useIncrementAddressUse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addressId: string) => {
      // First get current count
      const { data: addr } = await supabase
        .from("addresses")
        .select("use_count")
        .eq("id", addressId)
        .single();
      
      const { error } = await supabase
        .from("addresses")
        .update({
          use_count: (addr?.use_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", addressId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (address: Partial<Address> & { address1: string }) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = address as any;
      const { data, error } = await supabase
        .from("addresses")
        .insert([{
          ...rest,
          use_count: 1,
          last_used_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      return data as Address;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Address> & { id: string }) => {
      const { error } = await supabase
        .from("addresses")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeactivateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("addresses")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}
