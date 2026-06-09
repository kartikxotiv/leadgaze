import { redirect } from 'next/navigation';

/**
 * Sales module landing page.
 *
 * The sales module dashboard lives at /home/leads (leads list).
 * Redirect there so that /home/sales acts as the canonical entry point
 * for the sales module while the actual content is at /home/leads.
 */
export default function SalesPage() {
  redirect('/home/sales/leads');
}
