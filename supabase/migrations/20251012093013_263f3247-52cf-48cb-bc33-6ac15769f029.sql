-- Add structured fields for free content
ALTER TABLE public.free_content
ADD COLUMN market_type text,
ADD COLUMN action text, -- 'buy' or 'sell'
ADD COLUMN price numeric,
ADD COLUMN take_profit numeric,
ADD COLUMN stop_loss numeric,
ADD COLUMN sport_type text,
ADD COLUMN game_type text,
ADD COLUMN result text;