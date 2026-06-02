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

import type { Employee } from '~/types/employee.type';

export function DeleteEmployeeDialog(props: {
  employee: Employee | null;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const employeeName = props.employee
    ? `${props.employee.first_name}${props.employee.last_name ? ` ${props.employee.last_name}` : ''}`
    : 'this employee';

  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Employee</AlertDialogTitle>
          <AlertDialogDescription>
            Delete {employeeName}? This will also remove the employee role from
            the linked organization account.
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
