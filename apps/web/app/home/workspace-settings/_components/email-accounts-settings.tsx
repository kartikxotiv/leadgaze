'use client';

import { useState } from 'react';

import { useSearchParams } from 'next/navigation';

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

import { useUser } from '@kit/supabase/hooks/use-user';
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

import {
  type EmailAccount,
  type EmailAccountAccessScope,
  deleteEmailAccountService,
  getWorkspaceEmailAccountService,
  submitEmailAccountService,
  updateEmailAccountService,
} from '~/services/email.service';

import { EmailTemplatesTab } from '../../emails/_components/email-templates-tab';
import { EmailVariablesTab } from '../../emails/_components/email-variables-tab';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { useColumnResize } from '@kit/ui/use-column-resize';

type SmtpFormState = {
  email: string;
  from_name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  secure: boolean;
  imap_host: string;
  imap_port: string;
  imap_secure: boolean;
  access_scope: EmailAccountAccessScope;
};

const emptySmtpForm: SmtpFormState = {
  email: '',
  from_name: '',
  host: '',
  port: '465',
  username: '',
  password: '',
  secure: true,
  imap_host: '',
  imap_port: '993',
  imap_secure: true,
  access_scope: 'private',
};

export function EmailAccountsSettings({ workspace }: { workspace: any }) {
  const searchParams = useSearchParams();
  const { data: user } = useUser();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [connectTab, setConnectTab] = useState<'google' | 'smtp'>('google');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingAccountId, setUpdatingAccountId] = useState<number | null>(
    null,
  );
  const [form, setForm] = useState<SmtpFormState>(emptySmtpForm);
  const isAdmin = workspace?.role?.role_key === 'admin';
  const error = searchParams.get('error');

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('workspace-email-accounts-table');

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['workspace-email-accounts', workspace?.id],
    queryFn: () => getWorkspaceEmailAccountService(workspace.id),
    enabled: Boolean(workspace?.id),
  });

  const handleGoogleConnect = () => {
    if (!workspace?.id) return;

    const params = new URLSearchParams({
      workspace_id: workspace.id,
      from_name: workspace?.name ?? 'Leadgaze',
      access_scope: 'private',
      return_url: '/home/workspace-settings',
    });

    globalThis.location.href = `/api/email/google/auth?${params.toString()}`;
  };

  const handleSubmitSmtp = async () => {
    if (!workspace?.id) return;

    if (
      !form.email ||
      !form.from_name ||
      !form.host ||
      !form.port ||
      !form.username ||
      !form.password
    ) {
      toast.error('Please fill all required SMTP fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEmailAccountService(workspace.id, {
        ...form,
        port: Number(form.port),
        imap_port: form.imap_port ? Number(form.imap_port) : undefined,
        access_scope: isAdmin ? form.access_scope : 'private',
      });
      toast.success('Email account added successfully');
      setForm(emptySmtpForm);
      setConnectTab('google');
      setIsConnectDialogOpen(false);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (account: EmailAccount) => {
    setIsDeleting(true);
    try {
      await deleteEmailAccountService(String(account.id), workspace?.id || '');
      toast.success('Email account deleted successfully');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAccessChange = async (
    account: EmailAccount,
    accessScope: EmailAccountAccessScope,
  ) => {
    setUpdatingAccountId(account.id);
    try {
      await updateEmailAccountService({
        id: account.id,
        workspace_id: workspace.id,
        access_scope: accessScope,
      });
      toast.success('Email account access updated');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update access');
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleActiveChange = async (
    account: EmailAccount,
    isActive: boolean,
  ) => {
    setUpdatingAccountId(account.id);
    try {
      await updateEmailAccountService({
        id: account.id,
        workspace_id: workspace.id,
        is_active: isActive,
      });
      toast.success(`Email account ${isActive ? 'enabled' : 'disabled'}`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error === 'oauth_error' &&
              'There was an error connecting to Google.'}
            {error === 'missing_params' && 'Invalid response from Google.'}
            {error === 'auth_failed' && 'Authentication failed.'}
            {error === 'db_error' && 'Failed to save account details.'}
            {![
              'oauth_error',
              'missing_params',
              'auth_failed',
              'db_error',
            ].includes(error) && 'An unknown error occurred.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="mb-0">
          <TabsTrigger value="accounts">Email Accounts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <CardWidgetContainer title="Email Accounts" desc="Connect accounts to send emails from your workspace." icon2={<Dialog
                open={isConnectDialogOpen}
                onOpenChange={(open) => {
                  setIsConnectDialogOpen(open);
                  if (!open) setConnectTab('google');
                }}
              >
                <DialogTrigger asChild>
                  <Button className="h-9 w-9 p-0" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[500px] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex max-h-[90vh] flex-col">
                  <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
                    <DialogTitle>Connect Email Account</DialogTitle>
                  </DialogHeader>
                  <Tabs value={connectTab} onValueChange={(v) => setConnectTab(v as 'google' | 'smtp')} className="flex flex-1 flex-col overflow-hidden">
                    <div className="shrink-0 px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="google">Google / Gmail</TabsTrigger>
                      <TabsTrigger value="smtp">SMTP</TabsTrigger>
                    </TabsList>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                    <TabsContent value="google" className="space-y-4 pt-4">
                      <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        Connect your Gmail or Google Workspace account to send
                        emails directly.
                      </div>
                      <Button
                        onClick={handleGoogleConnect}
                        className="w-full text-leadgaze-dark dark:text-white"
                        variant="outline"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Connect with Google
                      </Button>
                    </TabsContent>
                    <TabsContent value="smtp" className="space-y-4 pt-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                        type="password"
                        value={form.password}
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
                      <div className="text-sm font-medium">IMAP Settings</div>
                      <div className="grid grid-cols-2 gap-4">
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
                              access_scope: EmailAccountAccessScope,
                            ) => setForm((prev) => ({ ...prev, access_scope }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
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
                  <DialogFooter className="border-t border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <Button
                      onClick={handleSubmitSmtp}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                    <TableHead className="relative" {...getHeaderProps('provider')}>
                      Provider
                      <span className="col-resize-handle" {...getResizeHandleProps('provider')} />
                    </TableHead>
                    <TableHead className="relative" {...getHeaderProps('email')}>
                      Email
                      <span className="col-resize-handle" {...getResizeHandleProps('email')} />
                    </TableHead>
                    <TableHead className="relative" {...getHeaderProps('owner')}>
                      Owner
                      <span className="col-resize-handle" {...getResizeHandleProps('owner')} />
                    </TableHead>
                    <TableHead className="relative" {...getHeaderProps('from_name')}>
                      From Name
                      <span className="col-resize-handle" {...getResizeHandleProps('from_name')} />
                    </TableHead>
                    <TableHead className="relative" {...getHeaderProps('access')}>
                      Access
                      <span className="col-resize-handle" {...getResizeHandleProps('access')} />
                    </TableHead>
                    <TableHead className="relative" {...getHeaderProps('status')}>
                      Status
                      <span className="col-resize-handle" {...getResizeHandleProps('status')} />
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[32px] px-4 py-2" colSpan={6}>
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
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        No email accounts connected yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account: EmailAccount) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge
                            variant={
                              account.provider === 'google'
                                ? 'secondary'
                                : 'outline'
                            }                            
                          >
                            {account.provider === 'google' ? 'Google' : 'SMTP'}
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
                          {isAdmin ? (
                            <Select
                              value={account.access_scope}
                              onValueChange={(value: EmailAccountAccessScope) =>
                                handleAccessChange(account, value)
                              }
                              disabled={updatingAccountId === account.id}
                            >
                              <SelectTrigger className="w-[170px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="workspace">
                                  Workspace
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <AccessBadge accessScope={account.access_scope} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              account.is_active ? 'default' : 'secondary'
                            }
                            onClick={() => {
                              if (
                                !account.can_manage ||
                                updatingAccountId === account.id
                              )
                                return;
                              handleActiveChange(account, !account.is_active);
                            }}
                            className={
                              account.can_manage ? 'cursor-pointer' : ''
                            }
                          >
                            {updatingAccountId === account.id
                              ? 'Updating...'
                              : account.is_active
                                ? 'Active'
                                : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {account.can_manage ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="text-muted-foreground h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Email Account
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{' '}
                                    <strong>{account.email}</strong>? This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                              {account.owner_user_id === user?.id
                                ? 'Owner'
                                : 'View only'}
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

        <TabsContent value="templates">
          <EmailTemplatesTab />
        </TabsContent>

        <TabsContent value="variables">
          <EmailVariablesTab />
        </TabsContent>
      </Tabs>
    </div>
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

function AccessBadge({
  accessScope,
}: {
  accessScope: EmailAccountAccessScope;
}) {
  if (accessScope === 'workspace') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Globe2 className="h-3 w-3" />
        Workspace
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Lock className="h-3 w-3" />
      Private
    </Badge>
  );
}
