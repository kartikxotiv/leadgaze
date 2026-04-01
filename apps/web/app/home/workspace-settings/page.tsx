/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Plus, Trash2, Check, AlertCircle, Loader2, Building2, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Badge } from '@kit/ui/badge';
// import { useToast } from '@kit/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Switch } from '@kit/ui/switch';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { deleteEmailAccountService, getWorkspaceEmailAccountService, submitEmailAccountService } from '~/services/email.service';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';

const smtpSchema = z.object({
  email: z.string().email(),
  from_name: z.string().min(1, 'From Name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().positive(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  secure: z.boolean(),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

function WorkspaceManagement({ currentWorkspace }: { currentWorkspace: any }) {
  const { data: user } = useUser();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(
            `
            workspace_id,
            workspaces (
              id,
              name
            )
          `,
          )
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (error) throw error;

        const uniqueWorkspaces = Array.from(
          new Map(
            data?.map((item: any) => [
              item.workspaces.id,
              {
                id: item.workspaces.id,
                name: item.workspaces.name,
              },
            ]),
          ).values(),
        );

        setWorkspaces(uniqueWorkspaces);
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user?.id]);

  const handleWorkspaceChange = (workspaceId: string) => {
    localStorage.setItem('selectedWorkspace', workspaceId);
    router.refresh();
  };

  if (!currentWorkspace) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Management</CardTitle>
        <CardDescription>
          Select and manage your active workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[300px] justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {currentWorkspace.name}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className="cursor-pointer gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkspaceSettingsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const searchParams = useSearchParams();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const error = searchParams.get('error');

  const {
    data: workspaceEmailAccount,
    isLoading: workspaceEmailAccountLoading,
    refetch: workspaceEmailAccountRefetch,
  } = useQuery({
    queryKey: ['workspace_id', workspace?.id],
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
      },
    });

    const onSubmit = async (data: SmtpFormValues) => {
      if (!workspace?.id) return;
      setIsSubmitting(true);
      try {
        await submitEmailAccountService(workspace?.id || '', data)
        toast.success('Email account added successfully');
        setIsConnectDialogOpen(false);
        workspaceEmailAccountRefetch();
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
            <Input {...form.register('from_name')} placeholder="My Company Support" />
            {form.formState.errors.from_name && <p className="text-destructive text-xs">{form.formState.errors.from_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input {...form.register('email')} placeholder="support@company.com" />
            {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input {...form.register('host')} placeholder="smtp.example.com" />
            {form.formState.errors.host && <p className="text-destructive text-xs">{form.formState.errors.host.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input {...form.register('port')} type="number" />
            {form.formState.errors.port && <p className="text-destructive text-xs">{form.formState.errors.port.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input {...form.register('username')} />
            {form.formState.errors.username && <p className="text-destructive text-xs">{form.formState.errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input {...form.register('password')} type="password" />
            {form.formState.errors.password && <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="secure" {...form.register('secure')} className="rounded border-gray-300" />
          <Label htmlFor="secure">Use SSL/TLS (Secure)</Label>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Connect SMTP Account
        </Button>
      </form>
    );
  };

  const handleGoogleConnect = () => {
    if (!workspace?.id) return;
    globalThis.location.href = `/api/email/google/auth?workspace_id=${workspace.id}&from_name=${workspace?.name ?? 'Leadgaze'}`;
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

  return (
    <>
      <PageHeader
        title="Workspace Settings"
        description="Manage your email sending configurations."
      />
      <PageBody>
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error === 'oauth_error' && 'There was an error connecting to Google.'}
                {error === 'missing_params' && 'Invalid response from Google.'}
                {error === 'auth_failed' && 'Authentication failed.'}
                {error === 'db_error' && 'Failed to save account details.'}
                {!['oauth_error', 'missing_params', 'auth_failed', 'db_error'].includes(error) && 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          )}

          <WorkspaceManagement currentWorkspace={workspace} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Accounts</CardTitle>
                <CardDescription>
                  Connect accounts to send emails from your workspace.
                </CardDescription>
              </div>
              <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                {/* <DialogTrigger asChild>
                  <Button disabled={!workspace}>
                    <Plus className="mr-2 h-4 w-4" />
                    Connect Account
                  </Button>
                </DialogTrigger> */}
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
                      <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm mb-4">
                        Connect your Gmail or Google Workspace account to send emails directly.
                      </div>
                      <Button onClick={handleGoogleConnect} className="w-full" variant="outline">
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
                    <TableHead>From Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaceEmailAccountLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading accounts...
                      </TableCell>
                    </TableRow>
                  ) : workspaceEmailAccount?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No email accounts connected yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    workspaceEmailAccount?.map((account: { id: string, provider: string, email: string, from_name: string, is_active: boolean }) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant={account.provider === 'google' ? 'secondary' : 'outline'}>
                            {account.provider === 'google' ? 'Google' : 'SMTP'}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>{account.from_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isDeleting}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Email Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{account.email}</strong>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(account.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}