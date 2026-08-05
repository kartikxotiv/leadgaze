'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Globe,
  ArrowRight,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Lock,
  Building2,
  BarChart3,
  Share2,
  Mail,
  Video,
  ArrowLeft
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';

import { CoreEmailSettingsPage } from '@kit/core/pages';
import { MeetingAccountsSettings } from './meeting-accounts-settings';
import { useRBAC } from '~/lib/rbac/rbac-provider';

type WorkspaceSummary = {
  id: string;
  name: string;
};

interface WorkspaceIntegrationsSettingsProps {
  workspace: WorkspaceSummary | null;
}

export function WorkspaceIntegrationsSettings({ workspace }: WorkspaceIntegrationsSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { canAccess } = useRBAC();
  const view = searchParams.get('view');
  const canManageEmail = canAccess('emails', 'manage_email');
  
  if (!workspace) return null;

  if (view === 'emails' && canManageEmail) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" className="px-2 font-semibold" onClick={() => router.push('?tab=integrations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Email Accounts
          </Button>
        </div>
        <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-none bg-transparent">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <CoreEmailSettingsPage
              workspace={workspace as any}
              embedded
              googleAuthPath="/api/email/google/auth"
              googleReturnUrl={pathname || '/home/workspace-settings'}
              permissions={{
                manageAccounts: canManageEmail,
                manageTemplates: canManageEmail,
                manageVariables: canManageEmail,
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'meetings') {
    return (
      <div className="flex flex-col h-full space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" className="px-2 font-semibold" onClick={() => router.push('?tab=integrations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Meeting Accounts
          </Button>
        </div>
        <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-none bg-transparent">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <MeetingAccountsSettings workspace={workspace as any} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const leadIntegrations = [
    {
      id: 'website-connector',
      name: 'Website Connector',
      description: 'Capture leads & support tickets from your website through embedded forms or direct API submissions.',
      icon: <Globe className="h-6 w-6 text-primary" />,
      badge: 'Available',
      path: `/home/sales/workspace-settings/integrations/website-connector`,
    },
    {
      id: 'zapier',
      name: 'Zapier Integration',
      description: 'Connect over 5,000+ apps using out-of-the-box automation triggers.',
      icon: <CheckCircle2 className="h-6 w-6 text-orange-500" />,
      badge: 'Available',
      path: `/home/sales/workspace-settings/integrations/zapier`,
    },
    {
      id: 'google-ads',
      name: 'Google Ads Lead Forms',
      description: 'Sync Google Ads lead form extensions directly with Leadgaze CRM automatically.',
      icon: <BarChart3 className="h-6 w-6 text-blue-500" />,
      badge: 'Available',
      path: `/home/sales/workspace-settings/integrations/google-ads`,
    },
    {
      id: 'meta-ads',
      name: 'Meta Lead Ads',
      description: 'Automatically import Facebook and Instagram leads in real-time via webhooks.',
      icon: <Share2 className="h-6 w-6 text-blue-600" />,
      badge: 'Available',
      path: `/home/sales/workspace-settings/integrations/meta-ads`,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Receive WhatsApp messages in a shared inbox and capture leads from conversations.',
      icon: <MessageSquare className="h-6 w-6 text-green-500" />,
      badge: 'Available',
      path: `/home/sales/workspace-settings/integrations/whatsapp`,
    },
  ];

  const emailIntegrations = [
    {
      id: 'email-accounts',
      name: 'Email Accounts',
      description: 'Receive Email messages in a shared inbox and capture leads from conversations.',
      icon: <Mail className="h-6 w-6 text-green-500" />,
      badge: 'Available',
      path: `?tab=integrations&view=emails`,
    }
  ];

  const meetingIntegrations = [
    {
      id: 'google-meet',
      name: 'Google Meet Integration',
      description: 'Join and manage Google Meet calls from a shared inbox and capture action items from conversations.',
      icon: <Video className="h-6 w-6 text-blue-500" />,
      badge: 'Available',
      path: `?tab=integrations&view=meetings`,
    },
    {
      id: 'zoom',
      name: 'Zoom Integration',
      description: 'Schedule and sync Zoom meetings directly from your CRM to streamline client calls and follow-ups.',
      icon: <Video className="h-6 w-6 text-blue-500" />,
      badge: 'Available',
      path: `?tab=integrations&view=meetings`,
    }
  ];
  
  const renderIntegrationItem = (integration: any) => (
    <div
      key={integration.id}
      className="flex flex-col border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm"
    >
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="w-8 h-8 flex items-center justify-center border border-slate-100 rounded-md shadow-sm">
            {integration.icon}
          </div>
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-2.5 py-0.5 rounded-sm border-0">
            {integration.badge}
          </Badge>
        </div>
        <div className="primary-text-medium font-bold text-slate-800 mb-2">
          {integration.name}
        </div>
        <div className="text-[13px] text-slate-500 flex-1 leading-relaxed">
          {integration.description}
        </div>
      </div>
      <div 
        className="px-4 py-3 border-t border-slate-100 flex items-center justify-between secondary-text-small-bold cursor-pointer text-slate-800 hover:bg-slate-50 transition-colors"
        onClick={() => router.push(integration.path)}
      >
        <span>Configure Settings</span>
        <ArrowRight className="h-4 w-4 text-slate-600" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-2 pb-4 border-b border-slate-200">
          <CardTitle className="mb-0 flex items-center gap-2 primary-text-big-regular text-leadgaze-dark dark:text-white">
            Work Space Integration
          </CardTitle>
          <CardDescription className="mt-1">
            Connect external channels to automatically ingest CRM Leads and Service Cloud support tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 space-y-6">
          
          <div className="space-y-2">
            <h3 className="primary-text-big-regular text-leadgaze-dark dark:text-white pb-2 mb-0">Lead Integration</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {leadIntegrations.map(renderIntegrationItem)}
            </div>
          </div>

          <div className="space-y-2 border-t">
            <h3 className="primary-text-big-regular text-leadgaze-dark dark:text-white pb-2 mb-0 mt-2">Email Integration</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emailIntegrations.map(renderIntegrationItem)}
            </div>
          </div>

          <div className="space-y-2 border-t">
            <h3 className="primary-text-big-regular text-leadgaze-dark dark:text-white pb-2 mb-0 mt-2">Meeting Integration</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {meetingIntegrations.map(renderIntegrationItem)}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

