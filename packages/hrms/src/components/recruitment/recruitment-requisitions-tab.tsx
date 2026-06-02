'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { RecruitmentRequisitionSummary } from '~/types/recruitment.type';

import { formatLabel } from '../page.data';
import { RecruitmentStatusBadge } from '../page.components';

export function RecruitmentRequisitionsTab(props: {
  canEditRequisition: boolean;
  onDelete: (id: string) => void;
  onEdit: (requisition: RecruitmentRequisitionSummary) => void;
  requisitions: RecruitmentRequisitionSummary[];
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Job Requisitions</CardTitle>
        <CardDescription>
          HR and admins can raise, assign, prioritize, and track open demand.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requisition</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.requisitions.length ? (
              props.requisitions.map((requisition) => (
                <TableRow key={requisition.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{requisition.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {requisition.requisition_code} - {requisition.openings} opening(s)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{requisition.department?.name ?? '-'}</TableCell>
                  <TableCell>{requisition.owner_employee?.name ?? '-'}</TableCell>
                  <TableCell>
                    {requisition.candidate_count} candidates - {requisition.interviews_count} interviews
                  </TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(requisition.status)} />
                  </TableCell>
                  <TableCell className="text-right">
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
      </CardContent>
    </Card>
  );
}
