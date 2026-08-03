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

import { formatDateTime } from '../../hooks/recruitment-formatters';
import { RecruitmentStatusBadge } from '../../pages/recruitment/page.components';
import { formatLabel } from '../../pages/recruitment/page.data';
import type { RecruitmentInterviewSummary } from '../../types/recruitment.type';

export function RecruitmentInterviewsTab(props: {
  canRecordFeedback: boolean;
  canScheduleInterviews: boolean;
  interviews: RecruitmentInterviewSummary[];
  onAddFeedback: (interviewId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (interview: RecruitmentInterviewSummary) => void;
}) {
  return (
    <div className="grid gap-2">
      <RecruitmentTableHeader
        title="Interviews"
        description="Schedule interview rounds, assign interviewers, and monitor pending feedback."
      />
      <CustomTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interview</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Interviewer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sticky right-0 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.interviews.length ? (
              props.interviews.map((interview) => (
                <TableRow key={interview.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{interview.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatLabel(interview.round_type)} -{' '}
                        {interview.feedback_count} feedback
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{interview.candidate_name}</TableCell>
                  <TableCell>
                    {formatDateTime(interview.scheduled_at)}
                  </TableCell>
                  <TableCell>
                    {interview.interviewer_employee?.name ?? '-'}
                  </TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge
                      label={formatLabel(interview.status)}
                    />
                  </TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      {props.canScheduleInterviews ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEdit(interview)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDelete(interview.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {props.canRecordFeedback ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => props.onAddFeedback(interview.id)}
                        >
                          Feedback
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center">
                  No interviews scheduled yet.
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
      <h2 className="primary-heading leading-tight text-leadgaze-dark dark:text-white">{props.title}</h2>
      <p className="primary-text-regular text-muted-foreground mt-1">{props.description}</p>
    </div>
  );
}
