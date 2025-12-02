CREATE OR REPLACE FUNCTION public.sync_account_on_lead_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'won' AND EXISTS (SELECT 1 FROM public.accounts WHERE sales_lead_id = NEW.id) THEN
    
    UPDATE public.accounts
    SET
      business_id = NEW.business_id,
      workspace_id = NEW.workspace_id,
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      email = NEW.email,
      phone_number = NEW.phone_number,
      alternative_email = NEW.alternative_email,
      alternative_phone_number = NEW.alternative_phone_number,
      linkedin_url = NEW.linkedin_url,
      location = NEW.location,
      contact_time_zone = NEW.contact_time_zone,
      business_name = NEW.business_name,
      business_linkedin = NEW.business_linkedin,
      business_contact = NEW.business_contact,
      platform = NEW.platform,
      priority = NEW.priority,
      comment = NEW.comment,
      owner_id = NEW.owner_id,
      created_by = NEW.created_by,
      is_deleted = NEW.is_deleted,
      deleted_at = NEW.deleted_at,
      updated_at = NOW()
    WHERE sales_lead_id = NEW.id;
    
    RAISE NOTICE 'Account synced for lead: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_account_on_lead_update ON public.sales_leads;
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

