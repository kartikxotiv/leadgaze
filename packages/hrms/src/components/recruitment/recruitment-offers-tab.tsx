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

import { formatCurrency, formatDate } from '../../hooks/recruitment-formatters';
import { RecruitmentStatusBadge } from '../../pages/recruitment/page.components';
import { formatLabel } from '../../pages/recruitment/page.data';
import type { RecruitmentOfferSummary } from '../../types/recruitment.type';

export function RecruitmentOffersTab(props: {
  canManageOffers: boolean;
  canManageOnboarding: boolean;
  offers: RecruitmentOfferSummary[];
  onCreateChecklist: (candidateId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (offer: RecruitmentOfferSummary) => void;
}) {
  return (
    <div className="grid gap-2">
      <RecruitmentTableHeader
        title="Offers"
        description="Manage offer preparation, approvals, release, response, and joining plans."
      />
      <CustomTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Compensation</TableHead>
              <TableHead>Joining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sticky right-0 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.offers.length ? (
              props.offers.map((offer) => (
                <TableRow key={offer.id} className="hover:bg-muted/50">
                  <TableCell>{offer.candidate_name}</TableCell>
                  <TableCell>{offer.offered_designation}</TableCell>
                  <TableCell>
                    {formatCurrency(offer.salary_amount, offer.currency_code)}
                  </TableCell>
                  <TableCell>{formatDate(offer.joining_date)}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(offer.status)} />
                  </TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      {props.canManageOffers ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEdit(offer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDelete(offer.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {props.canManageOnboarding ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            props.onCreateChecklist(offer.candidate_id)
                          }
                        >
                          Checklist
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center">
                  No offers created yet.
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
