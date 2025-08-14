"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Crown,
  Shield,
  User,
  Eye,
  Settings,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionManager } from "@/lib/permissions";
import { useAuthStore } from "@/lib/stores/auth-store";

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  lastLogin?: string;
  memberSince: string;
  joinedAt: string;
  status: string;
  role: {
    role: string;
    displayName: string;
    permissions: string[];
  };
}

interface TeamMembersListProps {
  currentUserOrganization: any;
  organizationId: string;
  onRefresh?: () => void;
}

export function TeamMembersList({
  currentUserOrganization,
  organizationId,
  onRefresh,
}: TeamMembersListProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();

  const canManageTeam =
    PermissionManager.canRemoveUsers(currentUserOrganization) ||
    PermissionManager.canChangeUserRoles(currentUserOrganization) ||
    PermissionManager.isAdmin(currentUserOrganization);

  useEffect(() => {
    if (organizationId) {
      console.log(
        "🔍 TeamMembersList: useEffect triggered with organizationId:",
        organizationId
      );
      fetchMembers();
    } else {
      console.warn("⚠️ TeamMembersList: No organizationId provided");
    }
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      // Use token from auth store instead of localStorage
      if (!token) {
        console.warn("No auth token found in store for team members");
        toast.error("Authentication required to view team members");
        return;
      }

      console.log("Fetching members for organization:", organizationId);

      const response = await fetch(
        `/api/organizations/${organizationId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log("Team members API response:", data);

      if (data.success) {
        setMembers(data.members || []);
        console.log(
          `Successfully loaded ${data.members?.length || 0} team members`
        );
      } else {
        console.error("Team members API error:", data.error);
        toast.error(data.error || "Failed to load team members");
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <Settings className="h-4 w-4" />;
      case "viewer":
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return "Never";

    const date = new Date(lastLogin);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;

    return formatDate(lastLogin);
  };

  const handleMemberAction = async (action: string, member: TeamMember) => {
    switch (action) {
      case "email":
        window.location.href = `mailto:${member.email}`;
        break;
      case "edit":
        toast.info("Edit member feature coming soon");
        break;
      case "remove":
        toast.info("Remove member feature coming soon");
        break;
      default:
        break;
    }
  };

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
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Team Members ({members.length})
            </CardTitle>
            <CardDescription>
              Active members in your organization
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchMembers();
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
        {members.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No team members found. Start by inviting your first team member!
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={member.fullName} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getRoleBadgeColor(member.role.role)}
                    >
                      {getRoleIcon(member.role.role)}
                      <span className="ml-1">{member.role.displayName}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">
                          {member.email}
                        </span>
                      </div>
                      {member.phoneNumber && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-3 w-3 mr-2" />
                          <span>{member.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-2" />
                      {formatDate(member.joinedAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastLogin(member.lastLogin)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "active" ? "default" : "secondary"
                      }
                      className={
                        member.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManageTeam && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleMemberAction("email", member)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>

                          {member.role.role !== "owner" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMemberAction("edit", member)
                                }
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleMemberAction("remove", member)
                                }
                                className="text-red-600"
                              >
                                <User className="h-4 w-4 mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
