'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Filter, Plus, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getLeadsService } from '~/services/leads.service';
import { Lead } from '~/services/leads.service';

import CreateLeadDialog from './components/create-lead-dialog';

import { ModuleGuard } from '~/lib/rbac/module-guard';

export default function LeadsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  const {
    data: leads = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', workspace.id],
    queryFn: () => getLeadsService(workspace.id),
    enabled: !!workspace.id,
  });

  // Get unique statuses from leads for filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Map();
    leads?.forEach((lead: Lead) => {
      if (lead.status && !statuses.has(lead.status.id)) {
        statuses.set(lead.status.id, lead.status);
      }
    });
    return Array.from(statuses.values());
  }, [leads]);

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    return leads?.filter((lead: Lead) => {
      const matchesSearch =
        lead.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' || lead.status_id === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, selectedStatus]);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
  };

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
      <PageHeader title="Leads" description="Manage and track your sales leads">
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="mt-2 text-2xl font-bold">
                  {leads.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Filtered</p>
                <p className="mt-2 text-2xl font-bold">
                  {filteredLeads.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="mt-2 text-2xl font-bold">
                  {leads.length > 0
                    ? Math.round(
                      leads.reduce(
                        (sum: number, lead: Lead) => sum + lead.lead_score,
                        0,
                      ) / leads.length,
                    )
                    : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {availableStatuses.map((status: any) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.status_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Name
                      </TableHead>
                      <TableHead>
                        Email
                      </TableHead>
                      <TableHead>
                        Company
                      </TableHead>
                      <TableHead>
                        Status
                      </TableHead>
                      <TableHead>
                        Score
                      </TableHead>
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <div className="text-gray-500">
                              Loading leads...
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="text-gray-500">
                            {searchTerm || selectedStatus !== 'all'
                              ? 'No leads match your filters'
                              : 'No leads yet. Create one to get started!'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead: Lead) => (
                        <TableRow
                          key={lead.id}
                        >
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
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{
                                    width: `${Math.min(lead.lead_score, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="w-8 text-right text-sm text-muted-foreground">
                                {lead.lead_score}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/home/leads/${lead.id}`}
                              className="text-sm font-medium text-primary hover:underline"
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
