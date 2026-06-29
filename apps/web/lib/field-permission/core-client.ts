import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/lib/database.types';

/** Access tables in the `core` schema (entity_fields, field_access_*, user_column_preferences). */
export function coreDb(supabase: SupabaseClient<Database>) {
  return supabase.schema('core');
}
