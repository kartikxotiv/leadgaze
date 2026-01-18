-- Fix phone_number type mismatch: Change both sales_leads and accounts phone_number from INTEGER to VARCHAR(255)
-- This fixes the error when converting sales leads to accounts: 
-- "column phone_number is of type integer but expression is of type character varying"

-- Step 1: Drop all triggers that reference phone_number to avoid conflicts during migration
DROP TRIGGER IF EXISTS trigger_convert_won_lead_to_account ON public.sales_leads;
DROP TRIGGER IF EXISTS trigger_convert_won_lead_to_account_on_insert ON public.sales_leads;
DROP TRIGGER IF EXISTS trigger_sync_account_on_lead_update ON public.sales_leads;
DROP TRIGGER IF EXISTS trigger_set_converted_to_opportunity_at ON public.sales_leads;

-- Step 2: Change sales_leads phone_number from INTEGER to VARCHAR(255)
ALTER TABLE public.sales_leads 
ALTER COLUMN phone_number TYPE VARCHAR(255) USING 
  CASE 
    WHEN phone_number IS NULL THEN NULL
    ELSE phone_number::VARCHAR(255)
  END;

-- Step 3: Change accounts phone_number from INTEGER to VARCHAR(255) to match sales_leads
-- This is critical to fix the conversion error
ALTER TABLE public.accounts 
ALTER COLUMN phone_number TYPE VARCHAR(255) USING 
  CASE 
    WHEN phone_number IS NULL THEN NULL
    ELSE phone_number::VARCHAR(255)
  END;

-- Step 4: Recreate all triggers (they will now work with VARCHAR automatically)
CREATE TRIGGER trigger_convert_won_lead_to_account
  AFTER UPDATE OF status ON public.sales_leads
  FOR EACH ROW
  WHEN (NEW.status = 'won' OR OLD.status = 'won')
  EXECUTE FUNCTION public.convert_won_lead_to_account();

CREATE TRIGGER trigger_convert_won_lead_to_account_on_insert
  AFTER INSERT ON public.sales_leads
  FOR EACH ROW
  WHEN (NEW.status = 'won')
  EXECUTE FUNCTION public.convert_won_lead_to_account_on_insert();

CREATE TRIGGER trigger_sync_account_on_lead_update
  AFTER UPDATE ON public.sales_leads
  FOR EACH ROW
  WHEN (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
    OLD.alternative_email IS DISTINCT FROM NEW.alternative_email OR
    OLD.alternative_phone_number IS DISTINCT FROM NEW.alternative_phone_number OR
    OLD.linkedin_url IS DISTINCT FROM NEW.linkedin_url OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.contact_time_zone IS DISTINCT FROM NEW.contact_time_zone OR
    OLD.business_id IS DISTINCT FROM NEW.business_id OR
    OLD.business_name IS DISTINCT FROM NEW.business_name OR
    OLD.business_linkedin IS DISTINCT FROM NEW.business_linkedin OR
    OLD.business_contact IS DISTINCT FROM NEW.business_contact OR
    OLD.platform IS DISTINCT FROM NEW.platform OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.comment IS DISTINCT FROM NEW.comment OR
    OLD.owner_id IS DISTINCT FROM NEW.owner_id OR
    OLD.created_by IS DISTINCT FROM NEW.created_by OR
    OLD.is_deleted IS DISTINCT FROM NEW.is_deleted OR
    OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  )
  EXECUTE FUNCTION public.sync_account_on_lead_update();

-- Recreate the opportunity conversion trigger
CREATE TRIGGER trigger_set_converted_to_opportunity_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_converted_to_opportunity_at();

