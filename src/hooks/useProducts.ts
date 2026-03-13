import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductUOM {
  id: string;
  product_id: string;
  name: string;
  qty: number;
  sort_order: number;
}

export interface DBProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  min_qty: number;
  barcode: string | null;
  supplier: string | null;
  cost_price: number;
  sell_price: number;
  tax_rate: number;
  weight: number | null;
  weight_unit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dim_unit: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_uoms: ProductUOM[];
}

export interface ProductMapping {
  id: string;
  product_id: string;
  connection_id: string;
  cc_product_code: string;
  cc_product_id: string | null;
  is_override: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_uoms(*)")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        cost_price: Number(p.cost_price),
        sell_price: Number(p.sell_price),
        tax_rate: Number(p.tax_rate),
        weight: p.weight ? Number(p.weight) : null,
        length: p.length ? Number(p.length) : null,
        width: p.width ? Number(p.width) : null,
        height: p.height ? Number(p.height) : null,
        product_uoms: (p.product_uoms || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })) as DBProduct[];
    },
  });
}

export function useProductMappings(productId?: string) {
  return useQuery({
    queryKey: ["product_mappings", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_mappings")
        .select("*")
        .eq("product_id", productId!);
      if (error) throw error;
      return data as ProductMapping[];
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product: Omit<DBProduct, "id" | "created_at" | "updated_at" | "product_uoms" | "is_active">;
      uoms: { name: string; qty: number; sort_order: number }[];
    }) => {
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          sku: input.product.sku,
          name: input.product.name,
          category: input.product.category,
          unit: input.product.unit,
          min_qty: input.product.min_qty,
          barcode: input.product.barcode,
          supplier: input.product.supplier,
          cost_price: input.product.cost_price,
          sell_price: input.product.sell_price,
          tax_rate: input.product.tax_rate,
          weight: input.product.weight,
          weight_unit: input.product.weight_unit,
          length: input.product.length,
          width: input.product.width,
          height: input.product.height,
          dim_unit: input.product.dim_unit,
          notes: input.product.notes,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.uoms.length > 0) {
        const { error: uomError } = await supabase
          .from("product_uoms")
          .insert(input.uoms.map(u => ({ ...u, product_id: product.id })));
        if (uomError) throw uomError;
      }
      return product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      product: Partial<Omit<DBProduct, "id" | "created_at" | "updated_at" | "product_uoms">>;
      uoms?: { name: string; qty: number; sort_order: number }[];
    }) => {
      const { error } = await supabase
        .from("products")
        .update(input.product)
        .eq("id", input.id);
      if (error) throw error;

      if (input.uoms !== undefined) {
        // Delete existing and re-insert
        await supabase.from("product_uoms").delete().eq("product_id", input.id);
        if (input.uoms.length > 0) {
          const { error: uomError } = await supabase
            .from("product_uoms")
            .insert(input.uoms.map(u => ({ ...u, product_id: input.id })));
          if (uomError) throw uomError;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpsertProductMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      connection_id: string;
      cc_product_code: string;
      cc_product_id?: string | null;
      is_override: boolean;
    }) => {
      const { data, error } = await supabase
        .from("product_mappings")
        .upsert(
          {
            product_id: input.product_id,
            connection_id: input.connection_id,
            cc_product_code: input.cc_product_code,
            cc_product_id: input.cc_product_id || null,
            is_override: input.is_override,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "product_id,connection_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product_mappings"] }),
  });
}

export function useDeleteProductMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { product_id: string; connection_id: string }) => {
      const { error } = await supabase
        .from("product_mappings")
        .delete()
        .eq("product_id", input.product_id)
        .eq("connection_id", input.connection_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product_mappings"] }),
  });
}

export function useBulkUpsertMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: {
      product_id: string;
      connection_id: string;
      cc_product_code: string;
      cc_product_id?: string | null;
      is_override: boolean;
    }[]) => {
      if (mappings.length === 0) return;
      const { error } = await supabase
        .from("product_mappings")
        .upsert(
          mappings.map(m => ({
            ...m,
            cc_product_id: m.cc_product_id || null,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: "product_id,connection_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product_mappings"] }),
  });
}
