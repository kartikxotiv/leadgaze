"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { Card, CardContent } from "@/components/ui/card";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Invalid Invitation
              </h1>
              <p className="text-gray-600">
                The invitation link is missing or invalid.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <AcceptInvitationForm invitationToken={token} />
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
