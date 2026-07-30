/**
 * TypeScript types for the WhatsApp Business integration.
 */

// ---------------------------------------------------------------------------
// Connection & Account
// ---------------------------------------------------------------------------

/** Stored in core.integration_connections (provider = 'whatsapp') */
export interface WhatsAppConnection {
  id: string;
  workspace_id: string;
  provider: 'whatsapp';
  status: 'active' | 'inactive' | 'error';
  config: {
    access_token: string;
    waba_id: string;       // WhatsApp Business Account ID
    phone_number_id: string;
    phone_number: string;
    display_name?: string;
    verified_name?: string;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/** Stored in core.integration_accounts (one per phone number) */
export interface WhatsAppAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  external_account_id: string;  // phone_number_id
  display_name: string;          // verified business name
  metadata: {
    phone_number_id: string;
    phone_number: string;
    waba_id: string;
    display_name: string;
    verified_name?: string;
    quality_rating?: string;
    status?: string;              // CONNECTED | DISCONNECTED | etc.
    access_token?: string;
  };
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface WhatsAppConversation {
  id: string;
  workspace_id: string;
  account_id?: string;
  customer_phone: string;
  customer_name?: string;
  lead_id?: string;
  contact_id?: string;
  status: ConversationStatus;
  first_message?: string;
  last_customer_message_at?: string;
  last_message_at?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  // Joined relations (from API responses)
  last_message?: WhatsAppMessage;
  assigned_to?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'document'
  | 'template' | 'interactive' | 'sticker' | 'location'
  | 'contact' | 'unsupported';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppMessage {
  id: string;
  workspace_id: string;
  conversation_id: string;
  meta_message_id?: string;
  direction: MessageDirection;
  message_type: MessageType;
  body?: string;
  media_url?: string;
  media_type?: string;
  media_size?: number;
  meta_media_id?: string;
  template_name?: string;
  template_language?: string;
  status: MessageStatus;
  error_message?: string;
  sent_by?: string;
  sent_by_name?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Assignments & Notes
// ---------------------------------------------------------------------------

export interface WhatsAppAssignment {
  id: string;
  workspace_id: string;
  conversation_id: string;
  assigned_to?: string;
  assigned_by?: string;
  unassigned_at?: string;
  created_at: string;
}

export interface WhatsAppNote {
  id: string;
  workspace_id: string;
  conversation_id: string;
  created_by?: string;
  created_by_name?: string;
  body: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Saved Replies & Templates
// ---------------------------------------------------------------------------

export interface WhatsAppSavedReply {
  id: string;
  workspace_id: string;
  title: string;
  body: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  workspace_id: string;
  account_id?: string;
  meta_template_id?: string;
  template_name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  template_payload: {
    components?: Array<{
      type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
      format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      text?: string;
      buttons?: Array<{
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
        text: string;
        url?: string;
        phone_number?: string;
      }>;
    }>;
  };
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type LeadCreationMode = 'automatic' | 'manual' | 'hybrid';

export interface WhatsAppSettings {
  id: string;
  workspace_id: string;
  lead_creation_mode: LeadCreationMode;
  lead_keywords: string[];
  lead_message_threshold: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Meta Cloud API Webhook Payload types
// ---------------------------------------------------------------------------

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string; // WABA ID
    changes: Array<{
      field: 'messages';
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: MessageType;
          text?: { body: string };
          image?: { id: string; mime_type: string; sha256: string; caption?: string };
          video?: { id: string; mime_type: string; sha256: string; caption?: string };
          audio?: { id: string; mime_type: string; sha256: string };
          document?: { id: string; filename: string; mime_type: string; sha256: string; caption?: string };
          sticker?: { id: string; mime_type: string; sha256: string; animated: boolean };
          location?: { latitude: number; longitude: number; name?: string; address?: string };
          button?: { payload: string; text: string };
          interactive?: {
            type: 'button_reply' | 'list_reply';
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
        }>;
        statuses?: Array<{
          id: string;        // meta_message_id
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{ code: number; title: string }>;
        }>;
      };
    }>;
  }>;
}

// ---------------------------------------------------------------------------
// API Response Shapes
// ---------------------------------------------------------------------------

export interface WhatsAppSettingsData {
  connection: WhatsAppConnection | null;
  accounts: WhatsAppAccount[];
  settings: WhatsAppSettings | null;
  savedReplies: WhatsAppSavedReply[];
  templates: WhatsAppTemplate[];
}

export interface ConversationListResponse {
  conversations: WhatsAppConversation[];
  total: number;
  hasMore: boolean;
}

export interface MessageListResponse {
  messages: WhatsAppMessage[];
  total: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Meta Cloud API helpers
// ---------------------------------------------------------------------------

export interface SendTextMessagePayload {
  to: string;
  body: string;
}

export interface SendTemplateMessagePayload {
  to: string;
  templateName: string;
  language: string;
  components?: unknown[];
}
