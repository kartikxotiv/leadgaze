/*
 * -------------------------------------------------------
 * Migration: Mark Existing Workspaces as Onboarded
 * Date: 2026-07-01
 * Description:
 *   Updates all existing workspaces to set is_onboarding_finished = true.
 *   This ensures that workspaces created before the onboarding flow
 *   are treated as having completed onboarding.
 * -------------------------------------------------------
 */

-- Update all existing workspaces to mark them as onboarded
UPDATE public.workspaces
SET is_onboarding_finished = TRUE;

-- Verify the update
-- SELECT COUNT(*) AS total_workspaces, 
--        SUM(CASE WHEN is_onboarding_finished THEN 1 ELSE 0 END) AS onboarded_workspaces
-- FROM public.workspaces;
