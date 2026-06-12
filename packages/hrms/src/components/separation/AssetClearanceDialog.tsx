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

import type {
  ApiResponse,
  AssetClearanceOption,
  EmployeeOption,
} from '../../types/separation.type';
import {
  NONE,
  toDateInput,
  toDateTimeLocalInput,
  toIsoDateTime,
} from '../../utils/separation-utils';

interface AssetClearanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingAsset: AssetClearanceOption | null;
  employees: EmployeeOption[];
  activeEmployees: EmployeeOption[];
  resignationOptions: { id: string; label: string }[];
  fetchResignationIdForEmployee: (employeeId: string) => Promise<string>;
  onSuccess: () => Promise<void>;
}

interface AssetClearanceForm {
  employee_id: string;
  resignation_id: string;
  asset_name: string;
  asset_tag: string;
  issued_date: string;
  returned_date: string;
  condition_at_return: 'PENDING' | 'GOOD' | 'DAMAGED' | 'LOST';
  remarks: string;
  status: 'PENDING' | 'RETURNED' | 'WAIVED';
  cleared_by: string;
  cleared_at: string;
}

const INITIAL_FORM: AssetClearanceForm = {
  employee_id: '',
  resignation_id: NONE,
  asset_name: '',
  asset_tag: '',
  issued_date: '',
  returned_date: '',
  condition_at_return: 'PENDING',
  remarks: '',
  status: 'PENDING',
  cleared_by: NONE,
  cleared_at: '',
};

export function AssetClearanceDialog({
  isOpen,
  onClose,
  editingAsset,
  employees,
  activeEmployees,
  resignationOptions,
  fetchResignationIdForEmployee,
  onSuccess,
}: AssetClearanceDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (editingAsset) {
      setForm({
        employee_id: editingAsset.employee_id,
        resignation_id: editingAsset.resignation_id ?? NONE,
        asset_name: editingAsset.asset_name,
        asset_tag: editingAsset.asset_tag ?? '',
        issued_date: toDateInput(editingAsset.issued_date),
        returned_date: toDateInput(editingAsset.returned_date),
        condition_at_return: editingAsset.condition_at_return,
        remarks: editingAsset.remarks ?? '',
        status: editingAsset.status,
        cleared_by: editingAsset.cleared_by ?? NONE,
        cleared_at: toDateTimeLocalInput(editingAsset.cleared_at),
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [editingAsset, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const path = editingAsset
      ? `/api/hrms/separation/asset-clearances/${editingAsset.id}`
      : '/api/hrms/separation/asset-clearances';

    const payload = {
      employee_id: form.employee_id,
      resignation_id: form.resignation_id === NONE ? null : form.resignation_id,
      asset_name: form.asset_name,
      asset_tag: form.asset_tag || null,
      issued_date: form.issued_date || null,
      returned_date: form.returned_date || null,
      condition_at_return: form.condition_at_return,
      remarks: form.remarks || null,
      status: form.status,
      cleared_by: form.cleared_by === NONE ? null : form.cleared_by,
      cleared_at: toIsoDateTime(form.cleared_at),
    };

    try {
      const response = await fetch(path, {
        method: editingAsset ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(json?.message || 'Failed to save asset clearance');
      }

      toast.success(json?.message || 'Asset clearance saved successfully');
      onClose();
      await onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save asset clearance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">{editingAsset ? 'Edit Asset Clearance' : 'Add Asset Clearance'}</DialogTitle>
            <DialogDescription className="text-base">
              All asset clearance fields are available below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={async (value) => {
                    setForm((prev) => ({ ...prev, employee_id: value }));
                    if (!editingAsset) {
                      const resId = await fetchResignationIdForEmployee(value);
                      if (resId !== NONE) {
                        setForm((prev) => ({ ...prev, resignation_id: resId }));
                      }
                    }
                  }}
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

              <div className="space-y-2">
                <Label>Resignation</Label>
                <Select
                  value={form.resignation_id}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, resignation_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resignation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {resignationOptions.map((resignation) => (
                      <SelectItem key={resignation.id} value={resignation.id}>
                        {resignation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-name">Asset Name</Label>
                <Input
                  id="asset-name"
                  required
                  maxLength={255}
                  value={form.asset_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, asset_name: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-tag">Asset Tag</Label>
                <Input
                  id="asset-tag"
                  maxLength={100}
                  value={form.asset_tag}
                  onChange={(event) => setForm((prev) => ({ ...prev, asset_tag: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issued-date">Issued Date</Label>
                <Input
                  id="issued-date"
                  type="date"
                  value={form.issued_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, issued_date: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="returned-date">Returned Date</Label>
                <Input
                  id="returned-date"
                  type="date"
                  value={form.returned_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, returned_date: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Condition At Return</Label>
                <Select
                  value={form.condition_at_return}
                  onValueChange={(value: 'PENDING' | 'GOOD' | 'DAMAGED' | 'LOST') =>
                    setForm((prev) => ({ ...prev, condition_at_return: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="GOOD">GOOD</SelectItem>
                    <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                    <SelectItem value="LOST">LOST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: 'PENDING' | 'RETURNED' | 'WAIVED') => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="RETURNED">RETURNED</SelectItem>
                    <SelectItem value="WAIVED">WAIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cleared By</Label>
                <Select
                  value={form.cleared_by}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, cleared_by: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {activeEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cleared-at">Cleared At</Label>
                <Input
                  id="cleared-at"
                  type="datetime-local"
                  value={form.cleared_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, cleared_at: event.target.value }))}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="asset-remarks">Remarks</Label>
                <Textarea
                  id="asset-remarks"
                  value={form.remarks}
                  onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
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
            <Button type="submit" disabled={isSubmitting || !form.employee_id || !form.asset_name}>
              {isSubmitting ? 'Saving...' : editingAsset ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
