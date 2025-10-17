"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { usePreventAuthBack } from "@/hooks/use-prevent-auth-back";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/stat-card";
import { useLeads, useLeadConfigs, useUpdateLead } from "@/hooks/use-leads";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";

// Dynamic import for heavy KanbanPipeline
const KanbanPipeline = dynamic(
  () =>
    import("@/components/leads/kanban-pipeline").then((mod) => ({
      default: mod.KanbanPipeline,
    })),
  {
    loading: () => (
      <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />
    ),
    ssr: false,
  }
);
import {
  InlineEditText,
  InlineEditEmail,
  InlineEditPhone,
  InlineEditSelect,
  InlineEditScore,
  DirectSelect,
  DirectScore,
  DirectText,
} from "@/components/leads/inline-edit-cell";
import {
  EnhancedFilters,
  type FilterConfig,
  type ActiveFilter,
} from "@/components/leads/enhanced-filters";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActivityLogForm } from "@/components/activities/activity-log-form";
import { FollowUpScheduler } from "@/components/tasks/follow-up-scheduler";
import { CreateDealForm } from "@/components/deals/create-deal-form";
// Lead scoring dashboard temporarily disabled due to API issues
import { BulkImportDialog } from "@/components/leads/bulk-import-dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  Clock,
  Filter,
  Download,
  UserPlus,
  ChevronRight,
  Star,
  Target,
  Zap,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  Activity,
  Upload,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";

export default function LeadsPage() {
  const { data: leadsData, isLoading, error } = useLeads();
  const { data: configs } = useLeadConfigs();
  const updateLeadMutation = useUpdateLead();

  // Prevent navigation back to auth pages
  usePreventAuthBack();

  // Extract leads array from the response data structure
  const leads = leadsData?.leads || [];
  const safeLeads = Array.isArray(leads) ? leads : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [sortBy, setSortBy] = useState<string>("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
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
  const [bulkImportDialog, setBulkImportDialog] = useState(false);

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

  // Get configurations (note: API returns data grouped by entity type)
  const statuses = configs?.status || [];
  const sources = configs?.source || [];
  const grades = configs?.score_grade || [];

  // Status color mapping (moved above useMemo)
  const getStatusColor = (statusName: string) => {
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
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Grade color mapping (moved above useMemo)
  const getGradeColor = (gradeName: string) => {
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
  const getShortStatusName = (entityValue: string) => {
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

  // Create filter configurations for enhanced filters (Status removed - handled by tabs)
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

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = safeLeads.filter((lead) => {
      // Search filter
      const matchesSearch =
        lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.businessName?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Enhanced filters (Status filtering handled by tabs)
      const sourceFilter = activeFilters.find((f) => f.filterId === "source");
      const gradeFilter = activeFilters.find((f) => f.filterId === "grade");

      const matchesSource =
        !sourceFilter?.values.length ||
        sourceFilter.values.includes(lead.sourceId);
      const matchesGrade =
        !gradeFilter?.values.length ||
        gradeFilter.values.includes(lead.scoreGradeId || "");

      // Tab filtering
      const statusConfig = statuses.find((s: any) => s.id === lead.statusId);
      const gradeConfig = grades.find((g: any) => g.id === lead.scoreGradeId);

      let matchesTab = true;
      if (activeTab !== "all") {
        switch (activeTab) {
          case "new":
            matchesTab =
              (statusConfig?.value || statusConfig?.entityValue) === "new";
            break;
          case "active":
            matchesTab = ["contact_attempted", "in_conversation"].includes(
              statusConfig?.value || statusConfig?.entityValue || ""
            );
            break;
          case "qualified":
            matchesTab =
              (statusConfig?.value || statusConfig?.entityValue) ===
              "qualified";
            break;
          case "hot":
            matchesTab =
              (gradeConfig?.value || gradeConfig?.entityValue) === "hot";
            break;
        }
      }

      return matchesSource && matchesGrade && matchesTab;
    });

    // Sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case "name":
            aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
            bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
            break;
          case "company":
            aValue = (a.businessName || "").toLowerCase();
            bValue = (b.businessName || "").toLowerCase();
            break;
          case "score":
            aValue = a.leadScore;
            bValue = b.leadScore;
            break;
          case "created":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case "updated":
          default:
            aValue = new Date(a.updatedAt).getTime();
            bValue = new Date(b.updatedAt).getTime();
            break;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    safeLeads,
    searchTerm,
    activeFilters,
    activeTab,
    sortBy,
    sortOrder,
    statuses,
    grades,
  ]);

  // Quick stats
  const stats = useMemo(() => {
    const total = safeLeads.length;
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

  // Quick status update
  const handleQuickStatusUpdate = async (
    leadId: string,
    newStatusId: string
  ) => {
    try {
      await updateLeadMutation.mutateAsync({
        leadId,
        data: { statusId: newStatusId },
      });
      toast.success("Lead status updated successfully!");
    } catch (error) {
      toast.error("Failed to update lead status");
    }
  };

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

    // Update legacy filter states for backward compatibility
    if (filterId === "source") {
      setSourceFilter(values.length === 1 ? values[0] : "all");
    } else if (filterId === "grade") {
      setGradeFilter(values.length === 1 ? values[0] : "all");
    }
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setSourceFilter("all");
    setGradeFilter("all");
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
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/pages/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Leads</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Enhanced Header with Actions */}
        <div className="relative overflow-hidden p-0">
          <div className="relative z-10">
            <div className="flex flex-col gap-6 md:flex-row  md:justify-between ">
              <div className="">
                {/* <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Lead Management
                </h1> */}


                {/* <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                  Track and nurture your sales prospects through the pipeline
                </p> */}
                {/* <div className="flex flex-col sm:flex-row gap-2 mt-2 overflow-x-auto">
                  <StatCard
                    icon={Target}
                    iconColor="text-blue-600"
                    bgColor="bg-blue-500/20"
                    value={safeLeads.length}
                    label="Total Leads"
                  />

                  <StatCard
                    icon={Zap}
                    iconColor="text-red-600"
                    bgColor="bg-red-500/20"
                    value={
                      filteredLeads.filter(
                        (lead) => lead.scoreGrade?.entityValue === "hot"
                      ).length
                    }
                    label="Hot Leads"
                  />

                  <StatCard
                    icon={UserPlus}
                    iconColor="text-green-600"
                    bgColor="bg-green-500/20"
                    value={
                      filteredLeads.filter(
                        (lead) => lead.status?.entityValue === "New"
                      ).length
                    }
                    label="New Leads"
                  />

                  <StatCard
                    icon={CheckCircle2}
                    iconColor="text-purple-600"
                    bgColor="bg-purple-500/20"
                    value={
                      filteredLeads.filter(
                        (lead) => lead.status?.entityValue === "Qualified"
                      ).length
                    }
                    label="Qualified"
                  />
                </div> */}
              </div>
              <div className="flex  flex-row  gap-3   ">
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/50 backdrop-blur-sm border-gray-200/50 hover:bg-white/80 transition-all duration-200"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button> */}
                <div className="flex gap-2">
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkImportDialog(true)}
                    className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4" />
                    Bulk Import
                  </Button> */}
                  {/* <Button
                    asChild
                    size="sm"
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Link href="/pages/leads/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lead
                    </Link>
                  </Button> */}
                </div>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          {/* <div className="absolute top-0 right-0 -translate-y-12 translate-x-12">
            <div className="w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
          </div> */}
        </div>

        {/* Filters and Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              {/* <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All Leads</TabsTrigger>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="qualified">Qualified</TabsTrigger>
                <TabsTrigger value="hot">Hot Prospects</TabsTrigger>
                <TabsTrigger
                  value="scoring"
                  className="flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  Lead Scoring
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    Table View
                  </Button>
                  <Button
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                    className="flex items-center gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    kanban View
                  </Button>
                </div>
              </div> */}

              {/* Enhanced Filters */}
              {/* <EnhancedFilters
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filterConfigs}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                resultCount={filteredLeads.length}
                totalCount={safeLeads.length}
              /> */}

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
                resultCount={filteredLeads.length}
                totalCount={safeLeads.length}
              />
                </div>
                <div className="flex gap-2 items-center">

                


                  {/* Columns Customizer Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Customize Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end" className="w-64 p-2">
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




                <Button
                    asChild
                    size="sm"
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Link href="/pages/leads/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lead
                    </Link>
                  </Button>
                </div>
              </div>





              <TabsContent value={activeTab} className="space-y-4">
                {/* Conditional View Rendering */}
                {viewMode === "kanban" ? (
                  <div className="h-[calc(100vh-300px)] min-h-[600px]">
                    <KanbanPipeline
                      leads={filteredLeads}
                      statuses={statuses}
                      onLeadUpdate={handleQuickStatusUpdate}
                      onLeadClick={(lead) => {
                        // You can implement a quick edit modal here
                        console.log("Quick edit lead:", lead);
                      }}
                    />
                  </div>
                ) : (
                  /* Leads Table */
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f1f5f980]">
                          <TableHead>S.no</TableHead>
                          {visibleColumns.includes('name') && <TableHead>Name</TableHead>}
                          {visibleColumns.includes('email') && <TableHead>Email</TableHead>}
                          {visibleColumns.includes('contact') && <TableHead>Contact</TableHead>}
                          {visibleColumns.includes('company') && <TableHead>Company</TableHead>}
                          {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
                          {visibleColumns.includes('grade') && <TableHead>Grade</TableHead>}
                          {visibleColumns.includes('score') && <TableHead>Score</TableHead>}
                          {visibleColumns.includes('source') && <TableHead>Source</TableHead>}
                          {/* {visibleColumns.includes('lastActivity') && <TableHead>Last Activity</TableHead>} */}

                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={visibleColumns.length + 2} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Users className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  No leads found
                                </p>
                                <Button asChild size="sm">
                                  <Link href="/pages/leads/new">
                                    Add your first lead
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredLeads.map((lead) => {
                            const status = statuses.find(
                              (s: any) => s.id === lead.statusId
                            );
                            const source = sources.find(
                              (s: any) => s.id === lead.sourceId
                            );
                            const grade = grades.find(
                              (g: any) => g.id === lead.scoreGradeId
                            );

                            return (


                              <TableRow
                                key={lead.leadId}
                                className="hover:bg-muted/50"
                              >
                              <TableCell>
                                {filteredLeads.findIndex((l) => l.leadId === lead.leadId) + 1}
                              </TableCell>

                                {visibleColumns.includes('name') && (
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    
                                    {/* <Avatar className="h-8 w-8">
                                      <AvatarFallback>
                                        {(
                                          lead.firstName?.[0] +
                                          lead.lastName?.[0]
                                        ).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar> */}

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <DirectText
                                          value={`${lead.firstName} ${lead.lastName}`}
                                          onSave={async (value) => {
                                            const [
                                              firstName,
                                              ...lastNameParts
                                            ] = value.split(" ");
                                            const lastName =
                                              lastNameParts.join(" ");
                                            await handleFieldUpdate(
                                              lead.leadId,
                                              "firstName",
                                              firstName
                                            );
                                            if (lastName) {
                                              await handleFieldUpdate(
                                                lead.leadId,
                                                "lastName",
                                                lastName
                                              );
                                            }
                                          }}
                                          placeholder="Enter full name..."
                                          className="font-medium"
                                        />


                                      </div>


                                          


                                    </div>
                                  </div>
                                </TableCell>
                                )}
                                {visibleColumns.includes('email') && (
                                <TableCell>
                                  
                                  <InlineEditEmail
                                        value={lead.email}
                                        onSave={(value) =>
                                          handleFieldUpdate(
                                            lead.leadId,
                                            "email",
                                            value
                                          )
                                        }
                                        placeholder="Enter email..."
                                      />


                                </TableCell>
                                )}


                                  {visibleColumns.includes('contact') && (
                                    <TableCell>
                                      {lead.phone}
                                    </TableCell>
                                  )}



                                {visibleColumns.includes('company') && (
                                <TableCell>
                                  <div className="space-y-1">
                                    <DirectText
                                      value={lead.businessName}
                                      onSave={(value) =>
                                        handleFieldUpdate(
                                          lead.leadId,
                                          "businessName",
                                          value
                                        )
                                      }
                                      placeholder="Enter company name..."
                                      className="font-medium"
                                    />
                                    {/* <DirectText
                                      value={lead.jobTitle}
                                      onSave={(value) =>
                                        handleFieldUpdate(
                                          lead.leadId,
                                          "jobTitle",
                                          value
                                        )
                                      }
                                      placeholder="Enter job title..."
                                      className="text-sm text-muted-foreground"
                                    /> */}
                                  </div>
                                </TableCell>
                                )}
                                {visibleColumns.includes('status') && (
                                <TableCell>
                                  <DirectSelect
                                    value={lead.statusId}
                                    options={statuses.map((s: any) => ({
                                      id: s.id,
                                      value: getShortStatusName(
                                        s.value || s.entityValue || ""
                                      ),
                                      label: getShortStatusName(
                                        s.value || s.entityValue || ""
                                      ),
                                    }))}
                                    onSave={(value) =>
                                      handleQuickStatusUpdate(
                                        lead.leadId,
                                        value
                                      )
                                    }
                                    badge={true}
                                    badgeVariant="outline"
                                    badgeClassName={getStatusColor(
                                      status?.entityValue || ""
                                    )}
                                  />
                                </TableCell>
                                )}
                                {visibleColumns.includes('grade') && (
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${getGradeColor(
                                        grade?.entityValue || ""
                                      )}`}
                                    />
                                    <span className="text-sm font-medium">
                                      {grade?.entityValue || "Ungraded"}
                                    </span>
                                  </div>
                                </TableCell>
                                )}
                                {visibleColumns.includes('score') && (
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold">
                                      {lead.scoreData?.totalScore ||
                                        lead.leadScore ||
                                        0}
                                    </span>
                                    {/* {lead.scoreData?.tier && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                          lead.scoreData.tier === "burning"
                                            ? "bg-red-100 text-red-800"
                                            : lead.scoreData.tier === "hot"
                                            ? "bg-orange-100 text-orange-800"
                                            : lead.scoreData.tier === "warm"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        {lead.scoreData.tier === "burning" &&
                                          "🔥"}
                                        {lead.scoreData.tier === "hot" && "🌶️"}
                                        {lead.scoreData.tier === "warm" && "🟡"}
                                        {lead.scoreData.tier === "cold" && "🧊"}
                                      </Badge>
                                    )} */}
                                  </div>
                                </TableCell>
                                )}
                                {visibleColumns.includes('source') && (
                                <TableCell>
                                  <Badge variant="secondary">
                                    {source?.entityValue || "Unknown"}
                                  </Badge>
                                </TableCell>
                                )}
                                {/* {visibleColumns.includes('lastActivity') && (
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(
                                      lead.updatedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </TableCell>
                                )} */}
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (lead.phone) {
                                            window.open(
                                              `tel:${lead.phone}`,
                                              "_self"
                                            );
                                          } else {
                                            toast.error(
                                              "No phone number available"
                                            );
                                          }
                                        }}
                                        disabled={!lead.phone}
                                      >
                                        <Phone className="h-4 w-4 mr-2" />
                                        Call {lead.phone || "No phone"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (lead.email) {
                                            window.open(
                                              `mailto:${lead.email}`,
                                              "_self"
                                            );
                                          } else {
                                            toast.error(
                                              "No email address available"
                                            );
                                          }
                                        }}
                                        disabled={!lead.email}
                                      >
                                        <Mail className="h-4 w-4 mr-2" />
                                        Send Email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setActivityDialog({
                                            open: true,
                                            leadId: lead.leadId,
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
                                            leadId: lead.leadId,
                                            leadName: `${lead.firstName} ${lead.lastName}`,
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
                                            leadId: lead.leadId,
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
                                      <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scoring" className="space-y-4">
                <div className="text-center py-12 space-y-4">
                  <Target className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-2xl font-semibold mb-2">
                      Lead Scoring System
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      AI-powered lead qualification and prioritization system.
                      This feature will score your leads based on engagement,
                      company fit, and behavior patterns.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button
                      onClick={() =>
                        toast.info(
                          "Lead scoring system will be available soon!"
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Setup Scoring Rules
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.info("Feature coming soon!")}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Calculate Scores
                    </Button>
                  </div>
                  <div className="mt-8 p-4 bg-muted rounded-lg max-w-lg mx-auto">
                    <h4 className="font-medium mb-2">Scoring Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>
                        • Activity-based scoring (calls, emails, responses)
                      </li>
                      <li>• Company profile matching (size, industry)</li>
                      <li>• Engagement tracking (email opens, clicks)</li>
                      <li>• Lead source quality assessment</li>
                      <li>• Automatic tier classification (Hot, Warm, Cold)</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          {activityDialog.leadId && (
            <ActivityLogForm
              relatedType="lead"
              relatedId={activityDialog.leadId}
              onSuccess={() => setActivityDialog({ open: false })}
              onCancel={() => setActivityDialog({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-Up Scheduler Dialog */}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Schedule Follow-up{" "}
              {followUpDialog.leadName ? `for ${followUpDialog.leadName}` : ""}
            </DialogTitle>
          </DialogHeader>
          {followUpDialog.leadId && (
            <FollowUpScheduler
              leadId={followUpDialog.leadId}
              leadName={followUpDialog.leadName}
              onSuccess={() => setFollowUpDialog({ open: false })}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Deal</DialogTitle>
          </DialogHeader>
          {createDealDialog.leadId && (
            <CreateDealForm
              preSelectedLeadId={createDealDialog.leadId}
              onSuccess={() => setCreateDealDialog({ open: false })}
              onCancel={() => setCreateDealDialog({ open: false })}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportDialog}
        onOpenChange={setBulkImportDialog}
        onImportComplete={(results) => {
          console.log("Import completed:", results);
          // Refetch leads data to show new imports
          // You can add a refetch function here
        }}
      />
    </DashboardLayout>
  );
}
