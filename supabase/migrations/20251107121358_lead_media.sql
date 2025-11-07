CREATE TABLE IF NOT EXISTS public.lead_media(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);

ALTER TABLE public.lead_media ENABLE ROW LEVEL SECURITY;