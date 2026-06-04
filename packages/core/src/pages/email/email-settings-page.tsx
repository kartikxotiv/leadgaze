'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Globe2, Loader2, Lock, Mail, Plus, Trash2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import type { CoreEmailAccount, CoreEmailAccountAccessScope } from '../../services/email-accounts.service';
import {
  createCoreSmtpAccountService,
  deleteCoreEmailAccountService,
  getCoreEmailAccountsService,
  updateCoreEmailAccountService,
} from '../../services/email-accounts.service';
import type { CoreEmailPageProps } from './types';

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
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [updatingAccountId, setUpdatingAccountId] = useState<number | null>(null);
  const [form, setForm] = useState<SmtpFormState>(emptySmtpForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['core-email-accounts', workspaceId],
    queryFn: () => getCoreEmailAccountsService(workspaceId || ''),
    enabled: Boolean(workspaceId),
  });

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

    if (!form.email || !form.from_name || !form.host || !form.port || !form.username || !form.password) {
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
      setIsConnectDialogOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccessChange = async (account: CoreEmailAccount, accessScope: CoreEmailAccountAccessScope) => {
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

  const handleActiveChange = async (account: CoreEmailAccount, isActive: boolean) => {
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
      <BodyComponent className="grid gap-6">
        {!workspaceId ? (
          <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            Select a workspace to configure email.
          </div>
        ) : !canManageAccounts ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission required</AlertTitle>
            <AlertDescription>You do not have permission to manage email accounts.</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Accounts</CardTitle>
                <CardDescription>Connect Gmail or SMTP/IMAP accounts for Core email.</CardDescription>
              </div>
              <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[540px]">
                  <DialogHeader>
                    <DialogTitle>Connect Email Account</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="google">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="google">Google / Gmail</TabsTrigger>
                      <TabsTrigger value="smtp">SMTP / IMAP</TabsTrigger>
                    </TabsList>
                    <TabsContent value="google" className="space-y-4 pt-4">
                      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        Connect Gmail or Google Workspace for sending and inbox sync.
                      </div>
                      <Button onClick={handleGoogleConnect} className="w-full" variant="outline">
                        <Mail className="mr-2 h-4 w-4" />
                        Connect with Google
                      </Button>
                    </TabsContent>
                    <TabsContent value="smtp" className="space-y-4 pt-4">
                      <SmtpField label="From Name" value={form.from_name} onChange={(from_name) => setForm((prev) => ({ ...prev, from_name }))} />
                      <SmtpField label="Email Address" value={form.email} onChange={(email) => setForm((prev) => ({ ...prev, email }))} />
                      <div className="grid grid-cols-2 gap-4">
                        <SmtpField label="SMTP Host" value={form.host} onChange={(host) => setForm((prev) => ({ ...prev, host }))} />
                        <SmtpField label="SMTP Port" value={form.port} onChange={(port) => setForm((prev) => ({ ...prev, port }))} />
                      </div>
                      <SmtpField label="Username" value={form.username} onChange={(username) => setForm((prev) => ({ ...prev, username }))} />
                      <SmtpField label="Password" value={form.password} type="password" onChange={(password) => setForm((prev) => ({ ...prev, password }))} />
                      <CheckboxField label="Use SSL/TLS for SMTP" checked={form.secure} onChange={(secure) => setForm((prev) => ({ ...prev, secure }))} />

                      <Separator />
                      <div className="text-sm font-medium">IMAP Settings for Inbox Sync</div>
                      <div className="grid grid-cols-2 gap-4">
                        <SmtpField label="IMAP Host" value={form.imap_host} onChange={(imap_host) => setForm((prev) => ({ ...prev, imap_host }))} />
                        <SmtpField label="IMAP Port" value={form.imap_port} onChange={(imap_port) => setForm((prev) => ({ ...prev, imap_port }))} />
                      </div>
                      <CheckboxField label="Use SSL/TLS for IMAP" checked={form.imap_secure} onChange={(imap_secure) => setForm((prev) => ({ ...prev, imap_secure }))} />
                      {isAdmin ? (
                        <div className="space-y-2">
                          <Label>Sharing</Label>
                          <Select value={form.access_scope} onValueChange={(value: CoreEmailAccountAccessScope) => setForm((prev) => ({ ...prev, access_scope: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="workspace">Workspace</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      <Button onClick={handleSubmitSmtp} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Connect SMTP Account
                      </Button>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>From Name</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center">Loading accounts...</TableCell></TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-muted-foreground py-8 text-center">No email accounts connected.</TableCell></TableRow>
                  ) : (
                    accounts.map((account: CoreEmailAccount) => (
                      <TableRow key={account.id}>
                        <TableCell><Badge variant={account.provider === 'google' ? 'secondary' : 'outline'}>{account.provider}</Badge></TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{account.owner?.name || account.owner?.email || 'Unknown owner'}</span>
                            {account.owner?.email ? <span className="text-muted-foreground text-xs">{account.owner.email}</span> : null}
                          </div>
                        </TableCell>
                        <TableCell>{account.from_name || '-'}</TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Select value={account.access_scope} disabled={updatingAccountId === account.id} onValueChange={(value: CoreEmailAccountAccessScope) => handleAccessChange(account, value)}>
                              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="private">Private</SelectItem>
                                <SelectItem value="workspace">Workspace</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={account.access_scope === 'workspace' ? 'secondary' : 'outline'} className="gap-1">
                              {account.access_scope === 'workspace' ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                              {account.access_scope}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={account.is_active ? 'default' : 'secondary'}
                            className={account.can_manage ? 'cursor-pointer' : ''}
                            onClick={() => account.can_manage && handleActiveChange(account, !account.is_active)}
                          >
                            {updatingAccountId === account.id ? 'Updating...' : account.is_active ? 'Active' : 'Inactive'}
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
                                  <AlertDialogTitle>Delete Email Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete <strong>{account.email}</strong>? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(account)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="text-muted-foreground text-xs">View only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
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
