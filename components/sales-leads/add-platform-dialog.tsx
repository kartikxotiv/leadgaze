"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface AddPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  onPlatformNameChange: (name: string) => void;
  error: string;
  onAdd: () => void;
  isAdding: boolean;
}

export function AddPlatformDialog({
  open,
  onOpenChange,
  platformName,
  onPlatformNameChange,
  error,
  onAdd,
  isAdding,
}: AddPlatformDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Platform</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            id="platformName"
            value={platformName}
            onChange={(event) => onPlatformNameChange(event.target.value)}
            placeholder="Enter platform name"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={onAdd} disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Platform"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
