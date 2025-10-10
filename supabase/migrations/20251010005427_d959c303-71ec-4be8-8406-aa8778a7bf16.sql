-- Add new payment method fields to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS mpesa_agent_number text,
ADD COLUMN IF NOT EXISTS mpesa_agent_name text,
ADD COLUMN IF NOT EXISTS cashapp_handle text,
ADD COLUMN IF NOT EXISTS venmo_handle text,
ADD COLUMN IF NOT EXISTS paypal_email text,
ADD COLUMN IF NOT EXISTS applepay_number text,
ADD COLUMN IF NOT EXISTS zelle_email text,
ADD COLUMN IF NOT EXISTS chime_email text;