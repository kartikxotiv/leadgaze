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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateWorkspace } from "@/hooks/use-workspaces";
import { Workspace } from "@/lib/types";
import { Loader2, Edit } from "lucide-react";
import { toast } from "sonner";

interface EditWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  workspace: Workspace;
}

export function EditWorkspaceDialog({
  open,
  onOpenChange,
  organizationId,
  workspace,
}: EditWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "archived">(
    "active"
  );

  const updateWorkspaceMutation = useUpdateWorkspace(
    organizationId,
    workspace.id
  );

 
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "");
      setDescription(workspace.description || "");
      setStatus(workspace.status || "active");
    }
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

   
    const hasChanges =
      name.trim() !== workspace.name ||
      description.trim() !== (workspace.description || "") ||
      status !== workspace.status;

    if (!hasChanges) {
      toast.info("No changes to save");
      onOpenChange(false);
      return;
    }

    try {
      await updateWorkspaceMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        status: status,
      });

      onOpenChange(false);
    } catch (error) {
     
    }
  };

  const handleClose = () => {
    if (!updateWorkspaceMutation.isPending) {
     
      setName(workspace.name || "");
      setDescription(workspace.description || "");
      setStatus(workspace.status || "active");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Workspace
          </DialogTitle>
          <DialogDescription>
            Update workspace details and settings. Changes will be applied
            immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name *</Label>
            <Input
              id="workspace-name"
              placeholder="Sales Team, Marketing, Support..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={updateWorkspaceMutation.isPending}
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
              disabled={updateWorkspaceMutation.isPending}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value: "active" | "inactive" | "archived") =>
                setStatus(value)
              }
              disabled={updateWorkspaceMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Inactive
                  </div>
                </SelectItem>
                <SelectItem value="archived">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    Archived
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {status === "archived" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Archived workspaces are hidden from most views and cannot be
                used.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateWorkspaceMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateWorkspaceMutation.isPending || !name.trim()}
            >
              {updateWorkspaceMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
