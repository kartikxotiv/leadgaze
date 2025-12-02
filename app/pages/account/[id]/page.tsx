"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  User,
  ArrowLeft,
  Briefcase,
  Target,
  Users,
  IdCard,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2 } from "lucide-react";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDateTime,
  formatDateTimeWithTime,
} from "@/lib/utils/sales-lead-utils";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateDealForm } from "@/components/deals/create-deal-form";
import { useCreateContact } from "@/hooks/use-contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AllNotes from "@/components/accountDetails/AllNotex";
import AllFiles from "@/components/accountDetails/AllFiles";
import AllMeeting from "@/components/accountDetails/AllMeeting";
import AddReletedOpportunities from "@/components/accountDetails/AddReletedOpportunities";
import AddReletedContact from "@/components/accountDetails/AddReletedContact";
import AccountInformation from "@/components/accountDetails/AccountInformation";

// API function to fetch single account
async function fetchAccount(accountId: string, token?: string) {
  const response = await fetch(`/api/accounts/${accountId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch account");
  }

  const data = await response.json();
  return data.success ? data.data : data;
}

// API function to fetch business details
async function fetchBusiness(businessId: string, token?: string) {
  const response = await fetch(`/api/business/${businessId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return null; // Business might not exist
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const { currentWorkspace } = useWorkspaceContext();
  const { user, token } = useAuthStore();

  const [newContactOpen, setNewContactOpen] = useState(false);
  const [newOpportunityOpen, setNewOpportunityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("related");
  const [selecttab, setselecttab] = useState("All Notes");
  const [Detailviewtab, setDetailviewtab] = useState("Related");

  const detailstab = ["Related", "Details"];

  const tabs = ["All Notes", "All Files", "All Meeting"];

  // Fetch account
  const {
    data: account,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => fetchAccount(accountId, token || undefined),
    enabled: !!accountId,
  });

  // Fetch business details if business_id exists
  const { data: business, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ["business", account?.business_id],
    queryFn: () => fetchBusiness(account!.business_id!, token || undefined),
    enabled: !!account?.business_id,
  });

  // Create contact mutation
  const createContactMutation = useCreateContact();

  // Contact form state
  const [contactFormData, setContactFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    location: "",
    description: "",
  });

  const handleCreateContact = async () => {
    if (!contactFormData.firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    if (!currentWorkspace?.id) {
      toast.error("Workspace not found");
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        firstName: contactFormData.firstName.trim(),
        lastName: contactFormData.lastName.trim() || undefined,
        email: contactFormData.email.trim() || undefined,
        phoneNumber: contactFormData.phoneNumber.trim() || undefined,
        workspaceId: currentWorkspace.id,
        location: contactFormData.location.trim() || undefined,
        description: contactFormData.description.trim() || undefined,
        // Note: companyId would need to be created from business if needed
      });

      toast.success("Contact created successfully!");
      setContactFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        location: "",
        description: "",
      });
      setNewContactOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create contact");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !account) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account not found</h3>
            <p className="text-muted-foreground mb-4">
              {error?.message ||
                "The account you're looking for doesn't exist."}
            </p>
            <Button asChild>
              <Link href="/pages/account">Back to Accounts</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <>
        <div className="bg-white rounded-md  border bg-card text-card-foreground shadow-sm">
          <div className="bg-[#e1effc] px-4 p-2 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            <div className="">
              <h4 className="bg-emerald-100 inline-block px-2 py-1 text-[11px] rounded-full text-emerald-700 hover:bg-emerald-900 hover:text-white">
                Account
              </h4>
              <div className="font-semibold text-sm">
                {account.first_name} {account.last_name}{" "}
              </div>
            </div>
          </div>
          <div className="px-4 py-5 flex gap-5 flex-wrap">
            <div className="min-w-24">
              <h5 className="text-xs font-semibold text-muted-foreground">
                Business Type
              </h5>
              <p className="text-xs mt-1 text-muted-foreground">
                {business?.business_type || account.business_name || "N/A"}
              </p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs font-semibold text-muted-foreground">
                Phone
              </h5>
              <p className="text-xs mt-1 text-muted-foreground">
                {account.phone_number || "N/A"}
              </p>
            </div>

            <div className="min-w-24">
              <h5 className="text-xs font-semibold text-muted-foreground">
                Industry
              </h5>
              <p className="text-xs mt-1 text-muted-foreground">
                {business?.industry || "N/A"}
              </p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs font-semibold text-muted-foreground">
                Business Name
              </h5>
              <p className="text-xs mt-1 text-muted-foreground">
                {business?.business_name || account.business_name || "N/A"}
              </p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs font-semibold text-muted-foreground">
                Converted At
              </h5>
              <p className="text-xs mt-1 text-muted-foreground">
                {account.converted_at
                  ? formatDateTime(account.converted_at)
                  : "N/A"}
              </p>
            </div>
            {account.email && (
              <div className="min-w-24">
                <h5 className="text-xs font-semibold text-muted-foreground">
                  Email
                </h5>
                <p className="text-xs mt-1 text-muted-foreground">
                  {account.email}
                </p>
              </div>
            )}
            {account.location && (
              <div className="min-w-24">
                <h5 className="text-xs font-semibold text-muted-foreground">
                  Location
                </h5>
                <p className="text-xs mt-1 text-muted-foreground">
                  {account.location}
                </p>
              </div>
            )}
            <div className="min-w-24">
              <h5 className="text-xs font-semibold text-muted-foreground">
                Website
              </h5>
              <p className="text-xs mt-1 text-muted-foreground">
                {business?.website ? (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {business.website}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 mt-3">
          <div className="col-span-8">
            <div className="bg-white rounded-md  border bg-card text-card-foreground shadow-sm p-4">
              <div className="">
                <ul className="flex gap-2 border-b">
                  {detailstab.map((el: string, ind: number) => (
                    <li
                      key={ind}
                      onClick={() => setDetailviewtab(el)}
                      className={`
                                py-2 px-3 font-semibold text-xs cursor-pointer
                                ${
                                  Detailviewtab === el
                                    ? "text-blue-600 border-b-2 border-blue-600"
                                    : "text-gray-600"
                                }
                              `}
                    >
                      {el}
                    </li>
                  ))}
                </ul>
              </div>
              {Detailviewtab === "Related" && (
                <>
                  <div className="my-3 border border-[#c9c9c9] rounded-[3px] mb-6">
                    <AddReletedContact
                      accountId={account.id}
                      businessId={account.business_id || undefined}
                    />
                  </div>
                  <div className="my-3 border border-[#c9c9c9] rounded-[3px]">
                    {/* <AddReletedOpportunities
                      accountId={account.id}
                      salesLeadId={account.sales_lead_id}
                    /> */}
                  </div>
                </>
              )}

              {Detailviewtab === "Details" && (
                <AccountInformation account={account} business={business} />
              )}
            </div>
          </div>
          <div className="col-span-4">
            <div className="bg-white rounded-md  border bg-card text-card-foreground shadow-sm p-4">
              <div className="">
                <ul className="flex gap-2 border-b">
                  {tabs.map((tab) => (
                    <li
                      key={tab}
                      onClick={() => setselecttab(tab)}
                      className={`py-2 px-3 font-semibold text-xs cursor-pointer
                      ${
                        selecttab === tab
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-600"
                      }`}
                    >
                      {tab}
                    </li>
                  ))}
                </ul>
              </div>
              {selecttab === "All Notes" && (
                <AllNotes leadId={account?.sales_lead_id} />
              )}
              {selecttab === "All Files" && (
                <AllFiles leadId={account?.sales_lead_id} />
              )}
              {selecttab === "All Meeting" && (
                <AllMeeting leadId={account?.sales_lead_id} />
              )}
            </div>
          </div>
        </div>
      </>
      <div className="space-y-6"></div>
    </DashboardLayout>
  );
}
