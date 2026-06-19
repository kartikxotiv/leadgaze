'use client';

import Link from 'next/link';

import { ExternalLink, FileText, MoreHorizontal, MoreVertical } from 'lucide-react';

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

import type { EmployeeDocument } from '../../types/document.type';
import { useRbac } from '../rbac/rbac-context';
import { formatDate } from '@kit/shared/utils';

export function DocumentsDirectoryCard(props: {
  documents: Array<EmployeeDocument>;
  filteredDocuments: Array<EmployeeDocument>;
  hasFilters: boolean;
  isColumnVisible: (columnId: string) => boolean;
  isLoading: boolean;
  onDeleteRequested?: (document: EmployeeDocument) => void;
  onEditRequested?: (document: EmployeeDocument) => void;
  visibility: Record<string, boolean>;
}) {
  const { hasPermission } = useRbac();
  const canEdit = hasPermission('documents', 'edit', 'team');
  const canDelete = hasPermission('documents', 'delete', 'team');
  const visibleColumnCount =
    Object.values(props.visibility).filter((value) => value !== false).length +
    1;

  return (
    <CustomTableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            {props.isColumnVisible('sno') && (
              <TableHead className="w-12 whitespace-nowrap">S. No.</TableHead>
            )}
            {props.isColumnVisible('document') && (
              <TableHead>Document</TableHead>
            )}
            {props.isColumnVisible('employee') && (
              <TableHead>Employee</TableHead>
            )}
            {props.isColumnVisible('employee_code') && (
              <TableHead>Employee Code</TableHead>
            )}
            {props.isColumnVisible('uploaded') && (
              <TableHead>Uploaded</TableHead>
            )}
            {props.isColumnVisible('status') && <TableHead>Status</TableHead>}
            {props.isColumnVisible('view') && <TableHead>View</TableHead>}
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
                    className="h-[52px] px-4 py-2"
                    colSpan={visibleColumnCount}
                  >
                    <Skeleton className="h-7 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            : null}

          {!props.isLoading && props.filteredDocuments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumnCount}
                className="h-24 text-center"
              >
                <div className="text-gray-500">
                  {props.documents.length === 0
                    ? 'No documents uploaded yet.'
                    : props.hasFilters
                      ? 'No documents match your search.'
                      : 'No documents found.'}
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {!props.isLoading &&
            props.filteredDocuments.map((document, index) => (
              <TableRow key={document.id} className="hover:bg-muted/50">
                {props.isColumnVisible('sno') && (
                  <TableCell className="text-muted-foreground w-12">
                    {index + 1}
                  </TableCell>
                )}
                {props.isColumnVisible('document') && (
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="primary-text-medium truncate text-leadgaze-primary dark:text-leadgaze-primary">
                          {document.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                )}
                {props.isColumnVisible('employee') && (
                  <TableCell className="primary-text-medium">
                    {document.employee
                      ? `${document.employee.first_name} ${
                          document.employee.last_name ?? ''
                        }`
                      : 'Unknown'}
                  </TableCell>
                )}
                {props.isColumnVisible('employee_code') && (
                  <TableCell className="text-muted-foreground">
                    {document.employee?.employee_code ?? '-'}
                  </TableCell>
                )}
                {props.isColumnVisible('uploaded') && (
                  <TableCell className="text-muted-foreground">
                    {formatDate(document.uploaded_at)}
                  </TableCell>
                )}
                {props.isColumnVisible('status') && (
                  <TableCell>{document.status || '-'}</TableCell>
                )}
                {props.isColumnVisible('view') && (
                  <TableCell>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      aria-label={`View ${document.name}`}
                      className="h-8 gap-1.5"
                    >
                      <Link
                        href={document.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                )}
                <TableCell className="sticky right-0 px-4 text-right">
                  {canEdit || canDelete ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Document actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        {canEdit ? (
                          <DropdownMenuItem
                            onClick={() => props.onEditRequested?.(document)}
                          >
                            Edit
                          </DropdownMenuItem>
                        ) : null}
                        {canDelete ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => props.onDeleteRequested?.(document)}
                          >
                            Delete
                          </DropdownMenuItem>
                        ) : null}
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


