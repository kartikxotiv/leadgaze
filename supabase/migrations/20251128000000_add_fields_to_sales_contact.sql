ALTER TABLE public.sales_contacts
     ADD COLUMN IF NOT EXISTS alternative_phone_number VARCHAR(255),
     ADD COLUMN IF NOT EXISTS alternative_email VARCHAR(255),
     ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
     ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
     ADD COLUMN IF NOT EXISTS business_linkedin VARCHAR(500),
     ADD COLUMN IF NOT EXISTS business_contact VARCHAR(255),
     ADD COLUMN IF NOT EXISTS comment TEXT;