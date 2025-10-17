"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useSmoothLogout } from "@/hooks/use-smooth-logout";
import { InviteUserDialog } from "@/components/auth/invite-user-dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Bell,
  Search,
  Menu,
  User,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle,
  Shield,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface DashboardHeaderProps {
  onMenuClick: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function DashboardHeader({ onMenuClick, collapsed, onCollapsedChange }: DashboardHeaderProps) {
  const { user, currentOrganization } = useAuth();
  const { currentOrganization: orgFromStore } = useAuthStore();
  const { logout, isLoggingOut } = useSmoothLogout();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = () => {
    if (!user?.firstName || !user?.lastName) return "U";
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user?.firstName || !user?.lastName) return "User";
    return `${user.firstName} ${user.lastName}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <>
      {/* Logout Loading Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Signing out...</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-[12px]">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCollapsedChange(!collapsed)}
              className="p-1.5"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Search Form */}
            {/* <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search leads, deals, tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                />
              </div>
            </form> */}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Invite button */}
            {orgFromStore?.organizationId && (
              <InviteUserDialog
                currentUserOrganization={orgFromStore}
                organizationId={orgFromStore.organizationId}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Invite user"
                    title="Invite user"
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>
                }
              />
            )}
            {/* Trial Status Badge */}
            {/* {currentOrganization?.subscriptionStatus === "trial" && (
              <Badge variant="outline" className="hidden sm:flex">
                Trial: {(currentOrganization as any)?.trialDaysRemaining || 14}{" "}
                days left
              </Badge>
            )} */}

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative bg-[#f1f5f9]">
                  <Bell className="w-5 h-5" />
                  {/* Notification Badge */}
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    3
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  <DropdownMenuItem className="flex flex-col items-start p-4">
                    <div className="font-medium">New lead assigned</div>
                    <div className="text-sm text-gray-500">
                      ACME Corp - John Doe
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      2 minutes ago
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start p-4">
                    <div className="font-medium">Deal updated</div>
                    <div className="text-sm text-gray-500">
                      Tech Solutions - $50,000
                    </div>
                    <div className="text-xs text-gray-400 mt-1">1 hour ago</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start p-4">
                    <div className="font-medium">Task due tomorrow</div>
                    <div className="text-sm text-gray-500">
                      Follow up with client
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      3 hours ago
                    </div>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center text-blue-600 hover:text-blue-700">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={undefined}
                      alt={getUserDisplayName()}
                    />
                    <AvatarFallback className="bg-blue-600 text-white text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {getUserDisplayName()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      
                      {currentOrganization?.name}

                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{getUserDisplayName()}</span>
                    <span className="text-xs font-normal text-gray-500">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/billing")}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing & Plans
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push("/security")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Security
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => router.push("/help")}>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Help & Support
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 dark:text-red-400"
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      Signing Out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
