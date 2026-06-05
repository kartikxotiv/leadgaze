import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';

import type {
  ApiResponse,
  ExitChecklistItemOption,
} from '../../types/separation.type';

type ChecklistItemDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  editingItem: ExitChecklistItemOption | null;
  onSuccess: () => Promise<void>;
};

const INITIAL_FORM = {
  title: '',
  description: '',
};

export function ChecklistItemDialog({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
}: ChecklistItemDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(
      editingItem
        ? {
            title: editingItem.title,
            description: editingItem.description ?? '',
          }
        : INITIAL_FORM,
    );
  }, [editingItem, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/hrms/separation/exit-checklist-items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
        }),
      });
      const json = (await response
        .json()
        .catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(json?.message || 'Failed to save checklist item');
      }

      toast.success(json?.message || 'Checklist item saved successfully');
      onClose();
      await onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save checklist item',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="checklist-item-title">Title</Label>
            <Input
              id="checklist-item-title"
              required
              maxLength={255}
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checklist-item-description">Description</Label>
            <Textarea
              id="checklist-item-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
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
            <Button type="submit" disabled={isSubmitting || !form.title.trim()}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
