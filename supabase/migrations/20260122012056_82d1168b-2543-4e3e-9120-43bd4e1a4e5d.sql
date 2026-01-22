-- Add M-Pesa Daraja API settings and payment method toggles to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS mpesa_consumer_key text,
ADD COLUMN IF NOT EXISTS mpesa_consumer_secret text,
ADD COLUMN IF NOT EXISTS mpesa_passkey text,
ADD COLUMN IF NOT EXISTS mpesa_paybill text,
ADD COLUMN IF NOT EXISTS mpesa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mpesa_environment text DEFAULT 'sandbox',
ADD COLUMN IF NOT EXISTS cashapp_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS venmo_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS paypal_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS applepay_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS zelle_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chime_enabled boolean DEFAULT true;