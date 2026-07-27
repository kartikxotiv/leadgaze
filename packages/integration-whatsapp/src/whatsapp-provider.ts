/**
 * WhatsApp Business Cloud API Provider
 *
 * Wraps all Meta Cloud API calls:
 * - Sending messages (text, template, media)
 * - Verifying webhook signatures
 * - Fetching phone number info
 * - Downloading media
 * - Syncing message templates
 *
 * This module runs server-side only.
 */

import type {
  SendTextMessagePayload,
  SendTemplateMessagePayload,
  WhatsAppTemplate,
} from './types';

const META_GRAPH_VERSION = 'v21.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

const WHATSAPP_SCOPES = [
  'email',
  'business_management',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
].join(',');

export function buildWhatsAppOAuthUrl(state: string): string {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/meta/callback`;

  if (!appId) {
    throw new Error('META_APP_ID environment variable is not set.');
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: WHATSAPP_SCOPES,
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

export async function exchangeWhatsAppCode(code: string): Promise<{
  user_access_token: string;
  token_expires_at: number;
  user_id: string;
}> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/meta/callback`;

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID or META_APP_SECRET is not set.');
  }

  const tokenUrl = `${META_GRAPH_BASE}/oauth/access_token`;
  const tokenParams = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    client_secret: appSecret,
    code,
  });

  const res = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to exchange code: ${errorBody}`);
  }

  const tokenData = await res.json();
  const shortLivedToken = tokenData.access_token as string;

  const llParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const llRes = await fetch(`${tokenUrl}?${llParams.toString()}`);
  if (!llRes.ok) {
    const llError = await llRes.text();
    throw new Error(`Failed to exchange for long-lived token: ${llError}`);
  }

  const llData = await llRes.json();
  const longLivedToken = llData.access_token as string;
  const expiresIn = llData.expires_in ?? 5184000;

  const debugUrl = `${META_GRAPH_BASE}/debug_token`;
  const debugParams = new URLSearchParams({
    input_token: longLivedToken,
    access_token: `${appId}|${appSecret}`,
  });

  const debugRes = await fetch(`${debugUrl}?${debugParams.toString()}`);
  const debugData = (await debugRes.json()).data as { user_id: string };

  return {
    user_access_token: longLivedToken,
    token_expires_at: Date.now() + expiresIn * 1000,
    user_id: debugData.user_id,
  };
}

export async function getOwnedWabasAndPhones(accessToken: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allWabas: { business_id?: string; waba_id: string; waba_name?: string; phones: any[] }[] = [];
  const seenWabaIds = new Set<string>();

  const addWabaWithPhones = async (wabaId: string, wabaName?: string, businessId?: string) => {
    if (seenWabaIds.has(wabaId)) return;
    seenWabaIds.add(wabaId);

    const phonesRes = await fetch(`${META_GRAPH_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (phonesRes.ok) {
      const phonesData = await phonesRes.json();
      allWabas.push({
        business_id: businessId,
        waba_id: wabaId,
        waba_name: wabaName,
        phones: phonesData.data || [],
      });
    } else {
      const err = await phonesRes.text();
      console.warn(`[whatsapp] Failed to fetch phone numbers for WABA ${wabaId}:`, err);
    }
  };

  // 1. Try fetching businesses
  const businessesRes = await fetch(`${META_GRAPH_BASE}/me/businesses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let businessFetchError = '';
  if (businessesRes.ok) {
    const businesses = ((await businessesRes.json()).data || []) as { id: string; name: string }[];
    for (const b of businesses) {
      const ownedRes = await fetch(`${META_GRAPH_BASE}/${b.id}/owned_whatsapp_business_accounts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const clientRes = await fetch(`${META_GRAPH_BASE}/${b.id}/client_whatsapp_business_accounts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const owned = ownedRes.ok ? ((await ownedRes.json()).data || []) : [];
      const client = clientRes.ok ? ((await clientRes.json()).data || []) : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wabas = [...owned, ...client] as any[];

      for (const waba of wabas) {
        if (waba.id) {
          await addWabaWithPhones(waba.id, waba.name, b.id);
        }
      }
    }
  } else {
    businessFetchError = await businessesRes.text();
    console.warn('[whatsapp] /me/businesses request failed:', businessFetchError);
  }

  // 2. Direct fetch: Try fetching WABAs directly associated with user/token
  const directEndpoints = [
    '/me/client_whatsapp_business_accounts',
    '/me/whatsapp_business_accounts',
    '/me/shared_whatsapp_business_accounts',
  ];

  for (const endpoint of directEndpoints) {
    try {
      const res = await fetch(`${META_GRAPH_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const directWabas = ((await res.json()).data || []) as any[];
        for (const waba of directWabas) {
          if (waba.id) {
            await addWabaWithPhones(waba.id, waba.name);
          }
        }
      }
    } catch (err) {
      console.warn(`[whatsapp] Failed fetching ${endpoint}:`, err);
    }
  }

  if (allWabas.length === 0 && !businessesRes.ok) {
    throw new Error(`Failed to fetch businesses from Meta Graph API: ${businessFetchError}`);
  }

  return allWabas;
}

// ---------------------------------------------------------------------------
// WABA webhook subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe a WhatsApp Business Account to the app's configured webhook.
 *
 * This MUST be called after connecting a WABA. Without it, Meta will not
 * dispatch incoming message events to your webhook URL — even if the URL is
 * saved and verified in the Meta Developer Console.
 *
 * IMPORTANT: Must use the User Access Token obtained via OAuth
 * (stored in integration_accounts.metadata.access_token).
 * The App Token (APP_ID|APP_SECRET) does NOT have permission for this endpoint
 * and returns a 100/33 GraphMethodException.
 */
export async function subscribeWabaToWebhook(
  wabaId: string,
  userAccessToken: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${META_GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`[whatsapp] Failed to subscribe WABA ${wabaId} to webhook:`, err);
    return { success: false, error: err };
  }

  const data = await res.json();
  console.log(`[whatsapp] Subscribed WABA ${wabaId} to webhook:`, data);
  return { success: true };
}

/**
 * Check which apps are currently subscribed to a WABA's webhook events.
 * Useful for debugging whether the subscription is active.
 *
 * Uses the User Access Token — same requirement as subscribeWabaToWebhook.
 */
export async function getWabaSubscribedApps(
  wabaId: string,
  userAccessToken: string,
): Promise<{ id: string; name: string; subscribed_fields: string[] }[]> {
  const res = await fetch(`${META_GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}


/**
 * Handles the GET challenge from Meta during webhook setup.
 * Returns the hub.challenge value if the verify token matches.
 */
export function verifyWebhookChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): { valid: boolean; challenge: string | null } {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error('[whatsapp] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set');
    return { valid: false, challenge: null };
  }

  const valid = mode === 'subscribe' && token === verifyToken;
  return { valid, challenge: valid ? challenge : null };
}

/**
 * Validates X-Hub-Signature-256 from Meta webhook POST requests.
 * Meta signs the body with your App Secret using HMAC-SHA256.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET ?? process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature) return false;

  const expectedPrefix = 'sha256=';
  if (!signature.startsWith(expectedPrefix)) return false;

  const sigHex = signature.slice(expectedPrefix.length);

  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
  const msgData = encoder.encode(rawBody);

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, msgData);
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return sigHex === signatureHex;
}

// ---------------------------------------------------------------------------
// Send messages
// ---------------------------------------------------------------------------

/**
 * Send a plain text message via Meta Cloud API.
 */
export async function sendTextMessage(
  phoneNumberId: string,
  { to, body }: SendTextMessagePayload,
  accessToken: string,
): Promise<{ message_id: string }> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to send WhatsApp message: ${err}`);
  }

  const data = await res.json();
  return { message_id: data.messages?.[0]?.id ?? '' };
}

/**
 * Send a template message via Meta Cloud API.
 */
export async function sendTemplateMessage(
  phoneNumberId: string,
  { to, templateName, language, components = [] }: SendTemplateMessagePayload,
  accessToken: string,
): Promise<{ message_id: string }> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to send WhatsApp template: ${err}`);
  }

  const data = await res.json();
  return { message_id: data.messages?.[0]?.id ?? '' };
}

/**
 * Mark a message as read (sends read receipts back to sender).
 */
export async function markMessageAsRead(
  phoneNumberId: string,
  messageId: string,
  accessToken: string,
): Promise<void> {
  await fetch(`${META_GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

// ---------------------------------------------------------------------------
// Phone number info
// ---------------------------------------------------------------------------

export interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  status: string;
}

/**
 * Fetch phone number details from the Graph API.
 * Used to validate the Phone Number ID on connection.
 */
export async function getPhoneNumberInfo(
  phoneNumberId: string,
  accessToken: string,
): Promise<PhoneNumberInfo> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,status`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get phone number info: ${err}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Fetch all approved message templates for a WABA.
 */
export async function getWabaTemplates(
  wabaId: string,
  accessToken: string,
): Promise<WhatsAppTemplate[]> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${wabaId}/message_templates?fields=id,name,language,category,components,status&limit=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch WhatsApp templates: ${err}`);
  }

  const data = await res.json();
  const rawTemplates: Array<Record<string, unknown>> = data.data ?? [];

  return rawTemplates.map((t) => ({
    id: '',
    workspace_id: '',
    account_id: undefined,
    meta_template_id: t.id as string,
    template_name: t.name as string,
    language: t.language as string,
    category: t.category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    template_payload: { components: t.components as WhatsAppTemplate['template_payload']['components'] },
    status: t.status as WhatsAppTemplate['status'],
    created_at: '',
    updated_at: '',
  }));
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface MediaDownloadUrl {
  url: string;
  mime_type: string;
  file_size: number;
  id: string;
}

/**
 * Get the temporary download URL for a media object.
 * URLs from Meta expire after 5 minutes.
 */
export async function getMediaDownloadUrl(
  mediaId: string,
  accessToken: string,
): Promise<MediaDownloadUrl> {
  const res = await fetch(`${META_GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get media URL: ${err}`);
  }

  return res.json();
}
