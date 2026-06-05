'use client';

import { Badge } from '@kit/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import type {
  SeparationDialogKey,
  SeparationItem,
} from '../../types/separation.type';
import {
  type SeparationTableData,
  getSeparationTableRows,
} from '../../utils/separation-table-rows';
import type { ConfirmDialogProps } from './ConfirmRemarkDialog';
import {
  SeparationActionMenu,
  type SeparationActionsPermissions,
} from './SeparationActionMenu';

type SeparationOperationsTab = {
  key: string;
  label: string;
  addLabel: string;
  columns: string[];
};

type SeparationOperationsTabsProps = {
  tabs: SeparationOperationsTab[];
  selectedTabKey: string;
  onTabChange: (value: string) => void;
  tableData: SeparationTableData;
  currentEmployeeId: string | null;
  isSubmitting: boolean;
  permissions: SeparationActionsPermissions;
  onEdit: (item: SeparationItem, type: SeparationDialogKey) => void;
  onConfirmDialog: (config: NonNullable<ConfirmDialogProps>) => void;
  onUpdateStatus: (
    path: string,
    status: string,
    remark?: string,
    successMsg?: string,
  ) => Promise<void>;
  onDeleteResignation: (resignationId: string) => Promise<void>;
};

export function SeparationOperationsTabs({
  tabs,
  selectedTabKey,
  onTabChange,
  tableData,
  currentEmployeeId,
  isSubmitting,
  permissions,
  onEdit,
  onConfirmDialog,
  onUpdateStatus,
  onDeleteResignation,
}: SeparationOperationsTabsProps) {
  return (
    <Tabs value={selectedTabKey} onValueChange={onTabChange}>
      <TabsList className="h-auto flex-wrap justify-start">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="space-y-4 pt-2">
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  {tab.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSeparationTableRows(tab.key, tableData).map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell, index) => (
                      <TableCell key={index}>
                        {index === row.cells.length - 1 ? (
                          <Badge variant="outline">{String(cell)}</Badge>
                        ) : (
                          String(cell || '-')
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {tab.key === 'exit_checklist' ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <SeparationActionMenu
                          item={row.raw}
                          type={tab.key as SeparationDialogKey}
                          currentEmployeeId={currentEmployeeId}
                          isSubmitting={isSubmitting}
                          permissions={permissions}
                          onEdit={onEdit}
                          onConfirmDialog={onConfirmDialog}
                          onUpdateStatus={onUpdateStatus}
                          onDeleteResignation={onDeleteResignation}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {getSeparationTableRows(tab.key, tableData).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tab.columns.length + 1}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
