
-- Add logo_url column to connections
ALTER TABLE public.connections ADD COLUMN logo_url text;

-- Create storage bucket for connection logos
INSERT INTO storage.buckets (id, name, public) VALUES ('connection-logos', 'connection-logos', true);

-- Allow anyone to read logos
CREATE POLICY "Public read access for connection logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'connection-logos');

-- Allow anon and authenticated to upload logos
CREATE POLICY "Allow upload connection logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'connection-logos');

-- Allow anon and authenticated to update logos
CREATE POLICY "Allow update connection logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'connection-logos');

-- Allow anon and authenticated to delete logos
CREATE POLICY "Allow delete connection logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'connection-logos');
