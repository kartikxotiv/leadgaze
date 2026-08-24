'use client';

import { MoreHorizontal, MoreVertical } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { Department } from '../../types/department.type';
import { useRbac } from '../rbac/rbac-context';
import { formatDate } from '@kit/shared/utils';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

export function DepartmentsDirectoryCard(props: {
  departments: Array<Department>;
  filteredDepartments: Array<Department>;
  hasFilters: boolean;
  isColumnVisible: (columnId: string) => boolean;
  isLoading: boolean;
  onDeleteRequested: (department: Department) => void;
  onEditRequested: (department: Department) => void;
  visibility: Record<string, boolean>;
}) {
  const { hasPermission } = useRbac();
  const canEdit = hasPermission('departments', 'edit', 'team');
  const canDelete = hasPermission('departments', 'delete', 'team');
  const visibleColumnCount =
    Object.values(props.visibility).filter((value) => value !== false).length +
    1;

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('hrms-departments');
  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<Department>(
    'hrms-departments',
    props.filteredDepartments
  );

  return (
    <CustomTableContainer>
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
            {props.isColumnVisible('department') && (
              <SortableTableHead
                label="Department"
                columnId="department"
                sortKey="name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('department')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('department')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('code') && (
              <SortableTableHead
                label="Code"
                columnId="code"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('code')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('code')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('parent') && (
              <SortableTableHead
                label="Parent"
                columnId="parent"
                sortKey="parent_department.name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('parent')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('parent')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('head') && (
              <SortableTableHead
                label="Head"
                columnId="head"
                sortKey="head_account.name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('head')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('head')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('cost_center') && (
              <SortableTableHead
                label="Cost Center"
                columnId="cost_center"
                sortKey="cost_center_code"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('cost_center')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('cost_center')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('status') && (
              <SortableTableHead
                label="Status"
                columnId="status"
                sortKey="is_active"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('status')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('status')} />
              </SortableTableHead>
            )}
            {props.isColumnVisible('updated') && (
              <SortableTableHead
                label="Updated"
                columnId="updated"
                sortKey="updated_at"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="relative"
                {...getHeaderProps('updated')}
              >
                <span className="col-resize-handle" {...getResizeHandleProps('updated')} />
              </SortableTableHead>
            )}
            <TableHead className="sticky right-0 px-4 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {props.isLoading
            ? [...Array(8)].map((_, index) => (
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

          {!props.isLoading && props.filteredDepartments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                className="h-24 text-center"
              >
                <div className="text-gray-500">
                  {props.departments.length === 0
                    ? 'No departments created yet.'
                    : props.hasFilters
                      ? 'No departments match your search or filters.'
                      : 'No departments found.'}
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {sortedData.map((department, index) => (
            <TableRow key={department.id} className="hover:bg-muted/50">
              {props.isColumnVisible('sno') && (
                <TableCell className="text-muted-foreground w-12">
                  {index + 1}
                </TableCell>
              )}
              {props.isColumnVisible('department') && (
                <TableCell className="min-w-[220px]">
                  <div className="min-w-0">
                    <p className="primary-text-medium truncate text-leadgaze-primary dark:text-leadgaze-primary">
                      {department.name}
                    </p>
                  </div>
                </TableCell>
              )}
              {props.isColumnVisible('code') && (
                <TableCell className="primary-text-medium">
                  {department.code}
                </TableCell>
              )}
              {props.isColumnVisible('parent') && (
                <TableCell>
                  {department.parent_department?.name ?? 'Root'}
                </TableCell>
              )}
              {props.isColumnVisible('head') && (
                <TableCell className="min-w-[180px]">
                  <div className="min-w-0">
                    <p className="truncate">
                      {department.head_account?.name ?? 'Unassigned'}
                    </p>
                    {department.head_account?.email ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {department.head_account.email}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
              )}
              {props.isColumnVisible('cost_center') && (
                <TableCell>
                  {department.cost_center_code ?? 'Not Set'}
                </TableCell>
              )}
              {props.isColumnVisible('status') && (
                <TableCell>
                  <Badge
                    variant={department.is_active ? 'default' : 'secondary'}
                  >
                    {department.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              )}
              {props.isColumnVisible('updated') && (
                <TableCell className="text-muted-foreground">
                  {formatDate(department.updated_at)}
                </TableCell>
              )}
              <TableCell className="bg-card sticky right-0 px-4 text-right">
                {canEdit || canDelete ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Department actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={() => props.onEditRequested(department)}
                        >
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => props.onDeleteRequested(department)}
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


