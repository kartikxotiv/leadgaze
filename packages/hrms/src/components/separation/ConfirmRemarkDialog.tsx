import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';

export type ConfirmDialogProps = {
  title: string;
  description: string;
  actionLabel: string;
  isDestructive?: boolean;
  onConfirm: (remark: string) => Promise<void>;
} | null;

interface ConfirmRemarkDialogProps {
  config: ConfirmDialogProps;
  onClose: () => void;
  isSubmitting: boolean;
}

export function ConfirmRemarkDialog({ config, onClose, isSubmitting }: ConfirmRemarkDialogProps) {
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (config) {
      setRemark('');
    }
  }, [config]);

  if (!config) return null;

  return (
    <Dialog open={Boolean(config)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription className="text-base">{config.description}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label htmlFor="action-confirm-remark">Remark (optional)</Label>
              <Textarea
                id="action-confirm-remark"
                placeholder="Add a remark…"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={config.isDestructive ? 'destructive' : 'default'}
              disabled={isSubmitting}
              onClick={() => config.onConfirm(remark)}
            >
              {isSubmitting ? 'Saving…' : config.actionLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
