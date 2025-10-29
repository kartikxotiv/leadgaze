"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { WorkspaceList } from "@/components/workspaces/workspace-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Users, Zap, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WorkspacesPage() {
  const { currentOrganization, user } = useAuth();

  if (!currentOrganization || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Loading...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we load your workspace settings.
          </p>
        </div>
      </div>
    );
  }

  const organizationId =
    currentOrganization.organizationId || currentOrganization.id;
  const userRole = currentOrganization.role || "viewer";
  const maxWorkspaces = currentOrganization.maxWorkspaces || 3;

  const canManageWorkspaces = ["owner", "admin"].includes(
    userRole.toLowerCase()
  );

  return (
    <div className="space-y-8">
      {}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Workspace Management
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Organize your teams and projects with workspaces. Each workspace can
          have its own leads, deals, pipeline, and team members.
        </p>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-600" />
              Workspace Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">0</span>
                <Badge variant="secondary">of {maxWorkspaces}</Badge>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Active workspaces in your organization
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <span className="text-2xl font-bold">0</span>
              <p className="text-xs text-muted-foreground">
                Members across all workspaces
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              Plan Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs">
                {currentOrganization.planType?.toUpperCase() || "FREE"}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {maxWorkspaces} workspace limit
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {}
      {!canManageWorkspaces && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You have <strong>{userRole}</strong> permissions. Only organization
            owners and admins can create and manage workspaces. Contact your
            administrator if you need to create new workspaces.
          </AlertDescription>
        </Alert>
      )}

      {}
      <div>
        <WorkspaceList
          organizationId={organizationId || ""}
          organizationMaxWorkspaces={maxWorkspaces}
          userRole={userRole}
        />
      </div>

      {}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            What are workspaces?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <div className="space-y-3 text-sm">
            <p>
              <strong>Workspaces</strong> help you organize your CRM data by
              teams, departments, or projects. Each workspace has its own:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Leads and deals</li>
              <li>Pipeline stages</li>
              <li>Team members and permissions</li>
              <li>Activity tracking</li>
              <li>Reporting and analytics</li>
            </ul>
            <p>
              <strong>Example:</strong> You might have separate workspaces for
              "Sales Team", "Marketing Leads", and "Customer Support" to keep
              data organized and ensure teams only see relevant information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
