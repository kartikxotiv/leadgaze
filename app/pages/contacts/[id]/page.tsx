"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useSalesContact } from "@/hooks/use-sales-contact";
import { useUpdateContact } from "@/hooks/use-contacts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  MapPin,
  User,
  Contact as ContactIcon,
  Plus,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, use, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface ContactDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ContactDetailsPage({
  params,
}: ContactDetailsPageProps) {
  const { id } = use(params);
  const { data: contact, isLoading, isError } = useSalesContact(id);
  const [isAboutOpen, setIsAboutOpen] = useState(true);
  const [isGetInTouchOpen, setIsGetInTouchOpen] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    location: string;
    description: string;
  }>({} as any);

  const updateContactMutation = useUpdateContact();

  // Initialize edited data when contact loads
  useEffect(() => {
    if (contact) {
      setEditedData({
        firstName: contact.first_name || "",
        lastName: contact.last_name || "",
        email: contact.email || "",
        phoneNumber: contact.phone_number || "",
        location: contact.location || "",
        description: contact.comment || "",
      });
    }
  }, [contact]);

  const handleEdit = () => {
    if (contact) {
      setEditedData({
        firstName: contact.first_name || "",
        lastName: contact.last_name || "",
        email: contact.email || "",
        phoneNumber: contact.phone_number || "",
        location: contact.location || "",
        description: contact.comment || "",
      });
    }
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateContactMutation.mutateAsync({
        contactId: id,
        data: editedData,
      });
      setIsEditMode(false);
    } catch (error) {
      console.error("Failed to update contact:", error);
    }
  };

  const updateField = (field: keyof typeof editedData, value: string) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !contact) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Contact Not Found</h2>
            <p className="text-muted-foreground">
              The contact you are looking for does not exist or has been
              deleted.
            </p>
            <Button asChild>
              <Link href="/pages/contacts">Back to Contacts</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full min-h-screen">
        {/* Refined Header */}
        <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-blue-600 rounded-md flex items-center justify-center">
              <ContactIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">
                Contact
              </p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                {contact.first_name} {contact.last_name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isEditMode && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white border-gray-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-blue-600"
                  >
                    <path d="M12 2v8" />
                    <path d="M5 10v4" />
                    <path d="M19 10v4" />
                    <path d="M21 14H3" />
                    <path d="M7 18h10" />
                    <path d="M12 14v8" />
                  </svg>
                </Button>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    className="h-8 text-blue-600 border-gray-300 rounded-r-none border-r-0 font-medium px-4"
                  >
                    New Opportunity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEdit}
                    className="h-8 text-blue-600 border-gray-300 rounded-l-none font-medium px-4"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-gray-300 rounded-l-none border-l-0"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </>
            )}
            {isEditMode && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="h-8 border-gray-300 font-medium px-4"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateContactMutation.isPending}
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {updateContactMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full p-4 space-y-4">
          {/* About Section */}
          <Collapsible open={isAboutOpen} onOpenChange={setIsAboutOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group border border-gray-200 dark:border-gray-700">
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform",
                  !isAboutOpen && "-rotate-90",
                )}
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                About
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0 px-1 pt-1">
              <DetailRow
                label="First Name"
                value={
                  isEditMode ? (
                    <Input
                      value={editedData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    contact.first_name
                  )
                }
              />
              <DetailRow
                label="Last Name"
                value={
                  isEditMode ? (
                    <Input
                      value={editedData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    contact.last_name
                  )
                }
              />
              <DetailRow
                label="Account Name"
                value={
                  <Link
                    href="#"
                    className="text-blue-600 hover:underline decoration-blue-500 underline-offset-2"
                  >
                    {contact.business_name || "No Account"}
                  </Link>
                }
              />
              <DetailRow
                label="Description"
                value={
                  isEditMode ? (
                    <Input
                      value={editedData.description}
                      onChange={(e) =>
                        updateField("description", e.target.value)
                      }
                      className="h-8"
                    />
                  ) : (
                    contact.comment || "Test"
                  )
                }
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Get in Touch Section */}
          <Collapsible
            open={isGetInTouchOpen}
            onOpenChange={setIsGetInTouchOpen}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group border border-gray-200 dark:border-gray-700">
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform",
                  !isGetInTouchOpen && "-rotate-90",
                )}
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Get in Touch
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0 px-1 pt-1">
              <DetailRow
                label="Phone"
                value={
                  isEditMode ? (
                    <Input
                      value={editedData.phoneNumber}
                      onChange={(e) =>
                        updateField("phoneNumber", e.target.value)
                      }
                      className="h-8"
                      type="tel"
                    />
                  ) : (
                    <Link
                      href={`tel:${contact.phone_number}`}
                      className="text-blue-600 hover:underline decoration-blue-500 underline-offset-2"
                    >
                      {contact.phone_number || "9999888822"}
                    </Link>
                  )
                }
              />
              <DetailRow
                label="Email"
                value={
                  isEditMode ? (
                    <Input
                      value={editedData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="h-8"
                      type="email"
                    />
                  ) : (
                    <Link
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:underline decoration-blue-500 underline-offset-2"
                    >
                      {contact.email || "test@gmail.com"}
                    </Link>
                  )
                }
              />
              <DetailRow
                label="Location"
                value={
                  isEditMode ? (
                    <Input
                      value={editedData.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col text-blue-600">
                        <span>
                          {contact.location == "Andorra" ? "Test" : ""}
                        </span>
                        <span>{contact.location || "Andorra"}</span>
                      </div>
                      <div className="w-[300px] h-[180px] rounded-sm border border-slate-200 overflow-hidden relative">
                        <div className="absolute inset-0 bg-[#e5e7eb] flex items-center justify-center overflow-hidden">
                          {/* SVG Map Mockup to look exactly like the screenshot */}
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <path
                              d="M0 20 Q 30 15 50 30 T 100 25"
                              stroke="#d1d5db"
                              fill="none"
                            />
                            <path
                              d="M20 0 Q 35 40 10 100"
                              stroke="#d1d5db"
                              fill="none"
                            />
                            <path
                              d="M70 0 Q 60 40 85 100"
                              stroke="#d1d5db"
                              fill="none"
                            />
                            <circle cx="50" cy="50" r="1.5" fill="#ef4444" />
                          </svg>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <MapPin className="h-6 w-6 text-red-500 fill-red-500 stroke-white" />
                            <div className="bg-white/90 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm whitespace-nowrap mt-1">
                              Andorra la Vella
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              />
              <DetailRow
                label="Email Opt Out"
                value={
                  <div className="pt-2">
                    <Checkbox className="h-4 w-4 border-gray-400 rounded-sm" />
                  </div>
                }
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="group flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0 px-2">
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          {label}
        </h3>
        <div className="text-sm font-normal text-gray-900 dark:text-white min-h-[22px]">
          {value}
        </div>
      </div>
    </div>
  );
}
