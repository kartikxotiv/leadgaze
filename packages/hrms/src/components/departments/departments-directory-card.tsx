'use client';

import { MoreHorizontal } from 'lucide-react';

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

  return (
    <CustomTableContainer>
      <Table>
        <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
          <TableRow>
            {props.isColumnVisible('sno') && (
              <TableHead className="w-12 whitespace-nowrap">S. No.</TableHead>
            )}
            {props.isColumnVisible('department') && (
              <TableHead>Department</TableHead>
            )}
            {props.isColumnVisible('code') && <TableHead>Code</TableHead>}
            {props.isColumnVisible('parent') && <TableHead>Parent</TableHead>}
            {props.isColumnVisible('head') && <TableHead>Head</TableHead>}
            {props.isColumnVisible('cost_center') && (
              <TableHead>Cost Center</TableHead>
            )}
            {props.isColumnVisible('status') && <TableHead>Status</TableHead>}
            {props.isColumnVisible('updated') && <TableHead>Updated</TableHead>}
            <TableHead className="bg-card sticky right-0 px-4 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {props.isLoading
            ? [...Array(8)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell
                    className="h-[52px] px-4 py-2"
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

          {props.filteredDepartments.map((department, index) => (
            <TableRow key={department.id} className="hover:bg-muted/50">
              {props.isColumnVisible('sno') && (
                <TableCell className="text-muted-foreground w-12">
                  {index + 1}
                </TableCell>
              )}
              {props.isColumnVisible('department') && (
                <TableCell className="min-w-[220px]">
                  <div className="min-w-0">
                    <p className="primary-text-medium truncate">
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
                        <MoreHorizontal className="h-4 w-4" />
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
