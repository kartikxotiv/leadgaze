"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { InviteUserDialog } from "@/components/auth/invite-user-dialog";
import { InvitationList } from "@/components/auth/invitation-list";
import { TeamMembersList } from "@/components/team/team-members-list";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TeamPage() {
  const { currentOrganization } = useAuthStore();
  const organizationId = currentOrganization?.organizationId;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInviteSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {organizationId ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Team Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your organization members and invitations
                </p>
              </div>
              <div className="flex gap-2">
                <InviteUserDialog
                  currentUserOrganization={currentOrganization}
                  organizationId={organizationId}
                  onSuccess={handleInviteSuccess}
                />
              </div>
            </div>

            <Tabs defaultValue="members" className="space-y-6">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger
                  value="members"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="invitations"
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invitations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-6">
                <TeamMembersList
                  key={refreshTrigger}
                  currentUserOrganization={currentOrganization}
                  organizationId={organizationId}
                  onRefresh={handleInviteSuccess}
                />
              </TabsContent>

              <TabsContent value="invitations" className="space-y-6">
                <InvitationList
                  key={refreshTrigger}
                  currentUserOrganization={currentOrganization}
                  organizationId={organizationId}
                  onRefresh={handleInviteSuccess}
                />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading organization...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
