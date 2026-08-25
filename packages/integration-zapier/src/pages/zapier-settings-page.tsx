'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Key, ShieldCheck, Clipboard, Check, Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Switch } from '@kit/ui/switch';
import { Label } from '@kit/ui/label';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';

import { useLocalization } from '@kit/shared/localization';
import type { ZapierApiKey, ZapierIntegration, ZapierLog } from '../types';

export interface ZapierSettingsPageProps {
  workspaceId: string;
  onNavigateBack: () => void;
  onLoadData: (workspaceId: string) => Promise<{ integration: ZapierIntegration; apiKeys: ZapierApiKey[]; logs: ZapierLog[] }>;
  onToggleStatus: (workspaceId: string, checked: boolean) => Promise<ZapierIntegration>;
  onGenerateKey: (workspaceId: string) => Promise<{ key: string; record: ZapierApiKey }>;
  onRevokeKey: (workspaceId: string) => Promise<void>;
}

export function ZapierSettingsPage({
  workspaceId,
  onNavigateBack,
  onLoadData,
  onToggleStatus,
  onGenerateKey,
  onRevokeKey,
}: ZapierSettingsPageProps) {
  const [integration, setIntegration] = useState<ZapierIntegration | null>(null);
  const [apiKeys, setApiKeys] = useState<ZapierApiKey[]>([]);
  const [logs, setLogs] = useState<ZapierLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  const { formatDateTime } = useLocalization();

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await onLoadData(workspaceId);
      setIntegration(data.integration);
      setApiKeys(data.apiKeys);
      setLogs(data.logs);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load Zapier integration settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (checked: boolean) => {
    if (!integration) return;
    setIsMutating(true);
    try {
      const updated = await onToggleStatus(workspaceId, checked);
      setIntegration(updated);
      toast.success(`Zapier integration ${checked ? 'enabled' : 'disabled'} successfully.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update integration status.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleGenerateKey = async () => {
    setIsMutating(true);
    try {
      const data = await onGenerateKey(workspaceId);
      setApiKeys([data.record]);
      setGeneratedKey(data.key);
      setShowKeyDialog(true);
      toast.success('New API Key generated successfully.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate API credentials.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (apiKeys.length === 0) return;
    setIsMutating(true);
    try {
      await onRevokeKey(workspaceId);
      setApiKeys([]);
      toast.success('Zapier API Key has been revoked.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to revoke API Key.');
    } finally {
      setIsMutating(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title={
            <div className="flex items-center gap-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Skeleton className="h-8 w-48" />
            </div>
          }
          description="Connect Leadgaze with external apps using standard Zapier workflows."
        />

        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
          <div className="grid gap-2 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">
            <div className="space-y-2 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
              <Card>
                <CardHeader className="border-b p-2">
                  <CardTitle className="text-sm font-semibold text-leadgaze-dark dark:text-white">Config &amp; Routing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
              <Card className="overflow-hidden border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6 py-2.5 font-semibold text-xs">Timestamp</TableHead>
                      <TableHead className="px-6 py-2.5 font-semibold text-xs">Action Type</TableHead>
                      <TableHead className="px-6 py-2.5 font-semibold text-xs">Status</TableHead>
                      <TableHead className="px-6 py-2.5 font-semibold text-xs">Outcome Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6 py-3" colSpan={4}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </PageBody>
      </>
    );
  }

  const activeKey = apiKeys.find((k) => k.status === 'active');

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNavigateBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Zapier Integration</span>
          </div>
        }
        description="Connect Leadgaze with external apps using standard Zapier triggers and actions."
      />

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden p-0 pt-2 h-[calc(100vh-120px)]">
        <div className="grid gap-2 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">
          {/* Config column */}
          <div className="space-y-2 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
            <Card className="glassmorphic border shadow-sm">
              <CardHeader className="border-b p-2">
                <CardTitle className="text-sm font-semibold text-leadgaze-dark dark:text-white">Config &amp; Routing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {integration?.status === 'active' ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={integration?.status === 'active'}
                      onCheckedChange={handleToggleStatus}
                      disabled={isMutating}
                    />
                  </div>
                </div>

                 <div className="space-y-2 border-t pt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Zapier API Key
                  </Label>
                  {activeKey ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded border bg-muted/20 p-2 font-mono text-xs text-muted-foreground">
                        <span className="flex-1 truncate">{activeKey.masked_key}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-xs"
                          onClick={() => {
                            if (confirm('Generating a new key will immediately revoke the current key. Do you want to proceed?')) {
                              handleGenerateKey();
                            }
                          }}
                          disabled={isMutating}
                        >
                          <RefreshCw className="h-3 w-3" /> Rotate Key
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={handleRevokeKey}
                          disabled={isMutating}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No API Key generated. Generate one to authenticate Zapier connections.
                      </p>
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                        onClick={handleGenerateKey}
                        disabled={isMutating}
                      >
                        <Key className="h-3 w-3" /> Generate API Key
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t pt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Workspace Identifier
                  </Label>
                  <div className="flex items-center gap-2 rounded border bg-muted/20 p-2 font-mono text-xs text-muted-foreground">
                    <span className="flex-1 truncate">{workspaceId}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => copyToClipboard(workspaceId, 'workspace')}
                    >
                      {copiedKey === 'workspace' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Clipboard className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Container */}
          <Tabs defaultValue="tutorial" className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
            <TabsList className="w-max bg-muted/40 p-1 rounded-lg shrink-0 mb-0">
              <TabsTrigger value="tutorial">Setup Guide</TabsTrigger>
              <TabsTrigger value="logs">Activity Logs</TabsTrigger>
            </TabsList>

            {/* ---- TUTORIAL SETUP GUIDE ---- */}
            <TabsContent value="tutorial" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm bg-card p-2 space-y-2">
                <div>
                  <h3 className="text-base font-semibold text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">Zapier Integration Tutorial</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow these steps to connect your custom third-party platforms with Leadgaze CRM via Zapier.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* Step 1 */}
                  <div className="space-y-1.5 border-l-2 border-primary pl-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">1. Generate API Credentials</h4>
                    <p className="text-xs text-muted-foreground">
                      Use the configuration panel on the left to generate an active API Key and copy your Workspace ID.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-1.5 border-l-2 border-primary pl-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">2. Configure Zapier Webhook</h4>
                    <p className="text-xs text-muted-foreground">
                      Inside your Zapier dashboard, add an action using **Webhooks by Zapier** app:
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                      <li><strong>Event:</strong> Custom Request</li>
                      <li><strong>Method:</strong> POST</li>
                      <li>
                        <strong>URL:</strong> <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{typeof window !== 'undefined' ? `${window.location.origin}/api/v1/zapier/submit` : 'https://app.leadgaze.com/api/v1/zapier/submit'}</code>
                      </li>
                    </ul>
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-1.5 border-l-2 border-primary pl-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">3. Set Request Headers</h4>
                    <p className="text-xs text-muted-foreground">
                      Add the following key-value pairs under Headers section in your Webhook setup:
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`Content-Type: application/json
X-Zapier-Api-Key: ${activeKey?.masked_key || 'YOUR_ZAPIER_API_KEY'}`}
                    </pre>
                  </div>

                  {/* Step 4 */}
                  <div className="space-y-1.5 border-l-2 border-primary pl-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">4. Define Payload Data Schema</h4>
                    <p className="text-xs text-muted-foreground">
                      Define the payload object to send to the Leadgaze submission API. The body must include an <code>action</code> and a matching <code>payload</code> block:
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`{
  "action": "create_lead",
  "payload": {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1 555 987 6543",
    "company": "Enterprise Corp",
    "notes": "Inquiry submitted via Zapier workflow extension."
  }
}`}
                    </pre>
                  </div>

                  {/* developer curl test */}
                  <div className="space-y-2 border-t pt-2">
                    <h4 className="flex items-center gap-2 text-sm text-sm font-semibold text-leadgaze-dark dark:text-white	">
                      <Play className="h-4 w-4 text-primary" /> Test locally with cURL
                    </h4>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`curl -X POST ${typeof window !== 'undefined' ? `${window.location.origin}/api/v1/zapier/submit` : 'https://app.leadgaze.com/api/v1/zapier/submit'} \\
  -H "Content-Type: application/json" \\
  -H "X-Zapier-Api-Key: ${activeKey?.masked_key || 'YOUR_ZAPIER_API_KEY'}" \\
  -d '{
    "action": "create_lead",
    "payload": {
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "phone": "+15559876543",
      "company": "Enterprise Corp",
      "notes": "cURL local test"
    }
  }'`}
                    </pre>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ---- ACTIVITY LOGS ---- */}
            <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden min-h-0">
              <Card className="overflow-hidden border shadow-sm flex-1 flex flex-col min-h-0">
                <CardHeader className="border-b p-2 shrink-0">
                  <CardTitle className="text-sm font-semibold text-leadgaze-dark dark:text-white">Activity Logs</CardTitle>
                  <CardDescription>
                    Incoming requests and status checks received from Zapier integrations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto flex-1 min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 py-2.5 text-xs">Timestamp</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Action Type</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Status</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Outcome Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="px-6 py-8 text-center text-sm text-muted-foreground"
                          >
                            No Zapier log records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-accent/5">
                            <TableCell className="px-6 py-2 text-xs">
                              {formatDateTime(log.created_at)}
                            </TableCell>
                            <TableCell className="px-6 py-2 text-xs font-semibold">
                              {log.request_type}
                            </TableCell>
                            <TableCell className="px-6 py-2">
                              <Badge
                                variant={
                                  log.status === 'Success'
                                    ? 'default'
                                    : 'destructive'
                                }
                                className="text-[10px] px-2 py-0"
                              >
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-2 text-xs text-muted-foreground max-w-[300px] truncate">
                              {log.message}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>

      {/* Copy Key Protection Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={(open) => {
        setShowKeyDialog(open);
        if (!open) setGeneratedKey(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New API Key Generated</DialogTitle>            
              
            
          </DialogHeader>
          <div className="space-y-2 custom-spacing-x-y py-2">
            <p className="primary-text-regular text-leadgaze-dark dark:text-white">Copy this key and save it in a secure password manager. For security reasons, <strong>this key will not be shown again</strong>.</p>
            <div className="flex items-center gap-2 rounded border bg-muted/20 p-2.5 font-mono text-sm">
              <span className="flex-1 truncate">{generatedKey}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  if (generatedKey) {
                    navigator.clipboard.writeText(generatedKey);
                    toast.success('API Key copied successfully!');
                  }
                }}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-md text-xs text-yellow-800 dark:text-yellow-400">
              <strong>Important:</strong> Storing a new key immediately revokes any previously generated keys for this integration.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
