'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Trash2,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Users,
  BarChart3,
  BookOpen,
  Settings2,
  Eye,
  EyeOff,
  Plus,
  X,
} from 'lucide-react';
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
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

import type {
  WhatsAppConnection,
  WhatsAppAccount,
  WhatsAppSettings,
  WhatsAppTemplate,
  WhatsAppSavedReply,
  WhatsAppConversation,
  WhatsAppMessage,
  LeadCreationMode,
} from '../types';
import { WhatsAppInboxTab } from './whatsapp-inbox-tab';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WhatsAppSettingsPageProps {
  workspaceId: string;
  onNavigateBack: () => void;
  onGoToInbox?: () => void;
  onLoadData: (workspaceId: string) => Promise<{
    connection: WhatsAppConnection | null;
    accounts: WhatsAppAccount[];
    settings: WhatsAppSettings | null;
    savedReplies: WhatsAppSavedReply[];
    templates: WhatsAppTemplate[];
  }>;
  onDisconnect: (workspaceId: string, accountId: string) => Promise<void>;
  onSyncNumbers?: (workspaceId: string) => Promise<{ synced: number; wabasCount: number }>;
  onSyncTemplates: (workspaceId: string, accountId: string) => Promise<{ synced: number }>;
  onUpdateSettings: (workspaceId: string, settings: {
    leadCreationMode?: LeadCreationMode;
    leadKeywords?: string[];
    leadMessageThreshold?: number;
  }) => Promise<void>;
  onGetConversations?: (workspaceId: string, params?: { status?: string; page?: number }) => Promise<{ conversations: WhatsAppConversation[]; total: number }>;
  onGetMessages?: (workspaceId: string, conversationId: string, params?: { page?: number }) => Promise<{ messages: WhatsAppMessage[]; total: number }>;
  onSendMessage?: (workspaceId: string, conversationId: string, body: string) => Promise<unknown>;
  onResolveConversation?: (workspaceId: string, conversationId: string) => Promise<unknown>;
  onReopenConversation?: (workspaceId: string, conversationId: string) => Promise<unknown>;
  onConvertToLead?: (workspaceId: string, conversationId: string) => Promise<{ leadId: string }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WhatsAppSettingsPage({
  workspaceId,
  onNavigateBack,
  onGoToInbox,
  onLoadData,
  onDisconnect,
  onSyncNumbers,
  onSyncTemplates,
  onUpdateSettings,
  onGetConversations,
  onGetMessages,
  onSendMessage,
  onResolveConversation,
  onReopenConversation,
  onConvertToLead,
}: WhatsAppSettingsPageProps) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [savedReplies, setSavedReplies] = useState<WhatsAppSavedReply[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isSyncingNumbers, setIsSyncingNumbers] = useState(false);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<WhatsAppAccount | null>(null);

  // Settings form
  const [leadMode, setLeadMode] = useState<LeadCreationMode>('hybrid');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [msgThreshold, setMsgThreshold] = useState(3);

  useEffect(() => {
    if (workspaceId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await onLoadData(workspaceId);
      setConnection(data.connection);
      setAccounts(data.accounts);
      setSettings(data.settings);
      setTemplates(data.templates);
      setSavedReplies(data.savedReplies);
      if (data.settings) {
        setLeadMode(data.settings.lead_creation_mode);
        setKeywords(data.settings.lead_keywords);
        setMsgThreshold(data.settings.lead_message_threshold);
      }
    } catch {
      toast.error('Failed to load WhatsApp settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = `/api/integrations/meta/auth?workspace_id=${workspaceId}&type=whatsapp`;
  };

  const handleDisconnect = async () => {
    if (!accountToDisconnect) return;
    setIsMutating(true);
    try {
      await onDisconnect(workspaceId, accountToDisconnect.id);
      setAccounts((prev) => prev.filter((a) => a.id !== accountToDisconnect.id));
      setShowDisconnectDialog(false);
      setAccountToDisconnect(null);
      toast.success('WhatsApp number disconnected.');
    } catch {
      toast.error('Failed to disconnect.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleSyncTemplates = async (accountId: string) => {
    setIsSyncingTemplates(true);
    try {
      const { synced } = await onSyncTemplates(workspaceId, accountId);
      toast.success(`Synced ${synced} templates from Meta.`);
      await loadData();
    } catch {
      toast.error('Failed to sync templates.');
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await onUpdateSettings(workspaceId, {
        leadCreationMode: leadMode,
        leadKeywords: keywords,
        leadMessageThreshold: msgThreshold,
      });
      toast.success('Lead creation settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    setKeywords((prev) => [...prev, kw]);
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw));

  const handleSyncNumbers = async () => {
    if (!onSyncNumbers) return;
    setIsSyncingNumbers(true);
    try {
      const res = await onSyncNumbers(workspaceId);
      toast.success(`Synced ${res.synced} numbers across ${res.wabasCount} WABA(s).`);
      await loadData();
    } catch (e) {
      toast.error(`Sync numbers failed: ${(e as Error).message}`);
    } finally {
      setIsSyncingNumbers(false);
    }
  };

  const isConnected = !!connection;
  const hasConnectedAccounts = accounts.length > 0;

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <>
        <PageHeader
          title={<div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="h-8 w-8" disabled><ArrowLeft className="h-4 w-4" /></Button><Skeleton className="h-8 w-52" /></div>}
          description="Connect your WhatsApp Business number to Leadgaze."
        />
        <PageBody className="py-4 space-y-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>WhatsApp Business</span>
          </div>
        }
        description="Connect your WhatsApp Business number to manage conversations and capture leads."
      />

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
        <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">

          {/* ---- LEFT SIDEBAR ---- */}
          <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Connected Numbers</CardTitle>
                  {isConnected && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-600">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {accounts.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {isConnected
                        ? 'Meta connection active, but no phone numbers found.'
                        : 'No WhatsApp numbers connected yet.'}
                    </p>
                    {isConnected && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-xs"
                        onClick={handleSyncNumbers}
                        disabled={isSyncingNumbers}
                      >
                        {isSyncingNumbers ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Sync Phone Numbers
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accounts.map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between p-2 rounded-md border text-xs bg-primary/5 border-primary">
                        <div className="flex flex-col flex-1 pr-2 overflow-hidden">
                          <span className="truncate font-medium">{acc.display_name}</span>
                          <span className="truncate text-[10px] text-muted-foreground font-mono">
                            {acc.metadata?.phone_number}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => { setAccountToDisconnect(acc); setShowDisconnectDialog(true); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant={isConnected ? 'outline' : 'default'}
                  className="w-full gap-1.5 text-xs"
                  onClick={handleConnect}
                  disabled={isMutating}
                >
                  <Plus className="h-3 w-3" />
                  {isConnected ? 'Reconnect / Change Account' : 'Connect via Facebook'}
                </Button>
              </CardContent>
            </Card>

            {isConnected && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Overview</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {[
                    { icon: <Users className="h-3.5 w-3.5" />, label: 'Numbers', value: accounts.length },
                    { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Templates', value: templates.length },
                    { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Saved Replies', value: savedReplies.length },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {stat.icon}
                        <span className="text-xs">{stat.label}</span>
                      </div>
                      <span className="text-xs font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ---- MAIN TABS ---- */}
          <Tabs defaultValue="overview" className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
            <TabsList className="w-max bg-muted/40 p-1 rounded-lg shrink-0 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="inbox" disabled={!isConnected}>Shared Inbox</TabsTrigger>
              <TabsTrigger value="lead-settings" disabled={!isConnected}>Lead Settings</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto min-h-0 space-y-6">
              {!isConnected ? (
                <Card className="border shadow-sm">
                  <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-full bg-muted/40">
                      <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
                        <circle cx="24" cy="24" r="20" fill="#25D366" />
                        <path d="M34.5 13.5C32 11 28.2 9.5 24 9.5c-8.3 0-15 6.7-15 15 0 2.6.7 5.2 2 7.4L9.5 39l7.3-1.9c2.1 1.1 4.5 1.7 6.9 1.7 8.3 0 15-6.7 15-15 0-4-.8-7.5-3.2-10l.6-.3zM24 35.6c-2.2 0-4.4-.6-6.3-1.7l-.5-.3-4.4 1.1 1.2-4.2-.3-.5C12.5 28.2 12 26.1 12 24c0-6.6 5.4-12 12-12 3.2 0 6.2 1.3 8.5 3.5 2.3 2.3 3.5 5.3 3.5 8.5 0 6.6-5.4 12-12 12z" fill="white" />
                        <path d="M30.5 26.5c-.4-.2-2.2-1.1-2.5-1.2-.3-.1-.6-.2-.8.2-.3.3-.9 1.2-1.2 1.4-.2.2-.5.2-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-.9-1.8-2.1-2-2.4-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.7.2-.2.2-.4.1-.7-.1-.3-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .4-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.8c.2.2 2.6 4 6.3 5.6 3.7 1.5 3.7 1 4.3 1 .7 0 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.1-.4-.2-.8-.4z" fill="white" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base custom-sub-heading-dialog-form">Connect WhatsApp Business</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Connect your WhatsApp Business number to receive and send messages directly from Leadgaze.
                      </p>
                    </div>
                    <Button onClick={handleConnect} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Connect via Facebook
                    </Button>
                  </CardContent>
                </Card>
              ) : !hasConnectedAccounts ? (
                <Card className="border shadow-sm">
                  <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
                    <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base custom-sub-heading-dialog-form">Meta Connection Active</h3>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Your Meta OAuth authorization was successful. However, 0 phone numbers were automatically retrieved for your WhatsApp Business Account.
                      </p>
                      <p className="text-xs text-muted-foreground max-w-md pt-1">
                        Make sure you have added a verified Phone Number under your WABA in Meta Business Manager, then click <strong>Sync Phone Numbers</strong> below.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Button onClick={handleSyncNumbers} disabled={isSyncingNumbers} className="gap-2 text-xs">
                        {isSyncingNumbers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Sync Phone Numbers
                      </Button>
                      <Button variant="outline" onClick={handleConnect} className="gap-2 text-xs">
                        Reconnect via Facebook
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {accounts.map((acc) => (
                    <Card key={acc.id} className="border shadow-sm">
                      <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm font-semibold">{acc.display_name}</CardTitle>
                          <CardDescription className="text-xs font-mono">
                            {acc.metadata?.phone_number} · WABA: {acc.metadata?.waba_id}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </Badge>
                          <Button
                            variant="outline" size="sm" className="gap-1.5 text-xs"
                            onClick={() => handleSyncTemplates(acc.id)}
                            disabled={isSyncingTemplates}
                          >
                            {isSyncingTemplates ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Sync Templates
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Quality Rating</p>
                            <p className="font-medium capitalize">{acc.metadata?.quality_rating ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">API Status</p>
                            <p className="font-medium">{acc.metadata?.status ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Lead Mode</p>
                            <p className="font-medium capitalize">{settings?.lead_creation_mode ?? 'hybrid'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Templates Synced</p>
                            <p className="font-medium">{templates.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>

            {/* SHARED INBOX TAB */}
            <TabsContent value="inbox" className="flex-1 h-full min-h-0 overflow-hidden">
              {onGetConversations && onGetMessages && onSendMessage && onResolveConversation && onReopenConversation && onConvertToLead ? (
                <WhatsAppInboxTab
                  workspaceId={workspaceId}
                  onGetConversations={onGetConversations}
                  onGetMessages={onGetMessages}
                  onSendMessage={onSendMessage}
                  onResolveConversation={onResolveConversation}
                  onReopenConversation={onReopenConversation}
                  onConvertToLead={onConvertToLead}
                />
              ) : (
                <Card className="border shadow-sm p-6 text-center text-xs text-muted-foreground">
                  Inbox services not provided.
                </Card>
              )}
            </TabsContent>

            {/* LEAD SETTINGS */}
            <TabsContent value="lead-settings" className="flex-1 overflow-y-auto min-h-0 space-y-2">
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Lead Creation Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Control how incoming WhatsApp messages create CRM leads.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Mode selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Creation Mode</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['automatic', 'manual', 'hybrid'] as LeadCreationMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setLeadMode(mode)}
                          className={`p-3 rounded-lg border text-left transition-all ${leadMode === mode
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-muted-foreground/40'
                            }`}
                        >
                          <p className="text-xs font-semibold capitalize">{mode}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {mode === 'automatic' && 'Always create a lead for new contacts'}
                            {mode === 'manual' && 'Agent manually converts conversations'}
                            {mode === 'hybrid' && 'Create lead if keywords/threshold match'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keyword editor (hybrid only) */}
                  {leadMode === 'hybrid' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger Keywords</Label>
                        <p className="text-xs text-muted-foreground">Lead is created if the customer&apos;s message contains any of these words.</p>
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-muted/20 min-h-[56px]">
                          {keywords.map((kw) => (
                            <span key={kw} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                              {kw}
                              <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                            placeholder="Add keyword..."
                            className="h-8 text-xs"
                          />
                          <Button size="sm" variant="outline" onClick={addKeyword} className="text-xs gap-1">
                            <Plus className="h-3 w-3" />
                            Add
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message Count Threshold</Label>
                        <p className="text-xs text-muted-foreground">Also create a lead after this many messages (even without keywords).</p>
                        <Input
                          type="number"
                          value={msgThreshold}
                          min={1}
                          max={20}
                          onChange={(e) => setMsgThreshold(parseInt(e.target.value, 10) || 3)}
                          className="h-8 text-xs w-24"
                        />
                      </div>
                    </>
                  )}

                  <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="gap-2 text-xs">
                    {isSavingSettings ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SETUP GUIDE */}
            <TabsContent value="setup" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm p-6 space-y-8">
                <div>
                  <h3 className="text-base font-bold mb-1 custom-sub-heading-dialog-form">WhatsApp Integration & Usage Guide</h3>
                  <p className="text-sm text-muted-foreground">How to connect your WhatsApp Business number, manage customer chats, and capture leads automatically.</p>
                </div>

                {[
                  {
                    n: 1,
                    title: 'Connect via Facebook Embedded Signup',
                    body: 'Click "Connect via Facebook" in the sidebar. Log in to Facebook and choose or create your Meta WhatsApp Business Account (WABA) and phone number. Access permissions will be granted automatically.',
                  },
                  {
                    n: 2,
                    title: 'Receiving Customer Messages',
                    body: 'Once connected, incoming customer messages on your WhatsApp number will automatically stream into Leadgaze. You can open the Shared Inbox to reply, assign conversations to team members, or add internal notes.',
                  },
                  {
                    n: 3,
                    title: 'Automatic & Hybrid CRM Lead Creation',
                    body: 'Configure rules under "Lead Settings":\n• Automatic: Every new incoming contact creates a CRM Lead automatically.\n• Hybrid: Creates a CRM Lead if the message contains target keywords or exceeds the message threshold.\n• Manual: Agents convert chats into CRM Leads with one click using the "Convert to Lead" button inside the Shared Inbox.',
                  },
                  {
                    n: 4,
                    title: 'Accessing Your WhatsApp Inbox',
                    body: 'Click the "Open Shared Inbox" button in the top action bar or navigate to Sales → Shared Inbox in the main navigation menu.',
                  },
                ].map((step) => (
                  <div key={step.n} className="border-l-2 border-emerald-500 pl-4 space-y-1.5">
                    <h4 className="text-sm font-semibold">{step.n}. {step.title}</h4>
                    {step.body && <p className="text-xs text-muted-foreground whitespace-pre-line">{step.body}</p>}
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>



      {/* ---- DISCONNECT DIALOG ---- */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect WhatsApp Number</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect <strong>{accountToDisconnect?.display_name}</strong>?
              Existing conversations will be preserved but new messages will not be received.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setShowDisconnectDialog(false); setAccountToDisconnect(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={isMutating} className="gap-2">
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
