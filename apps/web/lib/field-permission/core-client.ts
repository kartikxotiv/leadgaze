import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kit/supabase/database';

/**
 * Access tables in the `core` Postgres schema.
 * Note: The generated database.types.ts does not include the `core` schema,
 * so we cast to `any` here to bypass TypeScript while still hitting the
 * correct schema at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function coreDb(supabase: SupabaseClient<Database>): any {
  return (supabase as any).schema('core');
}
