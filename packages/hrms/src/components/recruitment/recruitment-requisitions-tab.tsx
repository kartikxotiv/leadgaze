'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { RecruitmentStatusBadge } from '../../pages/recruitment/page.components';
import { formatLabel } from '../../pages/recruitment/page.data';
import type { RecruitmentRequisitionSummary } from '../../types/recruitment.type';

export function RecruitmentRequisitionsTab(props: {
  canEditRequisition: boolean;
  onDelete: (id: string) => void;
  onEdit: (requisition: RecruitmentRequisitionSummary) => void;
  requisitions: RecruitmentRequisitionSummary[];
}) {
  return (
    <div className="grid gap-3">
      <RecruitmentTableHeader
        title="Job Requisitions"
        description="HR and admins can raise, assign, prioritize, and track open demand."
      />
      <CustomTableContainer>
        <Table>
          <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead>Requisition</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="bg-card sticky right-0 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.requisitions.length ? (
              props.requisitions.map((requisition) => (
                <TableRow key={requisition.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{requisition.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {requisition.requisition_code} - {requisition.openings}{' '}
                        opening(s)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{requisition.department?.name ?? '-'}</TableCell>
                  <TableCell>
                    {requisition.owner_employee?.name ?? '-'}
                  </TableCell>
                  <TableCell>
                    {requisition.candidate_count} candidates -{' '}
                    {requisition.interviews_count} interviews
                  </TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge
                      label={formatLabel(requisition.status)}
                    />
                  </TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    {props.canEditRequisition ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => props.onEdit(requisition)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => props.onDelete(requisition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center">
                  No requisitions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CustomTableContainer>
    </div>
  );
}

function RecruitmentTableHeader(props: { description: string; title: string }) {
  return (
    <div className="px-1">
      <h2 className="text-base font-semibold leading-tight">{props.title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{props.description}</p>
    </div>
  );
}
