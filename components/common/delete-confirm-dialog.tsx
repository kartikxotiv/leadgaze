"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemId?: string;
  onConfirm: (itemId?: string) => Promise<void> | void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemId,
  onConfirm,
  isLoading = false,
  title = "Delete Item",
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
}: DeleteConfirmDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm(itemId);
      // Only close on success - errors are handled by parent
      onOpenChange(false);
    } catch (error) {
      // Don't close on error - let parent handle it
      // The dialog will stay open so user can retry or cancel
    }
  };

  const defaultDescription = `Are you sure you want to delete <strong>${itemName}</strong>? This action cannot be undone.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p
            className="text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{
              __html: description || defaultDescription,
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

