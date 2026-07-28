'use client';

import { MoreHorizontal, MoreVertical } from 'lucide-react';

import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { Button } from '@kit/ui/button';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type {
  Employee,
  EmployeeListPagination,
} from '../../types/employee.type';
import { useRbac } from '../rbac/rbac-context';
import { EmployeeStatusBadge } from './employee-status-badge';
import { formatDate } from '@kit/shared/utils';
import { PageSizeSelector } from '@kit/ui/page-size-selector';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

export function EmployeesDirectoryCard(props: {
  employees: Array<Employee>;
  hasFilters: boolean;
  isColumnVisible: (columnId: string) => boolean;
  isLoading: boolean;
  onDeleteRequested: (employee: Employee) => void;
  onEditRequested: (employee: Employee) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pagination: EmployeeListPagination;
  visibility: Record<string, boolean>;
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
  const visibleColumnCount =
    1;

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('hrms-employees');

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<Employee>(
    'hrms-employees',
    props.employees,
    { onSortChange: () => props.onPageChange(1) }
  );

  return (
    <CustomTableContainer
      pagination={
        props.pagination.total > 0 ? (
          <div className="primary-text-regular text-leadgaze-muted bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8">
            <div className="flex items-center gap-1">
              Showing{' '}
              <span className="primary-text-regular text-leadgaze-muted">
                {from}
              </span>{' '}
              to{' '}
              <span className="primary-text-regular text-leadgaze-muted">
                {to}
              </span>{' '}
              of{' '}
              <span className="primary-text-regular text-leadgaze-muted">
                {props.pagination.total}
              </span>{' '}
              entries
            </div>
            <div className="flex w-full max-w-full min-w-0 items-center justify-end px-2">
                      <PageSizeSelector
                      value={props.pagination.pageSize}
                      onChange={(val) => {
                        props.onPageSizeChange(val);
                      }}
                    />
                  </div>
            <Pagination className="w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={
                      !props.pagination.hasPreviousPage || props.isLoading
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                    onClick={() =>
                      props.onPageChange(props.pagination.page - 1)
                    }
                  />
                </PaginationItem>
                {Array.from({ length: props.pagination.totalPages }).map(
                  (_, index) => (
                    <PaginationItem key={index}>
                      <PaginationLink
                        isActive={props.pagination.page === index + 1}
                        onClick={() => props.onPageChange(index + 1)}
                        className="cursor-pointer"
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    className={
                      !props.pagination.hasNextPage || props.isLoading
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                    onClick={() =>
                      props.onPageChange(props.pagination.page + 1)
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            {props.isColumnVisible('sno') && (
              <SortableTableHead
                label="S. No."
                columnId="sno"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                sortable={false}
                className="relative w-12 whitespace-nowrap"
                {...getHeaderProps('sno')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('employee') && (
              <SortableTableHead
                label="Employee"
                columnId="employee"
                sortKey="first_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('employee')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('employee')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('code') && (
              <SortableTableHead
                label="Code"
                columnId="code"
                sortKey="employee_code"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('code')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('code')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('department') && (
              <SortableTableHead
                label="Department"
                columnId="department"
                sortKey="department.name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('department')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('department')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('manager') && (
              <SortableTableHead
                label="Manager"
                columnId="manager"
                sortKey="manager.first_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('manager')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('manager')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('designation') && (
              <SortableTableHead
                label="Designation"
                columnId="designation"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('designation')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('designation')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('employment_type') && (
              <SortableTableHead
                label="Employment Type"
                columnId="employment_type"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('employment_type')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('employment_type')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('status') && (
              <SortableTableHead
                label="Status"
                columnId="status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('status')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('status')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('joining_date') && (
              <SortableTableHead
                label="Joining Date"
                columnId="joining_date"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('joining_date')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('joining_date')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('email') && (
              <SortableTableHead
                label="Email"
                columnId="email"
                sortKey="work_email"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('email')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('email')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('phone') && (
              <SortableTableHead
                label="Phone"
                columnId="phone"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('phone')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('phone')} />
              </SortableTableHead>
            )}
            <TableHead className="sticky right-0 px-4 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.isLoading
            ? [...Array(10)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell
                    className="h-[32px] px-4 py-2"
                    colSpan={visibleColumnCount}
                  >
                    <Skeleton className="h-7 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            : null}

          {!props.isLoading && props.employees.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                className="h-24 text-center"
              >
                <div className="text-gray-500">
                  {props.hasFilters
                    ? 'No employees match your search or filters.'
                    : 'No employees yet.'}
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {sortedData.map((employee, index) => (
            <TableRow key={employee.id} className="hover:bg-muted/50">
              {props.isColumnVisible('sno') && (
                <TableCell className="text-muted-foreground w-12">
                  {(props.pagination.page - 1) * props.pagination.pageSize +
                    index +
                    1}
                </TableCell>
              )}
              {props.isColumnVisible('employee') && (
                <TableCell className="min-w-[220px] h-14">
                  <div className="flex items-center gap-3 primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs font-semibold">
                        {getInitials(getEmployeeName(employee))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="">
                        {getEmployeeName(employee)}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {employee.work_email}
                      </p>
                    </div>
                  </div>
                </TableCell>
              )}
              {props.isColumnVisible('code') && (
                <TableCell className="primary-text-medium">
                  {employee.employee_code}
                </TableCell>
              )}
              {props.isColumnVisible('department') && (
                <TableCell>
                  {employee.department?.name ?? 'Unassigned'}
                </TableCell>
              )}
              {props.isColumnVisible('manager') && (
                <TableCell>
                  {employee.manager ? (
                    <div>
                      <p className="primary-text-medium">
                        {getEmployeeName(employee.manager)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {employee.manager.employee_code}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
              )}
              {props.isColumnVisible('designation') && (
                <TableCell>{employee.designation ?? 'Not Set'}</TableCell>
              )}
              {props.isColumnVisible('employment_type') && (
                <TableCell>
                  {formatEmploymentType(employee.employment_type)}
                </TableCell>
              )}
              {props.isColumnVisible('status') && (
                <TableCell>
                  <EmployeeStatusBadge status={employee.status} />
                </TableCell>
              )}
              {props.isColumnVisible('joining_date') && (
                <TableCell>
                  {employee.joining_date
                    ? formatDate(employee.joining_date)
                    : 'Not Set'}
                </TableCell>
              )}
              {props.isColumnVisible('email') && (
                <TableCell className="text-muted-foreground">
                  {employee.work_email}
                </TableCell>
              )}
              {props.isColumnVisible('phone') && (
                <TableCell className="text-muted-foreground">
                  {employee.phone ?? '-'}
                </TableCell>
              )}
              <TableCell className="sticky right-0 px-4 text-right">
                {canEdit || canDelete ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => props.onEditRequested(employee)}
                        >
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && employee.status !== 'active' && (
                        <DropdownMenuItem
                          className="text-destructive"
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
    </CustomTableContainer>
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



function formatEmploymentType(value: Employee['employment_type']) {
  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
