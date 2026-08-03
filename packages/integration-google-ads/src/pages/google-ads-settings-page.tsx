'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Link2,
  Link2Off,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Users,
  FileText,
  BarChart3,
  Loader2,
  Trash2,
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
import { Label } from '@kit/ui/label';

import { useLocalization } from '@kit/shared/localization';
import type {
  GoogleAdsConnection,
  GoogleAdsFormConfig,
  GoogleAdsFieldMapping,
  GoogleAdsSyncLog,
  GoogleAdsCustomerAccount,
  GoogleAdsAccount,
} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleAdsSettingsPageProps {
  workspaceId: string;
  onNavigateBack: () => void;
  onLoadData: (workspaceId: string) => Promise<{
    connection: GoogleAdsConnection | null;
    accounts: GoogleAdsAccount[];
    forms: GoogleAdsFormConfig[];
    mappings: GoogleAdsFieldMapping[];
    recentLogs: GoogleAdsSyncLog[];
  }>;
  onGetAuthUrl: (workspaceId: string) => Promise<{ url: string }>;
  onDisconnect: (workspaceId: string, accountId: string) => Promise<void>;
  onSaveForms: (workspaceId: string, forms: Partial<GoogleAdsFormConfig>[]) => Promise<GoogleAdsFormConfig[]>;
  onFetchAccounts: (workspaceId: string, accountId: string) => Promise<{ accounts: GoogleAdsCustomerAccount[] }>;
}

// ---------------------------------------------------------------------------
// Default Google → Leadgaze field mappings (shown in field mapping tab)
// ---------------------------------------------------------------------------

const DEFAULT_FIELD_MAPPINGS = [
  { google_field: 'FULL_NAME', leadgaze_field: 'name', label: 'Full Name' },
  { google_field: 'EMAIL', leadgaze_field: 'email', label: 'Email' },
  { google_field: 'PHONE_NUMBER', leadgaze_field: 'phone_number', label: 'Phone Number' },
  { google_field: 'COMPANY_NAME', leadgaze_field: 'company_name', label: 'Company Name' },
  { google_field: 'JOB_TITLE', leadgaze_field: 'designation', label: 'Job Title' },
  { google_field: 'CITY', leadgaze_field: 'city', label: 'City' },
  { google_field: 'ZIP_CODE', leadgaze_field: 'zip_code', label: 'ZIP Code' },
  { google_field: 'COUNTRY', leadgaze_field: 'country', label: 'Country' },
];

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  success: { label: 'Success', variant: 'default' },
  duplicate: { label: 'Duplicate', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
  invalid: { label: 'Invalid', variant: 'outline' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GoogleAdsSettingsPage({
  workspaceId,
  onNavigateBack,
  onLoadData,
  onGetAuthUrl,
  onDisconnect,
  onFetchAccounts,
}: GoogleAdsSettingsPageProps) {
  const [connection, setConnection] = useState<GoogleAdsConnection | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAdsAccount[]>([]);
  const [forms, setForms] = useState<GoogleAdsFormConfig[]>([]);
  const [logs, setLogs] = useState<GoogleAdsSyncLog[]>([]);

  // Selected Google account in UI for configuration view
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [customerAccounts, setCustomerAccounts] = useState<GoogleAdsCustomerAccount[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<GoogleAdsAccount | null>(null);

  const { formatDateTime } = useLocalization();

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Update customer accounts list when selected account changes
  useEffect(() => {
    if (selectedAccountId) {
      const activeAcc = googleAccounts.find(a => a.id === selectedAccountId);
      const cached = (activeAcc?.metadata?.customer_accounts ?? []) as GoogleAdsCustomerAccount[];
      setCustomerAccounts(cached);
    } else {
      setCustomerAccounts([]);
    }
  }, [selectedAccountId, googleAccounts]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await onLoadData(workspaceId);
      setConnection(data.connection);
      setGoogleAccounts(data.accounts);
      setForms(data.forms);
      setLogs(data.recentLogs);

      if (data.accounts.length > 0) {
        setSelectedAccountId(data.accounts[0]!.id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load Google Ads settings.');
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
      toast.error('Failed to initiate Google Ads connection.');
      setIsMutating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!accountToDisconnect) return;
    setIsMutating(true);
    try {
      await onDisconnect(workspaceId, accountToDisconnect.id);
      
      const remaining = googleAccounts.filter(a => a.id !== accountToDisconnect.id);
      setGoogleAccounts(remaining);
      
      if (selectedAccountId === accountToDisconnect.id) {
        setSelectedAccountId(remaining[0]?.id ?? '');
      }

      setShowDisconnectDialog(false);
      setAccountToDisconnect(null);
      toast.success('Google Ads account disconnected.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to disconnect Google Ads account.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRefreshAccounts = async () => {
    if (!selectedAccountId) return;
    setIsRefreshingAccounts(true);
    try {
      const { accounts: fresh } = await onFetchAccounts(workspaceId, selectedAccountId);
      setCustomerAccounts(fresh);
      
      // Update local state with fresh accounts cache
      setGoogleAccounts(prev => prev.map(acc => {
        if (acc.id === selectedAccountId) {
          return {
            ...acc,
            metadata: {
              ...acc.metadata,
              customer_accounts: fresh
            }
          };
        }
        return acc;
      }));

      toast.success('Ad accounts refreshed.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to refresh ad accounts.');
    } finally {
      setIsRefreshingAccounts(false);
    }
  };

  const hasConnectedAccounts = googleAccounts.length > 0;

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
          description="Connect your Google Ads accounts to automatically capture leads from Lead Form Extensions."
        />
        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
          <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">
            <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
              <Card>
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Connections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-3 space-y-2">
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
            <span>Google Ads Lead Forms</span>
          </div>
        }
        description="Connect your Google Ads accounts to automatically capture leads from Google Lead Form Extensions."
      />

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
        <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">

          {/* ---- LEFT SIDEBAR: Connections List ---- */}
          <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
            <Card className="border shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold">Connected Profiles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {googleAccounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No Google profiles connected for Ads lead forms.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {googleAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          selectedAccountId === acc.id
                            ? 'border-primary bg-primary/5 font-medium'
                            : 'border-border bg-transparent hover:bg-accent/5'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{acc.email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAccountToDisconnect(acc);
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
                  Link Google Profile
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            {hasConnectedAccounts && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Overview</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Profiles Connected</span>
                    </div>
                    <span className="text-xs font-semibold">{googleAccounts.length}</span>
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
              <TabsTrigger value="forms" disabled={!hasConnectedAccounts}>Lead Forms</TabsTrigger>
              <TabsTrigger value="field-mapping" disabled={!hasConnectedAccounts}>Field Mapping</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
              <TabsTrigger value="logs">Activity Logs</TabsTrigger>
            </TabsList>

            {/* ---- OVERVIEW ---- */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto min-h-0 space-y-6">
              {!hasConnectedAccounts ? (
                <Card className="border shadow-sm">
                  <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                    <div className="p-4 rounded-full bg-muted/40">
                      <img
                        src="https://www.gstatic.com/images/branding/product/2x/google_ads_48dp.png"
                        alt="Google Ads"
                        className="h-12 w-12"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base custom-sub-heading-dialog-form">Connect Google Ads Profiles</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Authorize Leadgaze to access your Google Ads profiles and automatically
                        capture leads from your Lead Form Extensions.
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
                      Link Google Ads Profile
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Selected Profile Ad Accounts */}
                  <Card className="border shadow-sm">
                    <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-semibold">Ad Accounts</CardTitle>
                        <CardDescription className="text-xs">
                          Ad accounts linked to: <span className="font-medium text-foreground">{googleAccounts.find(a => a.id === selectedAccountId)?.email}</span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs shrink-0"
                        onClick={handleRefreshAccounts}
                        disabled={isRefreshingAccounts}
                      >
                        {isRefreshingAccounts ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Refresh Accounts
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {customerAccounts.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          No accessible ad accounts found for this profile. Click &quot;Refresh Accounts&quot; to fetch.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="px-6 py-2.5 text-xs">Account Name</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Customer ID</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Currency</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Timezone</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerAccounts.map((account) => (
                              <TableRow key={account.customer_id} className="hover:bg-accent/5">
                                <TableCell className="px-6 py-2.5 text-sm font-medium">
                                  {account.account_name}
                                </TableCell>
                                <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                  {account.customer_id}
                                </TableCell>
                                <TableCell className="px-6 py-2.5 text-xs">
                                  {account.currency_code ?? '—'}
                                </TableCell>
                                <TableCell className="px-6 py-2.5 text-xs">
                                  {account.time_zone ?? '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Configured Forms */}
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
                              <TableHead className="px-6 py-2.5 text-xs">Campaign</TableHead>
                              <TableHead className="px-6 py-2.5 text-xs">Customer ID</TableHead>
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
                                  {form.campaign_name ?? '—'}
                                </TableCell>
                                <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                  {form.customer_id}
                                </TableCell>
                                <TableCell className="px-6 py-2.5">
                                  <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
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
            <TabsContent value="forms" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Lead Form Selection</CardTitle>
                  <CardDescription>
                    To configure a lead form, navigate to your Google Ads account and copy the
                    Form ID and Customer ID. Use the form below to add it to Leadgaze.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center space-y-3">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-medium">Manual Form Configuration</p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Google Ads does not expose a direct API to list all lead forms without
                      campaign-level access. Copy your Form ID and Customer ID from Google Ads Manager
                      and enter them in the Setup Guide tab to register forms.
                    </p>
                    <div className="flex justify-center pt-2">
                      <a
                        href="https://ads.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        Open Google Ads Manager
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {forms.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Registered Forms
                      </h4>
                      {forms.map((form) => (
                        <div
                          key={form.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{form.form_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {form.campaign_name ? `${form.campaign_name} · ` : ''}
                              Customer: {form.customer_id}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={form.is_active}
                              aria-label={`Toggle form ${form.form_name}`}
                            />
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
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
                    Default mapping of Google Ads lead form fields to Leadgaze CRM fields.
                    Custom fields can be added via the Leadgaze field configuration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 py-2.5 text-xs w-1/2">Google Ads Field</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs w-1/2">Leadgaze CRM Field</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEFAULT_FIELD_MAPPINGS.map((mapping) => (
                        <TableRow key={mapping.google_field} className="hover:bg-accent/5">
                          <TableCell className="px-6 py-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold">{mapping.label}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {mapping.google_field}
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
                      <strong>Note:</strong> Custom Google Ads fields (e.g., Budget, Industry) can be mapped
                      to custom Leadgaze fields. Configure custom fields in Settings → Fields.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- SETUP GUIDE ---- */}
            <TabsContent value="setup" className="flex-1 overflow-y-auto min-h-0">
              <Card className="border shadow-sm p-6 space-y-8">
                <div>
                  <h3 className="text-base font-bold mb-1 custom-sub-heading-dialog-form">Google Ads Lead Forms Integration Guide</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow these steps to capture Google Ads leads automatically into Leadgaze CRM.
                  </p>
                </div>

                {/* Step 1 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">1. Connect Your Google Ads Account</h4>
                  <p className="text-xs text-muted-foreground">
                    Click <strong>&quot;Link Google Profile&quot;</strong> from the side panel.
                    You will be redirected to Google&apos;s OAuth consent screen. Select your Google account and
                    grant the requested permissions.
                  </p>
                  <div className="mt-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <p><strong>Required permission:</strong> Google Ads Account access</p>
                    <p>Leadgaze will request the <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">https://www.googleapis.com/auth/adwords</code> scope.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">2. Verify Ad Accounts</h4>
                  <p className="text-xs text-muted-foreground">
                    After connecting, select the profile from the left sidebar. Go to <strong>Overview → Ad Accounts</strong>. Click <strong>Refresh Accounts</strong>
                    to fetch the list of Google Ads accounts linked to your Google profile.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">3. Enable Google Lead Form Extensions</h4>
                  <p className="text-xs text-muted-foreground">
                    Inside <strong>Google Ads Manager</strong>, create a Lead Form Extension on your campaign or ad group.
                    Copy the Form ID shown in the Google Ads URL or extension settings.
                  </p>
                  <a
                    href="https://support.google.com/google-ads/answer/9423234"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                  >
                    Read Google&apos;s official guide
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Step 4: Configure Webhook */}
                <div className="space-y-2 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">4. Configure Google Ads Webhook</h4>
                  <p className="text-xs text-muted-foreground">
                    In Google Ads Manager, navigate to your Lead Form and add a <strong>Webhook integration</strong>.
                    Provide the following Leadgaze endpoint:
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100 mt-2">
{`Endpoint URL:
${typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/google-ads/webhook` : 'https://YOUR_DOMAIN/api/integrations/google-ads/webhook'}

Google Key: (leave empty)`}
                  </pre>
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Important:</strong> Google sends only the <code>lead_id</code>, <code>form_id</code>, and
                      <code>customer_id</code> in the webhook payload — not the actual lead data.
                      Leadgaze automatically fetches the lead data from the Google Ads API after receiving the webhook.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">5. Test the Integration</h4>
                  <p className="text-xs text-muted-foreground">
                    Inside Google Ads, use the <strong>&quot;Preview&quot;</strong> function on your Lead Form to submit a test lead.
                    Leadgaze will receive the webhook, fetch the lead data from Google&apos;s API, and create a CRM lead automatically.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check the <strong>Activity Logs</strong> tab to confirm the lead was synced successfully.
                  </p>
                </div>

                {/* Step 6 */}
                <div className="space-y-1.5 border-l-2 border-primary pl-4">
                  <h4 className="text-sm font-semibold">6. Lead Routing & Attribution</h4>
                  <p className="text-xs text-muted-foreground">
                    All leads synced from Google Ads will be tagged with the source <strong>&quot;Google Ads: [Form Name]&quot;</strong>
                    in Leadgaze CRM for accurate attribution reporting.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Campaign name, Form ID, Customer ID, and GCLID are stored in the lead notes for full traceability.
                  </p>
                </div>

                {/* Example webhook payload */}
                <div className="space-y-2 border-t pt-6">
                  <h4 className="text-sm font-semibold">Example Google Webhook Payload</h4>
                  <p className="text-xs text-muted-foreground">
                    This is the payload Google sends to Leadgaze&apos;s webhook endpoint:
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`{
  "lead_id": "Tws9aijKLYPZ1eacTkX6Gg",
  "form_id": "12345678",
  "customer_id": "987654321",
  "campaign_id": "11122233",
  "ad_group_id": "44455566",
  "gclid": "EAIaIQobChMI..."
}`}
                  </pre>
                </div>

                {/* cURL test */}
                <div className="space-y-2 border-t pt-6">
                  <h4 className="text-sm font-semibold">Test the Webhook with cURL (for development)</h4>
                  <p className="text-xs text-muted-foreground">
                    You can simulate a Google webhook notification during development using this command:
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`curl -X POST ${typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/google-ads/webhook` : 'http://localhost:3000/api/integrations/google-ads/webhook'} \\
  -H "Content-Type: application/json" \\
  -d '{
    "lead_id": "test_lead_12345",
    "form_id": "YOUR_FORM_ID",
    "customer_id": "YOUR_CUSTOMER_ID",
    "campaign_id": "YOUR_CAMPAIGN_ID",
    "gclid": "test_gclid"
  }'`}
                  </pre>
                </div>
              </Card>
            </TabsContent>

            {/* ---- ACTIVITY LOGS ---- */}
            <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden min-h-0">
              <Card className="overflow-hidden border shadow-sm flex-1 flex flex-col min-h-0">
                <CardHeader className="border-b pb-3 shrink-0">
                  <CardTitle className="text-sm font-semibold">Activity Logs</CardTitle>
                  <CardDescription>
                    Webhook events received from Google Ads and their sync status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto flex-1 min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 py-2.5 text-xs">Timestamp</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Form ID</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Lead ID</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Status</TableHead>
                        <TableHead className="px-6 py-2.5 text-xs">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="px-6 py-12 text-center text-sm text-muted-foreground"
                          >
                            No sync logs yet. Submit a lead via Google Ads to see activity here.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => {
                          const badge = STATUS_BADGE[log.status] ?? { label: log.status, variant: 'outline' as const };
                          return (
                            <TableRow key={log.id} className="hover:bg-accent/5">
                              <TableCell className="px-6 py-2.5 text-xs whitespace-nowrap">
                                {formatDateTime(log.created_at)}
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                {log.form_id}
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-xs font-mono text-muted-foreground">
                                {log.lead_id}
                              </TableCell>
                              <TableCell className="px-6 py-2.5">
                                <Badge
                                  variant={badge.variant}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {badge.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-xs text-muted-foreground max-w-[240px] truncate">
                                {log.error_message ?? (log.crm_lead_id ? `CRM Lead: ${log.crm_lead_id}` : '—')}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect Google Ads Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect <span className="font-semibold text-foreground">{accountToDisconnect?.email}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-start gap-3 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm text-destructive space-y-1">
                <p className="font-semibold">This action will:</p>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  <li>Revoke Leadgaze&apos;s access to this Google account profile</li>
                  <li>Stop future lead syncing from forms configured with this account</li>
                  <li>Preserve existing CRM leads already synced</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisconnectDialog(false);
                  setAccountToDisconnect(null);
                }}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isMutating}
              >
                {isMutating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Disconnect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
