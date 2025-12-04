"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface AddBusinessTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessTypeName: string;
  onBusinessTypeNameChange: (name: string) => void;
  error: string;
  onAdd: () => void;
  isAdding: boolean;
}

export function AddBusinessTypeDialog({
  open,
  onOpenChange,
  businessTypeName,
  onBusinessTypeNameChange,
  error,
  onAdd,
  isAdding,
}: AddBusinessTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Business Type</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            id="businessTypeName"
            value={businessTypeName}
            onChange={(event) => onBusinessTypeNameChange(event.target.value)}
            placeholder="Enter business type name"
            disabled={isAdding}
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
                "Add Business Type"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
