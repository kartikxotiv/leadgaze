'use client';

import { useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Clock,
  CreditCard,
  Edit2,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { getWorkspaceSubscriptionService } from '@kit/core/services';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import { getRolesService } from '~/services/roles.service';
import {
  type WorkspaceMember,
  getMembersService,
  removeMemberService,
  resendInvitationService,
} from '~/services/team-members.service';

import { InviteMemberDialog } from './components/invite-member-dialog';
import { UpdateMemberDialog } from './components/update-member-dialog';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { cn } from '@kit/ui/utils';

function TeamMembersPageSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2 overflow-hidden">
        <div className="bg-sidebar flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="-mt-1 w-full overflow-x-auto px-6 pb-7">
          <div className="-mb-3 flex items-center gap-3">
            <Skeleton className="h-10 w-52 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-52 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 pb-6 lg:px-8">
        <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
          <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
            <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead className="sticky right-0 px-4 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="h-[52px] px-4 py-2" colSpan={6}>
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TeamMembersPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace, canAccess } = useRBAC();
  const pathname = usePathname();
  const productKey = getModuleKeyFromPath(pathname);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<WorkspaceMember | null>(
    null,
  );
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  // Fetch workspace subscription status for seat capacity
  const { data: subscriptionData } = useQuery({
    queryKey: ['workspace-subscription', currentWorkspace?.id],
    queryFn: () => getWorkspaceSubscriptionService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  const currentModule = useMemo(() => {
    return subscriptionData?.enabled_modules?.find(
      (m) => m.module_key === productKey,
    );
  }, [subscriptionData, productKey]);

  const columns = useMemo(
    () => [
      { id: 'member', label: 'Member' },
      { id: 'email', label: 'Email' },
      { id: 'role', label: 'Role' },
      { id: 'status', label: 'Status' },
      { id: 'primary_contact', label: 'Primary Contact' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('team-members', {
      member: true,
      email: true,
      role: true,
      status: true,
      primary_contact: true,
    });

  // Fetch members
  const {
    data: membersData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaceMembers', currentWorkspace?.id],
    queryFn: () => getMembersService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  // Prefetch roles so they're available immediately when invite dialog opens
  useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '');
      return res?.data;
    },
    enabled: !!currentWorkspace?.id,
  });

  const members = (membersData?.data || [])?.filter(
    (m: WorkspaceMember) => m.status !== 'removed',
  );
  const activeMembers = members.filter(
    (m: WorkspaceMember) => m.status === 'accepted',
  );
  const pendingMembers = members.filter(
    (m: WorkspaceMember) => m.status === 'pending',
  );

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: removeMemberService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', currentWorkspace?.id],
      });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to remove member');
    },
  });

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: resendInvitationService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', currentWorkspace?.id],
      });
      toast.success('Invitation resent successfully');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to resend invitation');
    },
  });

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      removeMutation.mutate(memberId);
    }
  };

  const handleResendInvitation = (memberId: string) => {
    resendMutation.mutate(memberId);
  };

  const handleEditMember = (member: WorkspaceMember) => {
    setUpdatingMember(member);
    setUpdateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="gap-1 border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <Check className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="gap-1 border-yellow-500/20 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-500">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="gap-1">
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleColor = (role: { color?: string } | null | undefined) => {
    return role?.color || '#6A7282';
  };

  if (!currentWorkspace) {
    return (
      <ModuleGuard module="team_members">
        <TeamMembersPageSkeleton />
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="team_members"> 
        <div className="flex shrink-0 flex-col gap-2 overflow-hidden">
          <PageHeader
            title={`Members (${members.length})`}
            description="Manage your workspace team members and permissions"
          >
            <div className="flex items-center gap-2">
              {/* {canAccess('team_members', 'create') && (
                <Button
                  onClick={() => setInviteDialogOpen(true)}
                  size="sm"
                  className="h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Invite Member
                </Button>
              )} */}

              {canAccess('team_members', 'create') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setInviteDialogOpen(true)}
                      className="h-9 w-9 bg-white p-0 dark:dark-background-color hover:cursor-pointer">
                        <Plus className="h-4 w-4" />                                        
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent side="bottom">
                    <p>Invite Member</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" /> */}

              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>
          {/* Summary Cards - Fixed at top */}
          <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Card className={cn('hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all')}>
                <CardContent className={cn('flex items-center px-3 py-2')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-activity-1" />
                    <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white")}>
                      Total Members ({members.length})
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn('hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all')}>
                <CardContent className={cn('flex items-center px-3 py-2')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-activity-2" />
                    <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white")}>
                      Active ({activeMembers.length})
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className={cn('hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all')}>
                <CardContent className={cn('flex items-center px-3 py-2')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-activity-4" />
                    <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white")}>
                      Pending Invitations ({pendingMembers.length})
                    </span>
                  </div>
                </CardContent>
              </Card>

              {currentModule && ( <Card className={cn('hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all')}>
                <CardContent className={cn('flex items-center px-3 py-2')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-activity-1" />                    
                    <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white")}>
                      Seats: {currentModule.used_seats} /{' '}
                        {currentModule.purchased_seats}
                    </span>
                    {currentModule.used_seats >=
                        currentModule.purchased_seats && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-4 px-1.5 text-[9px]"
                        >
                          Full
                        </Badge>
                      )}
                  </div>
                </CardContent>
              </Card>)}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = '/org/subscription')}
                    className="h-9 w-9 bg-white p-0 dark:dark-background-color hover:cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Manage Subscription</p>
                </TooltipContent>
              </Tooltip>
              </div>
            </div>
        </div>

          {/* <div className="flex min-h-0 flex-col space-y-6">
            <Card className="flex min-h-0 flex-col border-none shadow-none bg-transparent">
              <CardHeader className="shrink-0 py-4 px-0">
                <div>
                  <CardTitle className="leading-tight">Members</CardTitle>
                  <CardDescription>
                    Manage team members and their roles
                  </CardDescription>
                </div>
              </CardHeader>              
            </Card>

          </div> */}
        

          <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-3">
                  <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
                    <CustomTableContainer>
                      <Table>
                        <TableHeader>
                        <TableRow>
                          {isVisible('member') && <TableHead>Member</TableHead>}
                          {isVisible('email') && <TableHead>Email</TableHead>}
                          {isVisible('role') && <TableHead>Role</TableHead>}
                          {isVisible('status') && <TableHead>Status</TableHead>}
                          {isVisible('primary_contact') && (
                            <TableHead>Primary Contact</TableHead>
                          )}
                          <TableHead className="sticky-right-header">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member: WorkspaceMember) => (
                          <TableRow
                            key={member.id}
                            className="hover:bg-muted/50"
                          >
                            {isVisible('member') && (
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                                    {(
                                      member.user?.email?.charAt(0) || 'M'
                                    ).toUpperCase()}
                                  </div>
                                  <span className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                                    {member.user?.user_metadata?.full_name ||
                                      'Team Member'}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('email') && (
                              <TableCell className="text-muted-foreground text-sm">
                                {member.user?.email}
                              </TableCell>
                            )}
                            {isVisible('role') && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      backgroundColor: getRoleColor(
                                        member.role,
                                      ),
                                    }}
                                  />
                                  <span className="font-medium">
                                    {member.role?.role_name}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('status') && (
                              <TableCell>
                                {getStatusBadge(member.status)}
                              </TableCell>
                            )}
                            {isVisible('primary_contact') && (
                              <TableCell>
                                {member.is_primary_contact ? (
                                  <Badge variant="secondary">Primary</Badge>
                                ) : (
                                  <span className="text-muted-foreground/50 text-xs">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="bg-card sticky right-0 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {member.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleResendInvitation(member.id)
                                    }
                                    className="gap-2"
                                    disabled={resendMutation.isPending}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                                {canAccess('team_members', 'edit') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditMember(member)}
                                    className="gap-2"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {canAccess('team_members', 'delete') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveMember(member.id)
                                    }
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                                    disabled={removeMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                      
                    </CustomTableContainer>
                    </div>
                              {/* Dialogs */}
          <InviteMemberDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            productKey={productKey}
          />

          {updatingMember && (
            <UpdateMemberDialog
              member={updatingMember}
              open={updateDialogOpen}
              onOpenChange={setUpdateDialogOpen}
              onSuccess={() => setUpdatingMember(null)}
            />
          )}
                    </PageBody>
    </ModuleGuard>
  );
}
