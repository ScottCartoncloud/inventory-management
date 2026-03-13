
-- Add product sync settings to connections table
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_sync_mode TEXT NOT NULL DEFAULT 'pull';
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_auto_import BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_match_strategy TEXT NOT NULL DEFAULT 'sku';
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_last_synced_at TIMESTAMPTZ;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_last_sync_matched INTEGER;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_last_sync_unmatched_cc INTEGER;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS product_last_sync_unmatched_portal INTEGER;

-- Add cc_product_name to product_mappings
ALTER TABLE public.product_mappings ADD COLUMN IF NOT EXISTS cc_product_name TEXT;
