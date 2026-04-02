'use client';

import React, { useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getLeadStatusesService,
  getLeadsService,
} from '~/services/leads.service';
import { Lead } from '~/services/leads.service';
import { getMembersService } from '~/services/team-members.service';

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import CreateLeadDialog from './components/create-lead-dialog';

export default function LeadsPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterView, setFilterView] = useState<
    'main' | 'status' | 'created_by'
  >('main');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { data: user } = useUser();

  const activeFilterCount =
    (selectedStatus !== 'all' ? 1 : 0) + (selectedCreatedBy ? 1 : 0);

  const columns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'name', label: 'Name' },
      { id: 'first_name', label: 'First Name' },
      { id: 'last_name', label: 'Last Name' },
      { id: 'job_title', label: 'Job Title' },
      { id: 'email', label: 'Email' },
      { id: 'alt_email', label: 'Alt Email' },
      { id: 'phone', label: 'Phone' },
      { id: 'mobile', label: 'Mobile' },
      { id: 'company', label: 'Company' },
      { id: 'company_website', label: 'Company Website' },
      { id: 'company_linkedin', label: 'Company LinkedIn' },
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'department', label: 'Department' },
      { id: 'industry', label: 'Industry' },
      { id: 'company_size', label: 'Company Size' },
      { id: 'location', label: 'Location' },
      { id: 'timezone', label: 'Timezone' },
      { id: 'status', label: 'Status' },
      { id: 'source', label: 'Source' },
      { id: 'trigger', label: 'Trigger' },
      { id: 'notes', label: 'Notes' },
      { id: 'score', label: 'Score' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('leads', {
      sno: true,
      name: true,
      first_name: false,
      last_name: false,
      job_title: false,
      email: true,
      alt_email: false,
      phone: false,
      mobile: false,
      company: true,
      company_website: false,
      company_linkedin: false,
      linkedin: false,
      department: false,
      industry: false,
      company_size: false,
      location: false,
      timezone: false,
      status: true,
      source: false,
      trigger: false,
      notes: false,
      score: true,
      created_by: false,
      created_at: false,
      updated_by: true,
    });

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    data: leadsData = { data: [], count: 0, statusBreakdown: {} },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'leads',
      workspace?.id,
      currentPage,
      debouncedSearchTerm,
      selectedStatus,
      selectedCreatedBy,
    ],
    queryFn: () =>
      getLeadsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: debouncedSearchTerm,
        statusId: selectedStatus,
      }),
    enabled: !!workspace?.id,
  });

  const { data: membersData } = useQuery({
    queryKey: ['team-members', workspace?.id],
    queryFn: () => getMembersService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });
  const members = (membersData?.data || []) as any[];

  const { data: statuses = [] } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => getLeadStatusesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const leads = leadsData.data;
  const totalCount = leadsData.count;

  // Client-side filter for created-by (status is now server-side only for consistency)
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedCreatedBy) {
      result = result.filter(
        (lead: Lead) => lead.created_by === selectedCreatedBy,
      );
    }
    return result;
  }, [leads, selectedCreatedBy]);

  // Reset to first page when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatus, selectedCreatedBy]);

  const paginatedLeads = filteredLeads;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ModuleGuard module="leads">
        <PageHeader title="Leads" description="Manage your sales leads" />
        <PageBody>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-red-500">Failed to load leads</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageBody>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="leads">
      <div className="flex h-[100dvh] w-full max-w-full min-w-0 flex-col overflow-hidden">
        <div className="bg-sidebar flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
          <PageHeader
            className="bg-sidebar px-6 py-4"
            title={`Leads (${totalCount})`}
            description="Manage and track your sales leads"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div
                  className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
                    isSearchOpen ? 'w-64 lg:w-72' : 'w-9'
                  }`}
                >
                  {isSearchOpen ? (
                    <div className="relative w-full">
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search by name or email"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 pl-10"
                        onBlur={() => {
                          if (!searchTerm) setIsSearchOpen(false);
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="border-input hover:bg-accent -mr-6 flex h-8 w-8 items-center justify-center rounded-md border bg-transparent bg-white text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                          onClick={() => setIsSearchOpen(true)}
                        >
                          <Search className="h-4 w-4 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Search</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Filter button */}
              <Popover
                open={isFilterOpen}
                onOpenChange={(open) => {
                  setIsFilterOpen(open);
                  if (!open) setFilterView('main');
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        className={`border-input hover:bg-accent relative flex h-8 w-8 items-center justify-center rounded-md border bg-transparent bg-white dark:border-zinc-700 dark:bg-zinc-900 ${
                          isFilterOpen ? 'bg-accent' : ''
                        }`}
                      >
                        <Filter className="h-4 w-4 text-gray-500 dark:text-white" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Filter</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      {filterView !== 'main' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setFilterView('main')}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="text-sm font-semibold">
                        {filterView === 'main'
                          ? 'Filters'
                          : filterView === 'status'
                            ? 'Filter by Status'
                            : 'Filter by Created By'}
                      </span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={() => {
                        setSelectedStatus('all');
                        setSelectedCreatedBy('');
                      }}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="p-2">
                    {filterView === 'main' && (
                      <div className="flex flex-col gap-1">
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('status')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Status</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {selectedStatus === 'all'
                                ? 'All statuses'
                                : statuses.find(
                                    (s: any) => s.id === selectedStatus,
                                  )?.status_name || '1 selected'}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('created_by')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Created By</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {selectedCreatedBy
                                ? members.find(
                                    (m: any) => m.user_id === selectedCreatedBy,
                                  )?.user?.user_metadata?.full_name ||
                                  '1 selected'
                                : 'All members'}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    )}

                    {filterView === 'status' && (
                      <div className="flex flex-col gap-1 p-1">
                        {statuses.map((status: any) => {
                          const isSelected = selectedStatus === status.id;
                          return (
                            <div
                              key={status.id}
                              className="hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                              onClick={() => {
                                setSelectedStatus(
                                  isSelected ? 'all' : status.id,
                                );
                              }}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                  isSelected
                                    ? 'border-black bg-transparent dark:border-white'
                                    : 'border-black/20 bg-transparent dark:border-white/30'
                                }`}
                              >
                                {isSelected && (
                                  <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                                )}
                              </div>
                              <div
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              <span className="text-black dark:text-gray-200">
                                {status.status_name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filterView === 'created_by' && (
                      <div className="flex flex-col gap-1 p-1">
                        {members
                          .filter((m: any) => m.user_id)
                          .map((member: any) => {
                            const memberName =
                              member.user?.user_metadata?.full_name ||
                              member.user?.email ||
                              member.user_id;
                            const isChecked =
                              selectedCreatedBy === member.user_id;
                            return (
                              <div
                                key={member.user_id}
                                className="hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                                onClick={() =>
                                  setSelectedCreatedBy(
                                    isChecked ? '' : member.user_id,
                                  )
                                }
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                    isChecked
                                      ? 'border-black bg-transparent dark:border-white'
                                      : 'border-black/20 bg-transparent dark:border-white/30'
                                  }`}
                                >
                                  {isChecked && (
                                    <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                                  )}
                                </div>
                                <span className="truncate text-black dark:text-gray-200">
                                  {memberName}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {canAccess('leads', 'import') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        variant="outline"
                        className="h-8 w-8 p-0"
                      >
                        <FileUp className="h-4 w-4 text-gray-500 dark:text-white" />
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent side="bottom">
                      <span>Import</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {canAccess('leads', 'create') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        variant="outline"
                        className="h-8 w-8 bg-white p-0 text-black dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                      >
                        <Plus className="h-4 w-4 text-gray-500 dark:text-white" />
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent side="bottom">
                      <span>New Lead</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" /> */}

              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>

          {/* Status Distribution Cards */}
          <div className="bg-sidebar -mt-1 w-full max-w-full min-w-0 overflow-x-auto px-6 pb-7">
            <div className="-mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card
                className={`hover:border-primary/50 bg-card cursor-pointer transition-all ${selectedStatus === 'all' ? 'border-primary ring-primary ring-1' : ''}`}
                onClick={() => setSelectedStatus('all')}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[12px] font-medium tracking-wider uppercase">
                      All Leads ({totalCount})
                    </span>
                  </div>
                </CardContent>
              </Card>

              {statuses.map((status: any) => {
                const stats = leadsData.statusBreakdown[status.id] || {
                  count: 0,
                };
                const isSelected = selectedStatus === status.id;
                // Default (all): show real count. Specific status selected: only show count for that card, others 0
                const displayCount =
                  selectedStatus === 'all'
                    ? stats.count
                    : isSelected
                      ? stats.count
                      : 0;

                return (
                  <Card
                    key={status.id}
                    className={`hover:border-primary/50 bg-card cursor-pointer transition-all ${isSelected ? 'border-primary ring-primary ring-1' : ''}`}
                    onClick={() => setSelectedStatus(status.id)}
                  >
                    <CardContent className="h-8 p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-muted-foreground truncate text-[12px] font-medium tracking-wider uppercase">
                            {status.status_name} ({displayCount})
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
        <PageBody className="bg-sidebar sticky -mt-3 flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
            <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col space-y-6">
              {/* Table */}
              <Card className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col border-none shadow-none">
                <CardContent className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col p-0">
                  <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                    <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
                      <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          {isVisible('sno') && (
                            <TableHead className="w-12 whitespace-nowrap">
                              S. No.
                            </TableHead>
                          )}
                          {isVisible('name') && <TableHead>Name</TableHead>}
                          {isVisible('first_name') && (
                            <TableHead>First Name</TableHead>
                          )}
                          {isVisible('last_name') && (
                            <TableHead>Last Name</TableHead>
                          )}
                          {isVisible('job_title') && (
                            <TableHead>Job Title</TableHead>
                          )}
                          {isVisible('email') && <TableHead>Email</TableHead>}
                          {isVisible('alt_email') && (
                            <TableHead>Alt Email</TableHead>
                          )}
                          {isVisible('phone') && <TableHead>Phone</TableHead>}
                          {isVisible('mobile') && <TableHead>Mobile</TableHead>}
                          {isVisible('company') && (
                            <TableHead>Company</TableHead>
                          )}
                          {isVisible('company_website') && (
                            <TableHead>Company Website</TableHead>
                          )}
                          {isVisible('company_linkedin') && (
                            <TableHead>Company LinkedIn</TableHead>
                          )}
                          {isVisible('linkedin') && (
                            <TableHead>LinkedIn</TableHead>
                          )}
                          {isVisible('department') && (
                            <TableHead>Department</TableHead>
                          )}
                          {isVisible('industry') && (
                            <TableHead>Industry</TableHead>
                          )}
                          {isVisible('company_size') && (
                            <TableHead>Company Size</TableHead>
                          )}
                          {isVisible('location') && (
                            <TableHead>Location</TableHead>
                          )}
                          {isVisible('timezone') && (
                            <TableHead>Timezone</TableHead>
                          )}
                          {isVisible('status') && <TableHead>Status</TableHead>}
                          {isVisible('source') && <TableHead>Source</TableHead>}
                          {isVisible('trigger') && (
                            <TableHead>Trigger</TableHead>
                          )}
                          {isVisible('notes') && <TableHead>Notes</TableHead>}
                          {isVisible('score') && <TableHead>Score</TableHead>}
                          {isVisible('created_by') && (
                            <TableHead>Created By</TableHead>
                          )}
                          {isVisible('created_at') && (
                            <TableHead>Created On</TableHead>
                          )}
                          {isVisible('updated_by') && (
                            <TableHead>Last Updated By</TableHead>
                          )}
                          <TableHead className="bg-card sticky right-0 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={
                                visibility
                                  ? Object.values(visibility).filter(
                                      (v) => v !== false,
                                    ).length + 1
                                  : 7
                              }
                              className="h-24 text-center"
                            >
                              <div className="flex items-center justify-center">
                                <div className="text-gray-500">
                                  Loading leads...
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedLeads.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={
                                visibility
                                  ? Object.values(visibility).filter(
                                      (v) => v !== false,
                                    ).length + 1
                                  : 7
                              }
                              className="h-24 text-center"
                            >
                              <div className="text-gray-500">
                                {searchTerm || selectedStatus !== 'all'
                                  ? 'No leads match your search'
                                  : 'No leads yet. Create one to get started!'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedLeads.map((lead: Lead, index: number) => (
                            <TableRow
                              key={lead.id}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() =>
                                router.push(`/home/leads/${lead.id}`)
                              }
                            >
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('name') && (
                                <TableCell className="font-medium">
                                  <span>
                                    {lead.first_name} {lead.last_name || ''}
                                  </span>
                                </TableCell>
                              )}
                              {isVisible('first_name') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.first_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('last_name') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.last_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('job_title') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.job_title || '-'}
                                </TableCell>
                              )}
                              {isVisible('email') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.email || '-'}
                                </TableCell>
                              )}
                              {isVisible('alt_email') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.alt_email || '-'}
                                </TableCell>
                              )}
                              {isVisible('phone') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.phone_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('mobile') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.mobile_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('company') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.company_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_website') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.company_website || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_linkedin') && (
                                <TableCell className="text-muted-foreground max-w-[150px] truncate">
                                  {lead.company_linkedin_url || '-'}
                                </TableCell>
                              )}
                              {isVisible('linkedin') && (
                                <TableCell className="text-muted-foreground max-w-[150px] truncate">
                                  {lead.linkedin_url || '-'}
                                </TableCell>
                              )}
                              {isVisible('department') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.department || '-'}
                                </TableCell>
                              )}
                              {isVisible('industry') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.industry?.industry_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_size') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.company_size || '-'}
                                </TableCell>
                              )}
                              {isVisible('location') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.location || '-'}
                                </TableCell>
                              )}
                              {isVisible('timezone') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.timezone || '-'}
                                </TableCell>
                              )}
                              {isVisible('status') && (
                                <TableCell>
                                  {lead.status && (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1"
                                      style={{
                                        backgroundColor: `${lead.status.color}20`,
                                        color: lead.status.color,
                                        borderColor: `${lead.status.color}40`,
                                      }}
                                    >
                                      {lead.status.status_name}
                                    </Badge>
                                  )}
                                </TableCell>
                              )}
                              {isVisible('source') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.source?.source_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('trigger') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.trigger || '-'}
                                </TableCell>
                              )}
                              {isVisible('notes') && (
                                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                  {lead.notes || '-'}
                                </TableCell>
                              )}
                              {isVisible('score') && (
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <div className="bg-secondary h-2 w-16 overflow-hidden rounded-full">
                                      <div
                                        className="bg-primary h-full transition-all"
                                        style={{
                                          width: `${Math.min(
                                            calculateLeadScore({
                                              first_name: lead.first_name,
                                              last_name: lead.last_name,
                                              company_name: lead.company_name,
                                              industry_id:
                                                lead.industry_id ||
                                                lead.industry?.id,
                                              company_size: lead.company_size,
                                              location: lead.location,
                                              timezone: lead.timezone,
                                              job_title: lead.job_title,
                                              contacted_count:
                                                lead.contacted_count,
                                              status_key:
                                                lead.status?.status_key,
                                              custom_fields:
                                                lead.custom_fields || {},
                                              source_id: lead.source_id,
                                            }).totalScore,
                                            100,
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-muted-foreground w-8 text-right text-sm">
                                      {
                                        calculateLeadScore({
                                          first_name: lead.first_name,
                                          last_name: lead.last_name,
                                          company_name: lead.company_name,
                                          industry_id:
                                            lead.industry_id ||
                                            lead.industry?.id,
                                          company_size: lead.company_size,
                                          location: lead.location,
                                          timezone: lead.timezone,
                                          job_title: lead.job_title,
                                          contacted_count: lead.contacted_count,
                                          status_key: lead.status?.status_key,
                                          custom_fields:
                                            lead.custom_fields || {},
                                          source_id: lead.source_id,
                                        }).totalScore
                                      }
                                    </span>
                                  </div>
                                </TableCell>
                              )}
                              {isVisible('created_by') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.created_by_account?.name ||
                                    lead.created_by ||
                                    '-'}
                                </TableCell>
                              )}
                              {isVisible('created_at') && (
                                <TableCell className="text-muted-foreground whitespace-nowrap">
                                  {lead.created_at
                                    ? new Date(
                                        lead.created_at,
                                      ).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('updated_by') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.updated_by_account?.name ||
                                    lead.updated_by ||
                                    '-'}
                                </TableCell>
                              )}

                              <TableCell className="bg-card sticky right-0 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <EntityActionsDropdown
                                    id={lead.id}
                                    viewPath={`/home/leads/${lead.id}`}
                                    canDelete={canAccess('leads', 'delete')}
                                    onDelete={() => {
                                      setLeadToDelete(lead);
                                      setDeleteDialogOpen(true);
                                    }}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {totalCount > 0 && (
                <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8">
                  <div>
                    Showing{' '}
                    <span className="text-foreground font-medium">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="text-foreground font-medium">
                      {Math.min(currentPage * itemsPerPage, totalCount)}
                    </span>{' '}
                    of{' '}
                    <span className="text-foreground font-medium">
                      {totalCount}
                    </span>{' '}
                    leads
                  </div>
                  <Pagination className="w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          className={
                            currentPage === totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
            {/* closes table area div */}
          </div>
          {/* closes filter panel + table flex row */}

          {/* Create Lead Dialog */}
          <CreateLeadDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSuccess={handleCreateSuccess}
          />

          <DeleteEntityDialog
            isOpen={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            entityId={leadToDelete?.id || ''}
            entityType="lead"
            entityName={`${leadToDelete?.first_name} ${leadToDelete?.last_name || ''}`}
            onSuccess={() => {
              setLeadToDelete(null);
              refetch();
            }}
          />
        </PageBody>
      </div>
    </ModuleGuard>
  );
}
