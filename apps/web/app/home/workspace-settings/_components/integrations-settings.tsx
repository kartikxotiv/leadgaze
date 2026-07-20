'use client';

import { useRouter } from 'next/navigation';
import {
  Globe,
  ArrowRight,
  MessageSquare,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  Building2,
  BarChart3,
  Share2,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';

type WorkspaceSummary = {
  id: string;
  name: string;
};

interface WorkspaceIntegrationsSettingsProps {
  workspace: WorkspaceSummary | null;
}

export function WorkspaceIntegrationsSettings({ workspace }: WorkspaceIntegrationsSettingsProps) {
  const router = useRouter();

  if (!workspace) return null;

  const activeIntegrations = [
    {
      id: 'website-connector',
      name: 'Website Connector',
      description: 'Capture leads & support tickets from your website through embedded forms or direct API submissions.',
      icon: <Globe className="h-6 w-6 text-primary" />,
      badge: 'Available',
      badgeVariant: 'default' as const,
      path: `/home/sales/workspace-settings/integrations/website-connector`,
      connected: true,
    },
    {
      id: 'zapier',
      name: 'Zapier Integration',
      description: 'Connect over 5,000+ apps using out-of-the-box automation triggers.',
      icon: <CheckCircle2 className="h-6 w-6 text-orange-500" />,
      badge: 'Available',
      badgeVariant: 'default' as const,
      path: `/home/sales/workspace-settings/integrations/zapier`,
      connected: true,
    },
    {
      id: 'google-ads',
      name: 'Google Ads Lead Forms',
      description: 'Sync Google Ads lead form extensions directly with Leadgaze CRM automatically.',
      icon: <BarChart3 className="h-6 w-6 text-blue-500" />,
      badge: 'Available',
      badgeVariant: 'default' as const,
      path: `/home/sales/workspace-settings/integrations/google-ads`,
      connected: true,
    },
    {
      id: 'meta-ads',
      name: 'Meta Lead Ads',
      description: 'Automatically import Facebook and Instagram leads in real-time via webhooks.',
      icon: <Share2 className="h-6 w-6 text-blue-600" />,
      badge: 'Available',
      badgeVariant: 'default' as const,
      path: `/home/sales/workspace-settings/integrations/meta-ads`,
      connected: true,
    },
  ];

  const comingSoonIntegrations = [

    {
      id: 'linkedin-ads',
      name: 'LinkedIn Lead Forms',
      description: 'Capture high-intent B2B leads from LinkedIn Campaign Manager.',
      icon: <Sparkles className="h-6 w-6 text-blue-700" />,
      badge: 'Coming Soon',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Convert WhatsApp chat interactions into CRM leads and support cases.',
      icon: <MessageSquare className="h-6 w-6 text-green-500" />,
      badge: 'Planned',
    },
    {
      id: 'calendly',
      name: 'Calendly Integration',
      description: 'Automatically route scheduled meetings to assigned lead or ticket owners.',
      icon: <Calendar className="h-6 w-6 text-blue-400" />,
      badge: 'Planned',
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Workspace Integrations
          </CardTitle>
          <CardDescription>
            Connect external channels to automatically ingest CRM Leads and Service Cloud support tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeIntegrations.map((integration) => (
              <Card key={integration.id} className="relative overflow-hidden border border-primary/20 bg-card hover:bg-accent/10 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {integration.icon}
                  </div>
                  <Badge variant={integration.badgeVariant}>{integration.badge}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-3 min-h-[60px]">
                      {integration.description}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push(integration.path)}
                    className="w-full justify-between"
                    variant="outline"
                  >
                    Configure Settings
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {comingSoonIntegrations.map((integration) => (
              <Card key={integration.id} className="relative overflow-hidden border border-border bg-card/50 opacity-80">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    {integration.icon}
                  </div>
                  <Badge variant="secondary" className="flex gap-1 items-center">
                    <Lock className="h-3 w-3" />
                    {integration.badge}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <CardTitle className="text-base text-muted-foreground">{integration.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-3 min-h-[60px]">
                      {integration.description}
                    </CardDescription>
                  </div>
                  <Button className="w-full" variant="ghost" disabled>
                    Locked
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
