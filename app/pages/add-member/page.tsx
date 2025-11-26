"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { AddWorkspaceMemberDialog } from "@/components/workspaces/add-workspace-member-dialog";
import { useWorkspaces, type Workspace } from "@/hooks/use-workspaces";

interface WorkspaceInvite {
  id: string;
  email: string;
  workspaceId: string;
  roleId: string;
  invitedBy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    permissions?: Record<string, any>;
  } | null;
  invitedByUser: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  } | null;
}

export default function AddMemberPage() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const isInitialLoadRef = useRef(true);
  const { token, currentOrganization } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();
  const organizationId =
    currentOrganization?.organizationId || currentOrganization?.id;

  const { data: workspacesData } = useWorkspaces({
    organizationId: organizationId || "",
  });
  const workspaces = workspacesData?.workspaces || [];

  // Sync selectedWorkspaceId with currentWorkspace whenever it changes
  // This ensures the page updates when workspace is changed from header/switcher
  useEffect(() => {
    if (currentWorkspace?.id) {
      // Always sync with currentWorkspace from context (even if selectedWorkspaceId already has a value)
      if (currentWorkspace.id !== selectedWorkspaceId) {
        setSelectedWorkspaceId(currentWorkspace.id);
      }
    } else if (workspaces.length > 0 && !selectedWorkspaceId) {
      // If no currentWorkspace but workspaces available, use first one
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [currentWorkspace?.id, workspaces, selectedWorkspaceId]);

  // Fetch invites when workspace changes
  useEffect(() => {
    if (selectedWorkspaceId && token) {
      const shouldSilent = isInitialLoadRef.current;
      fetchInvites(shouldSilent);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  }, [selectedWorkspaceId, token]);

  const fetchInvites = async (silent = false) => {
    if (!selectedWorkspaceId || !token) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/workspaces/${selectedWorkspaceId}/invites`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setInvites(data.invites || []);
      } else {
        // Only show error if not silent (initial load)
        if (!silent) {
          toast.error(data.error || "Failed to load invites");
        } else {
          // On initial load, just log the error
          console.warn("Failed to load invites on initial load:", data.error);
        }
        setInvites([]);
      }
    } catch (error) {
      console.error("Failed to fetch invites:", error);
      // Only show error if not silent (initial load)
      if (!silent) {
        toast.error("Failed to load invites");
      }
      setInvites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveInvite = async (inviteId: string) => {
    if (!selectedWorkspaceId || !token) return;

    if (!confirm("Are you sure you want to remove this invite?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/workspaces/${selectedWorkspaceId}/invites/${inviteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Invite removed successfully");
        fetchInvites();
      } else {
        toast.error(data.error || "Failed to remove invite");
      }
    } catch (error) {
      console.error("Failed to remove invite:", error);
      toast.error("Failed to remove invite");
    }
  };

  const handleUpdateStatus = async (inviteId: string, newStatus: string) => {
    if (!selectedWorkspaceId || !token) return;

    try {
      const response = await fetch(
        `/api/workspaces/${selectedWorkspaceId}/invites/${inviteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Invite status updated successfully");
        fetchInvites();
      } else {
        toast.error(data.error || "Failed to update invite status");
      }
    } catch (error) {
      console.error("Failed to update invite status:", error);
      toast.error("Failed to update invite status");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium tracking-tight">
            Workspace Invites
          </h1>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={!selectedWorkspaceId}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Invite
            </Button>
          </div>
        </div>

        {!selectedWorkspaceId ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Please select a workspace to view invites.</p>
              {workspaces.length === 0 && (
                <p className="mt-2 text-sm">
                  No workspaces available. Create a workspace first.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Invites</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No invites found in this workspace.</p>
                  <p className="text-sm mt-2">
                    Click "Add New Invite" to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium p-1">
                          {invite.email}
                        </TableCell>
                        <TableCell className="p-1">
                          <Badge variant="secondary">
                            {invite.role?.name || "No Role"}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-1">
                          <Select
                            value={invite.status}
                            onValueChange={(value) =>
                              handleUpdateStatus(invite.id, value)
                            }
                          >
                            <SelectTrigger className="w-[120px] border-none focus:ring-0 focus:ring-offset-0 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          {invite.invitedByUser?.fullName || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right p-1  ">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveInvite(invite.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {organizationId && selectedWorkspaceId && (
        <AddWorkspaceMemberDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          organizationId={organizationId}
          workspaceId={selectedWorkspaceId}
          onSuccess={fetchInvites}
        />
      )}
    </DashboardLayout>
  );
}
