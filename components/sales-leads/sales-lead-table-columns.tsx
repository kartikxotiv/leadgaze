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
import { MoreHorizontal, Edit, Trash2, Flag } from "lucide-react";
import {
  STATUS_STYLE_MAP,
  type StatusOptionValue,
} from "@/lib/constants/sales-leads";
import { resolvePriorityColor, hexToRgba } from "@/lib/utils/sales-lead-utils";

export interface SalesLeadTableColumnsProps {
  canUpdateSalesLeads: boolean;
  canDeleteSalesLeads: boolean;
  canCreateSalesLeads: boolean;
  handlePreviewLead: (lead: any) => void;
  handleDeleteSalesLead: (id: string, name: string) => void;
  visibleColumns: string[];
}

export function useSalesLeadTableColumns({
  canUpdateSalesLeads,
  canDeleteSalesLeads,
  canCreateSalesLeads,
  handlePreviewLead,
  handleDeleteSalesLead,
  visibleColumns,
}: SalesLeadTableColumnsProps) {
  const columns = useMemo(() => {
    const allColumns = [
      {
        id: "name",
        name: "Lead Name",
        selector: (row: any) =>
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          "Unnamed Lead",
        sortable: true,
      },
      {
        id: "email",
        name: "Email",
        selector: (row: any) => row.email || "",
        sortable: true,
      },
      {
        id: "phone_number",
        name: "Phone",
        selector: (row: any) => row.phone_display || "",
        cell: (row: any) =>
          row.phone_display ? (
            <span className="text-sm text-muted-foreground">
              {row.phone_display}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/60">—</span>
          ),
        sortable: true,
      },
      {
        id: "status",
        name: "Status",
        selector: (row: any) => row.status_label || "",
        cell: (row: any) => {
          const rawStatus = row.status || row.originalStatus || "";
          const statusString = String(rawStatus).trim();

          let status: StatusOptionValue = "opportunities";

          if (
            statusString === "in_progress" ||
            statusString === "In Progress"
          ) {
            status = "in_progress";
          } else if (statusString === "lost" || statusString === "Lost") {
            status = "lost";
          } else if (statusString === "won" || statusString === "Won") {
            status = "won";
          } else if (
            statusString === "qualified_lead" ||
            statusString === "Qualified Lead"
          ) {
            status = "qualified_lead";
          } else if (
            statusString === "opportunities" ||
            statusString === "Opportunities"
          ) {
            status = "opportunities";
          }

          // Get color classes from STATUS_STYLE_MAP
          const classes =
            STATUS_STYLE_MAP[status] || "bg-gray-100 text-gray-700";

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
        id: "priority",
        name: "Priority",
        selector: (row: any) => row.priority_label || "",
        cell: (row: any) => {
          if (!row.priority_label) {
            return <span className="text-sm text-muted-foreground/60">—</span>;
          }
          const badgeColor = resolvePriorityColor(
            row.priority_label,
            row.priority_color,
          );
          const background = badgeColor
            ? hexToRgba(badgeColor, 0.15)
            : undefined;
          const style = background
            ? { backgroundColor: background, color: badgeColor }
            : undefined;
          const className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium gap-1.5 ${
            background ? "" : "bg-gray-100 text-gray-700"
          }`;
          return (
            <span className={className} style={style}>
              <Flag className="h-3.5 w-3.5" style={{ color: badgeColor }} />
              {row.priority_label}
            </span>
          );
        },
        sortable: true,
      },
      {
        id: "Location",
        name: "Location ",
        selector: (row: any) => row.location || "",
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
        selector: (row: any) => row.alternative_phone_number || "",
        sortable: true,
      },
      {
        id: "linkedin_url",
        name: "LinkedIn URL",
        selector: (row: any) => row.linkedin_url || "",
        sortable: true,
      },
      // {
      //   id: "business_name",
      //   name: "Business Name",
      //   selector: (row: any) => row.business_name || "",
      //   sortable: true,
      // },
      {
        id: "business_linkedin",
        name: "Business LinkedIn",
        selector: (row: any) => row.business_linkedin || "",
        sortable: true,
      },
      // {
      //   id: "business_contact",
      //   name: "Business Contact",
      //   selector: (row: any) => row.business_contact || "",
      //   sortable: true,
      // },
      {
        id: "comment",
        name: "Comment",
        selector: (row: any) => row.comment || "",
        sortable: true,
      },
      {
        id: "updated_at",
        name: "Updated",
        selector: (row: any) => row.updated_at_label || "",
        sortable: true,
      },
      {
        id: "actions",
        name: "Actions",
        cell: (row: any) => {
          const hasAnyPermission =
            canUpdateSalesLeads || canDeleteSalesLeads || canCreateSalesLeads;
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
                {canUpdateSalesLeads && (
                  <DropdownMenuItem onClick={() => handlePreviewLead(row)}>
                    <Edit className="h-4 w-4 mr-2" />
                    View & Edit
                  </DropdownMenuItem>
                )}
                {canDeleteSalesLeads && (
                  <>
                    {(canUpdateSalesLeads || canCreateSalesLeads) && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        handleDeleteSalesLead(
                          row.id,
                          `${row.first_name || ""} ${
                            row.last_name || ""
                          }`.trim() || "this lead",
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
        col.id === "name" ||
        col.id === "actions" ||
        visibleColumns.includes(col.id),
    );
  }, [
    canUpdateSalesLeads,
    canDeleteSalesLeads,
    canCreateSalesLeads,
    handlePreviewLead,
    handleDeleteSalesLead,
    visibleColumns,
  ]);

  return columns;
}
