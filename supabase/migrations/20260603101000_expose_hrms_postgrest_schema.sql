/*
 * Migration: Expose HRMS Schema To PostgREST
 *
 * The HRMS API uses supabase.schema('hrms') consistently with Leadgaze's
 * fundraising/core module pattern. PostgREST must include hrms in the
 * authenticator role's exposed schema list for those requests to work.
 */

ALTER ROLE authenticator
SET pgrst.db_schemas = 'public, graphql_public, fundraising, core, hrms';

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
