'use client';

import { MoreHorizontal } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
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

import type { Department } from '../../types/department.type';
import { useRbac } from '../rbac/rbac-context';

export function DepartmentsDirectoryCard(props: {
  departments: Array<Department>;
  filteredDepartments: Array<Department>;
  isLoading: boolean;
  onDeleteRequested: (department: Department) => void;
  onEditRequested: (department: Department) => void;
}) {
  const { hasPermission } = useRbac();
  const canEdit = hasPermission('departments', 'edit', 'team');
  const canDelete = hasPermission('departments', 'delete', 'team');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Directory</CardTitle>
      </CardHeader>

      <CardContent>
        <div className={'overflow-x-auto rounded-lg border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Cost Center</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className={'w-[48px]'} />
              </TableRow>
            </TableHeader>

            <TableBody>
              {props.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    Loading departments...
                  </TableCell>
                </TableRow>
              ) : null}

              {!props.isLoading && props.filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    {props.departments.length === 0
                      ? 'No departments created yet.'
                      : 'No departments match the current filters.'}
                  </TableCell>
                </TableRow>
              ) : null}

              {props.filteredDepartments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <div>
                      <p className={'font-medium'}>{department.name}</p>
                      <p className={'text-muted-foreground text-xs'}>
                        Updated {formatDate(department.updated_at)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className={'font-medium'}>
                    {department.code}
                  </TableCell>
                  <TableCell>
                    {department.parent_department?.name ?? 'Root'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{department.head_account?.name ?? 'Unassigned'}</p>
                      {department.head_account?.email ? (
                        <p className={'text-muted-foreground text-xs'}>
                          {department.head_account.email}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {department.cost_center_code ?? 'Not Set'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={department.is_active ? 'default' : 'secondary'}
                    >
                      {department.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit || canDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size={'icon'}
                            variant={'ghost'}
                            aria-label={'Department actions'}
                          >
                            <MoreHorizontal className={'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align={'end'}>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => props.onEditRequested(department)}
                            >
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className={'text-destructive'}
                              onClick={() =>
                                props.onDeleteRequested(department)
                              }
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
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}
