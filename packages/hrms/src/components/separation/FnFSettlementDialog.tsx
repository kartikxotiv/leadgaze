import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  ApiResponse,
  EmployeeOption,
  FnfSettlementOption,
  PayrollRunOption,
} from '../../types/separation.type';
import {
  NONE,
  formatNumberInput,
  toDateInput,
} from '../../utils/separation-utils';

interface FnFSettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingFnf: FnfSettlementOption | null;
  employees: EmployeeOption[];
  payrollRuns: PayrollRunOption[];
  onSuccess: () => Promise<void>;
}

interface FnFSettlementForm {
  employee_id: string;
  payroll_run_id: string;
  last_working_day: string;
  leave_encashment: string;
  gratuity: string;
  notice_recovery: string;
  total_payable: string;
  tds_on_fnf: string;
  net_payable: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';
  settlement_date: string;
}

const INITIAL_FORM: FnFSettlementForm = {
  employee_id: '',
  payroll_run_id: NONE,
  last_working_day: '',
  leave_encashment: '0',
  gratuity: '0',
  notice_recovery: '0',
  total_payable: '0',
  tds_on_fnf: '0',
  net_payable: '0',
  status: 'DRAFT',
  settlement_date: '',
};

export function FnFSettlementDialog({
  isOpen,
  onClose,
  editingFnf,
  employees,
  payrollRuns,
  onSuccess,
}: FnFSettlementDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (editingFnf) {
      setForm({
        employee_id: editingFnf.employee_id,
        payroll_run_id: editingFnf.payroll_run_id ?? NONE,
        last_working_day: toDateInput(editingFnf.last_working_day),
        leave_encashment: String(editingFnf.leave_encashment ?? 0),
        gratuity: String(editingFnf.gratuity ?? 0),
        notice_recovery: String(editingFnf.notice_recovery ?? 0),
        total_payable: String(editingFnf.total_payable ?? 0),
        tds_on_fnf: String(editingFnf.tds_on_fnf ?? 0),
        net_payable: String(editingFnf.net_payable ?? 0),
        status: editingFnf.status,
        settlement_date: toDateInput(editingFnf.settlement_date),
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [editingFnf, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);

    const path = editingFnf
      ? `/api/hrms/separation/fnf-settlements/${editingFnf.id}`
      : '/api/hrms/separation/fnf-settlements';

    const payload = {
      employee_id: form.employee_id,
      payroll_run_id:
        form.payroll_run_id === NONE || !form.payroll_run_id
          ? null
          : form.payroll_run_id,
      last_working_day: form.last_working_day,
      components: editingFnf?.components ?? [],
      leave_encashment: Number(form.leave_encashment || 0),
      gratuity: Number(form.gratuity || 0),
      notice_recovery: Number(form.notice_recovery || 0),
      total_payable: Number(form.total_payable || 0),
      tds_on_fnf: Number(form.tds_on_fnf || 0),
      net_payable: Number(form.net_payable || 0),
      status: form.status,
      settlement_date: form.settlement_date || null,
    };

    try {
      const response = await fetch(path, {
        method: editingFnf ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response
        .json()
        .catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(json?.message || 'Failed to save FnF settlement');
      }

      toast.success(json?.message || 'FnF settlement saved successfully');
      onClose();
      await onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save FnF settlement',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-3xl dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">
              {editingFnf ? 'Edit FnF Record' : 'Add FnF Record'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the settlement details for the employee exit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, employee_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {[employee.first_name, employee.last_name]
                          .filter(Boolean)
                          .join(' ') || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payroll Run</Label>
                <Select
                  value={form.payroll_run_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, payroll_run_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payroll run" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {payrollRuns.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.name || run.period || run.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fnf-last-working-day">Last Working Day</Label>
                <Input
                  id="fnf-last-working-day"
                  type="date"
                  required
                  value={form.last_working_day}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      last_working_day: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(
                    value:
                      | 'DRAFT'
                      | 'PENDING_APPROVAL'
                      | 'APPROVED'
                      | 'PAID'
                      | 'REJECTED',
                  ) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">
                      PENDING_APPROVAL
                    </SelectItem>
                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leave-encashment">Leave Encashment</Label>
                <Input
                  id="leave-encashment"
                  type="number"
                  step="0.01"
                  value={form.leave_encashment}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      leave_encashment: formatNumberInput(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gratuity">Gratuity</Label>
                <Input
                  id="gratuity"
                  type="number"
                  step="0.01"
                  value={form.gratuity}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      gratuity: formatNumberInput(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice-recovery">Notice Recovery</Label>
                <Input
                  id="notice-recovery"
                  type="number"
                  step="0.01"
                  value={form.notice_recovery}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notice_recovery: formatNumberInput(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-payable">Total Payable</Label>
                <Input
                  id="total-payable"
                  type="number"
                  step="0.01"
                  value={form.total_payable}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      total_payable: formatNumberInput(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tds-on-fnf">TDS on FnF</Label>
                <Input
                  id="tds-on-fnf"
                  type="number"
                  step="0.01"
                  value={form.tds_on_fnf}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      tds_on_fnf: formatNumberInput(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="net-payable">Net Payable</Label>
                <Input
                  id="net-payable"
                  type="number"
                  step="0.01"
                  value={form.net_payable}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      net_payable: formatNumberInput(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settlement-date">Settlement Date</Label>
                <Input
                  id="settlement-date"
                  type="date"
                  value={form.settlement_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      settlement_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
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
                isSubmitting || !form.employee_id || !form.last_working_day
              }
            >
              {isSubmitting ? 'Saving...' : editingFnf ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
