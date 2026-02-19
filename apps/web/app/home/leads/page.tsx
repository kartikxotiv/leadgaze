'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { FileUp, Filter, Plus, Search, Trash2 } from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
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

import { DeleteEntityDialog } from '../_components/delete-entity-dialog';
import { EntityActionsDropdown } from '../_components/entity-actions-dropdown';
import CreateLeadDialog from './components/create-lead-dialog';

export default function LeadsPage() {
  const router = useRouter();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const { data: user } = useUser();

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
      { id: 'is_public', label: 'Public' },
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
      is_public: false,
      score: true,
      created_by: false,
      created_at: false,
      updated_by: false,
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

  const { data: statuses = [] } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => getLeadStatusesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const leads = leadsData.data;
  const totalCount = leadsData.count;

  // Reset to first page when search or status changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatus]);

  const leadsWithStatus = leads;

  // Filter and search leads - we used to do this client-side, now we just use the data from server
  const paginatedLeads = leads;
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
      <div className="flex h-[100dvh] flex-col">
        <div className="bg-sidebar flex shrink-0 flex-col gap-2">
          <PageHeader
            className="bg-sidebar px-6 py-4"
            title={`Leads (${totalCount})`}
            description="Manage and track your sales leads"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-64 lg:w-72">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-40">
                  <Filter className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status: any) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.status_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

              {canAccess('leads', 'import') && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  variant="outline"
                  className="h-9 gap-2"
                >
                  <FileUp className="h-4 w-4 text-gray-500" />
                  Import
                </Button>
              )}
              {canAccess('leads', 'create') && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="h-9 gap-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New Lead
                </Button>
              )}

              <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>

          {/* Status Distribution Cards */}
          <div className="bg-sidebar px-6 pb-7">
            <div className="-mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card
                className={`hover:border-primary/50 bg-card cursor-pointer transition-all ${selectedStatus === 'all' ? 'border-primary ring-primary ring-1' : ''}`}
                onClick={() => setSelectedStatus('all')}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[12px] font-medium tracking-wider uppercase">
                      All Leads ({selectedStatus === 'all' ? totalCount : 0})
                    </span>
                    <div className="flex items-baseline gap-2">
                      {/* <span className="text-lg font-bold">{totalCount}</span> */}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {statuses.map((status: any) => {
                const stats = leadsData.statusBreakdown[status.id] || {
                  count: 0,
                };
                const isSelected = selectedStatus === status.id;
                const displayCount = isSelected ? stats.count : 0;

                return (
                  <Card
                    key={status.id}
                    className={`hover:border-primary/50 bg-card cursor-pointer transition-all ${selectedStatus === status.id ? 'border-primary ring-primary ring-1' : ''}`}
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
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">
                            {/* {stats.count} */}
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
        <PageBody className="bg-sidebar sticky -mt-6 flex min-h-0 flex-1 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 flex-1 flex-col space-y-6">
            {/* Table */}
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="flex-1 overflow-auto rounded-lg">
                  <table className="w-full caption-bottom text-sm">
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
                        {isVisible('company') && <TableHead>Company</TableHead>}
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
                        {isVisible('trigger') && <TableHead>Trigger</TableHead>}
                        {isVisible('notes') && <TableHead>Notes</TableHead>}
                        {isVisible('is_public') && (
                          <TableHead>Public</TableHead>
                        )}
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
                                ? 'No leads match your filters'
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
                            {isVisible('is_public') && (
                              <TableCell className="text-muted-foreground text-center">
                                {lead.is_public ? (
                                  <Badge
                                    variant="outline"
                                    className="border-green-200 bg-green-50 text-green-600"
                                  >
                                    Public
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-200 bg-amber-50 text-amber-600"
                                  >
                                    Private
                                  </Badge>
                                )}
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
                                            status_key: lead.status?.status_key,
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
                                          lead.industry_id || lead.industry?.id,
                                        company_size: lead.company_size,
                                        location: lead.location,
                                        timezone: lead.timezone,
                                        job_title: lead.job_title,
                                        contacted_count: lead.contacted_count,
                                        status_key: lead.status?.status_key,
                                        custom_fields: lead.custom_fields || {},
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
              <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 -mb-4 flex shrink-0 items-center justify-between border-t p-4 px-6 lg:-mb-8">
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
