'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { FileUp, Filter, Plus, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
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

import { useDebounce } from '~/lib/hooks/use-debounce';
import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getLeadStatusesService,
  getLeadsService,
} from '~/services/leads.service';
import { Lead } from '~/services/leads.service';

import CreateLeadDialog from './components/create-lead-dialog';

export default function LeadsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const {
    data: leadsData = { data: [], count: 0 },
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
      <>
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
      </>
    );
  }

  return (
    <ModuleGuard module="leads">
      <PageHeader
        className="-mx-4 mb-4 px-4 lg:-mx-0 lg:px-4"
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

          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            variant="outline"
            className="h-9 gap-2"
          >
            <FileUp className="h-4 w-4 text-gray-500" />
            Import
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-9 gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </div>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 whitespace-nowrap">
                        S. No.
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading leads...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm || selectedStatus !== 'all'
                              ? 'No leads match your filters'
                              : 'No leads yet. Create one to get started!'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLeads.map((lead: Lead, index: number) => (
                        <TableRow key={lead.id}>
                          <TableCell className="text-muted-foreground w-12">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/home/leads/${lead.id}`}
                              className="hover:underline"
                            >
                              {lead.first_name} {lead.last_name || ''}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.email || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.company_name || '-'}
                          </TableCell>
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
                                          lead.industry_id || lead.industry?.id,
                                        company_size: lead.company_size,
                                        location: lead.location,
                                        timezone: lead.timezone,
                                        job_title: lead.job_title,
                                        contacted_count: lead.contacted_count,
                                        status_key: lead.status?.status_key,
                                        custom_fields: lead.custom_fields || {},
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
                          <TableCell className="text-right">
                            <Link
                              href={`/home/leads/${lead.id}`}
                              className="text-primary text-sm font-medium hover:underline"
                            >
                              View
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalCount > 0 && (
            <div className="text-muted-foreground flex items-center justify-between px-2 text-sm">
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
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
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
      </PageBody>
    </ModuleGuard>
  );
}
