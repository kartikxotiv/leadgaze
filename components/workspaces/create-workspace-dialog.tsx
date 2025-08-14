"use client";

import { useState } from "react";
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
import { Loader2, FolderPlus } from "lucide-react";
import { toast } from "sonner";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  organizationId,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createWorkspaceMutation = useCreateWorkspace(organizationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    try {
      await createWorkspaceMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Reset form and close dialog
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleClose = () => {
    if (!createWorkspaceMutation.isPending) {
      setName("");
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your teams and projects. Each
            workspace can have its own leads, deals, and pipeline.
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
      </DialogContent>
    </Dialog>
  );
}
