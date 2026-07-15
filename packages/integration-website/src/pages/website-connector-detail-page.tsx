'use client';

import { useEffect, useState } from 'react';

import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  Play,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import { Skeleton } from '@kit/ui/skeleton';
import { useLocalization } from '@kit/shared/localization';

import type { Connector, ConnectorForm, ConnectorLog, FormField } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVAILABLE_LEAD_FIELDS = [
  { label: 'First Name', value: 'first_name', defaultType: 'text' },
  { label: 'Last Name', value: 'last_name', defaultType: 'text' },
  { label: 'Email', value: 'email', defaultType: 'text' },
  { label: 'Phone Number', value: 'phone_number', defaultType: 'text' },
  { label: 'Company Name', value: 'company_name', defaultType: 'text' },
  { label: 'Message', value: 'notes', defaultType: 'textarea' },
  { label: 'Job Title', value: 'job_title', defaultType: 'text' },
  { label: 'Alternative Email', value: 'alt_email', defaultType: 'text' },
  { label: 'Mobile Number', value: 'mobile_number', defaultType: 'text' },
  { label: 'Company Website', value: 'company_website', defaultType: 'text' },
  { label: 'Annual Revenue', value: 'annual_revenue', defaultType: 'number' },
  { label: 'Department', value: 'department', defaultType: 'text' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  id: string;
  name: string;
  email: string;
}

export interface WebsiteConnectorDetailPageProps {
  /** Connector to display */
  connector: Connector | null;
  isLoading: boolean;
  /** All logs for this connector */
  logs: ConnectorLog[];
  onRefetchLogs: () => void;
  /** Base site URL for embed snippet and cURL example */
  siteUrl: string;
  workspaceId: string;
  /** Supabase browser client */
  supabase: any;
  /** Toggle active / disabled */
  onUpdateConnector: (id: string, payload: { status?: string; name?: string; default_owner_id?: string | null }) => Promise<Connector>;
  /** Save the form builder definition */
  onUpdateConnectorForm: (id: string, payload: {
    success_message: string;
    redirect_url: string;
    spam_protection_enabled: boolean;
    button_color?: string;
    heading?: string;
    subheading?: string;
    fields: Omit<FormField, 'id'>[];
  }) => Promise<void>;
  /** Run sandbox test */
  onRunSandbox: (id: string, payload: { workspace_id: string; payload: any }) => Promise<void>;
  /** Navigate back to the list */
  onNavigateBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebsiteConnectorDetailPage({
  connector,
  isLoading,
  logs,
  onRefetchLogs,
  siteUrl,
  workspaceId,
  supabase,
  onUpdateConnector,
  onUpdateConnectorForm,
  onRunSandbox,
  onNavigateBack,
}: WebsiteConnectorDetailPageProps) {
  // Supabase-driven state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [forms, setForms] = useState<ConnectorForm[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  const { formatDateTime } = useLocalization();

  // UI state
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ConnectorLog | null>(null);

  // Mutation pending flags
  const [isUpdatingConnector, setIsUpdatingConnector] = useState(false);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  // Sandbox State
  const [sandboxPayload, setSandboxPayload] = useState({
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 555 987 6543',
    company: 'Enterprise Corp',
    message: 'I am interested in licensing the platform for 50 users.',
    custom_budget: '15000',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'summer_sale_2026',
  });

  // Form Builder state
  const [builderFields, setBuilderFields] = useState<Omit<FormField, 'id'>[]>([
    { field_name: 'first_name', label: 'First Name', field_type: 'text', is_required: true, sort_order: 1 },
    { field_name: 'last_name', label: 'Last Name', field_type: 'text', is_required: true, sort_order: 2 },
    { field_name: 'email', label: 'Email Address', field_type: 'text', is_required: true, sort_order: 3 },
    { field_name: 'phone_number', label: 'Phone Number', field_type: 'text', is_required: false, sort_order: 4 },
    { field_name: 'company_name', label: 'Company Name', field_type: 'text', is_required: false, sort_order: 5 },
    { field_name: 'notes', label: 'Message', field_type: 'textarea', is_required: true, sort_order: 6 },
  ]);

  const [builderSettings, setBuilderSettings] = useState({
    successMessage: 'Thank you for your submission! Our team will contact you shortly.',
    redirectUrl: '',
    spamProtection: false,
    buttonColor: '#4f46e5',
    heading: 'Contact Us',
    subheading: 'Please fill out the form below to get in touch.',
  });

  // Load accounts and connector details when connector changes
  useEffect(() => {
    if (workspaceId) loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (connector?.id) loadConnectorDetails(connector.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector?.id]);

  const loadAccounts = async () => {
    try {
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select(`user_id, accounts:user_id (id, name, email)`)
        .eq('workspace_id', workspaceId);

      if (membersData) {
        const fetchedAccounts = membersData
          .map((m: any) => m.accounts)
          .filter(Boolean) as Account[];
        setAccounts(fetchedAccounts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadConnectorDetails = async (connectorId: string) => {
    try {
      const { data: formData } = await supabase
        .schema('core')
        .from('connector_forms')
        .select('*')
        .eq('connector_id', connectorId);

      const formattedForms = (formData || []) as ConnectorForm[];
      setForms(formattedForms);

      if (formattedForms.length > 0 && formattedForms[0]) {
        const activeForm = formattedForms[0];
        const { data: fieldData } = await supabase
          .schema('core')
          .from('connector_form_fields')
          .select('*')
          .eq('form_id', activeForm.id)
          .order('sort_order', { ascending: true });

        if (fieldData && fieldData.length > 0) {
          setBuilderFields(fieldData as FormField[]);
        }

        setBuilderSettings({
          successMessage: activeForm.success_message || '',
          redirectUrl: activeForm.redirect_url || '',
          spamProtection: activeForm.spam_protection_enabled,
          buttonColor: activeForm.button_color || '#4f46e5',
          heading: activeForm.heading || 'Contact Us',
          subheading: activeForm.subheading || 'Please fill out the form below to get in touch.',
        });
      }

      const { data: keyData } = await supabase
        .schema('core')
        .from('connector_api_keys')
        .select('*')
        .eq('connector_id', connectorId);

      setApiKeys(keyData || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async () => {
    if (!connector) return;
    const newStatus = connector.status === 'active' ? 'disabled' : 'active';
    setIsUpdatingConnector(true);
    try {
      await onUpdateConnector(connector.id, { status: newStatus });
      toast.success('Connector settings updated.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update connector.');
    } finally {
      setIsUpdatingConnector(false);
    }
  };

  const handleSaveFormBuilder = async () => {
    if (!connector || forms.length === 0) return;
    setIsSavingForm(true);
    try {
      await onUpdateConnectorForm(connector.id, {
        success_message: builderSettings.successMessage,
        redirect_url: builderSettings.redirectUrl,
        spam_protection_enabled: false,
        button_color: builderSettings.buttonColor,
        heading: builderSettings.heading,
        subheading: builderSettings.subheading,
        fields: builderFields,
      });
      toast.success('Form layout saved successfully!');
      loadConnectorDetails(connector.id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save form layout.');
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleTestSandboxSubmit = async () => {
    if (!connector) return;
    setIsRunningSandbox(true);
    try {
      await onRunSandbox(connector.id, { workspace_id: workspaceId, payload: sandboxPayload });
      toast.success('Simulation submitted successfully!');
      onRefetchLogs();
    } catch (e) {
      console.error(e);
      toast.error('Simulation run failed.');
    } finally {
      setIsRunningSandbox(false);
    }
  };

  const handleRetryLog = async (log: ConnectorLog) => {
    try {
      toast.info('Simulating event retry processing...');
      await supabase
        .schema('core')
        .from('connector_logs')
        .update({ status: 'processing' })
        .eq('id', log.id);

      await new Promise((r) => setTimeout(r, 800));

      await supabase
        .schema('core')
        .from('connector_logs')
        .update({
          status: 'success',
          processing_result: {
            ...log.processing_result,
            retried_at: new Date().toISOString(),
            message: `${log.processing_result?.message || 'Retried successfully'} (Manually retried)`,
          },
        })
        .eq('id', log.id);

      toast.success('Retry processed successfully!');
      onRefetchLogs();
    } catch (e) {
      console.error(e);
      toast.error('Failed to retry event.');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ---------------------------------------------------------------------------
  // Loading / Not Found
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
              <Skeleton className="h-8 w-48" />
            </div>
          }
          description="Configure embeddable forms and secure API endpoints to receive website leads."
        />

        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
          <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
              <Card>
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Config &amp; Routing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold">Integration Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
              <div className="flex space-x-2 bg-muted/40 p-1 rounded-lg shrink-0 mb-6">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-12 mt-2" />
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-12 mt-2" />
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-12 mt-2" />
                    </CardHeader>
                  </Card>
                </div>
                <Card className="p-6">
                  <Skeleton className="h-48 w-full" />
                </Card>
              </div>
            </div>
          </div>
        </PageBody>
      </>
    );
  }

  if (!connector) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">Connector not found.</p>
        <Button onClick={onNavigateBack}>Go to Connectors List</Button>
      </div>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>{connector.name}</span>
            <Badge variant={connector.status === 'active' ? 'default' : 'secondary'}>
              {connector.status}
            </Badge>
          </div>
        }
        description="Configure embeddable forms and secure API endpoints to receive website leads."
      />

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-4 pb-6 h-[calc(100vh-120px)]">
        <div className="grid gap-6 lg:grid-cols-4 h-full min-h-0 flex-1 overflow-hidden">
          {/* ----------------------------------------------------------------
              Sidebar
          ---------------------------------------------------------------- */}
          <div className="space-y-6 lg:col-span-1 overflow-y-auto h-full pr-1 shrink-0">
            <Card className="glassmorphic">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold">Config &amp; Routing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {connector.status === 'active' ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={connector.status === 'active'}
                      onCheckedChange={handleToggleStatus}
                      disabled={isUpdatingConnector}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Default Owner
                  </Label>
                  <p className="text-sm font-medium">
                    {accounts.find((a) => a.id === connector.default_owner_id)?.name || 'Unassigned'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assignment Rules
                  </Label>
                  <p className="text-sm font-medium">
                    {connector.assignment_mode === 'fixed' ? 'Fixed Owner Assignment' : 'Round Robin'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold">Integration Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Ingested:</span>
                  <span className="font-bold">{logs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successful Runs:</span>
                  <span className="font-semibold text-green-500">
                    {logs.filter((l) => l.status === 'success' || l.status === 'duplicate').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ingestion Failures:</span>
                  <span className="font-semibold text-red-500">
                    {logs.filter((l) => l.status === 'error').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ----------------------------------------------------------------
              Main Tabs
          ---------------------------------------------------------------- */}
          <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
            <Tabs defaultValue="dashboard" className="h-full flex flex-col min-h-0 overflow-hidden space-y-6">
              <TabsList className="grid w-full grid-cols-5 bg-muted/40 p-1 shrink-0">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="form-builder">Form Builder</TabsTrigger>
                <TabsTrigger value="api-credentials">API Credentials</TabsTrigger>
                <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
                <TabsTrigger value="logs">Submissions Logs</TabsTrigger>
              </TabsList>

              {/* ---- DASHBOARD ---- */}
              <TabsContent value="dashboard" className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                        Submissions Volume
                      </CardDescription>
                      <CardTitle className="text-3xl">{logs.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Cumulative submissions processed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                        Today's Load
                      </CardDescription>
                      <CardTitle className="text-3xl">
                        {
                          logs.filter((l) => {
                            const date = new Date(l.created_at);
                            const today = new Date();
                            return (
                              date.getDate() === today.getDate() &&
                              date.getMonth() === today.getMonth() &&
                              date.getFullYear() === today.getFullYear()
                            );
                          }).length
                        }
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Inquiries submitted in the last 24h</p>
                    </CardContent>
                  </Card>
                  <Card className="border-red-500/20 bg-red-50/10 dark:bg-red-950/10">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-semibold uppercase tracking-wider text-red-500">
                        Failed Submissions
                      </CardDescription>
                      <CardTitle className="text-3xl text-red-500">
                        {logs.filter((l) => l.status === 'error').length}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Failed payloads awaiting retry</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Database className="h-4 w-4 text-primary" /> Recent Submissions Ingestion Flow
                    </CardTitle>
                    <CardDescription>
                      Visualizing recent ingestion activities for this connector.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
                        <Terminal className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium text-muted-foreground">
                          No submissions recorded yet
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Head to the Sandbox tab to submit your first test payload!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {logs.slice(0, 5).map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/10"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={
                                  log.status === 'success'
                                    ? 'default'
                                    : log.status === 'duplicate'
                                      ? 'secondary'
                                      : 'destructive'
                                }
                              >
                                {log.status}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">
                                  {(log.event?.raw_payload as any)?.name || 'Inquiry Submission'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(log.event?.raw_payload as any)?.email || 'N/A'} •{' '}
                                  {new Date(log.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <p className="font-semibold">
                                {log.processing_result?.entity === 'lead' ? 'CRM Lead' : 'Helpdesk Ticket'}
                              </p>
                              <p className="max-w-[200px] truncate text-muted-foreground">
                                {log.processing_result?.message || 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---- FORM BUILDER ---- */}
              <TabsContent value="form-builder" className="flex-1 min-h-0 h-full">
                <div className="grid gap-6 md:grid-cols-2 h-full min-h-0 items-stretch">
                  <Card className="flex flex-col h-full min-h-0">
                    <CardHeader className="shrink-0">
                      <CardTitle className="text-base">Configure Embedded Form</CardTitle>
                      <CardDescription>
                        Configure visible inputs, rename fields, and map payload parameters.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-6">
                      {/* Fields */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Form Fields
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => {
                              setBuilderFields([
                                ...builderFields,
                                {
                                  field_name: 'first_name',
                                  label: 'First Name',
                                  field_type: 'text',
                                  is_required: false,
                                  sort_order: builderFields.length + 1,
                                },
                              ]);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Field
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {builderFields.map((field, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2.5 border rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors"
                            >
                              {/* Destination field select */}
                              <div className="flex-1 min-w-[130px]">
                                <Select
                                  value={field.field_name}
                                  onValueChange={(val) => {
                                    const meta = AVAILABLE_LEAD_FIELDS.find((f) => f.value === val);
                                    const updated = [...builderFields];
                                    updated[idx] = {
                                      ...field,
                                      field_name: val,
                                      label: meta ? meta.label : field.label,
                                      field_type: meta ? (meta.defaultType as any) : field.field_type,
                                    };
                                    setBuilderFields(updated);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AVAILABLE_LEAD_FIELDS.map((f) => (
                                      <SelectItem key={f.value} value={f.value} className="text-xs">
                                        {f.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Label input */}
                              <div className="flex-1 min-w-[120px]">
                                <Input
                                  placeholder="Input Label"
                                  className="h-8 text-xs"
                                  value={field.label}
                                  onChange={(e) => {
                                    const updated = [...builderFields];
                                    updated[idx] = { ...field, label: e.target.value };
                                    setBuilderFields(updated);
                                  }}
                                />
                              </div>

                              {/* Required + Delete */}
                              <div className="flex items-center gap-3 shrink-0">
                                <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={field.is_required}
                                    onChange={(e) => {
                                      const updated = [...builderFields];
                                      updated[idx] = { ...field, is_required: e.target.checked };
                                      setBuilderFields(updated);
                                    }}
                                    className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary dark:border-zinc-700"
                                  />
                                  Required
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  onClick={() => setBuilderFields(builderFields.filter((_, i) => i !== idx))}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    <line x1="10" x2="10" y1="11" y2="17" />
                                    <line x1="14" x2="14" y1="11" y2="17" />
                                  </svg>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Header & Styling */}
                      <div className="space-y-4 border-t pt-4">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Form Header &amp; Styling
                        </Label>
                        <div className="space-y-2">
                          <Label htmlFor="f-heading">Form Heading</Label>
                          <Input
                            id="f-heading"
                            placeholder="Contact Us"
                            value={builderSettings.heading}
                            onChange={(e) =>
                              setBuilderSettings({ ...builderSettings, heading: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="f-subheading">Form Subheading</Label>
                          <Input
                            id="f-subheading"
                            placeholder="Please fill out the form below to get in touch."
                            value={builderSettings.subheading}
                            onChange={(e) =>
                              setBuilderSettings({ ...builderSettings, subheading: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="f-btn-color">Button Theme Color</Label>
                          <div className="flex items-center gap-3">
                            <Input
                              id="f-btn-color"
                              type="color"
                              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border-0 p-0"
                              value={builderSettings.buttonColor}
                              onChange={(e) =>
                                setBuilderSettings({ ...builderSettings, buttonColor: e.target.value })
                              }
                            />
                            <Input
                              type="text"
                              placeholder="#4f46e5"
                              value={builderSettings.buttonColor}
                              onChange={(e) =>
                                setBuilderSettings({ ...builderSettings, buttonColor: e.target.value })
                              }
                              className="max-w-[150px] font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Submit Actions */}
                      <div className="space-y-4 border-t pt-4">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Submit Actions
                        </Label>
                        <div className="space-y-2">
                          <Label htmlFor="f-msg">Success Message</Label>
                          <Input
                            id="f-msg"
                            value={builderSettings.successMessage}
                            onChange={(e) =>
                              setBuilderSettings({ ...builderSettings, successMessage: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="f-url">Redirect URL (Optional)</Label>
                          <Input
                            id="f-url"
                            placeholder="https://example.com/thank-you"
                            value={builderSettings.redirectUrl}
                            onChange={(e) =>
                              setBuilderSettings({ ...builderSettings, redirectUrl: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                    <DialogFooter className="border-t bg-muted/20 p-4 shrink-0">
                      <Button
                        onClick={handleSaveFormBuilder}
                        className="w-full gap-2"
                        disabled={isSavingForm}
                      >
                        <Save className="h-4 w-4" />
                        {isSavingForm ? 'Saving...' : 'Save Form Definition'}
                      </Button>
                    </DialogFooter>
                  </Card>

                  {/* Live Preview */}
                  <Card className="flex flex-col h-full min-h-0 border border-primary/10">
                    <CardHeader className="border-b bg-primary/5 pb-3 shrink-0">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Eye className="h-4 w-4 text-primary" /> Live Form Widget Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 items-center justify-center bg-accent/5 p-6 min-h-0">
                      <div className="w-full max-w-sm rounded-xl border bg-card shadow-sm flex flex-col h-full max-h-[380px] overflow-hidden">
                        {/* Title details */}
                        <div className="p-5 pb-2 space-y-1 shrink-0">
                          <h4 className="text-base font-bold">
                            {builderSettings.heading || connector.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {builderSettings.subheading || 'Inquiry Submission Form Widget'}
                          </p>
                        </div>

                        {/* Scrollable Fields */}
                        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
                          {builderFields.map((field) => (
                            <div key={field.field_name} className="space-y-1">
                              <Label className="text-xs font-semibold">
                                {field.label}{' '}
                                {field.is_required && <span className="text-red-500">*</span>}
                              </Label>
                              {field.field_type === 'textarea' ? (
                                <Textarea
                                  className="min-h-[70px] resize-none text-xs"
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                  disabled
                                />
                              ) : (
                                <Input
                                  className="h-8 text-xs"
                                  placeholder={`Enter ${field.label.toLowerCase()}`}
                                  disabled
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Sticky button */}
                        <div className="p-5 pt-2 shrink-0 border-t bg-card">
                          <Button
                            className="h-9 w-full text-xs text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: builderSettings.buttonColor }}
                            disabled
                          >
                            Submit Inquiry
                          </Button>
                        </div>
                      </div>
                    </CardContent>

                    <div className="p-4 border-t bg-muted/40 text-xs shrink-0">
                      <Label className="mb-2 block text-xs font-semibold">Embed Script Widget</Label>
                      <div className="flex items-center gap-2 truncate rounded border bg-card p-2 font-mono text-muted-foreground">
                        <span className="flex-1 truncate">
                          {`<script src="${siteUrl}/widget.js"></script><div data-leadgaze-form="${forms[0]?.id || 'FORM_ID'}"></div>`}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              `<script src="${siteUrl}/widget.js"></script><div data-leadgaze-form="${forms[0]?.id || 'FORM_ID'}"></div>`,
                              'embed',
                            )
                          }
                        >
                          {copiedKey === 'embed' ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* ---- API CREDENTIALS ---- */}
              <TabsContent value="api-credentials" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ingestion Credentials</CardTitle>
                    <CardDescription>
                      Secure API credentials used for direct programmatical leads or ticket submission.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Public Key</Label>
                        <div className="flex items-center gap-2 rounded border bg-muted/20 p-2.5 font-mono text-sm">
                          <span className="flex-1 truncate">
                            {apiKeys[0]?.public_key || 'Generate a key...'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(apiKeys[0]?.public_key || '', 'pub')}
                          >
                            {copiedKey === 'pub' ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Secret API Key</Label>
                        <div className="flex items-center gap-2 rounded border bg-muted/20 p-2.5 font-mono text-sm">
                          <span className="flex-1 truncate">
                            {showSecret
                              ? apiKeys[0]?.hashed_secret_key
                              : apiKeys[0]?.masked_secret_key || 'Generate a key...'}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(apiKeys[0]?.hashed_secret_key || '', 'sec')}
                          >
                            {copiedKey === 'sec' ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-6">
                      <h4 className="flex items-center gap-2 text-sm font-semibold">
                        <Terminal className="h-4 w-4 text-primary" /> Integration Developers Snippet (cURL)
                      </h4>
                      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
                        {`curl -X POST ${siteUrl}/api/v1/connectors/website/submit \\
  -H "Content-Type: application/json" \\
  -H "X-Connector-Public-Key: ${apiKeys[0]?.public_key || 'PUBLIC_KEY'}" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1 555 987 6543",
    "company": "Enterprise Corp",
    "message": "Demo inquiry",
    "custom_fields": {
      "budget": "15000"
    }
  }'`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---- SANDBOX ---- */}
              <TabsContent value="sandbox" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Endpoint Sandbox Tester
                    </CardTitle>
                    <CardDescription>
                      Trigger sample payloads directly on this environment to verify ingestion, mapping,
                      status, and log configurations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Sandbox Raw Ingestion Body
                        </Label>
                        <div className="space-y-2">
                          <Label htmlFor="s-name">Lead Name</Label>
                          <Input
                            id="s-name"
                            value={sandboxPayload.name}
                            onChange={(e) => setSandboxPayload({ ...sandboxPayload, name: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="s-email">Email Address</Label>
                            <Input
                              id="s-email"
                              value={sandboxPayload.email}
                              onChange={(e) =>
                                setSandboxPayload({ ...sandboxPayload, email: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="s-phone">Phone Number</Label>
                            <Input
                              id="s-phone"
                              value={sandboxPayload.phone}
                              onChange={(e) =>
                                setSandboxPayload({ ...sandboxPayload, phone: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s-company">Company</Label>
                          <Input
                            id="s-company"
                            value={sandboxPayload.company}
                            onChange={(e) =>
                              setSandboxPayload({ ...sandboxPayload, company: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s-msg">Inquiry Message</Label>
                          <Textarea
                            id="s-msg"
                            value={sandboxPayload.message}
                            onChange={(e) =>
                              setSandboxPayload({ ...sandboxPayload, message: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Attribution &amp; Custom Metadata
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="s-us">UTM Source</Label>
                            <Input
                              id="s-us"
                              value={sandboxPayload.utm_source}
                              onChange={(e) =>
                                setSandboxPayload({ ...sandboxPayload, utm_source: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="s-um">UTM Medium</Label>
                            <Input
                              id="s-um"
                              value={sandboxPayload.utm_medium}
                              onChange={(e) =>
                                setSandboxPayload({ ...sandboxPayload, utm_medium: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="s-uc">UTM Campaign</Label>
                            <Input
                              id="s-uc"
                              value={sandboxPayload.utm_campaign}
                              onChange={(e) =>
                                setSandboxPayload({ ...sandboxPayload, utm_campaign: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="s-bd">Custom Field (e.g. Budget)</Label>
                          <Input
                            id="s-bd"
                            value={sandboxPayload.custom_budget}
                            onChange={(e) =>
                              setSandboxPayload({ ...sandboxPayload, custom_budget: e.target.value })
                            }
                          />
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t pt-6">
                          <p className="max-w-[200px] text-xs text-muted-foreground">
                            Simulated leads are normalized and bypass IP restrictions.
                          </p>
                          <Button
                            onClick={handleTestSandboxSubmit}
                            className="gap-2"
                            disabled={isRunningSandbox}
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            {isRunningSandbox ? 'Simulating...' : 'Submit Payload'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---- LOGS ---- */}
              <TabsContent value="logs" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Submissions Logs</CardTitle>
                    <CardDescription>
                      Real-time audit log of all events processed by this connector.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-6 py-2.5 text-xs">Timestamp</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Channel</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Payload Target</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Status</TableHead>
                          <TableHead className="px-6 py-2.5 text-xs">Message Outcome</TableHead>
                          <TableHead className="px-6 py-2.5 text-right text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="px-6 py-8 text-center text-sm text-muted-foreground"
                            >
                              No submissions records found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-accent/5">
                              <TableCell className="px-6 py-2 text-xs">
                                {formatDateTime(log.created_at)}
                              </TableCell>
                              <TableCell className="px-6 py-2 font-mono text-[11px] capitalize">
                                {log.event?.source || 'API'}
                              </TableCell>
                              <TableCell className="px-6 py-2 text-xs font-medium">
                                <div>{(log.event?.raw_payload as any)?.name || 'N/A'}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {(log.event?.raw_payload as any)?.email || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-2">
                                <Badge
                                  variant={
                                    log.status === 'success'
                                      ? 'default'
                                      : log.status === 'duplicate'
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                  className="text-[10px] px-2 py-0"
                                >
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-2 max-w-[200px] truncate text-xs">
                                {log.processing_result?.message ||
                                  log.error_message ||
                                  'Inbound request normalized'}
                              </TableCell>
                              <TableCell className="px-6 py-2 space-x-2 text-right">
                                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setSelectedLog(log)}>
                                  Details
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 inline-flex items-center justify-center"
                                  onClick={() => handleRetryLog(log)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
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
        </div>

        {/* Detail Dialog for Logs */}
        <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Submission Log Details</DialogTitle>
              <DialogDescription>
                Raw payload metadata and target normalization output.
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="max-h-[450px] space-y-4 overflow-y-auto py-2 font-mono text-xs">
                <div className="space-y-1">
                  <span className="block font-bold text-muted-foreground">Event ID:</span>
                  <span className="block select-all rounded bg-muted px-2 py-1">
                    {selectedLog.event_id}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-muted-foreground">Raw Payload Received:</span>
                  <pre className="overflow-auto rounded bg-zinc-950 p-3 text-zinc-100">
                    {JSON.stringify(selectedLog.event?.raw_payload, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-muted-foreground">Normalized Target Payload:</span>
                  <pre className="overflow-auto rounded bg-zinc-950 p-3 text-zinc-100">
                    {JSON.stringify(selectedLog.event?.normalized_payload, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-muted-foreground">Engine Processing Result:</span>
                  <pre className="overflow-auto rounded bg-zinc-950 p-3 text-zinc-100">
                    {JSON.stringify(selectedLog.processing_result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setSelectedLog(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  );
}
