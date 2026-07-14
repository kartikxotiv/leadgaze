/*
 * -------------------------------------------------------
 * Migration: Auto-backfill workspace member product keys
 * Date: 2026-07-06
 * Description:
 *   For workspace_members records where product_key is NULL,
 *   this migration maps and copies memberships based on:
 *     - Active seat assignments (from public.seat_assignments table)
 *     - Default products/modules roles setup
 *   to ensure users correctly appear in module-specific member dropdown lists.
 * -------------------------------------------------------
 */

DO $$
DECLARE
    assignment RECORD;
    existing_member RECORD;
    prod RECORD;
    p_key VARCHAR(80);
BEGIN
    -- 1. Loop through all active seat assignments
    FOR assignment IN 
        SELECT sa.workspace_id, sa.user_id, sa.product_id, sp.product_key
        FROM public.seat_assignments sa
        JOIN public.subscription_products sp ON sp.id = sa.product_id
        WHERE sa.is_active = true
    LOOP
        -- Normalize product key
        p_key := CASE 
            WHEN assignment.product_key = 'service_cloud' THEN 'service_cloud'
            WHEN assignment.product_key = 'service-cloud' THEN 'service_cloud'
            WHEN assignment.product_key = 'sales' THEN 'sales'
            WHEN assignment.product_key = 'hrms' THEN 'hrms'
            ELSE assignment.product_key
        END;

        -- Find the primary role of the user in this workspace
        SELECT * INTO existing_member
        FROM public.workspace_members
        WHERE workspace_id = assignment.workspace_id 
          AND user_id = assignment.user_id
        LIMIT 1;

        IF existing_member.id IS NOT NULL THEN
            -- Check if they already have a record for this product_key
            IF NOT EXISTS (
                SELECT 1 FROM public.workspace_members 
                WHERE workspace_id = assignment.workspace_id 
                  AND user_id = assignment.user_id 
                  AND product_key = p_key
            ) THEN
                -- If the original record has NULL product_key, update it
                IF existing_member.product_key IS NULL THEN
                    UPDATE public.workspace_members
                    SET product_key = p_key, product_id = assignment.product_id
                    WHERE id = existing_member.id;
                ELSE
                    -- Otherwise duplicate the membership record to scope it to this product
                    INSERT INTO public.workspace_members (
                        workspace_id, user_id, role_id, status, is_primary_contact, invited_by, invited_at, accepted_at, product_key, product_id
                    ) VALUES (
                        existing_member.workspace_id,
                        existing_member.user_id,
                        existing_member.role_id,
                        existing_member.status,
                        existing_member.is_primary_contact,
                        existing_member.invited_by,
                        existing_member.invited_at,
                        existing_member.accepted_at,
                        p_key,
                        assignment.product_id
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- 2. For remaining records that still have NULL product_key (e.g. owners or non-assigned members)
    -- Map them to all available subscription products for that workspace so they appear in dropdowns
    FOR existing_member IN 
        SELECT id, workspace_id, user_id, role_id, status, is_primary_contact, invited_by, invited_at, accepted_at
        FROM public.workspace_members
        WHERE product_key IS NULL
    LOOP
        FOR prod IN 
            SELECT DISTINCT sp.id, sp.product_key
            FROM public.subscription_products sp
        LOOP
            p_key := CASE 
                WHEN prod.product_key = 'service_cloud' THEN 'service_cloud'
                WHEN prod.product_key = 'service-cloud' THEN 'service_cloud'
                WHEN prod.product_key = 'sales' THEN 'sales'
                WHEN prod.product_key = 'hrms' THEN 'hrms'
                ELSE prod.product_key
            END;

            IF NOT EXISTS (
                SELECT 1 FROM public.workspace_members 
                WHERE workspace_id = existing_member.workspace_id 
                  AND user_id = existing_member.user_id 
                  AND product_key = p_key
            ) THEN
                INSERT INTO public.workspace_members (
                    workspace_id, user_id, role_id, status, is_primary_contact, invited_by, invited_at, accepted_at, product_key, product_id
                ) VALUES (
                    existing_member.workspace_id,
                    existing_member.user_id,
                    existing_member.role_id,
                    existing_member.status,
                    existing_member.is_primary_contact,
                    existing_member.invited_by,
                    existing_member.invited_at,
                    existing_member.accepted_at,
                    p_key,
                    prod.id
                );
            END IF;
        END LOOP;

        -- Delete the original NULL product key record since FLS requires specific scoping
        DELETE FROM public.workspace_members WHERE id = existing_member.id;
    END LOOP;
END $$;
