"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Eye, EyeOff, Mail, Building, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface InvitationDetails {
  email: string;
  organization: {
    name: string;
    description?: string;
  };
  role: {
    displayName: string;
    description: string;
  };
  inviter: {
    name: string;
    email: string;
  };
  message?: string;
  expiresAt: string;
  isExpired: boolean;
  isAccepted: boolean;
}

interface AcceptInvitationFormProps {
  invitationToken: string;
}

export function AcceptInvitationForm({
  invitationToken,
}: AcceptInvitationFormProps) {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchInvitationDetails();
  }, [invitationToken]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(
        `/api/auth/accept-invitation?token=${invitationToken}`
      );
      const data = await response.json();

      if (data.success) {
        setInvitation(data.invitation);
        // Check if user might already exist by email domain or other logic
        // For now, assume new user unless we have more information
      } else {
        toast.error(data.error || "Invalid invitation");
        router.push("/auth/sign-in");
      }
    } catch (error) {
      console.error("Failed to fetch invitation:", error);
      toast.error("Failed to load invitation details");
      router.push("/auth/sign-in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (isNewUser && (!password || password.length < 8)) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (isNewUser && (!fullName || fullName.trim().length < 2)) {
      toast.error("Please enter your full name");
      return;
    }

    setIsAccepting(true);

    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationToken,
          password: isNewUser ? password : undefined,
          fullName: isNewUser ? fullName.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          data.user.isNewUser
            ? "Account created successfully! Welcome to the team!"
            : "Invitation accepted! Welcome back!"
        );

        // Store auth data (clear existing data first to avoid conflicts)
        if (typeof window !== "undefined") {
          // Clear any existing auth data to prevent cross-user contamination
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          localStorage.removeItem("organizations");
          localStorage.removeItem("currentOrganization");

          // Set new user's auth data
          localStorage.setItem("auth_token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem(
            "organizations",
            JSON.stringify(data.organizations)
          );
          localStorage.setItem(
            "currentOrganization",
            JSON.stringify(data.currentOrganization)
          );
        }

        // Wait a brief moment for auth state to update and cookie to be set
        setTimeout(() => {
          // Clear all browser history and force navigation to dashboard for NEW USER
          if (typeof window !== "undefined") {
            // Close any other tabs that might be open (can't do this but clear storage)
            localStorage.setItem("new_user_login", Date.now().toString());

            // Clear the entire history stack and navigate to dashboard
            window.history.replaceState(null, "", "/pages/dashboard");
            window.location.replace("/pages/dashboard");
          }
        }, 100);
      } else {
        toast.error(data.error || "Failed to accept invitation");
      }
    } catch (error) {
      console.error("Accept invitation error:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-center text-muted-foreground mt-4">
            Loading invitation details...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Unable to load invitation details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitation.isExpired) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            Invitation Expired
          </CardTitle>
          <CardDescription className="text-center">
            This invitation has expired and is no longer valid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please contact{" "}
              <a
                href={`mailto:${invitation.inviter.email}`}
                className="text-blue-600 hover:underline"
              >
                {invitation.inviter.name}
              </a>{" "}
              to request a new invitation.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/sign-in")}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitation.isAccepted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-green-600">
            Already Accepted
          </CardTitle>
          <CardDescription className="text-center">
            This invitation has already been accepted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Button
              onClick={() => router.push("/auth/sign-in")}
              className="w-full"
            >
              Continue to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-blue-100 rounded-full p-3">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            {invitation.inviter.name} has invited you to join{" "}
            <span className="font-semibold">
              {invitation.organization.name}
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Invitation Details */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{invitation.organization.name}</p>
              {invitation.organization.description && (
                <p className="text-sm text-muted-foreground">
                  {invitation.organization.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center space-x-2">
              <span className="text-sm">Role:</span>
              <Badge variant="secondary">{invitation.role.displayName}</Badge>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm">
                <span className="font-medium">From:</span>{" "}
                {invitation.inviter.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {invitation.inviter.email}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Message */}
        {invitation.message && (
          <>
            <Separator />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 italic">
                "{invitation.message}"
              </p>
            </div>
          </>
        )}

        {/* Role Description */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">
            As a {invitation.role.displayName}, you will be able to:
          </h4>
          <p className="text-sm text-muted-foreground">
            {invitation.role.description}
          </p>
        </div>

        <Separator />

        {/* Minimal Details for New Users */}
        {isNewUser && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your email will be: {invitation.email}
              </p>
            </div>
          </div>
        )}

        {/* Accept Button */}
        <Button
          onClick={handleAcceptInvitation}
          disabled={isAccepting || (isNewUser && password.length < 8)}
          className="w-full flex items-center space-x-2"
        >
          <CheckCircle className="h-4 w-4" />
          <span>
            {isAccepting
              ? "Accepting..."
              : isNewUser
              ? "Create Account & Accept"
              : "Accept Invitation"}
          </span>
        </Button>

        {/* Alternative Actions */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => setIsNewUser(false)}
              className="text-blue-600 hover:underline"
            >
              Sign in instead
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
