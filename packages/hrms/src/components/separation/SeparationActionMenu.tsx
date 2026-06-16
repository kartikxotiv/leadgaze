'use client';

import { MoreHorizontal, MoreVertical } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

import type {
  AssetClearanceOption,
  ExitLetterOption,
  FnfSettlementOption,
  ResignationOption,
  SeparationDialogKey,
  SeparationItem,
} from '../../types/separation.type';
import type { ConfirmDialogProps } from './ConfirmRemarkDialog';

export type SeparationActionsPermissions = {
  canManageAssets: boolean;
  canManageChecklist: boolean;
  canManageFnF: boolean;
  canManageLetters: boolean;
  canManageResignations: boolean;
};

type ConfirmDialogConfig = NonNullable<ConfirmDialogProps>;

type SeparationActionMenuProps = {
  item: SeparationItem;
  type: SeparationDialogKey;
  currentEmployeeId: string | null;
  isSubmitting: boolean;
  permissions: SeparationActionsPermissions;
  onEdit: (item: SeparationItem, type: SeparationDialogKey) => void;
  onConfirmDialog: (config: ConfirmDialogConfig) => void;
  onUpdateStatus: (
    path: string,
    status: string,
    remark?: string,
    successMsg?: string,
  ) => Promise<void>;
  onDeleteResignation: (resignationId: string) => Promise<void>;
};

function canEditType(
  type: SeparationDialogKey,
  permissions: SeparationActionsPermissions,
) {
  if (type === 'resignation') return permissions.canManageResignations;
  if (type === 'employee_checklist') return permissions.canManageChecklist;
  if (type === 'asset_clearance') return permissions.canManageAssets;
  if (type === 'fnf_settlement') return permissions.canManageFnF;
  if (type === 'letters') return permissions.canManageLetters;

  return false;
}

export function SeparationActionMenu({
  item,
  type,
  currentEmployeeId,
  isSubmitting,
  permissions,
  onEdit,
  onConfirmDialog,
  onUpdateStatus,
  onDeleteResignation,
}: SeparationActionMenuProps) {
  const resignation =
    type === 'resignation' ? (item as ResignationOption) : null;
  const canRemoveOwnResignation = Boolean(
    resignation &&
      resignation.employee_id === currentEmployeeId &&
      resignation.status !== 'ACCEPTED',
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={isSubmitting}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEditType(type, permissions) && (
          <DropdownMenuItem onClick={() => onEdit(item, type)}>
            Edit
          </DropdownMenuItem>
        )}
        {type === 'resignation' && permissions.canManageResignations && (
          <ResignationStatusActions
            item={item as ResignationOption}
            onConfirmDialog={onConfirmDialog}
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {canRemoveOwnResignation && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              onConfirmDialog({
                title: 'Remove Resignation',
                description: 'Remove your resignation request?',
                actionLabel: 'Remove',
                isDestructive: true,
                onConfirm: () => onDeleteResignation(item.id),
              })
            }
          >
            Remove
          </DropdownMenuItem>
        )}
        {type === 'asset_clearance' && permissions.canManageAssets && (
          <AssetClearanceStatusActions
            item={item as AssetClearanceOption}
            onConfirmDialog={onConfirmDialog}
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {type === 'fnf_settlement' && permissions.canManageFnF && (
          <FnFSettlementStatusActions
            item={item as FnfSettlementOption}
            onConfirmDialog={onConfirmDialog}
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {type === 'letters' && permissions.canManageLetters && (
          <ExitLetterStatusActions
            item={item as ExitLetterOption}
            onConfirmDialog={onConfirmDialog}
            onUpdateStatus={onUpdateStatus}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ResignationStatusActions({
  item,
  onConfirmDialog,
  onUpdateStatus,
}: {
  item: ResignationOption;
  onConfirmDialog: (config: ConfirmDialogConfig) => void;
  onUpdateStatus: SeparationActionMenuProps['onUpdateStatus'];
}) {
  return (
    <>
      {item.status !== 'RETRACTED' && (
        <DropdownMenuItem
          disabled={item.status === 'ACCEPTED'}
          onClick={() =>
            onConfirmDialog({
              title: 'Approve Resignation',
              description: 'Approve this resignation?',
              actionLabel: 'Approve',
              onConfirm: (remark) =>
                onUpdateStatus(
                  `/api/hrms/separation/resignations/${item.id}`,
                  'ACCEPTED',
                  remark,
                ),
            })
          }
        >
          Approve
        </DropdownMenuItem>
      )}
      {item.status !== 'ACCEPTED' && (
        <DropdownMenuItem
          disabled={item.status === 'RETRACTED'}
          className="text-destructive"
          onClick={() =>
            onConfirmDialog({
              title: 'Reject Resignation',
              description: 'Reject this resignation?',
              actionLabel: 'Reject',
              isDestructive: true,
              onConfirm: (remark) =>
                onUpdateStatus(
                  `/api/hrms/separation/resignations/${item.id}`,
                  'RETRACTED',
                  remark,
                ),
            })
          }
        >
          Reject
        </DropdownMenuItem>
      )}
    </>
  );
}

function AssetClearanceStatusActions({
  item,
  onConfirmDialog,
  onUpdateStatus,
}: {
  item: AssetClearanceOption;
  onConfirmDialog: (config: ConfirmDialogConfig) => void;
  onUpdateStatus: SeparationActionMenuProps['onUpdateStatus'];
}) {
  return (
    <>
      {item.status !== 'WAIVED' && (
        <DropdownMenuItem
          disabled={item.status === 'RETURNED'}
          onClick={() =>
            onConfirmDialog({
              title: 'Mark Returned',
              description: 'Mark asset as returned?',
              actionLabel: 'Returned',
              onConfirm: (remark) =>
                onUpdateStatus(
                  `/api/hrms/separation/asset-clearances/${item.id}`,
                  'RETURNED',
                  remark,
                ),
            })
          }
        >
          Returned
        </DropdownMenuItem>
      )}
      {item.status !== 'RETURNED' && (
        <DropdownMenuItem
          disabled={item.status === 'WAIVED'}
          onClick={() =>
            onConfirmDialog({
              title: 'Waive Asset',
              description: 'Waive this asset?',
              actionLabel: 'Waive',
              onConfirm: (remark) =>
                onUpdateStatus(
                  `/api/hrms/separation/asset-clearances/${item.id}`,
                  'WAIVED',
                  remark,
                ),
            })
          }
        >
          Waive
        </DropdownMenuItem>
      )}
    </>
  );
}

function FnFSettlementStatusActions({
  item,
  onConfirmDialog,
  onUpdateStatus,
}: {
  item: FnfSettlementOption;
  onConfirmDialog: (config: ConfirmDialogConfig) => void;
  onUpdateStatus: SeparationActionMenuProps['onUpdateStatus'];
}) {
  return (
    <>
      {(item.status === 'DRAFT' || item.status === 'PENDING_APPROVAL') && (
        <>
          <DropdownMenuItem
            onClick={() =>
              onConfirmDialog({
                title: 'Approve FnF',
                description: 'Approve this settlement?',
                actionLabel: 'Approve',
                onConfirm: (remark) =>
                  onUpdateStatus(
                    `/api/hrms/separation/fnf-settlements/${item.id}`,
                    'APPROVED',
                    remark,
                  ),
              })
            }
          >
            Approve
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              onConfirmDialog({
                title: 'Reject FnF',
                description: 'Reject this settlement?',
                actionLabel: 'Reject',
                isDestructive: true,
                onConfirm: (remark) =>
                  onUpdateStatus(
                    `/api/hrms/separation/fnf-settlements/${item.id}`,
                    'REJECTED',
                    remark,
                  ),
              })
            }
          >
            Reject
          </DropdownMenuItem>
        </>
      )}
      {item.status === 'APPROVED' && (
        <DropdownMenuItem
          onClick={() =>
            onConfirmDialog({
              title: 'Mark Paid',
              description: 'Mark as paid?',
              actionLabel: 'Paid',
              onConfirm: (remark) =>
                onUpdateStatus(
                  `/api/hrms/separation/fnf-settlements/${item.id}`,
                  'PAID',
                  remark,
                ),
            })
          }
        >
          Paid
        </DropdownMenuItem>
      )}
    </>
  );
}

function ExitLetterStatusActions({
  item,
  onConfirmDialog,
  onUpdateStatus,
}: {
  item: ExitLetterOption;
  onConfirmDialog: (config: ConfirmDialogConfig) => void;
  onUpdateStatus: SeparationActionMenuProps['onUpdateStatus'];
}) {
  if (item.status !== 'DRAFT') {
    return null;
  }

  return (
    <>
      <DropdownMenuItem
        onClick={() =>
          onConfirmDialog({
            title: 'Mark Issued',
            description: 'Mark letter as issued?',
            actionLabel: 'Issued',
            onConfirm: (remark) =>
              onUpdateStatus(
                `/api/hrms/separation/exit-letters/${item.id}`,
                'ISSUED',
                remark,
              ),
          })
        }
      >
        Issued
      </DropdownMenuItem>
      <DropdownMenuItem
        className="text-destructive"
        onClick={() =>
          onConfirmDialog({
            title: 'Cancel Letter',
            description: 'Cancel this letter?',
            actionLabel: 'Cancel',
            isDestructive: true,
            onConfirm: (remark) =>
              onUpdateStatus(
                `/api/hrms/separation/exit-letters/${item.id}`,
                'CANCELLED',
                remark,
              ),
          })
        }
      >
        Cancel
      </DropdownMenuItem>
    </>
  );
}
