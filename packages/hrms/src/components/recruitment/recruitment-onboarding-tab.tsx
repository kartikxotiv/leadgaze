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

import { formatDate } from '../../hooks/recruitment-formatters';
import { RecruitmentStatusBadge } from '../../pages/recruitment/page.components';
import { formatLabel } from '../../pages/recruitment/page.data';
import type { RecruitmentOnboardingTaskSummary } from '../../types/recruitment.type';

export function RecruitmentOnboardingTab(props: {
  canManageOnboarding: boolean;
  onDelete: (id: string) => void;
  onEdit: (task: RecruitmentOnboardingTaskSummary) => void;
  onboardingTasks: RecruitmentOnboardingTaskSummary[];
}) {
  return (
    <div className="grid gap-2">
      <RecruitmentTableHeader
        title="Onboarding Checklist"
        description="Track pre-joining tasks, owners, blockers, and completion dates."
      />
      <CustomTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sticky right-0 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.onboardingTasks.length ? (
              props.onboardingTasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/50">
                  <TableCell>{task.candidate_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {task.offer_designation ?? 'No linked offer'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{task.owner_employee?.name ?? '-'}</TableCell>
                  <TableCell>{formatDate(task.due_date)}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(task.status)} />
                  </TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    {props.canManageOnboarding ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => props.onEdit(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => props.onDelete(task.id)}
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
                  No onboarding tasks yet.
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
