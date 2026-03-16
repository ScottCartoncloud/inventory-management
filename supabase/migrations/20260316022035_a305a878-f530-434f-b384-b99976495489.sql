
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  suburb TEXT,
  city TEXT,
  state_name TEXT,
  state_code TEXT,
  postcode TEXT,
  country_name TEXT DEFAULT 'Australia',
  country_code TEXT DEFAULT 'AU',
  lat NUMERIC,
  lon NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual',
  cc_address_id TEXT,
  google_place_id TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  address_type TEXT DEFAULT 'delivery',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_org ON public.addresses(org_id);
CREATE INDEX idx_addresses_company ON public.addresses(org_id, company_name);
CREATE INDEX idx_addresses_suburb ON public.addresses(org_id, suburb);
CREATE INDEX idx_addresses_postcode ON public.addresses(org_id, postcode);
CREATE INDEX idx_addresses_cc_id ON public.addresses(cc_address_id);
CREATE INDEX idx_addresses_use_count ON public.addresses(org_id, use_count DESC);
CREATE INDEX idx_addresses_search ON public.addresses 
  USING GIN (to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(suburb, '') || ' ' || coalesce(city, '') || ' ' || coalesce(address1, '')));

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view addresses" ON public.addresses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon users can insert addresses" ON public.addresses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon users can update addresses" ON public.addresses FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon users can delete addresses" ON public.addresses FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated users can view addresses" ON public.addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert addresses" ON public.addresses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update addresses" ON public.addresses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete addresses" ON public.addresses FOR DELETE TO authenticated USING (true);
