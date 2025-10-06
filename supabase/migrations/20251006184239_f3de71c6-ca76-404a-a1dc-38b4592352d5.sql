-- Insert demo categories
INSERT INTO public.categories (name, description, icon) VALUES
  ('Forex Signals', 'Premium forex trading signals with high accuracy', '💱'),
  ('Crypto Signals', 'Cryptocurrency trading signals and analysis', '₿'),
  ('Sports Betting', 'Expert sports betting tips and predictions', '⚽'),
  ('Stock Market', 'Stock market analysis and trading signals', '📈')
ON CONFLICT DO NOTHING;

-- Insert demo crypto wallets
INSERT INTO public.crypto_wallets (crypto_type, wallet_address, network, is_active) VALUES
  ('BTC', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'Bitcoin', true),
  ('USDT', 'TYDzsYUEpvnYmQk4zGP9L5P3J4x8J4x8J4', 'TRC20', true),
  ('ETH', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'ERC20', true),
  ('USDT', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'ERC20', true)
ON CONFLICT DO NOTHING;

-- Get category IDs for packages
DO $$
DECLARE
  forex_cat_id uuid;
  crypto_cat_id uuid;
  sports_cat_id uuid;
BEGIN
  SELECT id INTO forex_cat_id FROM public.categories WHERE name = 'Forex Signals' LIMIT 1;
  SELECT id INTO crypto_cat_id FROM public.categories WHERE name = 'Crypto Signals' LIMIT 1;
  SELECT id INTO sports_cat_id FROM public.categories WHERE name = 'Sports Betting' LIMIT 1;

  -- Insert demo packages
  INSERT INTO public.packages (name, description, price, duration_days, category_id, features, telegram_link, whatsapp_link, is_active) VALUES
    ('Forex Starter', 'Perfect for beginners starting their forex journey', 49.99, 30, forex_cat_id, 
     '["Daily signals", "2-3 trades per day", "Basic support", "Risk management tips"]'::jsonb,
     'https://t.me/forexstarter', 'https://wa.me/1234567890', true),
    
    ('Forex Pro', 'Advanced forex signals for experienced traders', 99.99, 30, forex_cat_id,
     '["5-7 signals daily", "Advanced analysis", "24/7 support", "Private group access", "Risk management", "Technical analysis"]'::jsonb,
     'https://t.me/forexpro', 'https://wa.me/1234567890', true),
    
    ('Crypto Premium', 'Comprehensive crypto trading signals', 79.99, 30, crypto_cat_id,
     '["Bitcoin signals", "Altcoin picks", "Market analysis", "Entry & exit points", "Portfolio tips"]'::jsonb,
     'https://t.me/cryptopremium', 'https://wa.me/1234567890', true),
    
    ('Sports VIP', 'Exclusive sports betting predictions', 59.99, 30, sports_cat_id,
     '["Daily tips", "Multiple sports", "Win rate tracking", "Odds analysis", "Live support"]'::jsonb,
     'https://t.me/sportsvip', 'https://wa.me/1234567890', true)
  ON CONFLICT DO NOTHING;
END $$;

-- Make duncanprono47@gmail.com an admin
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'duncanprono47@gmail.com' LIMIT 1
);