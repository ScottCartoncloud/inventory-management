
-- 1. Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view organizations" ON public.organizations FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view organizations" ON public.organizations FOR SELECT TO authenticated USING (true);

-- Insert default org
INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Foods Pty Ltd', 'acme-foods');

-- 2. Add org_id to existing tables
ALTER TABLE public.connections ADD COLUMN org_id UUID REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.products ADD COLUMN org_id UUID REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.product_mappings ADD COLUMN org_id UUID REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.stock_on_hand ADD COLUMN org_id UUID REFERENCES public.organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';

UPDATE public.connections SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.products SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.product_mappings SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.stock_on_hand SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE public.connections ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.product_mappings ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.stock_on_hand ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX idx_connections_org ON public.connections(org_id);
CREATE INDEX idx_products_org ON public.products(org_id);
CREATE INDEX idx_stock_on_hand_org ON public.stock_on_hand(org_id);

-- 3. Add webhook_secret to connections
ALTER TABLE public.connections ADD COLUMN webhook_secret TEXT;

-- 4. Webhook events table
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL,
  cc_order_id TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_error TEXT
);

CREATE INDEX idx_webhook_events_connection ON public.webhook_events(connection_id);
CREATE INDEX idx_webhook_events_received ON public.webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_unprocessed ON public.webhook_events(processed) WHERE processed = false;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view webhook_events" ON public.webhook_events FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert webhook_events" ON public.webhook_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update webhook_events" ON public.webhook_events FOR UPDATE TO anon USING (true);
CREATE POLICY "Authenticated users can view webhook_events" ON public.webhook_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert webhook_events" ON public.webhook_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update webhook_events" ON public.webhook_events FOR UPDATE TO authenticated USING (true);

-- 5. Sale orders table
CREATE TABLE public.sale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  cc_order_id TEXT NOT NULL,
  cc_version INTEGER,
  order_number TEXT,
  cc_numeric_id TEXT,
  source TEXT NOT NULL DEFAULT 'cartoncloud',
  status TEXT NOT NULL,
  customer_name TEXT,
  deliver_company TEXT,
  deliver_address TEXT,
  deliver_method TEXT,
  collect_company TEXT,
  collect_address TEXT,
  urgent BOOLEAN DEFAULT false,
  allow_splitting BOOLEAN DEFAULT true,
  invoice_amount NUMERIC,
  invoice_currency TEXT DEFAULT 'AUD',
  total_qty NUMERIC NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  cc_created_at TIMESTAMPTZ,
  cc_modified_at TIMESTAMPTZ,
  cc_dispatched_at TIMESTAMPTZ,
  cc_packed_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, cc_order_id)
);

CREATE INDEX idx_sale_orders_org ON public.sale_orders(org_id);
CREATE INDEX idx_sale_orders_connection ON public.sale_orders(connection_id);
CREATE INDEX idx_sale_orders_status ON public.sale_orders(status);
CREATE INDEX idx_sale_orders_cc_order ON public.sale_orders(cc_order_id);
CREATE INDEX idx_sale_orders_created ON public.sale_orders(cc_created_at DESC);

ALTER TABLE public.sale_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view sale_orders" ON public.sale_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert sale_orders" ON public.sale_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update sale_orders" ON public.sale_orders FOR UPDATE TO anon USING (true);
CREATE POLICY "Authenticated users can view sale_orders" ON public.sale_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sale_orders" ON public.sale_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sale_orders" ON public.sale_orders FOR UPDATE TO authenticated USING (true);

-- Enable realtime for sale_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_orders;

-- 6. Sale order items table
CREATE TABLE public.sale_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_order_id UUID NOT NULL REFERENCES public.sale_orders(id) ON DELETE CASCADE,
  cc_item_id TEXT NOT NULL,
  cc_numeric_id TEXT,
  cc_product_id TEXT,
  cc_product_code TEXT,
  product_name TEXT,
  product_id UUID REFERENCES public.products(id),
  quantity NUMERIC NOT NULL,
  unit_of_measure TEXT,
  uom_name TEXT,
  expiry_date DATE,
  raw_item JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_order_items_order ON public.sale_order_items(sale_order_id);
CREATE INDEX idx_sale_order_items_product ON public.sale_order_items(product_id);

ALTER TABLE public.sale_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view sale_order_items" ON public.sale_order_items FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert sale_order_items" ON public.sale_order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can delete sale_order_items" ON public.sale_order_items FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated users can view sale_order_items" ON public.sale_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sale_order_items" ON public.sale_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete sale_order_items" ON public.sale_order_items FOR DELETE TO authenticated USING (true);
