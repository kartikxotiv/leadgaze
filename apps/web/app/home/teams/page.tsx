'use client';

import React, { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import {
  Card,
  CardContent,
} from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { StatusFilterDropdown } from '@kit/ui/status-filter-dropdown';

import { Skeleton } from '@kit/ui/skeleton';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useDebounce } from '~/lib/hooks/use-debounce';
import {
  type Team,
  deleteTeamService,
  getTeamsService,
} from '~/services/teams.service';

import { CreateTeamDialog } from './components/create-team-dialog';
import { EditTeamDialog } from './components/edit-team-dialog';
import { ManageTeamMembersDialog } from './components/manage-team-members-dialog';
import { cn } from '@kit/ui/utils';
import CustomTableContainer from '@kit/ui/custom-table-container';


export default function TeamsPage() {
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentWorkspace, canAccess } = useRBAC();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Virtual team statuses for filtering
  const teamStatuses = useMemo(
    () => [
      { id: 'has_members', status_name: 'Has Members', color: '#22c55e' },
      { id: 'no_members', status_name: 'No Members', color: '#ef4444' },
    ],
    [],
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Team Name' },
      { id: 'description', label: 'Description' },
      { id: 'members', label: 'Members Count' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('teams', {
      name: true,
      description: true,
      members: true,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('teams');


  // Fetch teams
  const {
    data: teamsData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaceTeams', currentWorkspace?.id],
    queryFn: async () => {
      const res = await getTeamsService(currentWorkspace?.id || '');
      return res?.data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const teams = Array.isArray(teamsData) ? teamsData : [];

  // Build status breakdown from teams data
  const teamStatusBreakdown = useMemo(() => {
    const hasMembers = teams.filter((t: Team) => (t._count?.members || 0) > 0).length;
    const noMembers = teams.filter((t: Team) => (t._count?.members || 0) === 0).length;
    return {
      has_members: { count: hasMembers },
      no_members: { count: noMembers },
    };
  }, [teams]);

  // Client-side search + status filtering
  const filteredTeams = useMemo(() => {
    let result = teams;

    // Status filter
    if (selectedStatus === 'has_members') {
      result = result.filter((t: Team) => (t._count?.members || 0) > 0);
    } else if (selectedStatus === 'no_members') {
      result = result.filter((t: Team) => (t._count?.members || 0) === 0);
    }

    // Search filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (team: Team) =>
          team.name?.toLowerCase().includes(term) ||
          team.description?.toLowerCase().includes(term),
      );
    }

    return result;
  }, [teams, selectedStatus, debouncedSearchTerm]);

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<Team>(
    'teams',
    filteredTeams,
  );

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: deleteTeamService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceTeams', currentWorkspace?.id],
      });
      toast.success('Team deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete team');
    },
  });

  const handleDeleteTeam = (teamId: string) => {
    if (confirm('Are you sure you want to delete this team? All team associations will be lost.')) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
  };

  const handleManageMembers = (team: Team) => {
    setManagingMembersTeam(team);
  };

  return (
    <ModuleGuard module="team_members">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden border-b">
        <PageHeader
          title={`Teams`}
          // description="Manage your workspace teams and their members"
        >
          <div className="p-[2px]">
            <ListToolBar
              align="right"
              className="border-none bg-transparent p-0"
              showSearch
              searchPlaceholder="Search teams..."
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              actions={[
                {
                  key: 'add',
                  label: 'New Team',
                  icon: Plus,
                  onClick: () => setCreateDialogOpen(true),
                  show: canAccess('team_members', 'create'),
                  buttonVariant: 'default',
                },
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
            {isLoading ? (
              <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                <Table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="sticky-right-header bg-background z-10 w-12 px-1 text-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="mx-auto flex h-8 w-8 items-center justify-center border-dashed"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[32px] px-4 py-2" colSpan={3}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                        <TableCell className="bg-card right-0 px-4 text-right">
                          <Skeleton className="h-7 ml-auto w-16" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : error ? (
              <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
                Failed to load teams
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedStatus !== 'all'
                    ? 'No teams match your search'
                    : 'No teams found'}
                </p>
                {!searchTerm && selectedStatus === 'all' && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Create First Team
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isVisible('name') && (
  <SortableTableHead
    label="Team Name"
    columnId="name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    sortable={false}
    className="relative"
    {...getHeaderProps('name')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('name')} />
  </SortableTableHead>
)}
                    {isVisible('description') && (
  <SortableTableHead
    label="Description"
    columnId="description"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    sortable={false}
    className="relative"
    {...getHeaderProps('description')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('description')} />
  </SortableTableHead>
)}
                    {isVisible('members') && (
  <SortableTableHead
    label="Members"
    columnId="members"
    sortKey="_count.members"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    sortable={false}
    className="relative"
    {...getHeaderProps('members')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('members')} />
  </SortableTableHead>
)}
                    <TableHead className="sticky-right-header bg-background z-10 w-12 px-1 text-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="mx-auto flex h-8 w-8 items-center justify-center border-dashed"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((team: Team) => (
                    <TableRow key={team.id}>
                      {isVisible('name') && (
                        <TableCell>
                          <span className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">{team.name}</span>
                        </TableCell>
                      )}
                      {isVisible('description') && (
                        <TableCell className="text-muted-foreground">
                          {team.description || '—'}
                        </TableCell>
                      )}
                      {isVisible('members') && (
                        <TableCell>
                          {team._count?.members || 0} members
                        </TableCell>
                      )}
                      <TableCell className="">
                        <div className="flex items-center justify-end gap-2">
                          {canAccess('team_members', 'edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageMembers(team)}
                              className="gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              Members
                            </Button>
                          )}
                          {canAccess('team_members', 'edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTeam(team)}
                              className="gap-2"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canAccess('team_members', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTeam(team.id)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                              disabled={deleteTeamMutation.isPending}
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
            )}
          </CustomTableContainer>
        </div>

        {/* Dialogs */}
        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {editingTeam && (
          <EditTeamDialog
            team={editingTeam}
            open={!!editingTeam}
            onOpenChange={(open) => !open && setEditingTeam(null)}
            onSuccess={() => setEditingTeam(null)}
          />
        )}

        {managingMembersTeam && (
          <ManageTeamMembersDialog
            team={managingMembersTeam}
            open={!!managingMembersTeam}
            onOpenChange={(open) => !open && setManagingMembersTeam(null)}
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
