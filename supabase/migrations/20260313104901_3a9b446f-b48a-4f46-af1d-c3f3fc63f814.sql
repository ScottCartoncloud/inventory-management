
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'CTN',
  min_qty INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  supplier TEXT,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  weight NUMERIC(10,3),
  weight_unit TEXT DEFAULT 'kg',
  length NUMERIC(10,2),
  width NUMERIC(10,2),
  height NUMERIC(10,2),
  dim_unit TEXT DEFAULT 'cm',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product UOMs table
CREATE TABLE public.product_uoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Product mappings table (per-tenant CC code overrides)
CREATE TABLE public.product_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  cc_product_code TEXT NOT NULL,
  cc_product_id TEXT,
  is_override BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, connection_id)
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for products
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.products FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon users can view products" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert products" ON public.products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update products" ON public.products FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete products" ON public.products FOR DELETE TO anon USING (true);

-- RLS policies for product_uoms
CREATE POLICY "Authenticated users can view product_uoms" ON public.product_uoms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert product_uoms" ON public.product_uoms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update product_uoms" ON public.product_uoms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete product_uoms" ON public.product_uoms FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon users can view product_uoms" ON public.product_uoms FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert product_uoms" ON public.product_uoms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update product_uoms" ON public.product_uoms FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete product_uoms" ON public.product_uoms FOR DELETE TO anon USING (true);

-- RLS policies for product_mappings
CREATE POLICY "Authenticated users can view product_mappings" ON public.product_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert product_mappings" ON public.product_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update product_mappings" ON public.product_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete product_mappings" ON public.product_mappings FOR DELETE TO authenticated USING (true);
CREATE POLICY "Anon users can view product_mappings" ON public.product_mappings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert product_mappings" ON public.product_mappings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update product_mappings" ON public.product_mappings FOR UPDATE TO anon USING (true);

-- updated_at trigger on products
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
