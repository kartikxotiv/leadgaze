"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  useLeadScores,
  useScoringStats,
  useCalculateLeadScore,
  useBatchCalculateScores,
  useCreateScoringRule,
  getTierColor,
  getTierIcon,
  type LeadScore,
} from "@/hooks/use-lead-scoring";
import {
  Target,
  TrendingUp,
  Zap,
  RefreshCw,
  Settings,
  Plus,
  Loader2,
  AlertCircle,
  Users,
  Award,
  Activity,
  BarChart3,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LeadScoringDashboardProps {
  organizationId?: string;
  className?: string;
}

function ScoreCard({ score }: { score: LeadScore }) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-6 truncate">
              {score.lead?.businessName ||
                `${score.lead?.firstName} ${score.lead?.lastName}`}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {score.lead?.jobTitle} • {score.lead?.source}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs font-bold", getTierColor(score.tier))}
            >
              {getTierIcon(score.tier)} {score.tier.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {score.totalScore}
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold">
              {format(new Date(score.lastCalculated), "MMM d")}
            </div>
            <div className="text-xs text-muted-foreground">Last Updated</div>
          </div>
        </div>

        {score.scoreBreakdown && score.scoreBreakdown.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Top Factors:
            </div>
            {score.scoreBreakdown.slice(0, 2).map((breakdown, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="truncate">{breakdown.ruleName}</span>
                <span
                  className={cn(
                    "font-medium",
                    breakdown.points > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {breakdown.points > 0 ? "+" : ""}
                  {breakdown.points}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            View Details
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadScoringDashboard({
  organizationId,
  className,
}: LeadScoringDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showRulesDialog, setShowRulesDialog] = useState(false);

  const { data: statsData, isLoading: statsLoading } =
    useScoringStats(organizationId);
  const { data: scoresData, isLoading: scoresLoading } = useLeadScores({
    organizationId,
    limit: 20,
  });
  const calculateScoreMutation = useCalculateLeadScore();
  const batchCalculateMutation = useBatchCalculateScores();
  const createRuleMutation = useCreateScoringRule();

  const scores = scoresData?.scores || [];
  const stats = statsData || {
    total: 0,
    byTier: { cold: 0, warm: 0, hot: 0, burning: 0 },
    averageScore: 0,
    highScoreLeads: 0,
    recentlyScored: 0,
  };

  const handleInitializeRules = async () => {
    try {
      console.log("Initializing default scoring rules...");
      const result = await createRuleMutation.mutateAsync({
        initializeDefaults: true,
      });
      console.log("Initialization result:", result);
      toast.success("Default scoring rules initialized!");
    } catch (error) {
      console.error("Error initializing scoring rules:", error);
      toast.error(
        `Failed to initialize scoring rules: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleBatchCalculate = async () => {
    try {
      console.log("Starting batch score calculation...");
      // Get all lead IDs that need scoring
      const leadIds = scores.map((score) => score.leadId);
      console.log("Lead IDs to score:", leadIds);
      const result = await batchCalculateMutation.mutateAsync(leadIds);
      console.log("Batch calculation result:", result);
      toast.success("Batch score calculation completed!");
    } catch (error) {
      console.error("Error calculating scores:", error);
      toast.error(
        `Failed to calculate scores: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Simple fallback if there are API issues
  if (statsLoading && scoresLoading) {
    return (
      <div className={cn("w-full space-y-6", className)}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Scoring</h2>
          <p className="text-muted-foreground">
            AI-powered lead qualification and prioritization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleBatchCalculate}
            disabled={batchCalculateMutation.isPending}
          >
            {batchCalculateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculate All
          </Button>
          <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Scoring Rules
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Scoring Rules</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure how leads are scored and qualified
                    </p>
                  </div>
                  <Button
                    onClick={handleInitializeRules}
                    disabled={createRuleMutation.isPending}
                  >
                    {createRuleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Initialize Defaults
                  </Button>
                </div>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Scoring rules management interface coming soon...
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Scored
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    🔥 Burning
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.byTier.burning}
                  </p>
                </div>
                <div className="h-8 w-8 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    🌶️ Hot
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.byTier.hot}
                  </p>
                </div>
                <div className="h-8 w-8 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Score
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(stats.averageScore)}
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    High Score
                  </p>
                  <p className="text-2xl font-bold">{stats.highScoreLeads}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
                  <Award className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Score ≥ 60</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="hot-leads" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Hot Leads
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recent Lead Scores
              </CardTitle>
              <CardDescription>
                Latest scored leads with qualification insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scoresLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : scores.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scores.map((score) => (
                    <ScoreCard key={score.scoreId} score={score} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Scores Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start by initializing scoring rules and calculating lead
                    scores.
                  </p>
                  <div className="space-y-2">
                    <Button onClick={handleInitializeRules} className="mr-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Initialize Rules
                    </Button>
                    <Button variant="outline" onClick={handleBatchCalculate}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Calculate Scores
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hot-leads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                High Priority Leads
              </CardTitle>
              <CardDescription>
                Focus on these high-scoring leads for maximum conversion
                potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Hot Leads View</h3>
                <p className="text-muted-foreground">
                  Filtered view of burning and hot leads coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byTier).map(([tier, count]) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {getTierIcon(tier as any)}
                        </span>
                        <span className="font-medium capitalize">{tier}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                stats.total > 0
                                  ? (count / stats.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Scoring Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium">Recently Scored</span>
                    <span className="text-sm font-bold">
                      {stats.recentlyScored}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-sm font-bold">
                      {Math.round(stats.averageScore)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-medium">
                      Conversion Ready
                    </span>
                    <span className="text-sm font-bold">
                      {stats.byTier.hot + stats.byTier.burning}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Scoring Rules Configuration
              </CardTitle>
              <CardDescription>
                Customize how leads are scored based on your business criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Advanced Rules Builder
                </h3>
                <p className="text-muted-foreground mb-6">
                  Configure custom scoring rules, adjust weights, and fine-tune
                  the qualification engine.
                </p>
                <Button
                  onClick={handleInitializeRules}
                  disabled={createRuleMutation.isPending}
                >
                  {createRuleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Initialize Default Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
