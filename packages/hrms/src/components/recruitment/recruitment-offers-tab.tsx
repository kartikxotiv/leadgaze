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
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Offers</CardTitle>
        <CardDescription>
          Manage offer preparation, approvals, release, response, and joining
          plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Compensation</TableHead>
              <TableHead>Joining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.offers.length ? (
              props.offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>{offer.candidate_name}</TableCell>
                  <TableCell>{offer.offered_designation}</TableCell>
                  <TableCell>
                    {formatCurrency(offer.salary_amount, offer.currency_code)}
                  </TableCell>
                  <TableCell>{formatDate(offer.joining_date)}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(offer.status)} />
                  </TableCell>
                  <TableCell className="text-right">
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
      </CardContent>
    </Card>
  );
}
