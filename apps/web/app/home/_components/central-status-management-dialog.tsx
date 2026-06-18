'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Edit2, Plus, Settings } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { getAccountTypesService } from '~/services/accounts.service';
import { getLeadStatusesService } from '~/services/leads.service';
import { getOpportunityStatusesService } from '~/services/opportunities.service';

import {
  StatusItem,
  StatusManagementDialog,
  StatusModuleKey,
} from './status-management-dialog';

interface CentralStatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialTab?: StatusModuleKey;
}

export function CentralStatusManagementDialog({
  open,
  onOpenChange,
  workspaceId,
  initialTab = 'leads',
}: CentralStatusManagementDialogProps) {
  const [activeTab, setActiveTab] = useState<StatusModuleKey>(initialTab);
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null);

  const { data: leadStatuses = [], refetch: refetchLeads } = useQuery<StatusItem[]>({
    queryKey: ['lead-statuses', workspaceId],
    queryFn: () => getLeadStatusesService(workspaceId) as Promise<StatusItem[]>,
    enabled: !!workspaceId && open,
  });

  const { data: opportunityStages = [], refetch: refetchOpportunities } = useQuery<StatusItem[]>({
    queryKey: ['opportunity-stages', workspaceId],
    queryFn: () => getOpportunityStatusesService(workspaceId) as Promise<StatusItem[]>,
    enabled: !!workspaceId && open,
  });

  const { data: accountTypes = [], refetch: refetchAccountTypes } = useQuery<StatusItem[]>({
    queryKey: ['account-types', workspaceId],
    queryFn: () => getAccountTypesService(workspaceId) as Promise<StatusItem[]>,
    enabled: !!workspaceId && open,
  });

  const openCreate = () => {
    setEditingStatus(null);
    setMgmtOpen(true);
  };

  const openEdit = (status: StatusItem) => {
    setEditingStatus(status);
    setMgmtOpen(true);
  };

  const handleSuccess = () => {
    if (activeTab === 'leads') {
      refetchLeads();
    } else if (activeTab === 'opportunities') {
      refetchOpportunities();
    } else {
      refetchAccountTypes();
    }
  };

  const addLabel =
    activeTab === 'leads' ? 'Status' : activeTab === 'opportunities' ? 'Stage' : 'Type';
  const entityLabel =
    activeTab === 'leads' ? 'Status' : activeTab === 'opportunities' ? 'Stage' : 'Type';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 sm:max-w-[620px] flex flex-col h-[620px]">
          <DialogHeader className="border-b px-6 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <DialogTitle>Manage Workspace Statuses</DialogTitle>
            </div>
            <DialogDescription>
              Configure pipeline stages for Leads, Opportunities, and Account Types.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as StatusModuleKey)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b px-6 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between py-2 shrink-0">
              <TabsList className="grid grid-cols-3 w-[400px]">
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="accounts">Account Types</TabsTrigger>
              </TabsList>

              <Button size="sm" onClick={openCreate} className="gap-1">
                <Plus className="h-4 w-4" />
                Add {addLabel}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="leads" className="m-0 space-y-4">
                <StatusList statuses={leadStatuses} onEdit={openEdit} entityLabel="Status" />
              </TabsContent>

              <TabsContent value="opportunities" className="m-0 space-y-4">
                <StatusList statuses={opportunityStages} onEdit={openEdit} entityLabel="Stage" />
              </TabsContent>

              <TabsContent value="accounts" className="m-0 space-y-4">
                <StatusList statuses={accountTypes} onEdit={openEdit} entityLabel="Type" />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Child StatusManagementDialog for create/edit/delete operations */}
      <StatusManagementDialog
        open={mgmtOpen}
        onOpenChange={setMgmtOpen}
        moduleKey={activeTab}
        workspaceId={workspaceId}
        existingStatus={editingStatus}
        onSuccess={handleSuccess}
      />
    </>
  );
}

interface StatusListProps {
  statuses: StatusItem[];
  onEdit: (status: StatusItem) => void;
  entityLabel: string;
}

function StatusList({ statuses, onEdit, entityLabel }: StatusListProps) {
  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="text-sm">No custom {entityLabel.toLowerCase()}s defined.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border divide-y bg-background">
      {statuses.map((status) => (
        <div
          key={status.id}
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: status.color }}
            />
            <div>
              <p className="text-sm font-medium">{status.status_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {status.is_system && (
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    System
                  </span>
                )}
                {status.is_closed && (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Closed
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(status)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
