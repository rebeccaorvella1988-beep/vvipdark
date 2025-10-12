-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for free content cards
CREATE TABLE public.free_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sports_betting', 'signals')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view active free content
CREATE POLICY "Anyone can view active free content"
ON public.free_content
FOR SELECT
USING (is_active = true);

-- Admins can manage free content
CREATE POLICY "Admins can manage free content"
ON public.free_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_free_content_updated_at
BEFORE UPDATE ON public.free_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content
INSERT INTO public.free_content (title, content, type) VALUES
('Free Sports Betting Tips', 'Get daily free sports betting predictions from our expert analysts. Updated daily with high-confidence picks across major sports leagues.', 'sports_betting'),
('Free Trading Signals', 'Access free trading signals for major currency pairs and cryptocurrencies. Perfect for beginners to start their trading journey.', 'signals');