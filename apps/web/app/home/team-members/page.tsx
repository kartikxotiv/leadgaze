'use client';

import { useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Edit2, Plus, RotateCcw, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

import { Badge } from '@kit/ui/badge';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import { getRolesService } from '~/services/roles.service';
import {
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

type UnifiedMember = {
  id: string;
  _type: 'member' | 'invitation';
  member_name: string;
  email: string;
  role_name: string;
  status: string;
  is_primary_contact: boolean;
  originalData: WorkspaceMember | PendingInvitation;
};

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
                <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                    <Button
                      type="button"
                      size="icon"
                      className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </Button>
                  </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="h-[32px] px-4 py-2" colSpan={6}>
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
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentWorkspace, canAccess } = useRBAC();
  const pathname = usePathname();
  const productKey = getModuleKeyFromPath(pathname);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<WorkspaceMember | null>(
    null,
  );
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'accepted' | 'pending' | 'all' | ''
  >('');
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
      (m: { module_key: string }) => m.module_key === productKey,
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

  const { getHeaderProps, getResizeHandleProps } =
    useColumnResize('team-members');

  // Fetch members — server handles status filter and search
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['workspaceMembers', currentWorkspace?.id, productKey, statusFilter, debouncedSearchTerm],
    queryFn: () =>
      getMembersService(
        currentWorkspace?.id || '',
        productKey,
        // When no filter is selected (''), default to fetching only 'accepted'
        // When 'pending' is selected, skip fetching members (undefined here, skipped below)
        statusFilter === '' ? 'accepted' : statusFilter === 'pending' ? undefined : statusFilter,
        debouncedSearchTerm || undefined,
      ),
    // Skip members query when showing pending-only (invitations table handles it)
    enabled: !!currentWorkspace?.id && statusFilter !== 'pending',
  });

  const allMembers = useMemo(
    () => (membersData?.data || []) as WorkspaceMember[],
    [membersData],
  );

  // Prefetch roles so they're available immediately when invite dialog opens
  useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '', productKey);
      return res?.data;
    },
    enabled: !!currentWorkspace?.id && !!productKey,
  });

  // ── Pending invitations from workspace_invitations table ──────────────────
  // Server handles the search filter; query is skipped for 'accepted' or default empty filter
  const { data: pendingInvitationsData, isLoading: isLoadingInvitations } =
    useQuery({
      queryKey: ['pendingInvitations', currentWorkspace?.id, productKey, debouncedSearchTerm, statusFilter],
      queryFn: () =>
        getPendingInvitationsService(
          currentWorkspace?.id || '',
          productKey,
          debouncedSearchTerm || undefined,
        ),
      enabled: !!currentWorkspace?.id && statusFilter !== 'accepted' && statusFilter !== '',
    });

  const pendingInvitations: PendingInvitation[] =
    (pendingInvitationsData?.data as PendingInvitation[]) || [];

  // Unified list: server already filtered both lists, just merge them
  const unifiedList = useMemo(() => {
    const unified: UnifiedMember[] = [
      ...allMembers.map((m) => ({
        id: m.id,
        _type: 'member' as const,
        member_name: m.user?.user_metadata?.full_name || 'Team Member',
        email: m.user?.email || '',
        role_name: m.role?.role_name || '',
        status: m.status,
        is_primary_contact: m.is_primary_contact,
        originalData: m,
      })),
      ...pendingInvitations.map((i) => ({
        id: `inv-${i.id}`,
        _type: 'invitation' as const,
        member_name: i.email,
        email: i.email,
        role_name: i.role?.role_name || '—',
        status: 'pending',
        is_primary_contact: false,
        originalData: i,
      })),
    ];

    return unified;
  }, [allMembers, pendingInvitations]);

  const { sortColumn, sortDirection, toggleSort, sortedData } =
    useTableSort<UnifiedMember>('team-members', unifiedList);

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

  // Status items - kept for potential future use with StatusFilterDropdown
  // Currently using filterGroups with ListToolBar instead
  const _memberStatusItems = useMemo(
    () => [
      { id: 'accepted', status_name: 'Active', color: '#22c55e' },
      { id: 'pending', status_name: 'Pending', color: '#eab308' },
    ],
    [],
  );




  const filterGroups = useMemo(() => {
    return [
      {
        key: 'status',
        label: 'Status',
        selectedValue: statusFilter || undefined,
        selectedLabel:
          statusFilter === 'pending'
            ? 'Pending'
            : statusFilter === 'accepted'
              ? 'Active'
              : statusFilter === 'all'
                ? 'All'
                : undefined,
        options: [
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'accepted', label: 'Active' },
        ],
        onSelect: (val: string) =>
          setStatusFilter(val as 'accepted' | 'pending' | 'all'),
      },
    ];
  }, [statusFilter]);

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
      <div className="flex shrink-0 flex-col gap-2 overflow-hidden border-top-bottom-gray">
        <PageHeader
          title={`Members`}
          // description={
          //   statusFilter === 'pending'
          //     ? 'Showing pending invitations only'
          //     : statusFilter === 'all'
          //       ? 'Showing all members'
          //       : 'Showing active members only'
          // }
        >
          
          <div className="p-[2px] flex gap-2">
            <div className="flex">
            {currentModule && (
              <Card
                className={cn(
                  'hover:border-primary/50 rounded-sm-card inline-flex w-auto shrink-0 cursor-pointer transition-all',
                )}
              >
                <CardContent className={cn('flex items-center px-1 py-1')}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className={cn(
                        'secondary-text-small-bold text-leadgaze-dark uppercase dark:text-white',
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
            <ListToolBar
              align="right"
              className="border-none bg-transparent p-0"
              showFilter
              filterLabel="Show Filters"
              filterGroups={filterGroups}
              activeFilterCount={statusFilter ? 1 : 0}
              onClearFilters={() => setStatusFilter('')}
              showSearch
              searchPlaceholder="Search"
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
        </PageHeader>
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <CustomTableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible('member') && (
                    <SortableTableHead
                      label="Member"
                      columnId="member"
                      sortKey="member_name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('member')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('member')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('email') && (
                    <SortableTableHead
                      label="Email"
                      columnId="email"
                      sortKey="email"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('email')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('email')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('role') && (
                    <SortableTableHead
                      label="Role"
                      columnId="role"
                      sortKey="role_name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('role')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('role')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('status') && (
                    <SortableTableHead
                      label="Status"
                      columnId="status"
                      sortKey="status"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('status')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('status')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('primary_contact') && (
                    <SortableTableHead
                      label="Primary Contact"
                      columnId="primary_contact"
                      sortKey="is_primary_contact"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('primary_contact')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('primary_contact')}
                      />
                    </SortableTableHead>
                  )}
                  <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                    <Button
                      type="button"
                      size="icon"
                      className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isLoadingInvitations ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="h-[32px] px-4 py-2" colSpan={5}>
                        <Skeleton className="h-7 w-full" />
                      </TableCell>
                      <TableCell className="bg-card right-0 px-4 text-right">
                        <Skeleton className="ml-auto h-7 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((row: UnifiedMember) => {
                    if (row._type === 'member') {
                      const member = row.originalData as WorkspaceMember;
                      return (
                        <TableRow key={member.id} className="hover:bg-muted/50">
                          {isVisible('member') && (
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="bg-secondary flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                                  {(
                                    member.user?.email?.charAt(0) || 'M'
                                  ).toUpperCase()}
                                </div>
                                <span className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                                  {row.member_name}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {isVisible('email') && (
                            <TableCell className="text-muted-foreground text-sm">
                              {row.email}
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
                                  {row.role_name}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {isVisible('status') && (
                            <TableCell>{getStatusBadge(row.status)}</TableCell>
                          )}
                          {isVisible('primary_contact') && (
                            <TableCell>
                              {row.is_primary_contact ? (
                                <Badge variant="secondary">Primary</Badge>
                              ) : (
                                <span className="text-muted-foreground/50 text-xs">
                                  —
                                </span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="bg-card sticky right-0 px-4 text-right">
                            <div className="flex items-center justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 border-0 p-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.status === 'pending' && (
                                    <DropdownMenuItem
                                      onClick={() => handleResendInvitation(member.id)}
                                      disabled={resendMutation.isPending}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <RotateCcw className="h-4 w-4" /> Resend Invitation
                                    </DropdownMenuItem>
                                  )}
                                  {canAccess('team_members', 'edit') && (
                                    <DropdownMenuItem
                                      onClick={() => handleEditMember(member)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Edit2 className="h-4 w-4" /> Edit Member
                                    </DropdownMenuItem>
                                  )}
                                  {canAccess('team_members', 'delete') && (
                                    <DropdownMenuItem
                                      onClick={() => handleRemoveMember(member.id)}
                                      disabled={removeMutation.isPending}
                                      className="text-destructive focus:text-destructive cursor-pointer gap-2"
                                    >
                                      <Trash2 className="h-4 w-4" /> Remove Member
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      const invitation = row.originalData as PendingInvitation;
                      return (
                        <TableRow
                          key={`inv-${invitation.id}`}
                          className="hover:bg-muted/50"
                        >
                          {isVisible('member') && (
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="bg-secondary flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                                  {invitation.email.charAt(0).toUpperCase()}
                                </div>
                                <span className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                                  {row.member_name}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {isVisible('email') && (
                            <TableCell className="text-muted-foreground text-sm">
                              {row.email}
                            </TableCell>
                          )}
                          {isVisible('role') && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: getRoleColor(invitation.role),
                                  }}
                                />
                                <span className="font-medium">
                                  {row.role_name}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {isVisible('status') && (
                            <TableCell>{getStatusBadge('pending')}</TableCell>
                          )}
                          {isVisible('primary_contact') && (
                            <TableCell>
                              <span className="text-muted-foreground/50 text-xs">—</span>
                            </TableCell>
                          )}
                          <TableCell className="sticky right-0 px-4 text-right">
                            <div className="flex items-center justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 border-0 p-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      resendInvitationEmailMutation.mutate(
                                        invitation.id,
                                      )
                                    }
                                    disabled={resendInvitationEmailMutation.isPending}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <RotateCcw className="h-4 w-4" /> Resend Invitation
                                  </DropdownMenuItem>
                                  {canAccess('team_members', 'delete') && (
                                    <DropdownMenuItem
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
                                      disabled={deleteInvitationMutation.isPending}
                                      className="text-destructive focus:text-destructive cursor-pointer gap-2"
                                    >
                                      <Trash2 className="h-4 w-4" /> Delete Invitation
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })
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
      
      <AddColumnModal
        open={addColumnModalOpen}
        onOpenChange={setAddColumnModalOpen}
        columns={columns}
        visibility={visibility}
        onToggleColumn={toggleVisibility}
        onResetColumns={reset}
      />
      </PageBody>
    </ModuleGuard>
  );
}
