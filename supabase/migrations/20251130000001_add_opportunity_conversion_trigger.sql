CREATE OR REPLACE FUNCTION public.set_converted_to_opportunity_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'opportunities' AND 
     (OLD.status IS NULL OR OLD.status != 'opportunities') AND
     NEW.converted_to_opportunity_at IS NULL THEN
    NEW.converted_to_opportunity_at := NOW();
  END IF;
  
  IF NEW.status != 'opportunities' AND OLD.status = 'opportunities' THEN
    NEW.converted_to_opportunity_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_converted_to_opportunity_at ON public.sales_leads;
CREATE TRIGGER trigger_set_converted_to_opportunity_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_converted_to_opportunity_at();


