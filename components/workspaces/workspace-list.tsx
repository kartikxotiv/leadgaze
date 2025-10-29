"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces, useDeleteWorkspace } from "@/hooks/use-workspaces";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { EditWorkspaceDialog } from "./edit-workspace-dialog";
import {
  FolderPlus,
  MoreHorizontal,
  Edit,
  Archive,
  Loader2,
  RefreshCw,
  Users,
  Calendar,
  Settings,
} from "lucide-react";
import { Workspace } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface WorkspaceListProps {
  organizationId: string;
  organizationMaxWorkspaces: number;
  userRole: string;
}

export function WorkspaceList({
  organizationId,
  organizationMaxWorkspaces,
  userRole,
}: WorkspaceListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null
  );

  const {
    data: workspaces = [],
    isLoading,
    error,
    refetch,
  } = useWorkspaces(organizationId, {
    enabled: !!organizationId,
  });

  const deleteWorkspaceMutation = useDeleteWorkspace(organizationId);

  const canManageWorkspaces = ["owner", "admin"].includes(
    userRole.toLowerCase()
  );
  const activeWorkspaces = workspaces.filter((w) => w.status === "active");
  const canCreateMore = activeWorkspaces.length < organizationMaxWorkspaces;

  const handleDelete = async (workspace: Workspace) => {
    if (
      window.confirm(
        `Are you sure you want to archive "${workspace.name}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteWorkspaceMutation.mutateAsync(workspace.id);
      } catch (error) {
       
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Workspaces refreshed!");
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">
          Failed to load workspaces
        </p>
        <Button variant="outline" onClick={handleRefresh} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Workspaces
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Organize your teams and projects with workspaces. Using{" "}
            {activeWorkspaces.length} of {organizationMaxWorkspaces} allowed
            workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>

          {canManageWorkspaces && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={!canCreateMore}
              title={
                !canCreateMore
                  ? `Workspace limit reached (${organizationMaxWorkspaces})`
                  : ""
              }
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          )}
        </div>
      </div>

      {}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderPlus className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No workspaces yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first workspace to organize your teams and projects.
            </p>
            {canManageWorkspaces && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Your First Workspace
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {workspace.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={getStatusColor(workspace.status)}
                      >
                        {workspace.status}
                      </Badge>
                    </div>
                  </div>

                  {canManageWorkspaces && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingWorkspace(workspace)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(workspace)}
                          className="text-red-600 dark:text-red-400"
                          disabled={deleteWorkspaceMutation.isPending}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {workspace.description && (
                    <CardDescription className="text-sm line-clamp-2">
                      {workspace.description}
                    </CardDescription>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>0 members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {workspace.createdAt
                            ? formatDistanceToNow(
                                new Date(workspace.createdAt),
                                { addSuffix: true }
                              )
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {}
      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={organizationId}
      />

      {editingWorkspace && (
        <EditWorkspaceDialog
          open={!!editingWorkspace}
          onOpenChange={() => setEditingWorkspace(null)}
          organizationId={organizationId}
          workspace={editingWorkspace}
        />
      )}
    </div>
  );
}
