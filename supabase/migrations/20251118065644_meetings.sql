CREATE TABLE IF NOT EXISTS public.meetings(
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   lead_id UUID REFERENCES public.sales_leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
   title TEXT NOT NULL,
   description TEXT,
   meeting_notes TEXT,
   time TIMESTAMPTZ NOT NULL,
   created_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

