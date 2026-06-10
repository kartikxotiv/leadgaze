'use client';

import type { ReactNode } from 'react';

import { Check, ChevronDown } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { ScrollArea } from '@kit/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { cn } from '@kit/ui/utils';

type MetricItem = {
  hint: string;
  label: string;
  value: number | string;
};

type EmployeeOption = {
  id: string;
  label: string;
};

type TableColumn = {
  align?: 'left' | 'right';
  key: string;
  label: string;
};

type TableRowValue = ReactNode | number | string | null | undefined;

export function ReportsMetricGrid(props: { items: MetricItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              {item.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmployeeMultiSelect(props: {
  onClear: () => void;
  onSelectAll: () => void;
  onToggle: (employeeId: string) => void;
  options: EmployeeOption[];
  selectedIds: string[];
}) {
  const selectedCount = props.selectedIds.length;
  const buttonLabel =
    selectedCount === 0
      ? 'All accessible employees'
      : selectedCount === 1
        ? '1 employee selected'
        : `${selectedCount} employees selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full min-w-0 justify-between">
          <span className="min-w-0 flex-1 truncate text-left">
            {buttonLabel}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(320px,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Employees</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={props.onSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={props.onClear}>
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="h-72">
          <div className="space-y-1 p-2">
            {props.options.length > 0 ? (
              props.options.map((option) => {
                const isChecked = props.selectedIds.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => props.onToggle(option.id)}
                    className="hover:bg-muted flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors"
                  >
                    <Checkbox checked={isChecked} />
                    <span className="flex-1 truncate">{option.label}</span>
                    {isChecked ? (
                      <Check className="text-primary h-4 w-4 shrink-0" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground p-3 text-sm">
                No employees match the current filter scope.
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function ReportTableCard(props: {
  columns: TableColumn[];
  description?: string;
  emptyMessage?: string;
  rows: Array<Record<string, TableRowValue>>;
  title: string;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="px-1">
        <h2 className="text-base leading-tight font-semibold">{props.title}</h2>
        {props.description ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {props.description}
          </p>
        ) : null}
      </div>

      <CustomTableContainer>
        <Table>
          <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
            <TableRow>
              {props.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(column.align === 'right' ? 'text-right' : '')}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.rows.length > 0 ? (
              props.rows.map((row, index) => (
                <TableRow key={`${props.title}-${index}`}>
                  {props.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === 'right' ? 'text-right' : '',
                        column.key === props.columns[0]?.key
                          ? 'font-medium'
                          : '',
                      )}
                    >
                      {row[column.key] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={props.columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {props.emptyMessage ??
                    'No records found for the selected filters.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CustomTableContainer>
    </div>
  );
}

export function ReportsStatusBadge(props: { label: string }) {
  const label = props.label.toLowerCase();
  const className =
    label.includes('approved') ||
    label.includes('paid') ||
    label.includes('published')
      ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
      : label.includes('pending') ||
          label.includes('draft') ||
          label.includes('generated')
        ? 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:text-amber-300'
        : label.includes('rejected') ||
            label.includes('cancelled') ||
            label.includes('void')
          ? 'border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:text-rose-300'
          : 'border-slate-200 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-300';

  return (
    <Badge variant="outline" className={className}>
      {props.label}
    </Badge>
  );
}
