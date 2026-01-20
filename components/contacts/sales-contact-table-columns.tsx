"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  MoveRight,
  Loader2,
  XCircle,
} from "lucide-react";
import { getPlatformBadgeColors } from "@/lib/utils/sales-contact-utils";
import {
  CONTACT_STATUS_STYLE_MAP,
  type StatusOptionValue,
} from "@/lib/constants/sales-contacts";

export interface SalesContactTableColumnsProps {
  canUpdateSalesContacts: boolean;
  canDeleteSalesContacts: boolean;
  canCreateSalesContacts: boolean;
  handlePreviewContact: (contact: any) => void;
  handleMoveToLead: (contact: any) => Promise<void>;
  handleReject: (contact: any) => Promise<void>;
  handleDeleteSalesContact: (id: string, name: string) => void;
  movingToLeadContactId: string | null;
  visibleColumns: string[];
}

export function useSalesContactTableColumns({
  canUpdateSalesContacts,
  canDeleteSalesContacts,
  canCreateSalesContacts,
  handlePreviewContact,
  handleMoveToLead,
  handleReject,
  handleDeleteSalesContact,
  movingToLeadContactId,
  visibleColumns,
}: SalesContactTableColumnsProps) {
  const columns = useMemo(() => {
    const allColumns = [
      {
        id: "full name",
        name: "Full Name",
        selector: (row: any) =>
          `${row.first_name || ""} ${row.last_name || ""}`.trim(),
        sortable: true,
      },
      {
        id: "phone_number",
        name: "Phone Number",
        selector: (row: any) =>
          row.phone_number ? `+${row.phone_number}` : "",
        sortable: true,
      },
      {
        id: "email",
        name: "Email",
        selector: (row: any) => row.email || "",
        sortable: true,
      },
      {
        id: "location",
        name: "Location",
        selector: (row: any) => row.location || "",
        sortable: true,
      },

      {
        id: "platform",
        name: "Platform",
        selector: (row: any) => row.platform_label || "",
        cell: (row: any) => {
          if (!row.platform_label) {
            return <span className="text-sm text-muted-foreground/60">—</span>;
          }
          const badgeColors = getPlatformBadgeColors(row.platform_label);
          return (
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700"
              style={badgeColors}
            >
              {row.platform_label}
            </span>
          );
        },
        sortable: true,
      },
      {
        id: "alternative_email",
        name: "Alternative Email",
        selector: (row: any) => row.alternative_email || "",
        sortable: true,
      },
      {
        id: "alternative_phone_number",
        name: "Alternative Phone Number",
        selector: (row: any) =>
          row.alternative_phone_number
            ? `+${row.alternative_phone_number}`
            : "",
        sortable: true,
      },
      // {
      //   id: "business_contact",
      //   name: "Business Contact",
      //   selector: (row: any) => row.business_contact || "",
      //   sortable: true,
      // },
      {
        id: "business_linkedin",
        name: "Business LinkedIn",
        selector: (row: any) => row.business_linkedin || "",
        sortable: true,
      },
      {
        id: "business_name",
        name: "Business Name",
        selector: (row: any) => row.business_label || "",
        sortable: true,
      },
      {
        id: "comment",
        name: "Comment",
        selector: (row: any) => row.comment || "",
        sortable: true,
      },
      {
        id: "linkedin_url",
        name: "LinkedIn URL",
        selector: (row: any) => row.linkedin_url || "",
        sortable: true,
      },
      {
        id: "updated_at",
        name: "Updated",
        selector: (row: any) => row.updated_at || "",
        sortable: true,
      },
      {
        id: "status",
        name: "Status",
        selector: (row: any) => row.status_label || "",
        cell: (row: any) => {
          const statusValue = (row.status as StatusOptionValue) ?? "pending";
          const classes =
            CONTACT_STATUS_STYLE_MAP[statusValue] ??
            "bg-gray-100 text-gray-700";
          return row.status_label ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${classes}`}
            >
              {row.status_label}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">—</span>
          );
        },
        sortable: true,
      },
      {
        id: "actions",
        name: "Actions",
        cell: (row: any) => {
          // Only show actions menu if user has any permissions
          const hasAnyPermission =
            canUpdateSalesContacts ||
            canDeleteSalesContacts ||
            canCreateSalesContacts;
          if (!hasAnyPermission) {
            return null;
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canUpdateSalesContacts && (
                  <DropdownMenuItem
                    onClick={() => {
                      handlePreviewContact(row);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                )}
                {canCreateSalesContacts && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        void handleMoveToLead(row);
                      }}
                      disabled={
                        movingToLeadContactId !== null ||
                        row.status === "moved_to_lead"
                      }
                    >
                      {movingToLeadContactId === String(row.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Moving...
                        </>
                      ) : (
                        <>
                          <MoveRight className="h-4 w-4 mr-2" />
                          Move to Lead
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        void handleReject(row);
                      }}
                      disabled={
                        row.status === "rejected" ||
                        row.status === "moved_to_lead"
                      }
                      className="text-orange-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                {canDeleteSalesContacts && (
                  <>
                    {(canUpdateSalesContacts || canCreateSalesContacts) && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        handleDeleteSalesContact(
                          row.id,
                          `${row.first_name || ""} ${
                            row.last_name || ""
                          }`.trim(),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        ignoreRowClick: true,
        allowoverflow: true,
        center: "true",
      },
    ];

    return allColumns.filter(
      (col) =>
        col.id === "full name" ||
        col.id === "actions" ||
        visibleColumns.includes(col.id),
    );
  }, [
    canUpdateSalesContacts,
    canDeleteSalesContacts,
    canCreateSalesContacts,
    handlePreviewContact,
    handleMoveToLead,
    handleReject,
    handleDeleteSalesContact,
    movingToLeadContactId,
    visibleColumns,
  ]);

  return columns;
}
