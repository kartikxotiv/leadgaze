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

export interface AddIndustryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industryName: string;
  onIndustryNameChange: (name: string) => void;
  error: string;
  onAdd: () => void;
  isAdding: boolean;
}

export function AddIndustryDialog({
  open,
  onOpenChange,
  industryName,
  onIndustryNameChange,
  error,
  onAdd,
  isAdding,
}: AddIndustryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Industry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            id="industryName"
            value={industryName}
            onChange={(event) => onIndustryNameChange(event.target.value)}
            placeholder="Enter industry name"
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
                "Add Industry"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
