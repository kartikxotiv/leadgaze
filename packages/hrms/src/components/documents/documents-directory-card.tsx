'use client';

import Link from 'next/link';

import { FileText, MoreHorizontal } from 'lucide-react';

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

import type { EmployeeDocument } from '~/types/document.type';

export function DocumentsDirectoryCard(props: {
  documents: Array<EmployeeDocument>;
  isLoading: boolean;
  onDeleteRequested?: (document: EmployeeDocument) => void;
  onEditRequested?: (document: EmployeeDocument) => void;
}) {
  return (
    <Card>
      <CardContent className={'p-0'}>
        <div className={'overflow-x-auto rounded-lg border'}>
          <Table>
            <TableHeader>
              <TableRow className={'bg-muted/40'}>
                <TableHead>Document</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>View</TableHead>
                <TableHead className={'w-[48px]'} />
              </TableRow>
            </TableHeader>

            <TableBody>
              {props.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : null}

              {!props.isLoading && props.documents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    No documents uploaded yet.
                  </TableCell>
                </TableRow>
              ) : null}

              {!props.isLoading &&
                props.documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className={'flex items-center gap-2'}>
                        <div
                          className={
                            'text-brand flex h-9 w-9 items-center justify-center'
                          }
                        >
                          <FileText className={'h-4 w-4'} />
                        </div>
                        <div>
                          <p className={'text-sm font-semibold'}>
                            {document.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={'text-sm font-medium'}>
                      {document.employee
                        ? `${document.employee.first_name} ${document.employee.last_name ?? ''}`
                        : 'Unknown'}
                    </TableCell>
                    <TableCell className={'text-muted-foreground text-sm'}>
                      {formatDate(document.uploaded_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        asChild
                        aria-label={`View ${document.name}`}
                      >
                        <Link
                          href={document.file_url}
                          target={'_blank'}
                          rel={'noreferrer'}
                        >
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size={'icon'}
                            variant={'ghost'}
                            aria-label={'Document actions'}
                          >
                            <MoreHorizontal className={'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align={'end'}>
                          <DropdownMenuItem
                            onClick={() => props.onEditRequested?.(document)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={'text-destructive'}
                            onClick={() => props.onDeleteRequested?.(document)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(date);
}
