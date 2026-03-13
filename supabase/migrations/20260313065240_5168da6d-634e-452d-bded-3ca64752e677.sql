
-- Create connections table (replaces hardcoded LOCATIONS)
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#666666',
  api_endpoint TEXT NOT NULL DEFAULT 'https://api.cartoncloud.com',
  tenant_id TEXT,
  client_id TEXT,
  client_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- For now, all authenticated users can read/write connections
CREATE POLICY "Authenticated users can view connections"
  ON public.connections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert connections"
  ON public.connections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update connections"
  ON public.connections FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete connections"
  ON public.connections FOR DELETE TO authenticated USING (true);

-- Also allow anon access for now (no auth required yet)
CREATE POLICY "Anon users can view connections"
  ON public.connections FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert connections"
  ON public.connections FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update connections"
  ON public.connections FOR UPDATE TO anon USING (true);

-- Create connection_tokens table (cached OAuth tokens)
CREATE TABLE public.connection_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS - no direct client access
ALTER TABLE public.connection_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens (no policies = no client access)

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
