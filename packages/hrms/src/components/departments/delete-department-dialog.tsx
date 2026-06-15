'use client';

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

import type { Department } from '../../types/department.type';

type DeleteDepartmentDialogProps = {
  department: Department | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function DeleteDepartmentDialog(props: DeleteDepartmentDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription>
            {props.department
              ? `Delete ${props.department.name}? This action cannot be undone.`
              : 'Delete this department? This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={props.isPending}
            onClick={(event) => {
              event.preventDefault();
              props.onConfirm();
            }}
          >
            {props.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
