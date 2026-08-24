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
    return client as unknown as ReturnType<typeof createBrowserClient<GenericSchema>>;
  }

  const keys = getSupabaseClientKeys();

  const cookieName = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME;

  client = createBrowserClient<Database>(keys.url, keys.anonKey, {
    ...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
  });

  return client as unknown as ReturnType<typeof createBrowserClient<GenericSchema>>;
}
