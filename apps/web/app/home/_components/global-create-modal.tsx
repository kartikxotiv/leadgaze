'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { cn } from '@kit/ui/utils';

import CreateLeadDialog from '../leads/components/create-lead-dialog';
import { CreateContactDialog } from '../contacts/components/create-contact-dialog';
import { CreateAccountDialog } from '../accounts/components/create-account-dialog';
import { OpportunityDialog } from '../opportunities/components/opportunity-dialog';
import { GlobalCreateReminderForm } from './global-create-reminder-form';
import { GlobalCreateNoteForm } from './global-create-note-form';

interface GlobalCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalCreateModal({ open, onOpenChange }: GlobalCreateModalProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname() || '';
  const isSalesModule = pathname.startsWith('/home/sales');
  
  // Right now we only support sales tabs, but we can expand this
  const tabs = isSalesModule ? [
    { id: 'lead', label: 'New Lead' },
    { id: 'contact', label: 'New Contact' },
    { id: 'account', label: 'New Account' },
    { id: 'opportunity', label: 'New Opportunity' },
    { id: 'reminder', label: 'New Reminder' },
    { id: 'note', label: 'New Note' },
  ] : [];

  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : '');

  const handleSuccess = () => {
    // Force all active queries (like the dashboard metrics) to refetch instantly
    queryClient.invalidateQueries();
    onOpenChange(false);
  };

  // Update active tab if module changes
  React.useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  if (tabs.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Quick Create</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center text-zinc-500">
            Quick create is not available in this module yet.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 overflow-hidden border-gray-200 bg-white sm:max-w-[800px] dark:border-slate-800 dark:bg-slate-950 [&>button>svg]:!text-gray-500 dark:[&>button>svg]:!text-gray-400 [&>button]:top-5 [&>button]:right-5">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-gray-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="sr-only">Create New Item</DialogTitle>
            {/* Tabs Header */}
            <div className="flex overflow-x-auto pl-4 pr-12 pt-4 hide-scrollbar">
              <div className="flex space-x-6 border-b border-transparent">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'whitespace-nowrap pb-3 text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                        : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Render Active Form Content */}
          <div className="flex flex-1 flex-col overflow-hidden min-h-0">
             {activeTab === 'lead' && (
                <CreateLeadDialog 
                  open={true} 
                  onOpenChange={() => {}} 
                  onSuccess={handleSuccess} 
                  asFormOnly 
                />
             )}
             {activeTab === 'contact' && (
                <CreateContactDialog 
                  open={true} 
                  onOpenChange={() => {}} 
                  onSuccess={handleSuccess} 
                  asFormOnly 
                />
             )}
             {activeTab === 'account' && (
                <CreateAccountDialog 
                  open={true} 
                  onOpenChange={() => {}} 
                  onSuccess={handleSuccess} 
                  asFormOnly 
                />
             )}
             {activeTab === 'opportunity' && (
                <OpportunityDialog 
                  isOpen={true} 
                  onOpenChange={() => {}} 
                  onSuccess={handleSuccess} 
                  asFormOnly 
                />
             )}
             {activeTab === 'reminder' && (
                <GlobalCreateReminderForm
                  onSuccess={handleSuccess}
                  onCancel={() => onOpenChange(false)}
                />
             )}
             {activeTab === 'note' && (
                <GlobalCreateNoteForm
                  onSuccess={handleSuccess}
                  onCancel={() => onOpenChange(false)}
                />
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
