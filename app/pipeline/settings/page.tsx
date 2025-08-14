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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePipeline } from "@/hooks/use-pipeline";
import { Settings, Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export default function PipelineSettingsPage() {
  const { stages } = usePipeline();

  return (
    <DashboardLayout
      title="Pipeline Settings"
      description="Configure your sales pipeline stages and probabilities"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Stage
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Pipeline Configuration
            </CardTitle>
            <CardDescription>
              Manage your sales pipeline stages, order, and probability settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      {stage.position}
                    </Badge>
                    <div>
                      <h3 className="font-medium">{stage.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Stage {stage.position}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={index === 0}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === stages.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Stage</CardTitle>
            <CardDescription>
              Create a new stage for your sales pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stage-name">Stage Name</Label>
                <Input id="stage-name" placeholder="e.g., Discovery" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  placeholder="25"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this stage"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button>Add Stage</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
