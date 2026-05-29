'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { useRbac } from '~/components/rbac/rbac-context';
import type { Employee, EmployeeListPagination } from '~/types/employee.type';

import { EmployeeStatusBadge } from './employee-status-badge';

export function EmployeesDirectoryCard(props: {
  employees: Array<Employee>;
  hasFilters: boolean;
  isLoading: boolean;
  onDeleteRequested: (employee: Employee) => void;
  onEditRequested: (employee: Employee) => void;
  onPageChange: (page: number) => void;
  pagination: EmployeeListPagination;
}) {
  const { hasPermission } = useRbac();
  const canEdit = hasPermission('employees', 'edit', 'team');
  const canDelete = hasPermission('employees', 'delete', 'team');
  const from =
    props.pagination.total === 0
      ? 0
      : (props.pagination.page - 1) * props.pagination.pageSize + 1;
  const to = Math.min(
    props.pagination.page * props.pagination.pageSize,
    props.pagination.total,
  );

  return (
    <Card className={'flex min-h-0 flex-1 flex-col'}>
      <CardContent className={'flex min-h-0 flex-1 flex-col gap-3 p-0'}>
        <div className={'min-h-0 flex-1 overflow-auto rounded-lg'}>
          <Table>
            <TableHeader className={'bg-background sticky top-0 z-10'}>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead className={'w-[48px]'} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={'text-muted-foreground py-8 text-center text-sm'}
                  >
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : null}

              {!props.isLoading && props.employees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={'text-muted-foreground py-8 text-center text-sm'}
                  >
                    {props.hasFilters
                      ? 'No employees match the current filters.'
                      : 'No employees found.'}
                  </TableCell>
                </TableRow>
              ) : null}

              {props.employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className={'flex items-center gap-3'}>
                      <Avatar className={'h-9 w-9'}>
                        <AvatarFallback className={'text-xs font-semibold'}>
                          {getInitials(getEmployeeName(employee))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={'font-medium'}>
                          {getEmployeeName(employee)}
                        </p>
                        <p className={'text-muted-foreground text-xs'}>
                          {employee.work_email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={'font-medium'}>
                    {employee.employee_code}
                  </TableCell>
                  <TableCell>
                    {employee.department?.name ?? 'Unassigned'}
                  </TableCell>
                  <TableCell>
                    {employee.manager ? (
                      <div>
                        <p className={'font-medium'}>
                          {getEmployeeName(employee.manager)}
                        </p>
                        <p className={'text-muted-foreground text-xs'}>
                          {employee.manager.employee_code}
                        </p>
                      </div>
                    ) : (
                      <span className={'text-muted-foreground'}>
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{employee.designation ?? 'Not Set'}</TableCell>
                  <TableCell>
                    <EmployeeStatusBadge status={employee.status} />
                  </TableCell>
                  <TableCell>
                    {employee.joining_date
                      ? formatDate(employee.joining_date)
                      : 'Not Set'}
                  </TableCell>
                  <TableCell>
                    {canEdit || canDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size={'icon'}
                            variant={'ghost'}
                            aria-label={'More actions'}
                          >
                            <MoreHorizontal className={'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align={'end'}>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => props.onEditRequested(employee)}
                            >
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && employee?.status !== 'active' && (
                            <DropdownMenuItem
                              className={'text-destructive'}
                              onClick={() => props.onDeleteRequested(employee)}
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div
          className={
            'flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between p-3'
          }
        >
          <p className={'text-muted-foreground'}>
            Showing {from}-{to} of {props.pagination.total} employees
          </p>

          <div className={'flex items-center gap-2'}>
            <Button
              variant={'outline'}
              size={'icon'}
              className={'h-8 w-8'}
              disabled={!props.pagination.hasPreviousPage || props.isLoading}
              onClick={() => props.onPageChange(props.pagination.page - 1)}
              aria-label={'Previous page'}
            >
              <ChevronLeft className={'h-4 w-4'} />
            </Button>

            <span className={'text-muted-foreground min-w-24 text-center'}>
              Page {props.pagination.totalPages === 0 ? 0 : props.pagination.page}{' '}
              of {props.pagination.totalPages}
            </span>

            <Button
              variant={'outline'}
              size={'icon'}
              className={'h-8 w-8'}
              disabled={!props.pagination.hasNextPage || props.isLoading}
              onClick={() => props.onPageChange(props.pagination.page + 1)}
              aria-label={'Next page'}
            >
              <ChevronRight className={'h-4 w-4'} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getEmployeeName(employee: Pick<Employee, 'first_name' | 'last_name'>) {
  return `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ''}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
