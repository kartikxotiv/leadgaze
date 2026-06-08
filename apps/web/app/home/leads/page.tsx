'use client';

import React, { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { FileUp, Plus } from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
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
import {TableStatusMetricTab} from '@kit/ui/table-status-metric-tab';

export default function LeadsPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string>('');
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
      <div className="flex h-[100dvh] w-full max-w-full min-w-0 flex-col overflow-hidden">
        <div className="bg-sidebar flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
          <PageHeader
            className="bg-sidebar px-6 py-4"
            title={`Leads (${totalCount})`}
            description="Manage and track your sales leads"
          />

          {/* Status Distribution Cards */}
          <div className="bg-sidebar -mt-1 w-full max-w-full min-w-0 overflow-x-auto px-6 pb-7">
            <div className="-mb-3 flex flex-wrap items-center gap-2">
              <TableStatusMetricTab
                   key={0}
                   id={0}
                   statusName='All Leads'
                   isSelected={selectedStatus === 'all'}
                   count={totalCount}
                   onClick={() => setSelectedStatus('all')} />
              {statuses.map((status: any) => {
                const stats = leadsData.statusBreakdown[status.id] || {
                  count: 0,
                };
                const isSelected = selectedStatus === status.id;
                const displayCount =
                  selectedStatus === 'all'
                    ? stats.count
                    : isSelected
                      ? stats.count
                      : 0;

                return (
                  <TableStatusMetricTab
                   key={status.id}
                   id={status.id}
                   color={status.color}
                   statusName={status.status_name}
                   count={displayCount}
                   isSelected={isSelected}
                   onClick={() => setSelectedStatus(status.id)} />                  
                );
              })}
            </div>
          </div>
        </div>

        {/* Full-width search / filter / actions toolbar */}
        <div className="bg-sidebar w-full max-w-full min-w-0 shrink-0 border-b px-6 py-2">
          <ListToolBar
            showSearch
            searchPlaceholder="Search leads..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            showFilter
            filterGroups={[
              {
                key: 'status',
                label: 'Status',
                selectedValue: selectedStatus === 'all' ? '' : selectedStatus,
                selectedLabel:
                  selectedStatus === 'all'
                    ? 'All statuses'
                    : (statuses.find((s: any) => s.id === selectedStatus) as any)?.status_name ?? '1 selected',
                options: statuses.map((s: any) => ({
                  value: s.id,
                  label: s.status_name,
                  color: s.color,
                })),
                onSelect: (val) => setSelectedStatus(val || 'all'),
              },
              {
                key: 'created_by',
                label: 'Created By',
                selectedValue: selectedCreatedBy,
                selectedLabel: selectedCreatedBy
                  ? (members.find((m: any) => m.user_id === selectedCreatedBy) as any)?.user?.user_metadata?.full_name ?? '1 selected'
                  : 'All members',
                options: members
                  .filter((m: any) => m.user_id)
                  .map((m: any) => ({
                    value: m.user_id,
                    label:
                      m.user?.user_metadata?.full_name ||
                      m.user?.email ||
                      m.user_id,
                  })),
                onSelect: (val) => setSelectedCreatedBy(val),
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => {
              setSelectedStatus('all');
              setSelectedCreatedBy('');
            }}
            actions={[
              {
                key: 'import',
                label: 'Import',
                icon: FileUp,
                onClick: () => setIsCreateDialogOpen(true),
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

        <PageBody className="bg-sidebar sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-3">
          <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
            <CustomTableContainer pagination={totalCount > 0 && (
                <div className="primary-text-regular text-leadgaze-muted bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8">
                  <div>
                    Showing{' '}
                    <span className="primary-text-regular text-leadgaze-muted">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="primary-text-regular text-leadgaze-muted">
                      {Math.min(currentPage * itemsPerPage, totalCount)}
                    </span>{' '}
                    of{' '}
                    <span className="primary-text-regular text-leadgaze-muted">
                      {totalCount}
                    </span>{' '}
                    enteries
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
              )}>
                    <Table>
                      <TableHeader>
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
