'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
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

import { deleteAccountService } from '~/services/accounts.service';
// We will need to export this
import { deleteContactService } from '~/services/contacts.service';
// We will need to export this
import { deleteLeadService } from '~/services/leads.service';
// We will need to export this
import { deleteOpportunityService } from '~/services/opportunities.service';

// We will need to export this

interface DeleteEntityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityName?: string;
  onSuccess?: () => void;
}

export function DeleteEntityDialog({
  isOpen,
  onOpenChange,
  entityId,
  entityType,
  entityName,
  onSuccess,
}: DeleteEntityDialogProps) {
  const getDeleteService = () => {
    switch (entityType) {
      case 'lead':
        return deleteLeadService;
      case 'contact':
        return deleteContactService;
      case 'account':
        return deleteAccountService;
      case 'opportunity':
        return deleteOpportunityService;
      default:
        throw new Error('Invalid entity type');
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (id: string) => getDeleteService()(id),
    onSuccess: () => {
      toast.success(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted successfully`,
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || `Failed to delete ${entityType}`);
    },
  });

  const handleDelete = () => {
    mutate(entityId);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the{' '}
            {entityType} {entityName ? `"${entityName}"` : ''} and remove it
            from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
