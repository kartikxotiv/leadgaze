import { createBrowserClient } from '@supabase/ssr';

import { Database } from '../database.types';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * @name getSupabaseBrowserClient
 * @description Get a Supabase client for use in the Browser
 */
export function getSupabaseBrowserClient<GenericSchema = Database>() {
  if (client) {
    return client as ReturnType<typeof createBrowserClient<GenericSchema>>;
  }

  const keys = getSupabaseClientKeys();

  client = createBrowserClient<Database>(keys.url, keys.anonKey);

  return client as ReturnType<typeof createBrowserClient<GenericSchema>>;
}
