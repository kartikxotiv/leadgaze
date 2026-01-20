import { useMemo } from "react";
import { useSalesLeads } from "@/hooks/use-sales-leads";
import { useContactPlatforms } from "@/hooks/use-contact-platforms";
import { useLeadPriorities } from "@/hooks/use-lead-priorities";
import { useSalesContacts } from "@/hooks/use-sales-contact";
import { useLeadComments } from "@/hooks/use-lead-comments";
import { useMeetings } from "@/hooks/use-meetings";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import { mapLeadToTableRow } from "@/lib/utils/sales-lead-utils";
import { formatStatus } from "@/lib/utils/sales-lead-utils";
import { STATUS_STYLE_MAP } from "@/lib/constants/sales-leads";
import type { DateRange } from "@/components/common/date-range-filter";

export function useSalesLeadsData(
  workspaceId: string | undefined,
  page: number,
  pageSize: number,
  previewLeadId: string | null | undefined,
  statusFilter?: string | string[],
  dateRange?: DateRange | null,
  search?: string,
) {
  const filters = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      page,
      limit: pageSize,
      workspaceId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(dateRange?.from ? { dateFrom: dateRange.from.toISOString() } : {}),
      ...(dateRange?.to ? { dateTo: dateRange.to.toISOString() } : {}),
      ...(search ? { search } : {}),
    };
  }, [workspaceId, page, pageSize, statusFilter, dateRange, search]);

  const contactLookupFilters = useMemo(() => {
    if (!workspaceId) return undefined;
    return { page: 1, limit: 100, workspaceId };
  }, [workspaceId]);

  const {
    data: salesLeads,
    isLoading,
    isError,
    error,
  } = useSalesLeads(filters);

  const { data: priorityList } = useLeadPriorities();
  const { data: platformList, isLoading: platformsLoading } =
    useContactPlatforms();
  const contactLookup = useSalesContacts(contactLookupFilters);
  const { data: leadComments = [], isLoading: leadCommentsLoading } =
    useLeadComments(previewLeadId || undefined);
  const { data: meetingsData, isLoading: meetingsLoading } = useMeetings({
    leadId: previewLeadId ? String(previewLeadId) : undefined,
  });

  const platformOptions = useMemo(() => platformList ?? [], [platformList]);
  const priorityOptions = useMemo(() => priorityList ?? [], [priorityList]);
  const priorityMap = useMemo(() => {
    const map = new Map<string, LeadPriority>();
    (priorityList ?? []).forEach((priority) => {
      map.set(priority.id, priority);
    });
    return map;
  }, [priorityList]);

  const platformMap = useMemo(() => {
    const map = new Map<number, string>();
    platformOptions.forEach((platform) => {
      if (platform.id !== undefined && platform.id !== null) {
        map.set(platform.id, platform.name);
      }
    });
    return map;
  }, [platformOptions]);

  const contactOptions = useMemo(
    () => contactLookup.data?.data ?? [],
    [contactLookup.data?.data],
  );
  const contactNameMap = useMemo(() => {
    const map = new Map<string, string>();
    contactOptions.forEach((contact: any) => {
      if (contact.id) {
        const name = `${contact.first_name || ""} ${
          contact.last_name || ""
        }`.trim();
        map.set(contact.id, name || contact.email || `Contact ${contact.id}`);
      }
    });
    return map;
  }, [contactOptions]);
  const contactPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    contactOptions.forEach((contact: any) => {
      if (contact.id && contact.phone_number) {
        map.set(contact.id, String(contact.phone_number));
      }
    });
    return map;
  }, [contactOptions]);

  const tableData = useMemo(() => {
    const leads = salesLeads?.data ?? [];
    return leads.map((lead) =>
      mapLeadToTableRow(lead, {
        priorityMap,
        platformMap,
        contactNameMap,
        contactPhoneMap,
      }),
    );
  }, [
    salesLeads?.data,
    priorityMap,
    platformMap,
    contactNameMap,
    contactPhoneMap,
  ]);

  const upcomingMeetings = useMemo(() => {
    if (!meetingsData) return [];
    const meetings =
      meetingsData?.data?.meetings ||
      meetingsData?.meetings ||
      (Array.isArray(meetingsData?.data) ? meetingsData.data : []);
    if (!Array.isArray(meetings) || meetings.length === 0) return [];
    const now = new Date();
    return meetings
      .filter((meeting: any) => {
        if (!meeting?.time) return false;
        const meetingTime = new Date(meeting.time);
        return !isNaN(meetingTime.getTime()) && meetingTime >= now;
      })
      .sort((a: any, b: any) => {
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      })
      .slice(0, 3);
  }, [meetingsData]);

  return {
    salesLeads,
    isLoading,
    isError,
    error,
    platformOptions,
    priorityOptions,
    contactOptions,
    priorityMap,
    platformMap,
    contactNameMap,
    contactPhoneMap,
    tableData,
    platformsLoading,
    leadComments,
    leadCommentsLoading,
    upcomingMeetings,
    meetingsLoading,
    totalRows: salesLeads?.count ?? 0,
    currentPage: salesLeads?.page ?? page,
  };
}
