import { useAuthStore } from "@/lib/stores/auth-store";
import { Workspace } from "@/lib/types";
import { toast } from "sonner";

export function useWorkspaceContext() {
  const { currentWorkspace, updateCurrentWorkspace, currentOrganization } =
    useAuthStore();

  const setCurrentWorkspace = (workspace: Workspace | null) => {
    // Validate workspace belongs to current organization
    if (workspace && currentOrganization) {
      const orgId =
        currentOrganization.organizationId || currentOrganization.id;
      if (workspace.organizationId !== orgId) {
        toast.error("Invalid workspace for current organization");
        return;
      }
    }

    updateCurrentWorkspace(workspace);

    // Store in localStorage for persistence across browser sessions
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

  // Get workspace context for API calls
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

  // Check if current user can access workspace features
  const canUseWorkspaces = () => {
    if (!currentOrganization) return false;

    const userRole = currentOrganization.role?.toLowerCase();
    return ["owner", "admin", "manager", "user"].includes(userRole || "");
  };

  // Check if current user can manage workspaces
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
