'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Trash2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { Skeleton } from '@kit/ui/skeleton';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
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

function TeamsPageSkeleton() {
  return (
    <ModuleGuard module="team_members">      
        <div className="bg-sidebar flex shrink-0 flex-col gap-2 overflow-hidden">
          <div className="bg-sidebar flex items-center justify-between px-6 py-4">
            <div className="space-y-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-60" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="bg-sidebar -mt-1 w-full overflow-x-auto px-6 pb-7">
            <div className="-mb-3 flex items-center gap-3">
              <Skeleton className="h-10 w-52 rounded-lg" />
              <Skeleton className="h-10 w-52 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="bg-sidebar flex min-h-0 flex-1 flex-col overflow-hidden pt-6 pb-6">
          <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6 mx-4 lg:mx-8">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  {[160, 240, 80, 80].map((w, i) => (
                    <th key={i} className="h-11 px-4 border-b border-border">
                      <Skeleton className="h-3" style={{ width: w }} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, row) => (
                  <tr key={row} className="bg-card border-b border-border">
                    <td className="h-11 px-4"><Skeleton className="h-3.5 w-32" /></td>
                    <td className="h-11 px-4"><Skeleton className="h-3.5 w-48" /></td>
                    <td className="h-11 px-4"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="h-11 px-4"><Skeleton className="h-6 w-6 rounded ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>      
    </ModuleGuard>
  );
}

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace, canAccess } = useRBAC();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [managingMembersTeam, setManagingMembersTeam] = useState<Team | null>(null);

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
      
        <div className="flex shrink-0 flex-col gap-2 overflow-hidden">
                  <PageHeader
                    title={`Teams (${teams.length})`}
                    description="Manage your workspace teams and their members"
                  >
                    <div className="flex items-center gap-2">        
        
              {canAccess('team_members', 'create') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(true)}
                      className="h-9 w-9 bg-white p-0 dark:dark-background-color hover:cursor-pointer">
                    
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent side="bottom">
                    <p>New Team</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>
          {/* Summary Cards */}
          <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Card className={cn('hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all')}>
                          <CardContent className={cn('flex items-center px-3 py-2')}>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <div className="h-2 w-2 shrink-0 rounded-full bg-activity-1" />
                              <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white")}>
                                Total Teams ({teams.length})
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={cn('hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all')}>
                          <CardContent className={cn('flex items-center px-3 py-2')}>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <div className="h-2 w-2 shrink-0 rounded-full bg-activity-2" />
                              <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white")}>
                                Total Team Assignments ({teams.reduce((acc: number, team: Team) => acc + (team._count?.members || 0), 0)})
                              </span>
                            </div>
                          </CardContent>
                        </Card>
            </div>
          </div>
        </div>

        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-3">
          <div className="flex min-h-0 w-full max-w-full min-w-0 gap-0 flex-col flex-1">
            <Card className="flex min-h-0 flex-col border-none shadow-none">
              <CardHeader className="shrink-0 p-4">
                <div>
                  <CardTitle className="leading-tight">Workspace Teams</CardTitle>
                  <CardDescription>
                    Organize your SDRs and Managers into teams
                  </CardDescription>
                </div>
              </CardHeader>
              </Card>
              <CustomTableContainer>                                    
                {isLoading ? (
                  <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                    <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          {[160, 240, 80, 80].map((w, i) => (
                            <th key={i} className="h-11 px-4 border-b border-border">
                              <Skeleton className="h-3" style={{ width: w }} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(8)].map((_, row) => (
                          <tr key={row} className="bg-card border-b border-border">
                            <td className="h-11 px-4"><Skeleton className="h-3.5 w-32" /></td>
                            <td className="h-11 px-4"><Skeleton className="h-3.5 w-48" /></td>
                            <td className="h-11 px-4"><Skeleton className="h-3.5 w-20" /></td>
                            <td className="h-11 px-4"><Skeleton className="h-6 w-6 rounded ml-auto" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : error ? (
                  <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
                    Failed to load teams
                  </div>
                ) : teams.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
                    <p className="text-muted-foreground">No teams found</p>
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      variant="outline"
                      size="sm"
                      className="mt-4"
                    >
                      Create First Team
                    </Button>
                  </div>
                ) : (
                  <Table>
                     <TableHeader>
                       <TableRow>
                      
                        
                          {isVisible('name') && <TableHead>Team Name</TableHead>}
                          {isVisible('description') && <TableHead>Description</TableHead>}
                          {isVisible('members') && <TableHead>Members</TableHead>}
                          <TableHead className="sticky-right-header text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teams.map((team: Team) => (
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
        </PageBody>

    </ModuleGuard>
  );
}
