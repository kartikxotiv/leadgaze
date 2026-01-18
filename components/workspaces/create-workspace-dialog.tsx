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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWorkspace } from "@/hooks/use-workspaces";
import { Loader2, FolderPlus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AddWorkspaceMemberDialog } from "./add-workspace-member-dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  };
  role: {
    id: string;
    name: string;
  };
  status: string;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  organizationId,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(
    null
  );
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const { token } = useAuthStore();

  const createWorkspaceMutation = useCreateWorkspace(organizationId);

  useEffect(() => {
    if (createdWorkspaceId && open) {
      fetchMembers();
    }
  }, [createdWorkspaceId, open]);

  const fetchMembers = async () => {
    if (!createdWorkspaceId || !token) return;

    try {
      setIsLoadingMembers(true);
      const response = await fetch(
        `/api/workspaces/${createdWorkspaceId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    try {
      const result = await createWorkspaceMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Get the workspace ID from the result
      const workspaceId = result?.workspace?.id || result?.id;
      if (workspaceId) {
        setCreatedWorkspaceId(workspaceId);
        toast.success(
          "Workspace created successfully! You can now add members."
        );
      } else {
        toast.success("Workspace created successfully!");
        handleClose();
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleClose = () => {
    if (!createWorkspaceMutation.isPending) {
      setName("");
      setDescription("");
      setCreatedWorkspaceId(null);
      setMembers([]);
      onOpenChange(false);
    }
  };

  const handleMemberAdded = () => {
    fetchMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!createdWorkspaceId || !token) return;

    try {
      const response = await fetch(
        `/api/workspaces/${createdWorkspaceId}/members/${memberId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Member removed successfully");
        fetchMembers();
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              {createdWorkspaceId
                ? "Workspace Created"
                : "Create New Workspace"}
            </DialogTitle>
            <DialogDescription>
              {createdWorkspaceId
                ? "Add members to your workspace. You can manage members here."
                : "Create a new workspace to organize your teams and projects. Each workspace can have its own leads, deals, and pipeline."}
            </DialogDescription>
          </DialogHeader>

          {!createdWorkspaceId ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Name *</Label>
                <Input
                  id="workspace-name"
                  placeholder="Sales Team, Marketing, Support..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={createWorkspaceMutation.isPending}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description</Label>
                <Textarea
                  id="workspace-description"
                  placeholder="Brief description of what this workspace is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={createWorkspaceMutation.isPending}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createWorkspaceMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWorkspaceMutation.isPending || !name.trim()}
                >
                  {createWorkspaceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Workspace
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Workspace Members</h3>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddMemberDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <p>No members added yet.</p>
                  <p className="text-sm mt-2">
                    Click "Add Member" to get started.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {member.user?.fullName || "Unknown User"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user?.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {member.role?.name || "No Role"}
                            </Badge>
                            <Badge
                              variant={
                                member.status === "accepted"
                                  ? "default"
                                  : member.status === "pending"
                                  ? "outline"
                                  : "destructive"
                              }
                            >
                              {member.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="ml-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {organizationId && (
        <AddWorkspaceMemberDialog
          open={showAddMemberDialog}
          onOpenChange={setShowAddMemberDialog}
          organizationId={organizationId}
          onSuccess={handleMemberAdded}
        />
      )}
    </>
  );
}
