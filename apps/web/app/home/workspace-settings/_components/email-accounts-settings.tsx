'use client';

import { useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';

import {
  EmailAccount,
  deleteEmailAccountService,
  getWorkspaceEmailAccountService,
  submitEmailAccountService,
  updateEmailAccountService,
} from '~/services/email.service';

const smtpSchema = z.object({
  email: z.string().email(),
  from_name: z.string().min(1, 'From Name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().positive(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  secure: z.boolean(),
  imap_host: z.string().optional(),
  imap_port: z.coerce.number().int().positive().optional(),
  imap_secure: z.boolean().optional(),
  access_scope: z.enum(['private', 'workspace']),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

export function EmailAccountsSettings({ workspace }: { workspace: any }) {
  const searchParams = useSearchParams();
  const { data: user } = useUser();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingAccountId, setUpdatingAccountId] = useState<number | null>(
    null,
  );
  const isAdmin = workspace?.role?.role_key === 'admin';

  const error = searchParams.get('error');

  const {
    data: workspaceEmailAccount,
    isLoading: workspaceEmailAccountLoading,
    refetch: workspaceEmailAccountRefetch,
  } = useQuery({
    queryKey: ['workspace-email-accounts', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) throw new Error('Workspace ID is required');
      return getWorkspaceEmailAccountService(workspace.id);
    },
    enabled: !!workspace?.id,
  });

  const SmtpForm = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<SmtpFormValues>({
      resolver: zodResolver(smtpSchema),
      defaultValues: {
        secure: true,
        port: 465,
        imap_secure: true,
        imap_port: 993,
        access_scope: 'private',
      },
    });

    const onSubmit = async (data: SmtpFormValues) => {
      if (!workspace?.id) return;

      setIsSubmitting(true);
      try {
        await submitEmailAccountService(workspace.id, data);
        toast.success('Email account added successfully');
        setIsConnectDialogOpen(false);
        await workspaceEmailAccountRefetch();
      } catch (err: any) {
        console.error('Failed to add account:', err);
        toast.error(err.message || 'Failed to add account');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From Name</Label>
            <Input
              {...form.register('from_name')}
              placeholder="My Company Support"
            />
            {form.formState.errors.from_name ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.from_name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              {...form.register('email')}
              placeholder="support@company.com"
            />
            {form.formState.errors.email ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input {...form.register('host')} placeholder="smtp.example.com" />
            {form.formState.errors.host ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.host.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input {...form.register('port')} type="number" />
            {form.formState.errors.port ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.port.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input {...form.register('username')} />
            {form.formState.errors.username ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.username.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input {...form.register('password')} type="password" />
            {form.formState.errors.password ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="secure"
            {...form.register('secure')}
            className="rounded border-gray-300"
          />
          <Label htmlFor="secure">Use SSL/TLS for SMTP (Secure)</Label>
        </div>

        <Separator className="my-4" />
        <div className="text-sm font-medium">
          IMAP Settings (For fetching emails)
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>IMAP Host</Label>
            <Input
              {...form.register('imap_host')}
              placeholder="imap.example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>IMAP Port</Label>
            <Input
              {...form.register('imap_port')}
              type="number"
              placeholder="993"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="imap_secure"
            {...form.register('imap_secure')}
            className="rounded border-gray-300"
          />
          <Label htmlFor="imap_secure">Use SSL/TLS for IMAP (Secure)</Label>
        </div>

        {isAdmin ? (
          <div className="space-y-2">
            <Label>Sharing</Label>
            <Select
              defaultValue={form.getValues('access_scope')}
              onValueChange={(value: 'private' | 'workspace') =>
                form.setValue('access_scope', value, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  Private: only owner and admins can send
                </SelectItem>
                <SelectItem value="workspace">
                  Workspace: all workspace members can send
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Connect SMTP Account
        </Button>
      </form>
    );
  };

  const handleGoogleConnect = () => {
    if (!workspace?.id) return;

    globalThis.location.href = `/api/email/google/auth?workspace_id=${workspace.id}&from_name=${workspace?.name ?? 'Leadgaze'}&access_scope=private`;
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteEmailAccountService(id, workspace?.id || '');
      toast.success('Email account deleted successfully');
      await workspaceEmailAccountRefetch();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAccessChange = async (
    account: EmailAccount,
    accessScope: 'private' | 'workspace',
  ) => {
    setUpdatingAccountId(account.id);
    try {
      await updateEmailAccountService({
        id: account.id,
        workspace_id: workspace.id,
        access_scope: accessScope,
      });
      toast.success('Email account access updated');
      await workspaceEmailAccountRefetch();
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
      await workspaceEmailAccountRefetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const renderAccessBadge = (account: EmailAccount) => {
    if (account.access_scope === 'workspace') {
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Email Accounts</CardTitle>
            <CardDescription>
              Connect accounts to send emails from your workspace.
            </CardDescription>
          </div>
          <Dialog
            open={isConnectDialogOpen}
            onOpenChange={setIsConnectDialogOpen}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    className="h-8 w-8 bg-white p-0 text-black dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Connect Account</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Connect Email Account</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="google" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="google">Google / Gmail</TabsTrigger>
                  <TabsTrigger value="smtp">SMTP</TabsTrigger>
                </TabsList>
                <TabsContent value="google" className="space-y-4 pt-4">
                  <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                    Connect your Gmail or Google Workspace account to send
                    emails directly.
                  </div>
                  <Button
                    onClick={handleGoogleConnect}
                    className="w-full"
                    variant="outline"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Connect with Google
                  </Button>
                </TabsContent>
                <TabsContent value="smtp">
                  <SmtpForm />
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
              {workspaceEmailAccountLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Loading accounts...
                  </TableCell>
                </TableRow>
              ) : workspaceEmailAccount?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No email accounts connected yet.
                  </TableCell>
                </TableRow>
              ) : (
                workspaceEmailAccount?.map((account: EmailAccount) => (
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
                          onValueChange={(value: 'private' | 'workspace') =>
                            handleAccessChange(account, value)
                          }
                          disabled={updatingAccountId === account.id}
                        >
                          <SelectTrigger className="w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="workspace">Workspace</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        renderAccessBadge(account)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant={account.is_active ? 'default' : 'secondary'}
                          onClick={() => {
                            if (!account.can_manage) return;
                            if (updatingAccountId === account.id) return;
                            handleActiveChange(account, !account.is_active);
                          }}
                          className="cursor-pointer"
                        >
                          {updatingAccountId === account.id
                            ? 'Updating...'
                            : account.is_active
                              ? 'Active'
                              : 'Inactive'}
                        </Badge>
                        {/* {account.can_manage ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground h-7 justify-start px-0 text-xs"
                            disabled={updatingAccountId === account.id}
                            onClick={() =>
                              handleActiveChange(account, !account.is_active)
                            }
                          >
                            {updatingAccountId === account.id
                              ? 'Updating...'
                              : account.is_active
                                ? 'Disable'
                                : 'Enable'}
                          </Button>
                        ) : null} */}
                      </div>
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
                                <strong>{account.email}</strong>? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(String(account.id))}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </CardContent>
      </Card>
    </div>
  );
}
