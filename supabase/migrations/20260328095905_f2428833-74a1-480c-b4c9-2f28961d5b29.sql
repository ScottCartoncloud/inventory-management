-- Add attachment fields to sale_orders
ALTER TABLE public.sale_orders ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.sale_orders ADD COLUMN IF NOT EXISTS attachment_filename TEXT;

-- Create storage bucket for order attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow read order attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-attachments');

CREATE POLICY "Allow upload order attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-attachments');

CREATE POLICY "Allow update order attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'order-attachments');