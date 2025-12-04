UPDATE public.accounts
SET 
  phone_number = sales_leads.phone_number,
  alternative_phone_number = sales_leads.alternative_phone_number,
  updated_at = NOW()
FROM public.sales_leads
WHERE accounts.sales_lead_id = sales_leads.id
  AND (
    -- Update if account has null but lead has value
    (accounts.phone_number IS NULL AND sales_leads.phone_number IS NOT NULL) OR
    (accounts.alternative_phone_number IS NULL AND sales_leads.alternative_phone_number IS NOT NULL) OR
    -- Update if values don't match
    accounts.phone_number IS DISTINCT FROM sales_leads.phone_number OR
    accounts.alternative_phone_number IS DISTINCT FROM sales_leads.alternative_phone_number
  );

