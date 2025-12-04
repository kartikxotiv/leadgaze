
CREATE TYPE public.sales_lead_status_new AS ENUM (
  'in_progress',
  'opportunities',  
  'won',
  'lost',
  'qualified_lead'  
);

ALTER TABLE public.sales_leads 
ADD COLUMN status_new public.sales_lead_status_new;

UPDATE public.sales_leads 
SET status_new = CASE 
  WHEN status::text = 'pipeline' THEN 'opportunities'::public.sales_lead_status_new
  WHEN status::text = 'in_progress' THEN 'in_progress'::public.sales_lead_status_new
  WHEN status::text = 'won' THEN 'won'::public.sales_lead_status_new
  WHEN status::text = 'lost' THEN 'lost'::public.sales_lead_status_new
  ELSE 'opportunities'::public.sales_lead_status_new  
END;

ALTER TABLE public.sales_leads 
DROP COLUMN status;

ALTER TABLE public.sales_leads 
RENAME COLUMN status_new TO status;

ALTER TABLE public.sales_leads 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'opportunities'::public.sales_lead_status_new;

DROP TYPE public.sales_lead_status;

ALTER TYPE public.sales_lead_status_new RENAME TO sales_lead_status;

ALTER TABLE public.sales_leads 
ALTER COLUMN status SET DEFAULT 'opportunities'::public.sales_lead_status;

