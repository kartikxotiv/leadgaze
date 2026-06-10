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
import type { RecruitmentCandidateSummary } from '../../types/recruitment.type';

export function RecruitmentCandidatesTab(props: {
  canAddNotes: boolean;
  canManageCandidates: boolean;
  canRecordFeedback: boolean;
  candidates: RecruitmentCandidateSummary[];
  latestInterviewIdForCandidate: (candidateId: string) => string | null;
  onAddFeedback: (interviewId: string | null) => void;
  onAddNote: (candidateId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (candidate: RecruitmentCandidateSummary) => void;
}) {
  return (
    <div className="grid gap-3">
      <RecruitmentTableHeader
        title="Candidates"
        description="Track status-wise candidate progress, ownership, notes, and feedback context."
      />
      <CustomTableContainer>
        <Table>
          <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Requisition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="bg-card sticky right-0 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.candidates.length ? (
              props.candidates.map((candidate) => (
                <TableRow key={candidate.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{candidate.full_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {candidate.email} -{' '}
                        {candidate.source ?? 'Unknown source'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{candidate.requisition_title}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge
                      label={formatLabel(candidate.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {candidate.notes_count} notes - {candidate.feedback_count}{' '}
                    feedback
                  </TableCell>
                  <TableCell>{candidate.owner_employee?.name ?? '-'}</TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      {props.canManageCandidates ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEdit(candidate)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDelete(candidate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {props.canAddNotes ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => props.onAddNote(candidate.id)}
                        >
                          Note
                        </Button>
                      ) : null}
                      {props.canRecordFeedback ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            props.onAddFeedback(
                              props.latestInterviewIdForCandidate(candidate.id),
                            )
                          }
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
                  No candidates yet.
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
