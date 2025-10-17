"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { ActivityLogFormRefactored } from "@/components/activities/activity-log-form-refactored";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useLead, useLeadConfigs, useUpdateLead } from "@/hooks/use-leads";
import { EnhancedActivityTimeline } from "@/components/activities/enhanced-activity-timeline";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Phone,
  Mail,
  Globe,
  Building2,
  MapPin,
  Calendar,
  Clock,
  User,
  Target,
  Star,
  Zap,
  MessageSquare,
  FileText,
  TrendingUp,
  Users,
  ExternalLink,
  Copy,
  Share,
  Heart,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;

  const { data: lead, isLoading } = useLead(leadId);
  const { data: configs } = useLeadConfigs();
  const updateLeadMutation = useUpdateLead();

  const [activeTab, setActiveTab] = useState("overview");
  const [openNoteSheet, setOpenNoteSheet] = useState(false);

 
  const statuses = configs?.statuses || [];
  const sources = configs?.sources || [];
  const industries = configs?.industries || [];
  const companySizes = configs?.companySizes || [];
  const scoreGrades = configs?.scoreGrades || [];
  const productInterests = configs?.productInterests || [];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lead not found</h3>
            <p className="text-muted-foreground mb-4">
              The lead you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link href="/pages/leads">Back to Leads</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

 
  const status = statuses.find((s) => s.id === lead.statusId);
  const source = sources.find((s) => s.id === lead.sourceId);
  const industry = industries.find((i) => i.id === lead.industryId);
  const companySize = companySizes.find((c) => c.id === lead.companySizeId);
  const grade = scoreGrades.find((g) => g.id === lead.scoreGradeId);

 
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

 
  const handleStatusUpdate = async (newStatusId: string) => {
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

 
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pages/leads">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {lead.firstName} {lead.lastName}
              </h1>
              <p className="text-muted-foreground">
                {lead.jobTitle
                  ? `${lead.jobTitle} at ${lead.company}`
                  : lead.company}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Convert to Deal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete Lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {(lead.firstName?.[0] + lead.lastName?.[0]).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {lead.firstName} {lead.lastName}
                  </h3>
                  <p className="text-muted-foreground">{lead.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${getGradeColor(
                        grade?.entityValue || ""
                      )}`}
                    />
                    <span className="text-sm font-medium">
                      {grade?.entityValue || "Ungraded"}
                    </span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm font-medium">
                      Score: {lead.leadScore}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Note
                </Button>
                <Select
                  value={lead.statusId}
                  onValueChange={handleStatusUpdate}
                >
                  <SelectTrigger className="w-auto border-none shadow-none">
                    <Badge
                      variant="outline"
                      className={getStatusColor(status?.entityValue || "")}
                    >
                      {status?.entityValue
                        ?.replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.entityValue
                          ?.replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{lead.email}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(lead.email, "Email")
                              }
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {lead.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Phone
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{lead.phone}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(lead.phone, "Phone")
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {(lead.website || lead.linkedinUrl) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lead.website && (
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                Website
                              </p>
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {lead.website}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}

                        {lead.linkedinUrl && (
                          <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                LinkedIn
                              </p>
                              <a
                                href={lead.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                              >
                                View Profile
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{lead.company}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Job Title
                        </p>
                        <p className="font-medium">
                          {lead.jobTitle || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Industry
                        </p>
                        <p className="font-medium">
                          {industry?.entityValue || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Company Size
                        </p>
                        <p className="font-medium">
                          {companySize?.entityValue || "Not specified"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {lead.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {lead.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Lead Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="text-4xl font-bold text-blue-600">
                          {lead.leadScore}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          /100
                        </div>
                      </div>
                      <Progress value={lead.leadScore} className="h-2" />
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getGradeColor(
                            grade?.entityValue || ""
                          )}`}
                        />
                        <span className="text-sm font-medium">
                          {grade?.entityValue || "Ungraded"} Lead
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Lead Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge
                        variant="outline"
                        className={getStatusColor(status?.entityValue || "")}
                      >
                        {status?.entityValue
                          ?.replace("_", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase()) ||
                          "Unknown"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <Badge variant="secondary">
                        {source?.entityValue || "Unknown"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Last Updated
                      </p>
                      <p className="font-medium">
                        {new Date(lead.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Convert to Deal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Add to Favorites
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activities">
            <EnhancedActivityTimeline leadId={leadId} />
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Notes & Comments</CardTitle>
                <CardDescription>
                  Add notes about your interactions and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-muted-foreground mb-6">
                    Log a note to keep track of important information for this
                    lead.
                  </p>
                  <Sheet open={openNoteSheet} onOpenChange={setOpenNoteSheet}>
                    <SheetTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="bottom"
                      className="h-[80vh] max-h-[80vh] overflow-y-auto rounded-t-2xl"
                    >
                      <SheetTitle className="mt-8">Log Note</SheetTitle>
                      <SheetDescription className="mb-4">
                        Create a note for this lead
                      </SheetDescription>
                      <ActivityLogFormRefactored
                        relatedType="lead"
                        relatedId={leadId}
                        onSuccess={() => setOpenNoteSheet(false)}
                      />
                    </SheetContent>
                  </Sheet>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <EnhancedActivityTimeline leadId={leadId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
