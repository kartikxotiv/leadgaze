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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="action-confirm-remark">Remark (optional)</Label>
          <Textarea
            id="action-confirm-remark"
            placeholder="Add a remark…"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
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
      </DialogContent>
    </Dialog>
  );
}
