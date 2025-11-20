"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";

interface WorkspaceRole {
  id: string;
  name: string;
  description?: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

interface AddWorkspaceMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  workspaceId?: string;
  onSuccess?: () => void;
}

export function AddWorkspaceMemberDialog({
  open,
  onOpenChange,
  organizationId,
  workspaceId,
  onSuccess,
}: AddWorkspaceMemberDialogProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(
    workspaceId || ""
  );
  const [email, setEmail] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRole[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (workspaceId) {
      setSelectedWorkspaceId(workspaceId);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open && organizationId) {
      if (!workspaceId) {
        fetchWorkspaces();
      }
    }
  }, [open, organizationId, workspaceId]);

  useEffect(() => {
    if (open && token) {
      fetchWorkspaceRoles();
      setSelectedRoleId("");
    } else {
      setWorkspaceRoles([]);
      setSelectedRoleId("");
    }
  }, [open, token]);

  const fetchWorkspaces = async () => {
    if (!token || !organizationId) {
      return;
    }

    try {
      setIsLoadingWorkspaces(true);
      const response = await fetch(
        `/api/workspaces?organizationId=${organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log("Workspaces API response:", data);

      if (data.success) {
        const workspacesList = data.data?.workspaces || [];
        console.log("Parsed workspaces:", workspacesList);
        setWorkspaces(workspacesList);

        if (workspacesList.length === 0) {
          console.warn("No workspaces found for organization:", organizationId);
        }
      } else {
        console.error("Failed to fetch workspaces:", data.error);
        toast.error(data.error || "Failed to load workspaces");
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const fetchWorkspaceRoles = async () => {
    if (!token) {
      return;
    }

    try {
      setIsLoadingRoles(true);
      const rolesResponse = await fetch(
        `/api/workspace-roles?showAll=true&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();

        if (rolesData.success) {
          let roles: WorkspaceRole[] = [];

          if (rolesData.roles) {
            roles = rolesData.roles;
          } else if (rolesData.data?.data) {
            roles = rolesData.data.data;
          }

          console.log("Fetched roles:", roles.length);
          setWorkspaceRoles(roles);

          if (roles.length === 0) {
            toast.info("No roles found. Please create roles first.");
          }
        } else {
          toast.error(rolesData.error || "Failed to load workspace roles");
        }
      } else {
        const errorData = await rolesResponse.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to load workspace roles");
      }
    } catch (error) {
      console.error("Failed to fetch workspace roles:", error);
      toast.error("Failed to load workspace roles");
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWorkspaceId) {
      toast.error("Please select a workspace");
      return;
    }

    if (!email || !selectedRoleId) {
      toast.error("Please enter an email and select a role");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `/api/workspaces/${selectedWorkspaceId}/invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            roleId: selectedRoleId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Invitation sent successfully");
        setSelectedWorkspaceId("");
        setEmail("");
        setSelectedRoleId("");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Failed to send workspace member invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedWorkspaceId("");
      setEmail("");
      setSelectedRoleId("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Workspace Member
          </DialogTitle>
          <DialogDescription>
            Invite a member to this workspace by email. They will receive an
            invitation email with the selected role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!workspaceId && (
            <div className="space-y-2">
              <Label htmlFor="workspace-select">Workspace *</Label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
                disabled={isLoadingWorkspaces || isSubmitting}
              >
                <SelectTrigger id="workspace-select">
                  <SelectValue placeholder="Select a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingWorkspaces ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm">
                        Loading workspaces...
                      </span>
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No workspaces available
                    </div>
                  ) : (
                    workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email-input">Email *</Label>
            <Input
              id="email-input"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-select">Role *</Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={!selectedWorkspaceId || isLoadingRoles || isSubmitting}
            >
              <SelectTrigger id="role-select">
                <SelectValue
                  placeholder={
                    !selectedWorkspaceId
                      ? "Select a workspace first"
                      : isLoadingRoles
                      ? "Loading roles..."
                      : "Select a role"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {!selectedWorkspaceId ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Please select a workspace first
                  </div>
                ) : isLoadingRoles ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading roles...</span>
                  </div>
                ) : workspaceRoles.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    <p className="font-medium mb-1">No roles available</p>
                    <p className="text-xs">
                      Please create roles for this workspace first.
                    </p>
                  </div>
                ) : (
                  workspaceRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.description && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          - {role.description}
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedWorkspaceId ||
                !email ||
                !selectedRoleId ||
                isLoadingWorkspaces ||
                isLoadingRoles
              }
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
