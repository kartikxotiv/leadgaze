CREATE TABLE IF NOT EXISTS public.user_module_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.subscription_products(id) ON DELETE CASCADE,
  is_interested BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.user_module_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_module_interests_policy ON public.user_module_interests
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);
