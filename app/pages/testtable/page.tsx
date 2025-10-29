"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { usePreventAuthBack } from "@/hooks/use-prevent-auth-back";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReactTable } from "@/components/reuseableComponent/ReactTable";
import {
  DirectText,
  DirectSelect,
  InlineEditEmail,
} from "@/components/leads/inline-edit-cell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EnhancedFilters,
  type FilterConfig,
  type ActiveFilter,
} from "@/components/leads/enhanced-filters";
import { useLeads, useLeadConfigs, useUpdateLead, useDeleteLead } from "@/hooks/use-leads";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityLogForm } from "@/components/activities/activity-log-form";
import { FollowUpScheduler } from "@/components/tasks/follow-up-scheduler";
import { CreateDealForm } from "@/components/deals/create-deal-form";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Download,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  Star,
  Target,
  Upload,
  LayoutGrid,
  Activity,
  Clock,
  Calendar,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { BulkImportDialog } from "@/components/leads/bulk-import-dialog";

export default function TestTablePage() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  
  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  // Add debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const { data: leadsData, isLoading, error } = useLeads({ 
    page: currentPage, 
    limit: pageSize,
    search: debouncedSearchTerm
  });
  const { data: configs } = useLeadConfigs();
  const updateLeadMutation = useUpdateLead();
  const deleteLeadMutation = useDeleteLead();
  const queryClient = useQueryClient();
  const [bulkImportDialog, setBulkImportDialog] = useState(false);
  // Prevent navigation back to auth pages
  usePreventAuthBack();

  const [sortBy, setSortBy] = useState<string>("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    leadId?: string;
    leadName?: string;
  }>({ open: false });
  const [leadDetailsSheet, setLeadDetailsSheet] = useState<{
    open: boolean;
    leadId?: string;
  }>({ open: false });
  const [activityDialog, setActivityDialog] = useState<{
    open: boolean;
    leadId?: string;
  }>({ open: false });
  const [followUpDialog, setFollowUpDialog] = useState<{
    open: boolean;
    leadId?: string;
    leadName?: string;
  }>({ open: false });
  const [createDealDialog, setCreateDealDialog] = useState<{
    open: boolean;
    leadId?: string;
  }>({ open: false });
  // Extract leads array and pagination info from the response data structure
  const leads = leadsData?.leads || [];
  const safeLeads = Array.isArray(leads) ? leads : [];
  const pagination = leadsData?.pagination || { total: 0, page: 1, totalPages: 1, limit: pageSize };

  // Get configurations (note: API returns data grouped by entity type)
  const statuses = configs?.status || [];
  const sources = configs?.source || [];
  const grades = configs?.score_grade || [];


  // Status color mapping for badges
  const getStatusColor = (statusName: string): string => {
    switch (statusName?.toLowerCase()) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "contact_attempted":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in_conversation":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "qualified":
        return "bg-green-100 text-green-800 border-green-200";
      case "disqualified":
        return "bg-red-100 text-red-800 border-red-200";
      case "not_reachable":
        return "text-gray-800 ";
      default:
        return "text-gray-800 ";
    }
  };

  // Status color mapping for dropdown items
  const getStatusColorForDropdown = (statusLabel: string): string => {
    const normalizedLabel = statusLabel?.toLowerCase().trim();
    
    switch (normalizedLabel) {
      case "new":
      case "contact attempted":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "contacted":
      case "in conversation":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "qualified":
        return "bg-green-100 text-green-700 border-green-200";
      case "proposal":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "negotiation":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "closed won":
        return "bg-green-100 text-green-800 border-green-300 font-medium";
      case "closed lost":
      case "disqualified":
        return "bg-red-100 text-red-700 border-red-200";
      case "not reachable":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "";
    }
  };

  // Grade color mapping
  const getGradeColor = (gradeName: string): string => {
    switch (gradeName?.toLowerCase()) {
      case "hot":
        return "bg-red-500";
      case "warm":
        return "bg-orange-500";
      case "cold":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Helper function to get short, clean status names
  const getShortStatusName = (entityValue: string): string => {
    const statusMap: Record<string, string> = {
      new: "New",
      contact_attempted: "Contacted",
      in_conversation: "In Conversation",
      qualified: "Qualified",
      disqualified: "Disqualified",
      not_reachable: "Not Reachable",
    };
    return (
      statusMap[entityValue] ||
      entityValue
        ?.replace("_", " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
      "Unknown"
    );
  };


  // Column customization state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 
    'email',
    'company', 
    'contact', 
    'status', 
    'grade', 
    'score',
    'source',
    // 'lastActivity'
  ]);

  // Define table columns
  const tableColumns = [
    { id: 'name', label: 'Lead Name' },
    { id: 'email', label: 'Email' },
    { id: 'company', label: 'Company' },
    { id: 'contact', label: 'Contact' },
    { id: 'status', label: 'Status' },
    { id: 'grade', label: 'Grade' },
    { id: 'score', label: 'Score' },
    { id: 'source', label: 'Source' },
    // { id: 'lastActivity', label: 'Last Activity' },
  ];
  // Column toggle handlers
  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleApplyColumns = () => {
    // Columns are already updated via handleToggleColumn
    // This function can be used for additional logic if needed
    console.log('Applied columns:', visibleColumns);
  };

  // Create dynamic columns based on visibleColumns state
  const getTableColumns = () => {
    const allColumns = [
      { 
        id: 'sno',
        name: 'S.no', 
        selector: (row: any, index: number) => index + 1, 
        sortable: false, 
        width: '80px' 
      },
      { 
        id: 'name',
        name: 'Name', 
        selector: (row: any) => `${row.firstName || ''} ${row.lastName || ''} `.trim(), 
        sortable: true,
        width: '150px',
        minWidth: '150px',
        cell: (row: any) => (
          <div 
            onClick={() => setLeadDetailsSheet({ open: true, leadId: row.leadId })} 
            className="cursor-pointer hover:text-blue-600"
          >
            {`${row.firstName || ''} ${row.lastName || ''}`.trim()}
          </div>
        )
      },
      { 
        id: 'email',
        name: 'Email', 
        selector: (row: any) => row.email || '', 
        sortable: true,
        width: '250px',
        minWidth: '250px',
        cell: (row: any) => (
          <InlineEditEmail
            value={row.email || ''}
            onSave={(value) =>
              handleFieldUpdate(
                row.leadId,
                "email",
                value
              )
            }
            placeholder="Enter email..."
            
          />
        )
      },
      { 
        id: 'contact',
        name: 'Contact', 
        selector: (row: any) => row.phone || '', 
        sortable: true,
        width: '200px',
        minWidth: '200px'
      },
      { 
        id: 'company',
        name: 'Company', 
        selector: (row: any) => row.businessName || '', 
        sortable: true,
        width: '200px',
        minWidth: '200px',
        cell: (row: any) => (
          <DirectText
            value={row.businessName || ''}
            onSave={(value) =>
              handleFieldUpdate(
                row.leadId,
                "businessName",
                value
              )
            }
            placeholder="Enter company name..."
            className="font-regular !text-[13px] !p-0 h-[20px]"
          />
        )
      },
      { 
        id: 'status',
        name: 'Status', 
        selector: (row: any) => {
          const status = statuses.find((s: any) => s.id === row.statusId);
          return getShortStatusName(status?.entityValue || "");
        }, 
        sortable: true,
        width: '120px',
        minWidth: '120px',
        cell: (row: any) => (
          <DirectSelect
            value={row.statusId}
            options={statuses.map((s: any) => ({
              id: s.id,
              value: getShortStatusName(s.value || s.entityValue || ""),
              label: getShortStatusName(s.value || s.entityValue || ""),
            }))}
            onSave={(value) =>
              handleFieldUpdate(
                row.leadId,
                "statusId",
                value
              )
            }
            getItemColor={getStatusColorForDropdown}
          />
        )
      },
      { 
        id: 'grade',
        name: 'Grade', 
        selector: (row: any) => {
          const grade = grades.find((g: any) => g.id === row.scoreGradeId);
          return grade?.entityValue || "Ungraded";
        }, 
        sortable: true,
        width: '100px',
        minWidth: '100px'
      },
      { 
        id: 'score',
        name: 'Score', 
        selector: (row: any) => row.scoreData?.totalScore || row.leadScore || 0, 
        sortable: true,
        width: '120px',
        minWidth: '120px'
      },
      { 
        id: 'source',
        name: 'Source', 
        selector: (row: any) => {
          const source = sources.find((s: any) => s.id === row.sourceId);
          return source?.entityValue || "Unknown";
        }, 
        sortable: true,
        width: '120px',
        minWidth: '120px'
      },
      { 
        id: 'actions',
        name: 'Actions', 
        cell: (row: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (row.phone) {
                    window.open(`tel:${row.phone}`, "_self");
                  } else {
                    toast.error("No phone number available");
                  }
                }}
                disabled={!row.phone}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call {row.phone || "No phone"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (row.email) {
                    window.open(`mailto:${row.email}`, "_self");
                  } else {
                    toast.error("No email address available");
                  }
                }}
                disabled={!row.email}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() =>
                      setActivityDialog({
                        open: true,
                        leadId: row.leadId,
                      })
                    }
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Log Activity
              </DropdownMenuItem>
               <DropdownMenuItem
                        onClick={() =>
                          setFollowUpDialog({
                            open: true,
                            leadId: row.leadId,
                            leadName: `${row.firstName} ${row.lastName}`,
                          })
                        }
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule Follow-up
                      </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                  onClick={() =>
                    setCreateDealDialog({
                      open: true,
                      leadId: row.leadId,
                    })
                  }
                >
                  <Target className="h-4 w-4 mr-2" />
                  Create Deal
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Call
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>


                <DropdownMenuSeparator />



              <DropdownMenuItem onClick={() => handleEditLead(row.leadId)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => handeldeletelead(row.leadId, `${row.firstName} ${row.lastName}`)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
        width: '100px',
        minWidth: '100px'
      },
    ];

    // Filter columns based on visibleColumns state
    return allColumns.filter(col => 
      col.id === 'sno' || col.id === 'actions' || visibleColumns.includes(col.id)
    );
  };






  // Filter configurations
  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        id: "source",
        label: "Source",
        icon: <Target className="h-3 w-3" />,
        options: sources.map((source: any) => ({
          id: source.id,
          value: source.value || source.entityValue || "",
          label:
            source.label || source.value || source.entityValue || "Unknown",
          count: safeLeads.filter((lead) => lead.sourceId === source.id).length,
        })),
        multiple: true,
        searchable: true,
      },
      {
        id: "grade",
        label: "Grade",
        icon: <Star className="h-3 w-3" />,
        options: grades.map((grade: any) => ({
          id: grade.id,
          value: grade.value || grade.entityValue || "",
          label: grade.label || grade.value || grade.entityValue || "Unknown",
          count: safeLeads.filter((lead) => lead.scoreGradeId === grade.id)
            .length,
          color: getGradeColor(grade.value || grade.entityValue || "").includes(
            "red"
          )
            ? "#ef4444"
            : getGradeColor(grade.value || grade.entityValue || "").includes(
                "orange"
              )
            ? "#f97316"
            : getGradeColor(grade.value || grade.entityValue || "").includes(
                "blue"
              )
            ? "#3b82f6"
            : "#6b7280",
        })),
        multiple: false,
        searchable: false,
      },
    ],
    [statuses, sources, grades, safeLeads]
  );

  // Note: Filtering and sorting is now handled by the backend
  // The frontend just displays the filtered results from the API

  // Quick stats
  const stats = useMemo(() => {
    const total = pagination.total;
    const newLeads = safeLeads.filter((lead) => {
      const status = statuses.find((s: any) => s.id === lead.statusId);
      return (status?.value || status?.entityValue) === "new";
    }).length;
    const qualified = safeLeads.filter((lead) => {
      const status = statuses.find((s: any) => s.id === lead.statusId);
      return (status?.value || status?.entityValue) === "qualified";
    }).length;
    const hotLeads = safeLeads.filter((lead) => {
      const grade = grades.find((g: any) => g.id === lead.scoreGradeId);
      return (grade?.value || grade?.entityValue) === "hot";
    }).length;

    return { total, newLeads, qualified, hotLeads };
  }, [safeLeads, statuses, grades]);

  // Handle inline field updates
  const handleFieldUpdate = async (
    leadId: string,
    field: string,
    value: string
  ) => {
    try {
      const updateData: Record<string, any> = {};

      // Handle different field types
      if (field === "leadScore") {
        updateData[field] = parseInt(value) || 0;
      } else {
        updateData[field] = value;
      }

      await updateLeadMutation.mutateAsync({
        leadId,
        data: updateData,
      });
    } catch (error) {
      throw new Error(`Failed to update ${field}`);
    }
  };

  const handleEditLead = (leadId: string) => {
    window.location.href = `/pages/leads/new?edit=${leadId}`;
  };

  const handeldeletelead = async (leadId: string, leadName: string) => {
    setDeleteDialog({
      open: true,
      leadId,
      leadName,
    });
  };

  const confirmDeleteLead = async () => {
    if (!deleteDialog.leadId) return;
    
    try {
      await deleteLeadMutation.mutateAsync(deleteDialog.leadId);
      toast.success("Lead deleted successfully!");
      setDeleteDialog({ open: false });
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const handleExportLeads = (format: 'csv' | 'excel') => {
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Score'];
    const data = safeLeads.map(lead => [
      `${lead.firstName} ${lead.lastName} `,
      lead.email || '',
      lead.phone || '',
      lead.businessName || '',
      statuses.find((s: any) => s.id === lead.statusId)?.entityValue || '',
      sources.find((s: any)  => s.id === lead.sourceId)?.entityValue || '',
      lead.leadScore || 0
    ]);
    
    const fileName = `leads-export-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      const csvContent = [headers, ...data]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Excel format (XLSX)
      const excelContent = [headers, ...data]
        .map(row => row.join('\t'))
        .join('\n');
      
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.xls`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast.success(`Leads exported as ${format.toUpperCase()} successfully!`);
  };

  // Enhanced filter handlers
  const handleFilterChange = (filterId: string, values: string[]) => {
    const filterConfig = filterConfigs.find((f) => f.id === filterId);
    if (!filterConfig) return;

    setActiveFilters((prev) => {
      const existingIndex = prev.findIndex((f) => f.filterId === filterId);
      const newFilter: ActiveFilter = {
        filterId,
        filterLabel: filterConfig.label,
        values,
        valueLabels: values.map((value) => {
          const option = filterConfig.options.find((opt) => opt.id === value);
          return option?.label || value;
        }),
      };

      if (existingIndex >= 0) {
        // Update existing filter
        if (values.length === 0) {
          return prev.filter((_, index) => index !== existingIndex);
        }
        const newFilters = [...prev];
        newFilters[existingIndex] = newFilter;
        return newFilters;
      } else {
        // Add new filter
        return values.length > 0 ? [...prev, newFilter] : prev;
      }
    });
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
  };

  const handleSortChange = (
    newSortBy: string,
    newSortOrder: "asc" | "desc"
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Leads</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "You don't have access to this organization."}
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      

        {/* Stats Cards */}
      

        {/* Filters and Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 justify-between">
              <div className="">
                <EnhancedFilters
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  filters={filterConfigs}
                  activeFilters={activeFilters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  resultCount={safeLeads.length}
                  totalCount={pagination.total}
                />
              </div>
              <div className="flex gap-2 items-center">

              <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 !font-regular"
                    onClick={() => setBulkImportDialog(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>

  {/* Columns Customizer Dropdown */}
                 


                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 !font-regular"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportLeads('csv')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportLeads('excel')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button
                         size="sm"
                         variant="outline"
                         className="flex items-center gap-2 !font-regular !text-[14px]"
                       >
                         <LayoutGrid className="h-4 w-4" />
                          Columns
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent 
                       side="bottom" 
                       align="end" 
                       className="w-64 p-2"
                     >
                       <p className="text-sm font-semibold px-2 pb-2">Customize Columns</p>
                       <div className="flex flex-col gap-2">
                         {tableColumns.map((col, idx) => (
                           <div key={col.id} className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded">
                             <span className="text-sm">{col.label}</span>
                             <Switch
                               checked={visibleColumns.includes(col.id)}
                               onCheckedChange={() => handleToggleColumn(col.id)}
                             />
                           </div>
                         ))}
                       </div>
                       <div className="flex justify-end mt-2">
                         <Button size="sm" onClick={handleApplyColumns}>
                           Apply
                         </Button>
                       </div>
                     </DropdownMenuContent>
                   </DropdownMenu>

                <Button asChild size="sm" className="bg-[#45a2ff] hover:bg-[#45a2ff]/90 px-2">
                <Link href="/pages/testtable/newlead">
                <Plus className="h-3 w-3 " />
                Add Lead
              </Link>
            </Button>

              </div>
            </div>

            {/* Data Table */}
            <div className="mt-4">
              <ReactTable 
                columns={getTableColumns()} 
                data={safeLeads} 
              />
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-[12px] text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} leads
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>




      
      <Sheet 
        open={leadDetailsSheet.open} 
        onOpenChange={(open) => setLeadDetailsSheet({ open, leadId: open ? leadDetailsSheet.leadId : undefined })}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lead Details</SheetTitle>
            <SheetDescription className="text-[12px] !mt-[0px]">
              View detailed information about the selected lead 
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-3 space-y-6">
            {safeLeads.length > 0 ? (
              // Get first lead as example or selected lead
              (() => {
                const selectedLead = leadDetailsSheet.leadId 
                  ? safeLeads.find(lead => lead.leadId === leadDetailsSheet.leadId)
                  : safeLeads[0];
                
                if (!selectedLead) return <p className="text-muted-foreground">No lead selected</p>;
                
                return (
                  <div className="space-y-4">
                    {/* Basic Information */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="font-meidum text-base mb-1">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Full Name</p>
                          <p className="font-medium text-xs" >{selectedLead.firstName} {selectedLead.lastName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium text-xs">{selectedLead.email || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium text-xs">{selectedLead.phone || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Job Title</p>
                          <p className="font-medium text-xs">{selectedLead.jobTitle || "Not provided"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Company Information */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="font-meidum text-base mb-1">Company Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Company Name</p>
                          <p className="font-medium text-xs">{selectedLead.businessName || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Website</p>
                          <p className="font-medium text-xs">{selectedLead.companyWebsite || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">LinkedIn</p>
                          <p className="font-medium text-xs">{selectedLead.linkedinProfile || "Not provided"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Lead Information */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="font-meidum text-base mb-1">Lead Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-medium text-xs">
                            {(() => {
                              const status = statuses.find((s: any) => s.id === selectedLead.statusId);
                              return status?.entityValue || "Unknown";
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Source</p>
                          <p className="font-medium text-xs">
                            {(() => {
                              const source = sources.find((s: any) => s.id === selectedLead.sourceId);
                              return source?.entityValue || "Unknown";
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Grade</p>
                          <p className="font-medium text-xs">
                            {(() => {
                              const grade = grades.find((g: any) => g.id === selectedLead.scoreGradeId);
                              return grade?.entityValue || "Ungraded";
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="font-medium text-xs">{selectedLead.leadScore || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedLead.qualificationNotes && (
                      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <h3 className="font-meidum text-base mb-1">Notes</h3>
                        <p className="text-xs text-muted-foreground">{selectedLead.qualificationNotes}</p>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="font-meidum text-base mb-1">Dates</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="font-medium text-xs">
                            {new Date(selectedLead.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Updated</p>
                          <p className="font-medium text-xs">
                            {new Date(selectedLead.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-muted-foreground">No leads available to display</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <BulkImportDialog
        open={bulkImportDialog}
        onOpenChange={setBulkImportDialog}
        onImportComplete={(results) => {
          console.log("Import completed:", results);
          // Refetch leads data to show new imports
          // You can add a refetch function here
        }}
      />


      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            leadId: open ? deleteDialog.leadId : undefined,
            leadName: open ? deleteDialog.leadName : undefined,
          })
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteDialog.leadName}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteLead}
                disabled={deleteLeadMutation.isPending}
              >
                {deleteLeadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog
        open={activityDialog.open}
        onOpenChange={(open) =>
          setActivityDialog({
            open,
            leadId: open ? activityDialog.leadId : undefined,
          })
        }
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          {activityDialog.leadId && (
            <ActivityLogForm
              relatedType="lead"
              relatedId={activityDialog.leadId}
              onSuccess={() => {
                setActivityDialog({ open: false });
                queryClient.invalidateQueries({ queryKey: ["leads"] });
              }}
              onCancel={() => setActivityDialog({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up Scheduler Dialog */}
      <Dialog
        open={followUpDialog.open}
        onOpenChange={(open) =>
          setFollowUpDialog({
            open,
            leadId: open ? followUpDialog.leadId : undefined,
            leadName: open ? followUpDialog.leadName : undefined,
          })
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          {followUpDialog.leadId && (
            <FollowUpScheduler
              leadId={followUpDialog.leadId}
              leadName={followUpDialog.leadName}
              onSuccess={() => {
                setFollowUpDialog({ open: false });
                queryClient.invalidateQueries({ queryKey: ["leads"] });
              }}
              onCancel={() => setFollowUpDialog({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Deal Dialog */}
      <Dialog
        open={createDealDialog.open}
        onOpenChange={(open) =>
          setCreateDealDialog({
            open,
            leadId: open ? createDealDialog.leadId : undefined,
          })
        }
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Deal from Lead</DialogTitle>
          </DialogHeader>
          {createDealDialog.leadId && (
            <CreateDealForm
              preSelectedLeadId={createDealDialog.leadId}
              onSuccess={() => {
                setCreateDealDialog({ open: false });
                queryClient.invalidateQueries({ queryKey: ["deals"] });
                toast.success("Deal created successfully!");
              }}
              onCancel={() => setCreateDealDialog({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}