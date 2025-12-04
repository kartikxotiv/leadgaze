ALTER TABLE public.sales_leads 
ADD COLUMN IF NOT EXISTS converted_to_opportunity_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sales_leads_converted_to_opportunity_at 
ON public.sales_leads(converted_to_opportunity_at) 
WHERE converted_to_opportunity_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_leads_status_opportunities 
ON public.sales_leads(status) 
WHERE status = 'opportunities';

UPDATE public.sales_leads 
SET converted_to_opportunity_at = updated_at 
WHERE status = 'opportunities' 
  AND converted_to_opportunity_at IS NULL;

COMMENT ON COLUMN public.sales_leads.converted_to_opportunity_at IS 
'Tracks when a sales lead was converted to an opportunity. Similar to how contacts have moved_to_lead status.';


