'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Globe2,
  Loader2,
  Lock,
  Mail,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from '@kit/ui/separator';
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

import type {
  CoreEmailAccount,
  CoreEmailAccountAccessScope,
} from '../../services/email-accounts.service';
import {
  createCoreSmtpAccountService,
  deleteCoreEmailAccountService,
  getCoreEmailAccountsService,
  updateCoreEmailAccountService,
} from '../../services/email-accounts.service';
import { CoreEmailTemplatesTab } from './templates-tab';
import type { CoreEmailPageProps } from './types';
import { CoreEmailVariablesTab } from './variables-tab';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

type SmtpFormState = {
  email: string;
  from_name: string;
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  imap_host: string;
  imap_port: string;
  imap_secure: boolean;
  access_scope: CoreEmailAccountAccessScope;
};

const emptySmtpForm: SmtpFormState = {
  email: '',
  from_name: '',
  host: '',
  port: '465',
  secure: true,
  username: '',
  password: '',
  imap_host: '',
  imap_port: '993',
  imap_secure: true,
  access_scope: 'private',
};

export function CoreEmailSettingsPage({
  workspace,
  permissions,
  googleAuthPath = '/api/core/email-google/auth',
  googleReturnUrl = '/home/core/email-settings',
  embedded = false,
}: CoreEmailPageProps) {
  const workspaceId = workspace?.id;
  const isAdmin = workspace?.role?.role_key === 'admin';
  const canManageAccounts = permissions?.manageAccounts ?? true;
  const canManageTemplates = permissions?.manageTemplates ?? true;
  const canManageVariables = permissions?.manageVariables ?? true;
  const settingsTabs = [
    { value: 'accounts', label: 'Email Accounts', allowed: canManageAccounts },
    { value: 'templates', label: 'Templates', allowed: canManageTemplates },
    { value: 'variables', label: 'Variables', allowed: canManageVariables },
  ].filter((tab) => tab.allowed);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [updatingAccountId, setUpdatingAccountId] = useState<number | null>(
    null,
  );
  const [form, setForm] = useState<SmtpFormState>(emptySmtpForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectTab, setConnectTab] = useState<'google' | 'smtp'>('google');

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('core-email-accounts-table');

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['core-email-accounts', workspaceId],
    queryFn: () => getCoreEmailAccountsService(workspaceId || ''),
    enabled: Boolean(workspaceId),
  });

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<CoreEmailAccount>(
    'core-email-accounts-table',
    accounts
  );

  const handleGoogleConnect = () => {
    if (!workspaceId) return;

    const params = new URLSearchParams({
      workspace_id: workspaceId,
      from_name: workspace?.name ?? 'Leadgaze',
      access_scope: 'private',
      return_url: googleReturnUrl,
      source: 'core',
    });

    globalThis.location.href = `${googleAuthPath}?${params.toString()}`;
  };

  const handleSubmitSmtp = async () => {
    if (!workspaceId) return;

    if (
      !form.email ||
      !form.from_name ||
      !form.host ||
      !form.port ||
      !form.username ||
      !form.password
    ) {
      toast.error('Please fill in all required SMTP fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCoreSmtpAccountService(workspaceId, {
        ...form,
        port: Number(form.port),
        imap_port: form.imap_port ? Number(form.imap_port) : undefined,
        access_scope: isAdmin ? form.access_scope : 'private',
      });
      toast.success('Email account connected');
      setForm(emptySmtpForm);
      setConnectTab('google');
      setIsConnectDialogOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccessChange = async (
    account: CoreEmailAccount,
    accessScope: CoreEmailAccountAccessScope,
  ) => {
    if (!workspaceId) return;
    setUpdatingAccountId(account.id);
    try {
      await updateCoreEmailAccountService({
        id: account.id,
        workspace_id: workspaceId,
        access_scope: accessScope,
      });
      toast.success('Account access updated');
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update account');
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleActiveChange = async (
    account: CoreEmailAccount,
    isActive: boolean,
  ) => {
    if (!workspaceId) return;
    setUpdatingAccountId(account.id);
    try {
      await updateCoreEmailAccountService({
        id: account.id,
        workspace_id: workspaceId,
        is_active: isActive,
      });
      toast.success(`Email account ${isActive ? 'enabled' : 'disabled'}`);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update account');
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleSyncEnabledChange = async (
    account: CoreEmailAccount,
    isSyncEnabled: boolean,
  ) => {
    if (!workspaceId) return;
    setUpdatingAccountId(account.id);
    try {
      await updateCoreEmailAccountService({
        id: account.id,
        workspace_id: workspaceId,
        is_sync_enabled: isSyncEnabled,
      });
      toast.success(`Email sync ${isSyncEnabled ? 'enabled' : 'disabled'}`);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update sync status');
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleDelete = async (account: CoreEmailAccount) => {
    if (!workspaceId) return;
    try {
      await deleteCoreEmailAccountService(account.id, workspaceId);
      toast.success('Email account deleted');
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    }
  };

  const BodyComponent = embedded ? 'div' : PageBody;

  return (
    <>
      {!embedded ? (
        <PageHeader
          title="Email Configuration"
          description="Connect shared Core email accounts for sending, inbox sync, and module-level replies."
        />
      ) : null}
      <BodyComponent className={embedded ? "flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col" : "grid gap-6"}>
        {!workspaceId ? (
          <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            Select a workspace to configure email.
          </div>
        ) : settingsTabs.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission required</AlertTitle>
            <AlertDescription>
              You do not have permission to manage email settings.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue={settingsTabs[0]!.value} className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col space-y-6">
            <TabsList className="mb-0 shrink-0 w-fit self-start">
              {settingsTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {canManageAccounts ? (
              <TabsContent
                value="accounts"
                className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
              >
                <CardWidgetContainer
                  className="flex-1 min-h-0"
                  headerClassName="p-2 xl:p-2 2xl:p-2"
                  title="Email Accounts"
                  desc="Connect Gmail or SMTP/IMAP accounts for Core email." icon2={<Dialog
                      open={isConnectDialogOpen}
                      onOpenChange={(open) => {
                        setIsConnectDialogOpen(open);
                        if (!open) setConnectTab('google');
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2">
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[540px] dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex max-h-[90vh] flex-col">
                        <DialogHeader>
                          <DialogTitle>Connect Email Account</DialogTitle>
                        </DialogHeader>
                        <Tabs value={connectTab} onValueChange={(v) => setConnectTab(v as 'google' | 'smtp')} className="flex flex-1 flex-col overflow-hidden">
                          <div className="shrink-0 p-2">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="google">
                              Google / Gmail
                            </TabsTrigger>
                            <TabsTrigger value="smtp">SMTP / IMAP</TabsTrigger>
                          </TabsList>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 pt-0">
                          <TabsContent
                            value="google"
                            className="space-y-2 pt-0 mt-0"
                          >
                            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                              Connect Gmail or Google Workspace for sending and
                              inbox sync.
                            </div>
                            <Button
                              onClick={handleGoogleConnect}
                              className="w-full secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2"
                              variant="outline"
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Connect with Google
                            </Button>
                          </TabsContent>
                          <TabsContent value="smtp" className="space-y-2 pt-0 mt-0">
                            <SmtpField
                              label="From Name"
                              value={form.from_name}
                              onChange={(from_name) =>
                                setForm((prev) => ({ ...prev, from_name }))
                              }
                            />
                            <SmtpField
                              label="Email Address"
                              value={form.email}
                              onChange={(email) =>
                                setForm((prev) => ({ ...prev, email }))
                              }
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <SmtpField
                                label="SMTP Host"
                                value={form.host}
                                onChange={(host) =>
                                  setForm((prev) => ({ ...prev, host }))
                                }
                              />
                              <SmtpField
                                label="SMTP Port"
                                value={form.port}
                                onChange={(port) =>
                                  setForm((prev) => ({ ...prev, port }))
                                }
                              />
                            </div>
                            <SmtpField
                              label="Username"
                              value={form.username}
                              onChange={(username) =>
                                setForm((prev) => ({ ...prev, username }))
                              }
                            />
                            <SmtpField
                              label="Password"
                              value={form.password}
                              type="password"
                              onChange={(password) =>
                                setForm((prev) => ({ ...prev, password }))
                              }
                            />
                            <CheckboxField
                              label="Use SSL/TLS for SMTP"
                              checked={form.secure}
                              onChange={(secure) =>
                                setForm((prev) => ({ ...prev, secure }))
                              }
                            />

                            <Separator />
                            <div className="text-sm font-medium">
                              IMAP Settings for Inbox Sync
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <SmtpField
                                label="IMAP Host"
                                value={form.imap_host}
                                onChange={(imap_host) =>
                                  setForm((prev) => ({ ...prev, imap_host }))
                                }
                              />
                              <SmtpField
                                label="IMAP Port"
                                value={form.imap_port}
                                onChange={(imap_port) =>
                                  setForm((prev) => ({ ...prev, imap_port }))
                                }
                              />
                            </div>
                            <CheckboxField
                              label="Use SSL/TLS for IMAP"
                              checked={form.imap_secure}
                              onChange={(imap_secure) =>
                                setForm((prev) => ({ ...prev, imap_secure }))
                              }
                            />
                            {isAdmin ? (
                              <div className="space-y-2">
                                <Label>Sharing</Label>
                                <Select
                                  value={form.access_scope}
                                  onValueChange={(
                                    value: CoreEmailAccountAccessScope,
                                  ) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      access_scope: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="private">
                                      Private
                                    </SelectItem>
                                    <SelectItem value="workspace">
                                      Workspace
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : null}
                           </TabsContent>
                          </div>
                        </Tabs>
                        {connectTab === 'smtp' ? (
                        <DialogFooter>
                          <Button
                            onClick={handleSubmitSmtp}
                            disabled={isSubmitting}                            
                            className="gap-1.5 px-2"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            Connect SMTP Account
                          </Button>
                        </DialogFooter>
                        ) : null}
                        </div>
                      </DialogContent>
                    </Dialog>}>
                  <div className='mb-2'>                  
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableTableHead
                            label="Provider"
                            columnId="provider"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('provider')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('provider')} />
                          </SortableTableHead>
                          <SortableTableHead
                            label="Email"
                            columnId="email"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('email')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('email')} />
                          </SortableTableHead>
                          <SortableTableHead
                            label="Owner"
                            columnId="owner"
                            sortKey="owner.name"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('owner')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('owner')} />
                          </SortableTableHead>
                          <SortableTableHead
                            label="From Name"
                            columnId="from_name"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('from_name')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('from_name')} />
                          </SortableTableHead>
                          <SortableTableHead
                            label="Access"
                            columnId="access"
                            sortKey="access_scope"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('access')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('access')} />
                          </SortableTableHead>
                          <SortableTableHead
                            label="Status"
                            columnId="status"
                            sortKey="is_active"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('status')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('status')} />
                          </SortableTableHead>
                          <SortableTableHead
                            label="Sync"
                            columnId="sync"
                            sortKey="is_sync_enabled"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative"
                            {...getHeaderProps('sync')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('sync')} />
                          </SortableTableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          [...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                              <TableCell className="h-[32px] px-4 py-2" colSpan={7}>
                                <Skeleton className="h-7 w-full" />
                              </TableCell>
                              <TableCell className="bg-card px-4 text-right">
                                <Skeleton className="h-7 ml-auto w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : accounts.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-muted-foreground py-8 text-center"
                            >
                              No email accounts connected.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedData.map((account: CoreEmailAccount) => (
                            <TableRow key={account.id}>
                              <TableCell>
                                <Badge
                                  className="text-leadgaze-dark dark:text-white"
                                  variant={
                                    account.provider === 'google'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                >
                                  {account.provider}
                                </Badge>
                              </TableCell>
                              <TableCell>{account.email}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>
                                    {account.owner?.name ||
                                      account.owner?.email ||
                                      'Unknown owner'}
                                  </span>
                                  {account.owner?.email ? (
                                    <span className="text-muted-foreground text-xs">
                                      {account.owner.email}
                                    </span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>{account.from_name || '-'}</TableCell>
                              <TableCell>
                                {isAdmin || account.can_manage ? (
                                  <Select
                                    value={account.access_scope}
                                    disabled={updatingAccountId === account.id}
                                    onValueChange={(
                                      value: CoreEmailAccountAccessScope,
                                    ) => handleAccessChange(account, value)}
                                  >
                                    <SelectTrigger className="w-[160px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="private">
                                        Private
                                      </SelectItem>
                                      <SelectItem value="workspace">
                                        Workspace
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge                                  
                                    variant={
                                      account.access_scope === 'workspace'
                                        ? 'secondary'
                                        : 'outline'
                                    }
                                    className="gap-1 text-leadgaze-dark dark:text-white"
                                  >
                                    {account.access_scope === 'workspace' ? (
                                      <Globe2 className="h-3 w-3" />
                                    ) : (
                                      <Lock className="h-3 w-3" />
                                    )}
                                    {account.access_scope}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    account.is_active ? 'default' : 'secondary'
                                  }
                                  className={
                                    account.can_manage ? 'cursor-pointer' : ''
                                  }
                                  onClick={() =>
                                    account.can_manage &&
                                    handleActiveChange(
                                      account,
                                      !account.is_active,
                                    )
                                  }
                                >
                                  {updatingAccountId === account.id
                                    ? 'Updating...'
                                    : account.is_active
                                      ? 'Active'
                                      : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    account.is_sync_enabled
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className={
                                    account.can_manage ? 'cursor-pointer' : ''
                                  }
                                  onClick={() =>
                                    account.can_manage &&
                                    handleSyncEnabledChange(
                                      account,
                                      !account.is_sync_enabled,
                                    )
                                  }
                                >
                                  {updatingAccountId === account.id
                                    ? 'Updating...'
                                    : account.is_sync_enabled
                                      ? 'Enabled'
                                      : 'Disabled'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {account.can_manage ? (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="text-muted-foreground h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Email Account
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Delete{' '}
                                          <strong>{account.email}</strong>? This
                                          action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(account)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    View only
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  </CardWidgetContainer>
              </TabsContent>
            ) : null}

            {canManageTemplates ? (
              <TabsContent
                value="templates"
                className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
              >
                <CoreEmailTemplatesTab workspaceId={workspaceId} />
              </TabsContent>
            ) : null}

            {canManageVariables ? (
              <TabsContent
                value="variables"
                className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
              >
                <CoreEmailVariablesTab workspaceId={workspaceId} />
              </TabsContent>
            ) : null}
          </Tabs>
        )}
      </BodyComponent>
    </>
  );
}

function SmtpField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-gray-300"
      />
      {label}
    </label>
  );
}
