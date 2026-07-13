/*
 * -------------------------------------------------------
 * Migration: Backfill Company Profiles for Existing Workspaces
 * Date: 2026-07-06
 * Description:
 *   1. Identifies all workspaces that do not have a `company_id` linked (company_id IS NULL).
 *   2. Creates a company record for each workspace using the workspace's name and 'US' as the default billing country.
 *   3. Links the newly created company's ID back to the workspace.
 * -------------------------------------------------------
 */

DO $$
DECLARE
    r RECORD;
    new_company_id UUID;
BEGIN
    FOR r IN 
        SELECT id, name, owner_id 
        FROM public.workspaces 
        WHERE company_id IS NULL
    LOOP
        -- Create a company profile with the workspace name, default billing country 'US', and the workspace owner as created_by
        INSERT INTO public.companies (name, billing_country, created_by)
        VALUES (r.name, 'US', r.owner_id)
        RETURNING id INTO new_company_id;
        
        -- Link the company back to the workspace
        UPDATE public.workspaces
        SET company_id = new_company_id
        WHERE id = r.id;
    END LOOP;
END $$;
