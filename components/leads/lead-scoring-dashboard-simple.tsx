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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Target,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SimpleLeadScoringDashboardProps {
  organizationId?: string;
  className?: string;
}

export function SimpleLeadScoringDashboard({
  organizationId,
  className,
}: SimpleLeadScoringDashboardProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [setupStatus, setSetupStatus] = useState<
    "idle" | "initializing" | "ready" | "error"
  >("idle");

  const handleInitializeRules = async () => {
    if (!organizationId) {
      toast.error("Organization ID is required");
      return;
    }

    setIsInitializing(true);
    setSetupStatus("initializing");

    try {
      console.log("Manually initializing scoring rules...");

     
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSetupStatus("ready");
      toast.success("Default scoring rules initialized! (Simulated)");
    } catch (error) {
      console.error("Error initializing scoring rules:", error);
      setSetupStatus("error");
      toast.error("Failed to initialize scoring rules");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestScoring = async () => {
    setIsCalculating(true);

    try {
      console.log("Testing score calculation...");

     
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success("Test scoring completed! (Simulated)");
    } catch (error) {
      console.error("Error testing scores:", error);
      toast.error("Failed to test scoring");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Lead Scoring System
          </h2>
          <p className="text-muted-foreground">
            AI-powered lead qualification and prioritization
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lead Scoring Setup
          </CardTitle>
          <CardDescription>
            Initialize the scoring system and configure rules for your
            organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The lead scoring system requires initial setup to configure
              default rules and calculate scores for existing leads.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Initialize Default Rules</h4>
                <p className="text-sm text-muted-foreground">
                  Set up default scoring rules for lead qualification
                </p>
              </div>
              <div className="flex items-center gap-2">
                {setupStatus === "ready" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {setupStatus === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <Button
                  onClick={handleInitializeRules}
                  disabled={isInitializing || setupStatus === "ready"}
                  className="flex items-center gap-2"
                >
                  {isInitializing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {setupStatus === "ready"
                    ? "Rules Initialized"
                    : "Initialize Rules"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Test Score Calculation</h4>
                <p className="text-sm text-muted-foreground">
                  Calculate scores for existing leads using the configured rules
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleTestScoring}
                  disabled={isCalculating || setupStatus !== "ready"}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Test Scoring
                </Button>
              </div>
            </div>
          </div>

          {setupStatus === "ready" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Lead scoring system is ready! You can now use the full scoring
                dashboard.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Organization ID:</strong>{" "}
              {organizationId || "Not provided"}
            </p>
            <p>
              <strong>Setup Status:</strong> {setupStatus}
            </p>
            <p>
              <strong>Note:</strong> This is a simplified version for testing.
              The full scoring system includes advanced rules, batch processing,
              and detailed analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
