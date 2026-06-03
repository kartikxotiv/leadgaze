import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import { EmployeeOption, ResignationOption, ApiResponse } from '../types';
import {
  NONE,
  toDateInput,
  toDateTimeLocalInput,
  toIsoDateTime,
  formatNumberInput,
  parseNullableNumber,
} from '../utils/separation-utils';

interface ResignationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingResignation: ResignationOption | null;
  employees: EmployeeOption[];
  currentEmployeeId: string | null;
  canManageResignations: boolean;
  onSuccess: () => Promise<void>;
}

interface ResignationForm {
  employee_id: string;
  resignation_date: string;
  last_working_day: string;
  notice_period_days: string;
  notice_waiver_days: string;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'RETRACTED';
  remarks: string;
  accepted_by: string;
  accepted_at: string;
}

const INITIAL_FORM: ResignationForm = {
  employee_id: '',
  resignation_date: '',
  last_working_day: '',
  notice_period_days: '',
  notice_waiver_days: '0',
  reason: '',
  status: 'SUBMITTED',
  remarks: '',
  accepted_by: NONE,
  accepted_at: '',
};

export function ResignationDialog({
  isOpen,
  onClose,
  editingResignation,
  employees,
  currentEmployeeId,
  canManageResignations,
  onSuccess,
}: ResignationDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (editingResignation) {
      setForm({
        employee_id: editingResignation.employee_id,
        resignation_date: toDateInput(editingResignation.resignation_date),
        last_working_day: toDateInput(editingResignation.last_working_day),
        notice_period_days:
          editingResignation.notice_period_days === null
            ? ''
            : String(editingResignation.notice_period_days),
        notice_waiver_days: String(editingResignation.notice_waiver_days ?? 0),
        reason: editingResignation.reason ?? '',
        status: editingResignation.status,
        remarks: editingResignation.remarks ?? '',
        accepted_by: editingResignation.accepted_by ?? NONE,
        accepted_at: toDateTimeLocalInput(editingResignation.accepted_at),
      });
    } else {
      setForm({
        ...INITIAL_FORM,
        employee_id: canManageResignations ? '' : (currentEmployeeId ?? ''),
      });
    }
  }, [canManageResignations, currentEmployeeId, editingResignation, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const path = editingResignation
      ? `/api/resignations/${editingResignation.id}`
      : '/api/resignations';

    const payload = canManageResignations
      ? {
        employee_id: form.employee_id,
        resignation_date: form.resignation_date,
        last_working_day: form.last_working_day || null,
        notice_period_days: parseNullableNumber(form.notice_period_days),
        notice_waiver_days: Number(form.notice_waiver_days || 0),
        reason: form.reason,
        status: form.status,
        remarks: form.remarks || null,
        accepted_by: form.accepted_by === NONE ? null : form.accepted_by,
        accepted_at: toIsoDateTime(form.accepted_at),
      }
      : {
        employee_id: currentEmployeeId,
        resignation_date: form.resignation_date,
        reason: form.reason,
      };

    try {
      const response = await fetch(path, {
        method: editingResignation ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(json?.message || 'Failed to save resignation');
      }

      toast.success(json?.message || 'Resignation saved successfully');
      onClose();
      await onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save resignation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingResignation
                ? 'Edit Resignation'
                : canManageResignations
                  ? 'Add Resignation'
                  : 'Apply Resignation'}
            </DialogTitle>
            <DialogDescription>
              {canManageResignations
                ? 'Update resignation review, notice, approver, and remarks.'
                : 'Submit your resignation request for HR review.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {canManageResignations && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, employee_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resignation-date">Resignation Date</Label>
              <Input
                id="resignation-date"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={form.resignation_date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, resignation_date: event.target.value }))
                }
              />
            </div>

            {canManageResignations && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="last-working-day">Last Working Day</Label>
                  <Input
                    id="last-working-day"
                    type="date"
                    value={form.last_working_day}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, last_working_day: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notice-period-days">Notice Period Days</Label>
                  <Input
                    id="notice-period-days"
                    type="number"
                    min={0}
                    value={form.notice_period_days}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notice_period_days: formatNumberInput(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notice-waiver-days">Notice Waiver Days</Label>
                  <Input
                    id="notice-waiver-days"
                    type="number"
                    min={0}
                    value={form.notice_waiver_days}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notice_waiver_days: formatNumberInput(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'RETRACTED') => setForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="RETRACTED">Retracted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Accepted By</Label>
                  <Select
                    value={form.accepted_by}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, accepted_by: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accepted-at">Accepted At</Label>
                  <Input
                    id="accepted-at"
                    type="datetime-local"
                    value={form.accepted_at}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, accepted_at: event.target.value }))
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resignation-reason">Reason</Label>
              <Textarea
                id="resignation-reason"
                required
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </div>

            {canManageResignations && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="resignation-remarks">Remarks</Label>
                <Textarea
                  id="resignation-remarks"
                  value={form.remarks}
                  onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !form.employee_id ||
                (!canManageResignations && !currentEmployeeId)
              }
            >
              {isSubmitting
                ? 'Saving...'
                : editingResignation
                  ? 'Update'
                  : canManageResignations
                    ? 'Create'
                    : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
