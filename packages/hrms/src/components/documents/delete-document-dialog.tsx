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

import type { EmployeeDocument } from '../../types/document.type';

type DeleteDocumentDialogProps = {
  document: EmployeeDocument | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function DeleteDocumentDialog(props: DeleteDocumentDialogProps) {
  const employeeName = props.document?.employee
    ? `${props.document.employee.first_name} ${props.document.employee.last_name ?? ''}`.trim()
    : null;

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>
            {props.document
              ? `Delete ${props.document.name}${employeeName ? ` for ${employeeName}` : ''}? This action cannot be undone.`
              : 'Delete this document? This action cannot be undone.'}
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
