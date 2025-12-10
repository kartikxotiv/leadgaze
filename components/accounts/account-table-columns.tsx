"use client";

import { useMemo } from "react";
import { Building2, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { formatDateTimeWithTime } from "@/lib/utils/sales-lead-utils";

export interface AccountTableColumnsProps {
  page: number;
  pageSize: number;
  visibleColumns: string[];
}

export function useAccountTableColumns({
  page,
  pageSize,
  visibleColumns,
}: AccountTableColumnsProps) {
  const columns = useMemo(() => {
    const allColumns = [
      {
        id: "sno",
        name: "S.no",
        selector: (row: any, index: number) =>
          (page - 1) * pageSize + index + 1,
        sortable: false,
        width: "80px",
      },
      {
        id: "name",
        name: "Name",
        selector: (row: any) =>
          `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
          "Unnamed Account",
        sortable: true,
        width: "150px",
        minWidth: "150px",
        cell: (row: any) => (
          <div className="font-medium">
            {`${row.first_name || ""} ${row.last_name || ""}`.trim() ||
              "Unnamed Account"}
          </div>
        ),
      },
      {
        id: "email",
        name: "Email",
        selector: (row: any) => row.email || "",
        sortable: true,
        width: "250px",
        minWidth: "200px",
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            {row.email ? (
              <a
                href={`mailto:${row.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {row.email}
              </a>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "phone",
        name: "Phone",
        selector: (row: any) => row.phone_number || "",
        sortable: true,
        width: "150px",
        minWidth: "150px",
        cell: (row: any) => (
          <div className="flex items-center gap-2">
            {row.phone_number ? (
              <a
                href={`tel:${row.phone_number}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {String(row.phone_number)}
              </a>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },

      {
        id: "location",
        name: "Location",
        selector: (row: any) => row.location || "",
        sortable: true,
        width: "120px",
        minWidth: "120px",
        overflow: "hidden",
        cell: (row: any) => (
          <div className="flex items-center gap-1 overflow-hidden">
            {row.location ? (
              <>
                <span className="truncate">{row.location}</span>
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "alternative_email",
        name: "Alternative Email",
        selector: (row: any) => row.alternative_email || "",
        sortable: true,
        width: "200px",
        minWidth: "180px",
        cell: (row: any) => (
          <div>
            {row.alternative_email ? (
              <span className="text-sm">{row.alternative_email}</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "alternative_phone",
        name: "Alternative Phone",
        selector: (row: any) => row.alternative_phone_number || "",
        sortable: true,
        width: "150px",
        minWidth: "150px",
        cell: (row: any) => (
          <div>
            {row.alternative_phone_number ? (
              <span className="text-sm">
                {String(row.alternative_phone_number)}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        selector: (row: any) => row.linkedin_url || "",
        sortable: false,
        width: "120px",
        minWidth: "120px",
        cell: (row: any) => (
          <div className="overflow-hidden">
            <span className="truncate">{row.linkedin_url}</span>
            {/* {row.linkedin_url ? (
              <a
                href={row.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            ) : (
              <span className="text-muted-foreground">-</span>
            )} */}
          </div>
        ),
      },
      {
        id: "business_linkedin",
        name: "Business LinkedIn",
        selector: (row: any) => row.business_linkedin || "",
        sortable: false,
        width: "150px",
        minWidth: "130px",
        cell: (row: any) => (
          <div className="overflow-hidden">
            <span className="truncate">{row.business_linkedin}</span>
          </div>
        ),
      },
      {
        id: "business_contact",
        name: "Business Contact",
        selector: (row: any) => row.business_contact || "",
        sortable: true,
        width: "150px",
        minWidth: "130px",
        cell: (row: any) => (
          <div>
            {row.business_contact ? (
              <span className="text-sm">{row.business_contact}</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "business",
        name: "Business",
        selector: (row: any) => row.business_name || "",
        sortable: true,
        width: "120px",
        minWidth: "120px",
        cell: (row: any) => {
          const businessName =
            row.business_name || row.business?.business_name || "";
          return (
            <div className="flex items-center gap-2">
              {businessName ? (
                <>
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>{businessName}</span>
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          );
        },
      },
      {
        id: "comment",
        name: "Comment",
        selector: (row: any) => row.comment || "",
        sortable: true,
        width: "200px",
        minWidth: "150px",
        cell: (row: any) => (
          <div className="truncate max-w-[200px]" title={row.comment}>
            {row.comment ? (
              <span className="text-sm">{row.comment}</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        ),
      },
      {
        id: "converted_at",
        name: "Converted",
        selector: (row: any) => row.converted_at || "",
        sortable: true,
        width: "180px",
        minWidth: "150px",
        cell: (row: any) => (
          <div className="text-xs text-muted-foreground">
            {row.converted_at
              ? formatDateTimeWithTime(row.converted_at)
              : "Recently"}
          </div>
        ),
      },
    ];

    return allColumns.filter(
      (col) =>
        col.id === "sno" || col.id === "name" || visibleColumns.includes(col.id)
    );
  }, [page, pageSize, visibleColumns]);

  return columns;
}
