"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { ChevronDown, FolderOpen, Plus, Settings, Loader2 } from "lucide-react";
import { Workspace } from "@/lib/types";
import { toast } from "sonner";

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  onWorkspaceChange?: (workspace: Workspace) => void;
  compact?: boolean;
}

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onWorkspaceChange,
  compact = false,
}: WorkspaceSwitcherProps) {
  const { currentOrganization } = useAuth();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const organizationId =
    currentOrganization?.organizationId || currentOrganization?.id;

  // Clear workspace if it's no longer in the available workspaces list
  // This handles cases where user loses access to a workspace
  if (currentWorkspace && !isLoading && workspaces.length > 0) {
    const workspaceStillAvailable = workspaces.some(
      (w) => w.id === currentWorkspace.id
    );
    if (!workspaceStillAvailable) {
      // Workspace is no longer available, clear it
      setCurrentWorkspace(null);
    }
  }

  const {
    data: workspaces = [],
    isLoading,
    error,
  } = useWorkspaces(organizationId || "", {
    enabled: !!organizationId && !!currentOrganization,
  });

  const selectedWorkspaceId = currentWorkspaceId || currentWorkspace?.id;
  const selectedWorkspace = workspaces.find(
    (w) => w.id === selectedWorkspaceId
  );
  const activeWorkspaces = workspaces.filter((w) => w.status === "active");

  const canManageWorkspaces =
    currentOrganization?.role &&
    ["owner", "admin"].includes(currentOrganization.role.toLowerCase());

  const handleWorkspaceSelect = (workspace: Workspace) => {
    if (workspace.id === selectedWorkspaceId) return;

    setCurrentWorkspace(workspace as any);

    onWorkspaceChange?.(workspace);
    toast.success(`Switched to "${workspace.name}" workspace`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (!organizationId || !currentOrganization) {
    return null;
  }

  if (error) {
    return (
      <Button variant="outline" size={compact ? "sm" : "default"} disabled>
        <FolderOpen className="h-4 w-4 mr-2" />
        {compact ? "Error" : "Workspace Error"}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            className="justify-between min-w-[200px]"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 truncate">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              )}
              <span className="truncate">
                {isLoading
                  ? "Loading..."
                  : selectedWorkspace?.name ||
                    currentWorkspace?.name ||
                    "Select Workspace"}
              </span>
              {(selectedWorkspace || currentWorkspace) && (
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(
                    (selectedWorkspace || currentWorkspace)?.status || "active"
                  )} text-xs px-1.5 py-0.5`}
                >
                  {(selectedWorkspace || currentWorkspace)?.status || "active"}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Select Workspace
          </DropdownMenuLabel>

          {activeWorkspaces.length > 0 ? (
            activeWorkspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceSelect(workspace)}
                className={
                  selectedWorkspaceId === workspace.id ? "bg-accent" : ""
                }
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {workspace.name}
                      </div>
                      {workspace.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {workspace.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedWorkspaceId === workspace.id && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full ml-2" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">
                No active workspaces
              </span>
            </DropdownMenuItem>
          )}

          {canManageWorkspaces && (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Manage Workspaces
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {activeWorkspaces.length} of{" "}
            {currentOrganization?.maxWorkspaces || 0} workspaces
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={organizationId}
      />
    </>
  );
}
