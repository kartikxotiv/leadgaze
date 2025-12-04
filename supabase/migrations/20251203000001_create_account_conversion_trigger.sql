CREATE OR REPLACE FUNCTION public.convert_won_lead_to_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE sales_lead_id = NEW.id) THEN
      
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
      VALUES (
        NEW.id,
        NEW.business_id,
        NEW.workspace_id,
        NEW.first_name,
        NEW.last_name,
        NEW.email,
        NEW.phone_number,
        NEW.alternative_email,
        NEW.alternative_phone_number,
        NEW.linkedin_url,
        NEW.location,
        NEW.contact_time_zone,
        NEW.business_name,
        NEW.business_linkedin,
        NEW.business_contact,
        NEW.platform,
        NEW.priority,
        NEW.comment,
        NEW.owner_id,
        NEW.created_by,
        NOW(),
        NEW.updated_at,
        NEW.is_deleted,
        NEW.deleted_at,
        NEW.created_at,
        NOW()
      );
      
      RAISE NOTICE 'Account created for won lead: %', NEW.id;
    END IF;
    
  ELSIF OLD.status = 'won' AND NEW.status != 'won' THEN
    RAISE NOTICE 'Lead status changed from won to % for lead: %', NEW.status, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_convert_won_lead_to_account ON public.sales_leads;
CREATE TRIGGER trigger_convert_won_lead_to_account
  AFTER UPDATE OF status ON public.sales_leads
  FOR EACH ROW
  WHEN (NEW.status = 'won' OR OLD.status = 'won')
  EXECUTE FUNCTION public.convert_won_lead_to_account();

CREATE OR REPLACE FUNCTION public.convert_won_lead_to_account_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'won' THEN
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
    VALUES (
      NEW.id,
      NEW.business_id,
      NEW.workspace_id,
      NEW.first_name,
      NEW.last_name,
      NEW.email,
      NEW.phone_number,
      NEW.alternative_email,
      NEW.alternative_phone_number,
      NEW.linkedin_url,
      NEW.location,
      NEW.contact_time_zone,
      NEW.business_name,
      NEW.business_linkedin,
      NEW.business_contact,
      NEW.platform,
      NEW.priority,
      NEW.comment,
      NEW.owner_id,
      NEW.created_by,
      NOW(),
      NEW.updated_at,
      NEW.is_deleted,
      NEW.deleted_at,
      NEW.created_at,
      NOW()
    );
    
    RAISE NOTICE 'Account created for new won lead: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_convert_won_lead_to_account_on_insert ON public.sales_leads;
CREATE TRIGGER trigger_convert_won_lead_to_account_on_insert
  AFTER INSERT ON public.sales_leads
  FOR EACH ROW
  WHEN (NEW.status = 'won')
  EXECUTE FUNCTION public.convert_won_lead_to_account_on_insert();

