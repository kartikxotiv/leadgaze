'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';

import { deleteDocumentService } from '~/services/document.service';
import type { EmployeeDocument } from '~/types/document.type';

interface DeleteDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  document: EmployeeDocument | null;
}

export function DeleteDocumentDialog({
  isOpen,
  onOpenChange,
  document,
}: DeleteDocumentDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!document) return;
      return deleteDocumentService(document.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_documents'] });
      toast.success('Document deleted successfully');
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the document
            <span className="font-semibold"> {document?.name}</span> for 
            <span className="font-semibold"> {document?.employee?.first_name} {document?.employee?.last_name}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
