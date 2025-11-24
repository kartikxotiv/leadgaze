import { useAuthStore } from "@/lib/stores/auth-store";
import { Workspace } from "@/lib/types";
import { toast } from "sonner";

export function useWorkspaceContext() {
  const { currentWorkspace, updateCurrentWorkspace, currentOrganization } =
    useAuthStore();

  const setCurrentWorkspace = (workspace: Workspace | null) => {
    // Allow switching to workspaces where user is a member
    // The API already validates membership, so we trust workspaces from the list
    // If workspace is from a different organization, we allow it since user is a member

    if (workspace && currentOrganization) {
      const orgId =
        currentOrganization.organizationId || currentOrganization.id;
      const workspaceOrgId =
        workspace.organizationId ||
        (workspace as any).organization?.organizationId ||
        (workspace as any).organization?.id;

      // If workspace is from a different organization, log it but allow it
      // User might be a member of workspaces across organizations
      if (workspaceOrgId && workspaceOrgId !== orgId) {
        console.log(
          `[WorkspaceContext] Switching to workspace from different organization:`,
          {
            currentOrg: orgId,
            workspaceOrg: workspaceOrgId,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
          }
        );
        // Allow the switch - user is a member of this workspace
        // Optionally show info toast
        toast.info(
          `Switching to workspace "${workspace.name}" from different organization`
        );
      }
    }

    updateCurrentWorkspace(workspace);

    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        if (workspace) {
          localStorage.setItem("current_workspace", JSON.stringify(workspace));
        } else {
          localStorage.removeItem("current_workspace");
        }
      } catch (error) {
        console.warn("Failed to store current workspace:", error);
      }
    }
  };

  const clearWorkspace = () => {
    updateCurrentWorkspace(null);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem("current_workspace");
      } catch (error) {
        console.warn("Failed to clear current workspace:", error);
      }
    }
  };

  const getWorkspaceContext = () => {
    const orgId =
      currentOrganization?.organizationId || currentOrganization?.id;
    const workspaceId = currentWorkspace?.id;

    return {
      organizationId: orgId || null,
      workspaceId: workspaceId || null,
      hasWorkspace: !!workspaceId,
    };
  };

  const canUseWorkspaces = () => {
    if (!currentOrganization) return false;

    const userRole = currentOrganization.role?.toLowerCase();
    return ["owner", "admin", "manager", "user"].includes(userRole || "");
  };

  const canManageWorkspaces = () => {
    if (!currentOrganization) return false;

    const userRole = currentOrganization.role?.toLowerCase();
    return ["owner", "admin"].includes(userRole || "");
  };

  return {
    currentWorkspace,
    setCurrentWorkspace,
    clearWorkspace,
    getWorkspaceContext,
    canUseWorkspaces: canUseWorkspaces(),
    canManageWorkspaces: canManageWorkspaces(),
    organizationId:
      currentOrganization?.organizationId || currentOrganization?.id,
  };
}
