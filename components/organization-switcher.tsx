"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load the heavy CreateOrganizationSheet component
const CreateOrganizationSheetLazy = dynamic(
  () =>
    import("./create-organization-sheet").then((mod) => ({
      default: mod.CreateOrganizationSheet,
    })),
  {
    loading: () => (
      <div className="animate-pulse h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading organization form...</div>
      </div>
    ),
    ssr: false, // Don't render on server
  }
);

export function OrganizationSwitcher() {
  const {
    currentOrganization,
    organizations,
    switchOrganization,
    token,
    isAuthenticated,
    autoLogout,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [switchingToOrgId, setSwitchingToOrgId] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrganizationSwitch = async (orgId: string) => {
    // Clear any previous errors
    setError(null);

    // Check if user is authenticated and has a valid token
    if (!isAuthenticated || !token) {
      setError("Your session has expired. Logging out...");
      autoLogout();
      return;
    }

    // Validate organization ID
    if (!orgId || typeof orgId !== "string") {
      setError("Invalid organization selected");
      return;
    }

    // Check if already switching to this organization
    if (switchingToOrgId === orgId) {
      return;
    }

    // Check if already on this organization
    const currentOrgId =
      currentOrganization?.organizationId || currentOrganization?.id;
    if (orgId === currentOrgId) {
      return;
    }

    // Prevent race conditions - only allow one switch at a time
    if (isLoading || switchingToOrgId) {
      return;
    }

    // Set loading states
    setIsLoading(true);
    setSwitchingToOrgId(orgId);

    try {
      await switchOrganization(orgId);

      // Success - clear any errors
      setError(null);
    } catch (error) {
      // Handle specific error types
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to switch organization";

      if (
        errorMessage.includes("No authorization token provided") ||
        errorMessage.includes("Invalid token") ||
        errorMessage.includes("token")
      ) {
        setError("Your session has expired. Logging out...");
        autoLogout();
      } else if (
        errorMessage.includes("Access denied") ||
        errorMessage.includes("403")
      ) {
        setError("You don't have access to this organization.");
      } else if (
        errorMessage.includes("Network") ||
        errorMessage.includes("fetch")
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to switch organization. Please try again.");
      }

      console.error("Organization switch failed:", error);
    } finally {
      setIsLoading(false);
      setSwitchingToOrgId(null);
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated || !token) {
    return null; // Simply don't render instead of auto-logout to prevent loops
  }

  if (!currentOrganization) return null;

  return (
    <>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <span className="truncate">{currentOrganization.name}</span>
            </div>
            {isLoading ? (
              <span className="text-xs text-gray-500">Switching...</span>
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-full min-w-[240px]" align="start">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {organizations?.map((org) => {
            const orgId = org.organizationId || org.id;
            const isCurrentOrg =
              orgId ===
              (currentOrganization?.organizationId || currentOrganization?.id);
            const isSwitchingToThisOrg = switchingToOrgId === orgId;
            const isDisabled = isLoading || isSwitchingToThisOrg;

            return (
              <DropdownMenuItem
                key={orgId}
                className={`flex ${
                  isCurrentOrg
                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                } items-center justify-between ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                onClick={() => {
                  if (!isDisabled) {
                    handleOrganizationSwitch(orgId as string);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {isSwitchingToThisOrg ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {org.name}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {org.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isSwitchingToThisOrg && (
                    <span className="text-xs text-blue-600">Switching...</span>
                  )}
                  {org.subscriptionStatus === "trial" &&
                    !isSwitchingToThisOrg && (
                      <Badge variant="secondary" className="text-xs">
                        Trial
                      </Badge>
                    )}
                </div>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={`flex items-center gap-2 ${
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={() => {
              if (!isLoading) {
                setShowCreateSheet(true);
              }
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Create New Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Organization Sheet */}
      {showCreateSheet && (
        <CreateOrganizationSheetLazy
          open={showCreateSheet}
          onOpenChange={setShowCreateSheet}
        />
      )}
    </>
  );
}
