'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Link2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Users,
  FileText,
  BarChart3,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
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
import { Switch } from '@kit/ui/switch';

import { useLocalization } from '@kit/shared/localization';
import type {
  MetaAdsPage,
  MetaAdsFormConfig,
  MetaAdsFieldMapping,
  MetaAdsSyncLog,
  MetaAdsLeadForm,
  MetaAdsConnection,
} from '../types';

// ---------------------------------------------------------------------------
// Default Meta → Leadgaze field mapping
// ---------------------------------------------------------------------------

const DEFAULT_FIELD_MAPPINGS = [
  { meta_field: 'full_name', leadgaze_field: 'name', label: 'Full Name' },
  { meta_field: 'email', leadgaze_field: 'email', label: 'Email' },
  { meta_field: 'phone_number', leadgaze_field: 'phone_number', label: 'Phone Number' },
  { meta_field: 'company_name', leadgaze_field: 'company_name', label: 'Company Name' },
  { meta_field: 'job_title', leadgaze_field: 'designation', label: 'Job Title' },
  { meta_field: 'city', leadgaze_field: 'city', label: 'City' },
  { meta_field: 'state', leadgaze_field: 'state', label: 'State' },
  { meta_field: 'zip_code', leadgaze_field: 'zip_code', label: 'ZIP Code' },
  { meta_field: 'country', leadgaze_field: 'country', label: 'Country' },
];

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  success: { label: 'Success', variant: 'default' },
  duplicate: { label: 'Duplicate', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
  invalid: { label: 'Invalid', variant: 'outline' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MetaAdsSettingsPageProps {
  workspaceId: string;
  onNavigateBack: () => void;
  onLoadData: (workspaceId: string) => Promise<{
    connection: MetaAdsConnection | null;
    pages: MetaAdsPage[];
    forms: MetaAdsFormConfig[];
    mappings: MetaAdsFieldMapping[];
    recentLogs: MetaAdsSyncLog[];
  }>;
  onGetAuthUrl: (workspaceId: string) => Promise<{ url: string }>;
  onDisconnect: (workspaceId: string, pageAccountId: string) => Promise<void>;
  onSaveForms: (workspaceId: string, forms: Partial<MetaAdsFormConfig>[]) => Promise<MetaAdsFormConfig[]>;
  onFetchLeadForms: (workspaceId: string, pageAccountId: string) => Promise<{ forms: MetaAdsLeadForm[] }>;
  onSubscribePage: (workspaceId: string, pageAccountId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MetaAdsSettingsPage({
  workspaceId,
  onNavigateBack,
  onLoadData,
  onGetAuthUrl,
  onDisconnect,
  onFetchLeadForms,
  onSubscribePage,
}: MetaAdsSettingsPageProps) {
  const [connection, setConnection] = useState<MetaAdsConnection | null>(null);
  const [pages, setPages] = useState<MetaAdsPage[]>([]);
  const [forms, setForms] = useState<MetaAdsFormConfig[]>([]);
  const [logs, setLogs] = useState<MetaAdsSyncLog[]>([]);

  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [pageForms, setPageForms] = useState<MetaAdsLeadForm[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isFetchingForms, setIsFetchingForms] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [pageToDisconnect, setPageToDisconnect] = useState<MetaAdsPage | null>(null);

  const { formatDateTime } = useLocalization();

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await onLoadData(workspaceId);
      setConnection(data.connection);
      setPages(data.pages);
      setForms(data.forms);
      setLogs(data.recentLogs);
      if (data.pages.length > 0) {
        setSelectedPageId(data.pages[0]!.id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load Meta Ads settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsMutating(true);
    try {
      const { url } = await onGetAuthUrl(workspaceId);
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error('Failed to initiate Facebook connection.');
      setIsMutating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!pageToDisconnect) return;
    setIsMutating(true);
    try {
      await onDisconnect(workspaceId, pageToDisconnect.id);
      const remaining = pages.filter((p) => p.id !== pageToDisconnect.id);
      setPages(remaining);
      if (selectedPageId === pageToDisconnect.id) {
        setSelectedPageId(remaining[0]?.id ?? '');
      }
      setShowDisconnectDialog(false);
      setPageToDisconnect(null);
      toast.success('Facebook Page disconnected.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to disconnect page.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleFetchForms = async () => {
    if (!selectedPageId) return;
    setIsFetchingForms(true);
    try {
      const { forms: fresh } = await onFetchLeadForms(workspaceId, selectedPageId);
      setPageForms(fresh);
      toast.success(`Fetched ${fresh.length} lead forms.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch lead forms from Meta.');
    } finally {
      setIsFetchingForms(false);
    }
  };

  const handleSubscribePage = async () => {
    if (!selectedPageId) return;
    setIsSubscribing(true);
    try {
      await onSubscribePage(workspaceId, selectedPageId);
      toast.success('Page subscribed to receive lead notifications.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to subscribe page.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const hasConnectedPages = pages.length > 0;
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <>
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Skeleton className="h-8 w-52" />
            </div>
          }
          description="Connect your Facebook Pages to capture leads from Meta Lead Ads automatically."
        />
        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
          <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">
            <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
              <Card>
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Connections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-10 w-96" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </PageBody>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNavigateBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Meta Ads Lead Forms</span>
          </div>
        }
        description="Connect your Facebook Pages to automatically capture leads from Meta Lead Ads."
      />

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
        <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">

          {/* ---- LEFT SIDEBAR: Connected Pages ---- */}
          <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold">Connected Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {pages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No Facebook Pages connected yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pages.map((page) => (
                      <div
                        key={page.id}
                        onClick={() => setSelectedPageId(page.id)}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          selectedPageId === page.id
                            ? 'border-primary bg-primary/5 font-medium'
                            : 'border-border bg-transparent hover:bg-accent/5'
                        }`}
                      >
                        <div className="flex flex-col flex-1 pr-2 overflow-hidden">
                          <span className="truncate font-medium">{page.display_name}</span>
                          <span className="truncate text-[10px] text-muted-foreground font-mono">
                            {page.metadata?.page_id}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPageToDisconnect(page);
                            setShowDisconnectDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={handleConnect}
                  disabled={isMutating}
                >
                  {isMutating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )}
                  Link Facebook Account
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            {hasConnectedPages && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Overview</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Pages Connected</span>
                    </div>
                    <span className="text-xs font-semibold">{pages.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">Active Forms</span>
                    </div>
                    <span className="text-xs font-semibold">
                      {forms.filter((f) => f.is_active).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span className="text-xs">Leads Synced</span>
                    </div>
                    <span className="text-xs font-semibold">
                      {logs.filter((l) => l.status === 'success').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ---- MAIN CONTENT TABS ---- */}
          <Tabs
            defaultValue="overview"
            className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden"
          >
            <TabsList className="w-max bg-muted/40 p-1 rounded-lg shrink-0 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="forms" disabled={!hasConnectedPages}>Lead Forms</TabsTrigger>
              <TabsTrigger value="field-mapping" disabled={!hasConnectedPages}>Field Mapping</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
              <TabsTrigger value="logs">Activity Logs</TabsTrigger>
            </TabsList>

            {/* ---- OVERVIEW ---- */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto min-h-0 space-y-6">
              {!hasConnectedPages ? (
                <Card className="border shadow-sm">
                  <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-full bg-muted/40">
                      {/* Meta brand colour icon */}
                      <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
                        <path
                          d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z"
                          fill="#1877F2"
                        />
                        <path
                          d="M32.6 24h-4.4v-2.8c0-1.092.536-2.2 2.2-2.2h1.7v-3.75a20.75 20.75 0 0 0-3.024-.264c-3.088 0-5.076 1.872-5.076 5.256V24H20v4.5h4v11h4.2V28.5h3.148L32.6 24z"
                          fill="white"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Connect Facebook Pages</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Authorize Leadgaze to access your Facebook Pages and automatically
                        capture leads from Meta Lead Ads.
                      </p>
                    </div>
                    <Button
                      onClick={handleConnect}
                      disabled={isMutating}
                      className="gap-2"
                    >
                      {isMutating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Link Facebook Account
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Selected Page info */}
                  <Card className="border shadow-sm">
                    <CardHeader className="border-b pb-3">
                      <CardTitle className="text-sm font-semibold">
                        Selected Page: {selectedPage?.display_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Page ID:{' '}
                        <span className="font-mono text-foreground">
                          {selectedPage?.metadata?.page_id ?? '—'}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={handleSubscribePage}
                          disabled={isSubscribing || !selectedPageId}
                        >
                          {isSubscribing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Re-subscribe to Leads
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configured Forms Table */}
                  {forms.length > 0 && (
                    <Card className="border shadow-sm">
                      <CardHeader className="border-b pb-3">
                        <CardTitle className="text-sm font-semibold">Configured Lead Forms</CardTitle>
                        <CardDescription>
                          Forms currently configured to sync leads to Leadgaze CRM.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="px-6 py-2.5 text-xs">Form Name</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Page</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Form ID</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {forms.map((form) => (
                              <TableRow key={form.id} className="hover:bg-accent/5">
                                <TableCell className="px-6 py-2.5 text-sm font-medium">
                                  {form.form_name}
                                </TableCell>
                                <TableCell className="px-6 py-2.5 text-xs text-muted-foreground">
                                  {form.page_name ?? form.page_id}
                                </TableCell>
                                <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                  {form.form_id}
                                </TableCell>
                                <TableCell className="px-6 py-2.5">
                                  <Badge
                                    variant={form.is_active ? 'default' : 'secondary'}
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {form.is_active ? 'Active' : 'Paused'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* ---- LEAD FORMS ---- */}
            <TabsContent value="forms" className="flex-1 overflow-y-auto min-h-0 space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold">Lead Form Selection</CardTitle>
                    <CardDescription className="text-xs">
                      Fetch lead forms from the selected Facebook Page and select which ones to sync.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs shrink-0"
                    onClick={handleFetchForms}
                    disabled={isFetchingForms || !selectedPageId}
                  >
                    {isFetchingForms ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Fetch Forms
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  {pageForms.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center space-y-3">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="text-sm font-medium">No forms fetched yet</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Select a Facebook Page from the sidebar and click{' '}
                        <strong>&quot;Fetch Forms&quot;</strong> to retrieve your Meta Lead Forms.
                      </p>
                      <div className="flex justify-center pt-2">
                        <a
                          href="https://www.facebook.com/adsmanager"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          Open Meta Ads Manager
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Available Forms ({pageForms.length})
                      </h4>
                      {pageForms.map((form) => {
                        const isConfigured = forms.some((f) => f.form_id === form.id);
                        return (
                          <div
                            key={form.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{form.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                ID: {form.id}
                                {form.status && ` · ${form.status}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isConfigured ? (
                                <Badge variant="default" className="text-[10px] gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Configured
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  Not synced
                                </Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Previously configured forms */}
                  {forms.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Configured Forms
                      </h4>
                      {forms.map((form) => (
                        <div
                          key={form.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/10"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{form.form_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {form.page_name ?? form.page_id} · Form ID: {form.form_id}
                            </p>
                          </div>
                          <Switch
                            checked={form.is_active}
                            aria-label={`Toggle form ${form.form_name}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- FIELD MAPPING ---- */}
            <TabsContent value="field-mapping" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Field Mapping</CardTitle>
                  <CardDescription>
                    Default mapping of Meta lead form fields to Leadgaze CRM fields.
                    Supports standard Meta fields and custom questions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 py-2.5 text-xs w-1/2">Meta Field</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs w-1/2">Leadgaze CRM Field</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEFAULT_FIELD_MAPPINGS.map((mapping) => (
                        <TableRow key={mapping.meta_field} className="hover:bg-accent/5">
                          <TableCell className="px-6 py-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold">{mapping.label}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {mapping.meta_field}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary font-medium">
                                {mapping.leadgaze_field}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-muted/20 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> Custom Meta form questions (e.g., Industry, Budget) can be
                      mapped to custom Leadgaze fields. Configure custom fields in Settings → Fields.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- SETUP GUIDE ---- */}
            <TabsContent value="setup" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm p-6 space-y-8">
                <div>
                  <h3 className="text-base font-bold mb-1">Meta Ads Lead Forms Integration Guide</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow these steps to capture Facebook and Instagram leads automatically into Leadgaze CRM.
                  </p>
                </div>

                {/* Step 1 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">1. Create a Meta Developer App</h4>
                  <p className="text-xs text-muted-foreground">
                    Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com</a> and create a Business type app.
                    Enable <strong>Facebook Login</strong> and <strong>Webhooks</strong> products.
                  </p>
                  <div className="mt-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <p><strong>Required env vars:</strong></p>
                    <p><code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">META_APP_ID</code></p>
                    <p><code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">META_APP_SECRET</code></p>
                    <p><code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">META_WEBHOOK_VERIFY_TOKEN</code> (any secret string you choose)</p>
                    <p><code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">META_REDIRECT_URI</code> = your callback URL (optional, auto-detected)</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">2. Connect Your Facebook Account</h4>
                  <p className="text-xs text-muted-foreground">
                    Click <strong>&quot;Link Facebook Account&quot;</strong> from the sidebar.
                    You will be redirected to Facebook&apos;s OAuth consent screen.
                    Grant the following permissions:
                  </p>
                  <div className="mt-2 rounded-md bg-muted/30 p-3 text-xs font-mono text-muted-foreground space-y-1">
                    <p>pages_show_list</p>
                    <p>pages_read_engagement</p>
                    <p>pages_manage_metadata</p>
                    <p>business_management</p>
                    <p>leads_retrieval</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">3. Pages Auto-Subscribed</h4>
                  <p className="text-xs text-muted-foreground">
                    After you connect, Leadgaze automatically subscribes all your Pages to receive
                    lead notifications. You can manually re-subscribe from the Overview tab if needed.
                  </p>
                </div>

                {/* Step 4: Configure Webhook */}
                <div className="space-y-2 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">4. Configure Meta Webhook</h4>
                  <p className="text-xs text-muted-foreground">
                    In your Meta Developer App, go to <strong>Webhooks → Subscribe to Page events</strong>.
                    Add the following:
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100 mt-2">
{`Callback URL:
${typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/meta/webhook` : 'https://YOUR_DOMAIN/api/integrations/meta/webhook'}

Verify Token: (your META_WEBHOOK_VERIFY_TOKEN value)

Subscribe to: leadgen`}
                  </pre>
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Important:</strong> Meta sends only the <code>leadgen_id</code>, <code>page_id</code>, and{' '}
                      <code>form_id</code> in the webhook. Leadgaze fetches the full lead data from the Graph API automatically.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">5. Fetch & Configure Lead Forms</h4>
                  <p className="text-xs text-muted-foreground">
                    Go to the <strong>Lead Forms</strong> tab, select a Page, and click{' '}
                    <strong>&quot;Fetch Forms&quot;</strong>. Once fetched, forms are registered for lead routing.
                  </p>
                </div>

                {/* Step 6 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">6. Test the Integration</h4>
                  <p className="text-xs text-muted-foreground">
                    Use the <strong>Lead Ads Testing Tool</strong> in Meta&apos;s developer platform to submit a test lead.
                    Check <strong>Activity Logs</strong> to confirm the lead was synced.
                  </p>
                  <a
                    href="https://developers.facebook.com/tools/lead-ads-testing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                  >
                    Open Lead Ads Testing Tool
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Example webhook payload */}
                <div className="space-y-2 border-t pt-6">
                  <h4 className="text-sm font-semibold">Example Meta Webhook Payload</h4>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`{
  "object": "page",
  "entry": [{
    "id": "PAGE_ID",
    "changes": [{
      "field": "leadgen",
      "value": {
        "leadgen_id": "123456789",
        "page_id": "PAGE_ID",
        "form_id": "FORM_ID",
        "adgroup_id": "AD_GROUP_ID",
        "ad_id": "AD_ID",
        "created_time": 1696000000
      }
    }]
  }]
}`}
                  </pre>
                </div>

                {/* App Review reminder */}
                <div className="flex items-start gap-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 p-4 border-t mt-4">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <p><strong>App Review Required for Production:</strong></p>
                    <p>
                      The permissions <code>leads_retrieval</code>, <code>pages_manage_metadata</code>, and{' '}
                      <code>business_management</code> require Meta Business Verification and App Review
                      before they can be used with non-admin users. Until approved, only app admins,
                      developers, and testers can use this integration.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ---- ACTIVITY LOGS ---- */}
            <TabsContent value="logs" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Activity Logs</CardTitle>
                  <CardDescription>Recent lead sync events for this workspace.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {logs.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No lead sync events yet. Leads will appear here once received via webhook.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-6 py-2.5 text-xs">Leadgen ID</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Form</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Status</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Error</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Received At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const badge = STATUS_BADGE[log.status] ?? { label: 'Unknown', variant: 'outline' as const };
                          return (
                            <TableRow key={log.id} className="hover:bg-accent/5">
                              <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                {log.leadgen_id}
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                {log.form_id}
                              </TableCell>
                              <TableCell className="px-6 py-2.5">
                                <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                                  {badge.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-xs text-destructive max-w-xs truncate">
                                {log.error_message ?? '—'}
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-xs text-muted-foreground">
                                {formatDateTime(log.created_at)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>

      {/* ---- DISCONNECT DIALOG ---- */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Facebook Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect{' '}
              <strong>{pageToDisconnect?.display_name}</strong>? This will stop lead syncing
              for all forms on this page. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisconnectDialog(false);
                setPageToDisconnect(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isMutating}
              className="gap-2"
            >
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
