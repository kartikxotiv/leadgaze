ALTER TABLE public.sales_contacts
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.sales_leads
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_contacts_business_id ON public.sales_contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_business_id ON public.sales_leads(business_id);

