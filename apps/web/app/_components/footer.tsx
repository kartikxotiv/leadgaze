/* app/_components/footer.tsx */
'use client';

import { useEffect, useState } from 'react';

const BILLING_COUNTRY_KEY = 'leadgaze_billing_country';
const COUNTRY_CHANGED_EVENT = 'leadgaze:billing-country-changed';

/**
 * Persist the billing_country so the footer can pick it up on subsequent
 * onboarding steps without hitting the DB again.
 * Call this ONLY after the company is successfully saved to the DB.
 * Also dispatches a custom event so any mounted Footer re-renders immediately.
 */
export function persistBillingCountry(countryCode: string) {
  const code = countryCode.toUpperCase();
  try {
    localStorage.setItem(BILLING_COUNTRY_KEY, code);
    // Notify any mounted Footer components to update
    window.dispatchEvent(new CustomEvent(COUNTRY_CHANGED_EVENT, { detail: code }));
  } catch {
    // localStorage not available (e.g. private mode)
  }
}

/**
 * Footer displayed on all public screens (sign-in / sign-up / onboarding).
 *
 * Priority order for determining the footer text:
 *   1. `billing_country` saved in localStorage (set once company is saved to DB)
 *   2. IP-based country detection via api.country.is
 *
 * India (country code "IN") → Xotiv Pvt. Ltd.
 * Anything else             → Programea LLC.
 *
 * Font size is 10px, fixed to the bottom-right corner.
 */
export function Footer() {
  const [isIndia, setIsIndia] = useState<boolean | null>(null);

  useEffect(() => {
    // Helper to resolve and set state from a country code
    const resolve = (code: string) => setIsIndia(code.toUpperCase() === 'IN');

    // 1️⃣  Check localStorage first (set after company is saved to DB)
    try {
      const saved = localStorage.getItem(BILLING_COUNTRY_KEY);
      if (saved) {
        resolve(saved);
        // Still register the listener in case it changes later on same page
      }
    } catch {
      // ignore
    }

    // 2️⃣  Listen for future billing-country updates (e.g. user completes step 1)
    const handleCountryChange = (e: Event) => {
      resolve((e as CustomEvent<string>).detail);
    };
    window.addEventListener(COUNTRY_CHANGED_EVENT, handleCountryChange);

    // 3️⃣  If nothing in localStorage yet, fall back to IP geolocation
    try {
      if (!localStorage.getItem(BILLING_COUNTRY_KEY)) {
        fetch('https://api.country.is')
          .then((res) => res.json())
          .then((data) => {
            // Only apply IP result if billing country hasn't been set yet
            if (!localStorage.getItem(BILLING_COUNTRY_KEY) && data?.country) {
              resolve(data.country);
            }
          })
          .catch(() => {
            if (!localStorage.getItem(BILLING_COUNTRY_KEY)) {
              setIsIndia(false); // default to Programea on failure
            }
          });
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener(COUNTRY_CHANGED_EVENT, handleCountryChange);
    };
  }, []);

  // While detecting, render nothing to avoid layout shift
  if (isIndia === null) return null;

  const link = isIndia ? (
    <>© 2026 Leadgaze. Operated by <a href="https://xotiv.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline dotted' }}>Xotiv Pvt. Ltd.</a></>
  ) : (
    <>© 2026 Leadgaze. Operated by <a href="https://programea.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline dotted' }}>Programea LLC.</a></>
  );

  return (
    <footer
      style={{ fontSize: '12px', position: 'fixed', bottom: '8px', right: '12px', zIndex: 50 }}
      className="text-leadgaze-muted select-none dark:text-white"
    >
      {link}
    </footer>
  );
}
