import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  handleCheckWebhookSubscription,
  handleDisconnect,
  handleSyncNumbers,
} from './account-actions-controller';
import {
  handleAddNote,
  handleAssignConversation,
  handleDeleteReply,
  handleSaveReply,
  handleSendMessage,
  handleUpdateConversationStatus,
} from './conversation-actions-controller';
import {
  handleConvertToLead,
  handleSyncTemplates,
  handleUpdateSettings,
} from './workspace-actions-controller';

export async function handleMutateWhatsAppSettings(
  workspaceId: string,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  switch (action) {
    case 'disconnect':
      return handleDisconnect(workspaceId, body.accountId, supabase);
    case 'send-message':
      return handleSendMessage(workspaceId, body, userId, supabase);
    case 'assign-conversation':
      return handleAssignConversation(workspaceId, body, userId, supabase);
    case 'resolve-conversation':
      return handleUpdateConversationStatus(
        workspaceId,
        body.conversationId,
        'resolved',
        supabase,
      );
    case 'reopen-conversation':
      return handleUpdateConversationStatus(
        workspaceId,
        body.conversationId,
        'open',
        supabase,
      );
    case 'close-conversation':
      return handleUpdateConversationStatus(
        workspaceId,
        body.conversationId,
        'closed',
        supabase,
      );
    case 'add-note':
      return handleAddNote(workspaceId, body, userId, supabase);
    case 'save-reply':
      return handleSaveReply(workspaceId, body, userId, supabase);
    case 'delete-reply':
      return handleDeleteReply(workspaceId, body.replyId, supabase);
    case 'update-settings':
      return handleUpdateSettings(workspaceId, body, supabase);
    case 'sync-numbers':
      return handleSyncNumbers(workspaceId, supabase);
    case 'sync-templates':
      return handleSyncTemplates(workspaceId, body.accountId, supabase);
    case 'convert-to-lead':
      return handleConvertToLead(workspaceId, body, userId, supabase);
    case 'check-webhook-subscription':
      return handleCheckWebhookSubscription(
        workspaceId,
        body.accountId,
        supabase,
      );
    default:
      return NextResponse.json(
        { success: false, message: `Unknown action: ${action}` },
        { status: 400 },
      );
  }
}
