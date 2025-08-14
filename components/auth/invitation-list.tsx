"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionManager } from "@/lib/permissions";
import { InviteUserDialog } from "./invite-user-dialog";

interface Invitation {
  id: string;
  email: string;
  message?: string;
  role: {
    role: string;
    displayName: string;
  };
  inviter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  status: string;
  expiresAt: string;
  isExpired: boolean;
  isAccepted: boolean;
  createdAt: string;
}

interface InvitationListProps {
  currentUserOrganization: any;
  organizationId: string;
  onRefresh?: () => void;
}

export function InvitationList({
  currentUserOrganization,
  organizationId,
  onRefresh,
}: InvitationListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canInviteUsers = PermissionManager.canInviteUsers(
    currentUserOrganization
  );

  useEffect(() => {
    if (canInviteUsers) {
      fetchInvitations();
    }
  }, [organizationId, canInviteUsers]);

  const fetchInvitations = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const response = await fetch(
        `/api/auth/invite?organizationId=${organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setInvitations(data.invitations);
      } else {
        toast.error("Failed to load invitations");
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInvitationLink = async (invitationId: string) => {
    // In a real app, you'd generate the invitation link based on the token
    // For now, we'll use a placeholder
    const invitationLink = `${window.location.origin}/auth/invite/${invitationId}`;

    try {
      await navigator.clipboard.writeText(invitationLink);
      toast.success("Invitation link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const resendInvitation = async (invitation: Invitation) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      // Create a new invitation (same email, role)
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: invitation.email,
          role: invitation.role.role,
          organizationId,
          message: invitation.message || "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Invitation resent successfully");
        fetchInvitations(); // Refresh the list
        onRefresh?.(); // Trigger parent refresh
      } else {
        toast.error(data.error || "Failed to resend invitation");
      }
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      // This would need a cancel endpoint in the API
      // For now, we'll show a placeholder
      toast.info("Cancel invitation feature coming soon");
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.isAccepted) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    }

    if (invitation.isExpired) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!canInviteUsers) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Invitations</CardTitle>
            <CardDescription>
              Manage pending invitations and invite new team members
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchInvitations();
              onRefresh?.();
            }}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No pending invitations. Use the "Invite User" button above to send
              your first invitation.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">
                    {invitation.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PermissionManager.getRoleBadgeColor(
                        invitation.role.role
                      )}
                    >
                      {invitation.role.displayName}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(invitation)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {invitation.inviter.firstName}{" "}
                        {invitation.inviter.lastName}
                      </div>
                      <div className="text-muted-foreground">
                        {invitation.inviter.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(invitation.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(invitation.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => copyInvitationLink(invitation.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>

                        {!invitation.isAccepted && !invitation.isExpired && (
                          <>
                            <DropdownMenuItem
                              onClick={() => resendInvitation(invitation)}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}

                        {invitation.isExpired && (
                          <DropdownMenuItem
                            onClick={() => resendInvitation(invitation)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Send New Invitation
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
