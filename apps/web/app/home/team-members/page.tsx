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
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { StatusFilterDropdown } from '@kit/ui/status-filter-dropdown';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
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
import { useColumnResize } from '@kit/ui/use-column-resize';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import { getRolesService } from '~/services/roles.service';
import {
  type SeatAssignment,
  getSeatAssignmentsService,
  getWorkspaceSubscriptionService,
} from '~/services/subscription.service';
import {
  type PendingInvitation,
  type WorkspaceMember,
  deleteInvitationService,
  getMembersService,
  getPendingInvitationsService,
  removeMemberService,
  resendInvitationEmailService,
  resendInvitationService,
} from '~/services/team-members.service';

import { InviteMemberDialog } from './components/invite-member-dialog';
import { UpdateMemberDialog } from './components/update-member-dialog';
import { Card, CardContent } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

function TeamMembersPageSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
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
  const canViewSubscription = canAccess('subscription', 'view');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<WorkspaceMember | null>(
    null,
  );
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'accepted' | 'pending'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

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

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('team-members');


  // Fetch members
  const { data: membersData = [], isLoading } = useQuery({
    queryKey: ['workspaceMembers', currentWorkspace?.id],
    queryFn: () => getMembersService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  // Fetch seat assignments for the current module to filter members
  const { data: assignmentsData } = useQuery({
    queryKey: ['module-seat-assignments', currentWorkspace?.id, productKey],
    queryFn: () =>
      getSeatAssignmentsService(currentWorkspace?.id || '', productKey),
    enabled: !!currentWorkspace?.id && !!productKey,
  });

  // Build set of user_ids who have an active seat in this module
  const moduleAssignedUserIds = useMemo(() => {
    const assignments = (assignmentsData?.data ?? []) as SeatAssignment[];
    return new Set(
      assignments.filter((a) => a.is_active).map((a) => a.user_id),
    );
  }, [assignmentsData]);

  // Prefetch roles so they're available immediately when invite dialog opens
  useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '', productKey);
      return res?.data;
    },
    enabled: !!currentWorkspace?.id && !!productKey,
  });

  // Only show members who have an active seat in the current module.
  // Pending members (not yet accepted) are always shown so admins can manage invites.
  const allMembers = (membersData?.data || [])
    .filter((m: WorkspaceMember) => m.status !== 'removed')
    .filter(
      (m: WorkspaceMember) =>
        m.status === 'pending' || moduleAssignedUserIds.has(m.user_id),
    );
  const activeMembers = allMembers.filter(
    (m: WorkspaceMember) => m.status === 'accepted',
  );
  const pendingMembers = allMembers.filter(
    (m: WorkspaceMember) => m.status === 'pending',
  );

  // Apply the active status filter to the member list shown in the table
  const members = useMemo(() => {
    let filtered: WorkspaceMember[];
    switch (statusFilter) {
      case 'accepted':
        filtered = activeMembers;
        break;
      case 'pending':
        filtered = pendingMembers;
        break;
      default:
        filtered = allMembers;
    }
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (m: WorkspaceMember) =>
          (m.user?.user_metadata?.full_name || '').toLowerCase().includes(term) ||
          (m.user?.email || '').toLowerCase().includes(term),
      );
    }
    return filtered;
  }, [statusFilter, allMembers, activeMembers, pendingMembers, debouncedSearchTerm]);

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

  // Resend invitation mutation (legacy workspace_members-based)
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

  // ── Pending invitations from workspace_invitations table ──────────────────
  const { data: pendingInvitationsData, isLoading: isLoadingInvitations } =
    useQuery({
      queryKey: ['pendingInvitations', currentWorkspace?.id],
      queryFn: () => getPendingInvitationsService(currentWorkspace?.id || ''),
      enabled: !!currentWorkspace?.id && statusFilter === 'pending',
    });

  const pendingInvitations: PendingInvitation[] =
    (pendingInvitationsData?.data as PendingInvitation[]) || [];

  // Status items for StatusFilterDropdown
  const memberStatusItems = useMemo(
    () => [
      { id: 'accepted', status_name: 'Active', color: '#22c55e' },
      { id: 'pending', status_name: 'Pending', color: '#eab308' },
    ],
    [],
  );

  const memberStatusBreakdown = useMemo(
    () => ({
      accepted: { count: activeMembers.length },
      pending: { count: pendingInvitations.length || pendingMembers.length },
    }),
    [activeMembers.length, pendingInvitations.length, pendingMembers.length],
  );

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: deleteInvitationService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pendingInvitations', currentWorkspace?.id],
      });
      toast.success('Invitation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to delete invitation');
    },
  });

  // Resend invitation email mutation (workspace_invitations-based)
  const resendInvitationEmailMutation = useMutation({
    mutationFn: resendInvitationEmailService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['pendingInvitations', currentWorkspace?.id],
      });
      toast.success('Invitation email resent successfully');
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to resend invitation email');
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
            title={`Members (${statusFilter === 'pending' ? pendingInvitations.length : (statusFilter === 'all' ? allMembers.length : members.length)})`}
            description={
              statusFilter === 'all'
                ? 'Manage your workspace team members and permissions'
                : statusFilter === 'accepted'
                  ? 'Showing active members only'
                  : 'Showing pending invitations only'
            }
          ><div className="flex">
            {currentModule && (
              <Card
                className={cn(
                  'hover:border-primary/50 bg-card rounded-sm-card inline-flex w-auto shrink-0 cursor-pointer transition-all',
                )}
              >
                <CardContent className={cn('flex items-center px-3 py-2')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className={cn(
                        'primary-text-medium text-leadgaze-dark uppercase dark:text-white',
                      )}
                    >
                      Seats: {currentModule.used_seats} /{' '}
                      {currentModule.purchased_seats}
                    </span>
                    {currentModule.used_seats >=
                      currentModule.purchased_seats && (
                      <Badge variant="destructive" className="ml-auto h-4 px-2">
                        Full
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </PageHeader>
          
      </div>

        {/* Toolbar with search, status filter, actions */}
        <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
          <ListToolBar
            statusSlot={
              <StatusFilterDropdown
                statuses={memberStatusItems}
                selectedStatus={statusFilter}
                onStatusChange={(id) =>
                  setStatusFilter(id as 'all' | 'accepted' | 'pending')
                }
                statusBreakdown={memberStatusBreakdown}
                totalCount={allMembers.length}
                allLabel="All Members"
              />
            }
            showSearch
            searchPlaceholder="Search members..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            actions={[
              ...(canAccess('team_members', 'create')
                ? [
                    {
                      key: 'invite',
                      label: 'Invite Member',
                      icon: Plus,
                      onClick: () => setInviteDialogOpen(true),
                      show: true,
                      buttonVariant: 'default' as const,
                    },
                  ]
                : []),              
            ]}
            columnVisibilitySlot={
              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            }
          />
        </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <CustomTableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  {statusFilter === 'pending' ? (
                    <>
                      <TableHead>Email</TableHead>
                      {isVisible('role') && (
  <TableHead className="relative" {...getHeaderProps('role')}>
    Role
    <span className="col-resize-handle" {...getResizeHandleProps('role')} />
  </TableHead>
)}
                      <TableHead>Sent On</TableHead>
                      {isVisible('status') && (
  <TableHead className="relative" {...getHeaderProps('status')}>
    Status
    <span className="col-resize-handle" {...getResizeHandleProps('status')} />
  </TableHead>
)}
                    </>
                  ) : (
                    <>
                      {isVisible('member') && (
  <TableHead className="relative" {...getHeaderProps('member')}>
    Member
    <span className="col-resize-handle" {...getResizeHandleProps('member')} />
  </TableHead>
)}
                      {isVisible('email') && (
  <TableHead className="relative" {...getHeaderProps('email')}>
    Email
    <span className="col-resize-handle" {...getResizeHandleProps('email')} />
  </TableHead>
)}
                      {isVisible('role') && (
  <TableHead className="relative" {...getHeaderProps('role')}>
    Role
    <span className="col-resize-handle" {...getResizeHandleProps('role')} />
  </TableHead>
)}
                      {isVisible('status') && (
  <TableHead className="relative" {...getHeaderProps('status')}>
    Status
    <span className="col-resize-handle" {...getResizeHandleProps('status')} />
  </TableHead>
)}
                      {isVisible('primary_contact') && (
  <TableHead className="relative" {...getHeaderProps('primary_contact')}>
    Primary Contact
    <span className="col-resize-handle" {...getResizeHandleProps('primary_contact')} />
  </TableHead>
)}
                    </>
                  )}
                  <TableHead className="sticky-right-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusFilter === 'pending' ? (
                  // ── Pending Invitations Table ─────────────────────────────
                  isLoadingInvitations ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[52px] px-4 py-2" colSpan={4}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                        <TableCell className="bg-card right-0 px-4 text-right">
                          <Skeleton className="ml-auto h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : pendingInvitations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground h-32 text-center"
                      >
                        No pending invitations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingInvitations.map((invitation) => (
                      <TableRow
                        key={invitation.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                              {invitation.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                              {invitation.email}
                            </span>
                          </div>
                        </TableCell>
                        {isVisible('role') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor: getRoleColor(
                                    invitation.role,
                                  ),
                                }}
                              />
                              <span className="font-medium">
                                {invitation.role?.role_name || '—'}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground text-sm">
                          {invitation.invited_at
                            ? new Date(
                                invitation.invited_at,
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : invitation.created_at
                              ? new Date(
                                  invitation.created_at,
                                ).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                        </TableCell>
                        {isVisible('status') && (
                          <TableCell>{getStatusBadge('pending')}</TableCell>
                        )}
                        <TableCell className="bg-card sticky right-0 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    resendInvitationEmailMutation.mutate(
                                      invitation.id,
                                    )
                                  }
                                  className="gap-2"
                                  disabled={
                                    resendInvitationEmailMutation.isPending
                                  }
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Resend Invitation</p>
                              </TooltipContent>
                            </Tooltip>
                            {canAccess('team_members', 'delete') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          'Are you sure you want to delete this invitation?',
                                        )
                                      ) {
                                        deleteInvitationMutation.mutate(
                                          invitation.id,
                                        );
                                      }
                                    }}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                                    disabled={
                                      deleteInvitationMutation.isPending
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>Delete Invitation</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : // ── Members Table ──────────────────────────────────────────
                isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="h-[52px] px-4 py-2" colSpan={5}>
                        <Skeleton className="h-7 w-full" />
                      </TableCell>
                      <TableCell className="bg-card right-0 px-4 text-right">
                        <Skeleton className="ml-auto h-7 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member: WorkspaceMember) => (
                    <TableRow key={member.id} className="hover:bg-muted/50">
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
                                backgroundColor: getRoleColor(member.role),
                              }}
                            />
                            <span className="font-medium">
                              {member.role?.role_name}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {isVisible('status') && (
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Resend Invitation</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {canAccess('team_members', 'edit') && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                  className="gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Edit Member</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {canAccess('team_members', 'delete') && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                                  disabled={removeMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Remove Member</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
            productKey={productKey}
          />
        )}
      </PageBody>
    </ModuleGuard>
  );
}
