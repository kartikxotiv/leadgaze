import { ZapierApiKey, ZapierIntegration, ZapierLog } from './types';

// Helper to generate a random API Key prefix zg_live_
export function generateRandomKey(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `zg_live_${hex}`;
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return '************';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

// Log builder
export async function createZapierLog(
  supabase: any,
  payload: {
    workspace_id: string;
    request_type: string;
    status: ZapierLog['status'];
    message: string;
  }
) {
  try {
    await supabase
      .schema('core')
      .from('zapier_logs')
      .insert({
        workspace_id: payload.workspace_id,
        request_type: payload.request_type,
        status: payload.status,
        message: payload.message,
      });
  } catch (err) {
    console.error('Failed to create Zapier audit log:', err);
  }
}
