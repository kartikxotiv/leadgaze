'use client';

import { useRouter } from 'next/navigation';
import { WhatsAppSettingsPage } from '@kit/integration-whatsapp/pages';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getWhatsAppSettingsService,
  disconnectWhatsAppService,
  syncWhatsAppTemplatesService,
  syncWhatsAppNumbersService,
  updateWhatsAppSettingsService,
  getWhatsAppConversationsService,
  getWhatsAppMessagesService,
  sendWhatsAppMessageService,
  resolveWhatsAppConversationService,
  reopenWhatsAppConversationService,
  convertToLeadService,
} from '~/services/whatsapp.service';

export default function WhatsAppIntegrationRoute() {
  const router = useRouter();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  return (
    <WhatsAppSettingsPage
      workspaceId={workspaceId!}
      onNavigateBack={() => router.push('/home/sales/workspace-settings')}
      onLoadData={getWhatsAppSettingsService}
      onDisconnect={disconnectWhatsAppService}
      onSyncNumbers={syncWhatsAppNumbersService}
      onSyncTemplates={syncWhatsAppTemplatesService}
      onUpdateSettings={updateWhatsAppSettingsService}
      onGetConversations={getWhatsAppConversationsService}
      onGetMessages={getWhatsAppMessagesService}
      onSendMessage={sendWhatsAppMessageService}
      onResolveConversation={resolveWhatsAppConversationService}
      onReopenConversation={reopenWhatsAppConversationService}
      onConvertToLead={convertToLeadService}
    />
  );
}
