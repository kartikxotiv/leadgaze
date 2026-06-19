'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { getAccountTypesService } from '~/services/accounts.service';
import { getLeadStatusesService } from '~/services/leads.service';
import { getOpportunityStatusesService } from '~/services/opportunities.service';

import { CentralStatusManagementDialog } from './central-status-management-dialog';
import { StatusItem, StatusModuleKey } from './status-management-dialog';

interface ManageableStatusSelectProps {
  moduleKey: StatusModuleKey;
  workspaceId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Passed through to the SelectTrigger className */
  triggerClassName?: string;
  filter?: (statuses: StatusItem[]) => StatusItem[];
}

export function ManageableStatusSelect({
  moduleKey,
  workspaceId,
  value,
  onValueChange,
  disabled = false,
  placeholder,
  triggerClassName,
  filter,
}: ManageableStatusSelectProps) {
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  const queryKey =
    moduleKey === 'leads'
      ? ['lead-statuses', workspaceId]
      : moduleKey === 'opportunities'
        ? ['opportunity-stages', workspaceId]
        : ['account-types', workspaceId];

  const { data: rawStatuses = [] } = useQuery<StatusItem[]>({
    queryKey,
    queryFn: () =>
      moduleKey === 'leads'
        ? (getLeadStatusesService(workspaceId) as Promise<StatusItem[]>)
        : moduleKey === 'opportunities'
          ? (getOpportunityStatusesService(workspaceId) as Promise<
              StatusItem[]
            >)
          : (getAccountTypesService(workspaceId) as Promise<StatusItem[]>),
    enabled: !!workspaceId,
  });

  const statuses = filter ? filter(rawStatuses) : rawStatuses;

  const openManagement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectOpen(false);
    setMgmtOpen(true);
  };

  const entityLabel =
    moduleKey === 'leads'
      ? 'Status'
      : moduleKey === 'opportunities'
        ? 'Stage'
        : 'Type';
  const defaultPlaceholder =
    placeholder ?? `Select ${entityLabel.toLowerCase()}`;

  return (
    <>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        open={selectOpen}
        onOpenChange={setSelectOpen}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={defaultPlaceholder}>
            {value
              ? (() => {
                  const found = statuses.find((s) => s.id === value);
                  return found ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: found.color }}
                      />
                      <span>{found.status_name}</span>
                    </div>
                  ) : (
                    defaultPlaceholder
                  );
                })()
              : defaultPlaceholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status.id} value={status.id} className="pr-2">
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="truncate">{status.status_name}</span>
                </div>
              </div>
            </SelectItem>
          ))}

          {/* Divider + Manage statuses button */}
          <div className="mt-1 border-t pt-1">
            <button
              type="button"
              onClick={openManagement}
              className="text-primary hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage{' '}
              {moduleKey === 'leads'
                ? 'Statuses'
                : moduleKey === 'opportunities'
                  ? 'Stages'
                  : 'Types'}
            </button>
          </div>
        </SelectContent>
      </Select>

      {/* Centralized status management dialog */}
      <CentralStatusManagementDialog
        open={mgmtOpen}
        onOpenChange={setMgmtOpen}
        workspaceId={workspaceId}
        initialTab={moduleKey}
      />
    </>
  );
}
