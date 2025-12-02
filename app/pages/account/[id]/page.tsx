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
import { formatDateTimeWithTime } from "@/lib/utils/sales-lead-utils";
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
          <div className="bg-[#f3f3f3] p-3 flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            <div className="">
              <h4 className="bg-emerald-100 inline-block px-2 py-1 text-xs rounded-full text-emerald-700 hover:bg-emerald-900 hover:text-white">
                Account
              </h4>
              <div className="font-semibold text-sm">
                {account.first_name} {account.last_name}{" "}
              </div>
            </div>
          </div>
          <div className="p-4 flex gap-5 ">
            <div className="min-w-24">
              <h5 className="text-xs">Business Type</h5>
              <p className=" text-xs mt-1">Direct</p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs">Phone</h5>
              <p className=" text-xs mt-1">{account.phone_number}</p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs">Website</h5>
              <p className="f text-xs mt-1">www.google.com</p>
            </div>

            <div className="min-w-24">
              <h5 className="text-xs">Industry</h5>
              <p className=" text-xs mt-1">Development</p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs">Business Name</h5>
              <p className=" text-xs mt-1">Self</p>
            </div>
            <div className="min-w-24">
              <h5 className="text-xs">Create Lead</h5>
              <p className=" text-xs mt-1">
                {" "}
                {account.converted_at
                  ? formatDateTimeWithTime(account.converted_at)
                  : "recently"}
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
                    <AddReletedContact />
                  </div>
                  <div className="my-3 border border-[#c9c9c9] rounded-[3px]">
                    <AddReletedOpportunities />
                  </div>
                </>
              )}

              {Detailviewtab == "details" && "asdk"}
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
              {selecttab === "All Notes" && <AllNotes />}
              {selecttab === "All Files" && <AllFiles />}
              {selecttab === "All Meeting" && <AllMeeting />}
            </div>
          </div>
        </div>
      </>
      <div className="space-y-6">
        {/* <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pages/account">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Accounts
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {`${account.first_name || ""} ${
                  account.last_name || ""
                }`.trim() || "Unnamed Account"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {account.business_name || "Account Details"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setNewContactOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
            <Button
              variant="default"
              onClick={() => setNewOpportunityOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Opportunity
            </Button>
          </div>
        </div> */}

        {/* <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg mb-1">
                  {`${account.first_name || ""} ${
                    account.last_name || ""
                  }`.trim() || "Unnamed Account"}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge className="bg-emerald-100 text-emerald-700">
                    Account
                  </Badge>
                  {account.business_name && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Building2 className="h-3 w-3" />
                      {account.business_name}
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {account.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{account.email}</span>
                </div>
              )}
              {account.phone_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {String(account.phone_number)}
                  </span>
                </div>
              )}
              {account.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {account.location}
                  </span>
                </div>
              )}
            </div>

            {(account.business_name ||
              account.business_linkedin ||
              account.business_contact) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Business Details
                  </div>
                  {account.business_name && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{account.business_name}</span>
                    </div>
                  )}
                  {account.business_contact && (
                    <div className="text-sm text-muted-foreground">
                      Contact: {account.business_contact}
                    </div>
                  )}
                  {account.business_linkedin && (
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <a
                        href={account.business_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        Business LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card> */}

        {/* <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="related">Related</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="related" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>Contacts</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewContactOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No contacts yet. Create your first contact for this account.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    <CardTitle>Opportunities</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewOpportunityOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No opportunities yet. Create your first opportunity for this
                  account.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Converted At
                    </div>
                    <div className="text-sm mt-1">
                      {account.converted_at
                        ? formatDateTimeWithTime(account.converted_at)
                        : "N/A"}
                    </div>
                  </div>
                  {account.owner_id && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Owner
                      </div>
                      <div className="text-sm mt-1">
                        Owner ID: {account.owner_id}
                      </div>
                    </div>
                  )}
                </div>
                {account.comment && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Notes
                      </div>
                      <div className="text-sm">{account.comment}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs> */}

        <Dialog open={newContactOpen} onOpenChange={setNewContactOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Contact</DialogTitle>
              <DialogDescription>
                Create a new contact for this account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={contactFormData.firstName}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        firstName: e.target.value,
                      })
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={contactFormData.lastName}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        lastName: e.target.value,
                      })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        email: e.target.value,
                      })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={contactFormData.phoneNumber}
                    onChange={(e) =>
                      setContactFormData({
                        ...contactFormData,
                        phoneNumber: e.target.value,
                      })
                    }
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={contactFormData.location}
                  onChange={(e) =>
                    setContactFormData({
                      ...contactFormData,
                      location: e.target.value,
                    })
                  }
                  placeholder="City, Country"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="min-h-[100px]"
                  value={contactFormData.description}
                  onChange={(e) =>
                    setContactFormData({
                      ...contactFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setNewContactOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateContact}
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Contact"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={newOpportunityOpen} onOpenChange={setNewOpportunityOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Opportunity</DialogTitle>
              <DialogDescription>
                Create a new opportunity for this account
              </DialogDescription>
            </DialogHeader>
            <CreateDealForm
              preSelectedLeadId={account.sales_lead_id}
              onSuccess={() => {
                setNewOpportunityOpen(false);
                toast.success("Opportunity created successfully!");
              }}
              onCancel={() => setNewOpportunityOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
