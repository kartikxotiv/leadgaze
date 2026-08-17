import { useMutation } from '@tanstack/react-query';

import { useSupabase } from './use-supabase';

/**
 * @name useSignOut
 * @description Use Supabase to sign out a user locally without invalidating other sessions
 */
export function useSignOut() {
  const client = useSupabase();

  return useMutation({
    mutationFn: () => {
      try {
        localStorage.removeItem('leadgaze_billing_country');
      } catch {
        // ignore (e.g. private browsing mode)
      }
      return client.auth.signOut({ scope: 'local' });
    },
  });
}
