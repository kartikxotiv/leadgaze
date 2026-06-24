'use client';

import React, { useMemo, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { FileUp, Plus } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { CsvImportDialog } from '@kit/ui/csv-import-dialog';
import { PageBody, PageHeader } from '@kit/ui/page';

import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import { ListToolBar } from '@kit/ui/list-toolbar';

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
import {CustomTableContainer} from '@kit/ui/custom-table-container';
import {StatusFilterDropdown} from '@kit/ui/status-filter-dropdown';
import { TablePagination } from '@kit/ui/table-pagination';
import { useLocalization } from '~/lib/localization/localization-provider';

export default function LeadsPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const { formatDate } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;

  // ─── Custom Fields (dynamic columns from API) ─────────────────────────────
  // When the backend is ready, replace the empty array with your query:
  // const { data: customFields = [] } = useQuery({
  //   queryKey: ['lead-custom-fields', workspace?.id],
  //   queryFn: () => getLeadCustomFieldsService(workspace?.id || ''),
  //   enabled: !!workspace?.id,
  // });
  const customFields: { id: string; label: string }[] = [];

  const activeFilterCount =
    selectedStatuses.length + selectedCreatedByIds.length;

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
      ...customFields,
    ],
    [customFields],
  );
  const importColumns = useMemo(
    () => [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'alt_email', label: 'Alt Email' },
      { key: 'phone_number', label: 'Phone' },
      { key: 'mobile_number', label: 'Mobile' },
      { key: 'company_name', label: 'Company' },
      { key: 'company_website', label: 'Company Website' },
      { key: 'company_linkedin_url', label: 'Company LinkedIn' },
      { key: 'linkedin_url', label: 'LinkedIn' },
      { key: 'job_title', label: 'Job Title' },
      { key: 'department', label: 'Department' },
      { key: 'industry_id', label: 'Industry' },
      { key: 'company_size', label: 'Company Size' },
      { key: 'location', label: 'Location' },
      { key: 'timezone', label: 'Timezone' },
      { key: 'status_id', label: 'Status', required: true },
      { key: 'source_id', label: 'Source' },
      { key: 'trigger', label: 'Trigger' },
      { key: 'notes', label: 'Notes' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset, mergeNewColumns } =
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

  // Column resize — widths persisted in localStorage: 'table-col-widths-leads'
  const { getHeaderProps, getResizeHandleProps } = useColumnResize('leads');

  // Merge newly-arrived custom field IDs into visibility (preserves user prefs)
  useEffect(() => {
    if (!customFields.length) return;
    mergeNewColumns(
      Object.fromEntries(customFields.map((cf) => [cf.id, true])),
    );
  }, [customFields, mergeNewColumns]);

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
      selectedStatuses,
      selectedCreatedByIds,
      pageSize,
    ],
    queryFn: () =>
      getLeadsService({
        workspaceId: workspace?.id || '',
        page: currentPage,
        limit: pageSize,
        searchTerm: debouncedSearchTerm,
        statusId: selectedStatuses.length > 0 ? selectedStatuses : undefined,
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
    if (selectedCreatedByIds.length > 0) {
      result = result.filter(
        (lead: Lead) => selectedCreatedByIds.includes(lead.created_by ?? ''),
      );
    }
    return result;
  }, [leads, selectedCreatedByIds]);

  // Reset to first page when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatuses, selectedCreatedByIds, pageSize]);

  // ── Table sorting (Phase 1: client-side) ───────────────────────────────────
  // To switch to server-side sorting later:
  //   1. Set mode: 'server'
  //   2. Add sortState to queryKey above
  //   3. Pass sortColumn + sortDirection to getLeadsService()
  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<Lead>(
    'leads',
    filteredLeads,
    { onSortChange: () => setCurrentPage(1) },
  );

  const paginatedLeads = sortedData;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const showTableSkeleton = !workspace || isLoading;

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

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
        <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
          <PageHeader            
            title={`Leads (${totalCount})`}
            description="Manage and track your sales leads"
          />          
        </div>
        
          {/* Status filter dropdown + toolbar */}
        <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
          <ListToolBar
            statusSlot={
              <StatusFilterDropdown
                statuses={statuses}
                selectedStatuses={selectedStatuses}
                onStatusesChange={setSelectedStatuses}
                statusBreakdown={leadsData.statusBreakdown}
                totalCount={totalCount}
                allLabel="All Leads"
              />
            }
            showSearch
            searchPlaceholder="Search leads..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            showFilter
            filterGroups={[
              {
                key: 'status',
                label: 'Status',
                selectedValues: selectedStatuses,
                selectedLabel:
                  selectedStatuses.length === 0
                    ? 'All statuses'
                    : selectedStatuses.length === 1
                      ? (statuses.find((s: any) => s.id === selectedStatuses[0]) as any)?.status_name ?? '1 selected'
                      : `${selectedStatuses.length} selected`,
                options: statuses.map((s: any) => ({
                  value: s.id,
                  label: s.status_name,
                  color: s.color,
                })),
                onSelectValues: setSelectedStatuses,
              },
              {
                key: 'created_by',
                label: 'Created By',
                selectedValues: selectedCreatedByIds,
                selectedLabel: selectedCreatedByIds.length === 0
                  ? 'All members'
                  : selectedCreatedByIds.length === 1
                    ? (members.find((m: any) => m.user_id === selectedCreatedByIds[0]) as any)?.user?.user_metadata?.full_name ?? '1 selected'
                    : `${selectedCreatedByIds.length} selected`,
                options: members
                  .filter((m: any) => m.user_id)
                  .map((m: any) => ({
                    value: m.user_id,
                    label:
                      m.user?.user_metadata?.full_name ||
                      m.user?.email ||
                      m.user_id,
                  })),
                onSelectValues: setSelectedCreatedByIds,
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => {
              setSelectedStatuses([]);
              setSelectedCreatedByIds([]);
            }}
            actions={[
              {
                key: 'import',
                label: 'Import',
                icon: FileUp,
                onClick: () => setIsImportDialogOpen(true),
                show: canAccess('leads', 'import'),
                buttonVariant: 'outline',
              },
              {
                key: 'add',
                label: 'New Lead',
                icon: Plus,
                onClick: () => setIsCreateDialogOpen(true),
                show: canAccess('leads', 'create'),
                buttonVariant: 'default',
              },
            ]}
            columnVisibilitySlot={
              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            }
          />
        </div>
        
        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
            <CustomTableContainer pagination={
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                entityLabel="entries"
              />
            }>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isVisible('sno') && (
                            <SortableTableHead
                              label="S. No."
                              columnId="sno"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              sortable={false}
                              className="relative w-12 whitespace-nowrap"
                              {...getHeaderProps('sno')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
                            </SortableTableHead>
                          )}
                          {isVisible('name') && (
                            <SortableTableHead
                              label="Name"
                              columnId="name"
                              sortKey="first_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('name')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('name')} />
                            </SortableTableHead>
                          )}
                          {isVisible('first_name') && (
                            <SortableTableHead
                              label="First Name"
                              columnId="first_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('first_name')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('first_name')} />
                            </SortableTableHead>
                          )}
                          {isVisible('last_name') && (
                            <SortableTableHead
                              label="Last Name"
                              columnId="last_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('last_name')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('last_name')} />
                            </SortableTableHead>
                          )}
                          {isVisible('job_title') && (
                            <SortableTableHead
                              label="Job Title"
                              columnId="job_title"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('job_title')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('job_title')} />
                            </SortableTableHead>
                          )}
                          {isVisible('email') && (
                            <SortableTableHead
                              label="Email"
                              columnId="email"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('email')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('email')} />
                            </SortableTableHead>
                          )}
                          {isVisible('alt_email') && (
                            <SortableTableHead
                              label="Alt Email"
                              columnId="alt_email"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('alt_email')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('alt_email')} />
                            </SortableTableHead>
                          )}
                          {isVisible('phone') && (
                            <SortableTableHead
                              label="Phone"
                              columnId="phone"
                              sortKey="phone_number"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('phone')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('phone')} />
                            </SortableTableHead>
                          )}
                          {isVisible('mobile') && (
                            <SortableTableHead
                              label="Mobile"
                              columnId="mobile"
                              sortKey="mobile_number"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('mobile')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('mobile')} />
                            </SortableTableHead>
                          )}
                          {isVisible('company') && (
                            <SortableTableHead
                              label="Company"
                              columnId="company"
                              sortKey="company_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('company')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('company')} />
                            </SortableTableHead>
                          )}
                          {isVisible('company_website') && (
                            <SortableTableHead
                              label="Company Website"
                              columnId="company_website"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('company_website')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('company_website')} />
                            </SortableTableHead>
                          )}
                          {isVisible('company_linkedin') && (
                            <SortableTableHead
                              label="Company LinkedIn"
                              columnId="company_linkedin"
                              sortKey="company_linkedin_url"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('company_linkedin')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('company_linkedin')} />
                            </SortableTableHead>
                          )}
                          {isVisible('linkedin') && (
                            <SortableTableHead
                              label="LinkedIn"
                              columnId="linkedin"
                              sortKey="linkedin_url"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('linkedin')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('linkedin')} />
                            </SortableTableHead>
                          )}
                          {isVisible('department') && (
                            <SortableTableHead
                              label="Department"
                              columnId="department"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('department')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('department')} />
                            </SortableTableHead>
                          )}
                          {isVisible('industry') && (
                            <SortableTableHead
                              label="Industry"
                              columnId="industry"
                              sortKey="industry.industry_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('industry')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('industry')} />
                            </SortableTableHead>
                          )}
                          {isVisible('company_size') && (
                            <SortableTableHead
                              label="Company Size"
                              columnId="company_size"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('company_size')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('company_size')} />
                            </SortableTableHead>
                          )}
                          {isVisible('location') && (
                            <SortableTableHead
                              label="Location"
                              columnId="location"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('location')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('location')} />
                            </SortableTableHead>
                          )}
                          {isVisible('timezone') && (
                            <SortableTableHead
                              label="Timezone"
                              columnId="timezone"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('timezone')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('timezone')} />
                            </SortableTableHead>
                          )}
                          {isVisible('status') && (
                            <SortableTableHead
                              label="Status"
                              columnId="status"
                              sortKey="status.status_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('status')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('status')} />
                            </SortableTableHead>
                          )}
                          {isVisible('source') && (
                            <SortableTableHead
                              label="Source"
                              columnId="source"
                              sortKey="source.source_name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('source')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('source')} />
                            </SortableTableHead>
                          )}
                          {isVisible('trigger') && (
                            <SortableTableHead
                              label="Trigger"
                              columnId="trigger"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('trigger')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('trigger')} />
                            </SortableTableHead>
                          )}
                          {isVisible('notes') && (
                            <SortableTableHead
                              label="Notes"
                              columnId="notes"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('notes')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('notes')} />
                            </SortableTableHead>
                          )}
                          {isVisible('score') && (
                            <SortableTableHead
                              label="Score"
                              columnId="score"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              sortable={false}
                              className="relative"
                              {...getHeaderProps('score')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('score')} />
                            </SortableTableHead>
                          )}
                          {isVisible('created_by') && (
                            <SortableTableHead
                              label="Created By"
                              columnId="created_by"
                              sortKey="created_by_account.name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('created_by')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('created_by')} />
                            </SortableTableHead>
                          )}
                          {isVisible('created_at') && (
                            <SortableTableHead
                              label="Created On"
                              columnId="created_at"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('created_at')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('created_at')} />
                            </SortableTableHead>
                          )}
                          {isVisible('updated_by') && (
                            <SortableTableHead
                              label="Last Updated By"
                              columnId="updated_by"
                              sortKey="updated_by_account.name"
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={toggleSort}
                              className="relative"
                              {...getHeaderProps('updated_by')}
                            >
                              <span className="col-resize-handle" {...getResizeHandleProps('updated_by')} />
                            </SortableTableHead>
                          )}
                          {/* Dynamic custom field columns — rendered automatically when API returns data */}
                          {/* sortKey defaults to cf.id — API field IDs always match their data key, no mapping needed */}
                          {customFields.map((cf) =>
                            isVisible(cf.id) ? (
                              <SortableTableHead
                                key={cf.id}
                                label={cf.label}
                                columnId={cf.id}
                                sortColumn={sortColumn}
                                sortDirection={sortDirection}
                                onSort={toggleSort}
                                className="relative"
                                {...getHeaderProps(cf.id)}
                              >
                                <span className="col-resize-handle" {...getResizeHandleProps(cf.id)} />
                              </SortableTableHead>
                            ) : null,
                          )}
                          {/* Actions — intentionally NOT resizable (sticky column) */}
                          <TableHead className="sticky-right-header">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {showTableSkeleton ? (
                          <>
                            {[...Array(10)].map((_, i) => (
                              <TableRow key={i}>
                                <TableCell
                                  className="h-[52px] px-4 py-2"
                                  colSpan={
                                    visibility
                                      ? Object.values(visibility).filter(
                                          (v) => v !== false,
                                        ).length + 1
                                      : 7
                                  }
                                >
                                  <Skeleton className="h-7 w-full rounded-md" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
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
                                {searchTerm || selectedStatuses.length > 0 || selectedCreatedByIds.length > 0
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
                                router.push(`/home/sales/leads/${lead.id}`)
                              }
                            >
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('name') && (
                                <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                                  <span>
                                    {lead.first_name} {lead.last_name || ''}
                                  </span>
                                </TableCell>
                              )}
                              {isVisible('first_name') && (
                                <TableCell>
                                  {lead.first_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('last_name') && (
                                <TableCell>
                                  {lead.last_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('job_title') && (
                                <TableCell>
                                  {lead.job_title || '-'}
                                </TableCell>
                              )}
                              {isVisible('email') && (
                                <TableCell className='text-muted-foreground'>
                                  {lead.email || '-'}
                                </TableCell>
                              )}
                              {isVisible('alt_email') && (
                                <TableCell className="text-muted-foreground">
                                  {lead.alt_email || '-'}
                                </TableCell>
                              )}
                              {isVisible('phone') && (
                                <TableCell>
                                  {lead.phone_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('mobile') && (
                                <TableCell>
                                  {lead.mobile_number || '-'}
                                </TableCell>
                              )}
                              {isVisible('company') && (
                                <TableCell>
                                  {lead.company_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_website') && (
                                <TableCell>
                                  {lead.company_website || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_linkedin') && (
                                <TableCell className="max-w-[150px] truncate">
                                  {lead.company_linkedin_url || '-'}
                                </TableCell>
                              )}
                              {isVisible('linkedin') && (
                                <TableCell className="max-w-[150px] truncate">
                                  {lead.linkedin_url || '-'}
                                </TableCell>
                              )}
                              {isVisible('department') && (
                                <TableCell>
                                  {lead.department || '-'}
                                </TableCell>
                              )}
                              {isVisible('industry') && (
                                <TableCell>
                                  {lead.industry?.industry_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('company_size') && (
                                <TableCell>
                                  {lead.company_size || '-'}
                                </TableCell>
                              )}
                              {isVisible('location') && (
                                <TableCell>
                                  {lead.location || '-'}
                                </TableCell>
                              )}
                              {isVisible('timezone') && (
                                <TableCell>
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
                                <TableCell>
                                  {lead.source?.source_name || '-'}
                                </TableCell>
                              )}
                              {isVisible('trigger') && (
                                <TableCell>
                                  {lead.trigger || '-'}
                                </TableCell>
                              )}
                              {isVisible('notes') && (
                                <TableCell className="max-w-[200px] truncate">
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
                                    <span className="w-8 text-right text-sm">
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
                                <TableCell>
                                  {lead.created_by_account?.name ||
                                    lead.created_by ||
                                    '-'}
                                </TableCell>
                              )}
                              {isVisible('created_at') && (
                                <TableCell className="whitespace-nowrap">
                                  {lead.created_at
                                    ? formatDate(lead.created_at)
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('updated_by') && (
                                <TableCell>
                                  {lead.updated_by_account?.name ||
                                    lead.updated_by ||
                                    '-'}
                                </TableCell>
                              )}

                              {/* Dynamic custom field cells — value read from lead.custom_fields JSON column */}
                              {customFields.map((cf) =>
                                isVisible(cf.id) ? (
                                  <TableCell key={cf.id}>
                                    {(lead as any).custom_fields?.[cf.id] ?? '-'}
                                  </TableCell>
                                ) : null,
                              )}

                              <TableCell className="bg-card sticky right-0 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <EntityActionsDropdown
                                    id={lead.id}
                                    viewPath={`/home/sales/leads/${lead.id}`}
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
                    </Table>               

              
            </CustomTableContainer>
            {/* closes table area div */}
          </div>
          {/* closes filter panel + table flex row */}

          {/* Create Lead Dialog */}
          <CreateLeadDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSuccess={handleCreateSuccess}
          />

          <CsvImportDialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            title="Import Leads from CSV"
            description="Upload a CSV, match each header to a database column, and save the adjusted file before the API upload step."
            columns={importColumns}
            onUpload={async ({ formData, file }) => {
              console.log('CSV ready for upload', {
                fileName: file.name,
                formData,
              });
            }}
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
    </ModuleGuard>
  );
}
