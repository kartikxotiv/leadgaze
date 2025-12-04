INSERT INTO public.accounts (
  sales_lead_id,
  business_id,
  workspace_id,
  first_name,
  last_name,
  email,
  phone_number,
  alternative_email,
  alternative_phone_number,
  linkedin_url,
  location,
  contact_time_zone,
  business_name,
  business_linkedin,
  business_contact,
  platform,
  priority,
  comment,
  owner_id,
  created_by,
  converted_at,
  converted_from_lead_at,
  is_deleted,
  deleted_at,
  created_at,
  updated_at
)
SELECT 
  id as sales_lead_id,
  business_id,
  workspace_id,
  first_name,
  last_name,
  email,
  phone_number,
  alternative_email,
  alternative_phone_number,
  linkedin_url,
  location,
  contact_time_zone,
  business_name,
  business_linkedin,
  business_contact,
  platform,
  priority,
  comment,
  owner_id,
  created_by,
  updated_at as converted_at, -- Use updated_at as conversion time
  updated_at as converted_from_lead_at,
  is_deleted,
  deleted_at,
  created_at,
  updated_at
FROM public.sales_leads
WHERE status = 'won'
  AND NOT EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE accounts.sales_lead_id = sales_leads.id
  )
ON CONFLICT (sales_lead_id) DO NOTHING;

