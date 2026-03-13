
-- Add new columns to connections table for SOH
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS cc_customer_id TEXT;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS cc_warehouse_name TEXT DEFAULT 'Default';
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS soh_refresh_interval TEXT DEFAULT 'manual';
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS soh_last_refreshed_at TIMESTAMPTZ;

-- Create stock_on_hand table
CREATE TABLE IF NOT EXISTS public.stock_on_hand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  cc_product_code TEXT NOT NULL,
  product_status TEXT NOT NULL DEFAULT 'AVAILABLE',
  unit_of_measure TEXT,
  qty NUMERIC NOT NULL DEFAULT 0,
  raw_response JSONB,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, connection_id, product_status, unit_of_measure)
);

CREATE INDEX IF NOT EXISTS idx_soh_product ON public.stock_on_hand(product_id);
CREATE INDEX IF NOT EXISTS idx_soh_connection ON public.stock_on_hand(connection_id);
CREATE INDEX IF NOT EXISTS idx_soh_product_connection ON public.stock_on_hand(product_id, connection_id);

ALTER TABLE public.stock_on_hand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view stock_on_hand" ON public.stock_on_hand FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert stock_on_hand" ON public.stock_on_hand FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update stock_on_hand" ON public.stock_on_hand FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete stock_on_hand" ON public.stock_on_hand FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated users can view stock_on_hand" ON public.stock_on_hand FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stock_on_hand" ON public.stock_on_hand FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stock_on_hand" ON public.stock_on_hand FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete stock_on_hand" ON public.stock_on_hand FOR DELETE TO authenticated USING (true);
