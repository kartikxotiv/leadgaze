'use client';

import { useState, use, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  MoreVertical,
  Plus,
  UserCheck,
  X,
} from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { Checkbox } from '@kit/ui/checkbox';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { PageBody } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TablePagination } from '@kit/ui/table-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { AdminNavbar } from '~/components/admin-navbar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkspaceByIdService, getWorkspaceMembersService, removeWorkspaceMemberService, getWorkspaceUsageAnalyticsService } from '~/services/workspaces.service';
import { startImpersonationService } from '~/services/impersonation.service';
import { Skeleton } from '@kit/ui/skeleton';
import { toast } from 'sonner';
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

// ─── Static mock data ─────────────────────────────────────────────────────────

// WS static data removed in favor of dynamic API data

const AUDIT_LOGS = Array.from({ length: 7 }, (_, i) => ({
  id: `a${i}`, sno: i + 1,
  user: 'Aman Kumar', detail: 'Signed in via Google SSO',
  ip: '103.21.4.12', timestamp: '2026-08-03 09:10', action: 'Login',
}));

const BILLING_ROWS = Array.from({ length: 9 }, (_, i) => ({
  id: `b${i}`, sno: i + 1,
  invoice: 'INV-4928', detail: 'Invoice', plan: 'Enterprise',
  amount: '$2400', status: 'Paid', date: '2026-08-01',
}));

// Removed USAGE_STATS

const MODULES_DATA = [
  {
    id: 'sales', name: 'Sales Desk', status: 'Active', activeSince: '2025-01-15',
    icon: '👤', iconBg: 'bg-blue-50',
    seatUsed: 40, seatTotal: 48, utilisation: 83,
    entitlement: { plan: 'Enterprise', billing: 'Monthly', renewal: '2026-09-03' },
    features: [
      { name: 'Lead Management', on: true }, { name: 'Email Sequences', on: true },
      { name: 'Pipeline View', on: true }, { name: 'AI Lead Scoring (Beta)', on: true },
      { name: 'Custom Fields', on: true }, { name: 'API Access', on: true },
    ],
    barColor: 'bg-blue-600',
  },
  {
    id: 'service', name: 'Service Desk', status: 'Active', activeSince: '2025-01-15',
    icon: '🖥', iconBg: 'bg-purple-50',
    seatUsed: 28, seatTotal: 48, utilisation: 58,
    entitlement: { plan: 'Enterprise', billing: 'Monthly', renewal: '2026-09-03' },
    features: [
      { name: 'Employee Directory', on: true }, { name: 'Leave Management', on: true },
      { name: 'Performance Reviews', on: true }, { name: 'Payroll Processing', on: false },
      { name: 'Attendance Tracking', on: true }, { name: 'Org Chart', on: true },
    ],
    barColor: 'bg-purple-500',
  },
  {
    id: 'hrms', name: 'HRMS', status: 'Disabled', activeSince: null,
    icon: '⚙', iconBg: 'bg-amber-50',
    seatUsed: 0, seatTotal: 48, utilisation: 0,
    entitlement: { plan: 'Enterprise', billing: 'Monthly', renewal: '2026-09-03' },
    features: [
      { name: 'Stock Management', on: false }, { name: 'Purchase Orders', on: false },
      { name: 'Demand Forecasting', on: false }, { name: 'Multi-Warehouse', on: false },
      { name: 'Barcode Scanning', on: false }, { name: 'Supplier Portal', on: false },
    ],
    barColor: 'bg-zinc-200',
  },
];

const INTEGRATIONS = [
  { id: 'google', name: 'Google Workspace', category: 'Productivity', status: 'Connected',
    connectedSince: '2025-03-12', lastSync: '2026-08-03 08:30', services: ['Calendar', 'Gmail', 'Drive'],
    logo: 'G', logoBg: 'bg-white border border-zinc-200', logoColor: 'text-blue-600 font-bold' },
  { id: 'ms365', name: 'Microsoft 365', category: 'Productivity', status: 'Connected',
    connectedSince: '2025-06-01', lastSync: '2026-08-03 07:55', services: ['Outlook', 'Teams', 'OneDrive'],
    logo: '⊞', logoBg: 'bg-white border border-zinc-200', logoColor: 'text-orange-600 font-bold' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Messaging', status: 'Available',
    connectedSince: null, lastSync: null, services: ['Messaging', 'Notifications'],
    logo: '💬', logoBg: 'bg-green-50 border border-green-100', logoColor: '' },
  { id: 'meta', name: 'Meta (Facebook & Instagram)', category: 'Social & Ads', status: 'Available',
    connectedSince: null, lastSync: null, services: ['Pages', 'Ads', 'Leads'],
    logo: 'f', logoBg: 'bg-blue-600', logoColor: 'text-white font-bold' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Social & Ads', status: 'Available',
    connectedSince: null, lastSync: null, services: ['Pages', 'Lead Gen'],
    logo: 'in', logoBg: 'bg-blue-700', logoColor: 'text-white font-bold text-xs' },
  { id: 'zapier', name: 'Zapier', category: 'Automation', status: 'Available',
    connectedSince: null, lastSync: null, services: ['Triggers', 'Actions'],
    logo: 'Z', logoBg: 'bg-orange-100 border border-orange-200', logoColor: 'text-orange-600 font-bold' },
];

// ─── Shared badge helpers ─────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-transparent',
  Paid: 'bg-emerald-50 text-emerald-700 border-transparent',
  Trial: 'bg-amber-50 text-amber-700 border-transparent',
  Disabled: 'bg-zinc-100 text-zinc-500 border-transparent',
  Suspended: 'bg-red-50 text-red-600 border-transparent',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-xs font-semibold ${STATUS_CLASSES[status] ?? 'bg-zinc-100 text-zinc-500 border-transparent'}`}>
      {status}
    </Badge>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge className="bg-indigo-100 text-indigo-700 border-transparent text-xs font-semibold">
      {plan}
    </Badge>
  );
}

// Shared tab trigger class — matches leads detail page exactly
const TAB_TRIGGER =
  'data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary';

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ WS }: { WS: any }) {
  const infoRows = [
    { label: 'Name', value: WS.name },
    { label: 'Domain', value: WS.domain },
    { label: 'Industry', value: WS.industry },
    { label: 'Created', value: WS.created },
    { label: 'Last Login', value: WS.lastLogin },
  ];
  const subRows = [
    { label: 'Billing Cycle', value: WS.billingCycle },
    { label: 'Monthly Amount', value: WS.monthlyAmount },
    { label: 'Renewal Date', value: WS.renewalDate },
    { label: 'Revenue Generated', value: WS.revenueGenerated },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
      {/* Workspace Info */}
      <CardWidgetContainer title="Workspace Info" headerClassName="p-2 xl:p-2 2xl:p-2" hideHeaderBorder={true}>
        <div className="flex flex-col gap-1 px-2">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b py-1">
              <span className="primary-text-regular text-leadgaze-muted mb-0">{label}</span>
              <span className="primary-text-medium text-leadgaze-dark dark:text-white text-right">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-b py-1">
            <span className="primary-text-regular text-leadgaze-muted">Status</span>
            <StatusBadge status={WS.status} />
          </div>
        </div>
      </CardWidgetContainer>

      {/* Stats + Active Modules */}
      <div className="flex flex-col gap-2 lg:col-span-1">
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: WS.seats, l: 'Seats' }, { v: WS.mrr, l: 'MRR' },
            { v: WS.modules, l: 'Modules' }, { v: WS.members, l: 'Members' },
          ].map(({ v, l }) => (
            <Card key={l} className="p-4 flex flex-col justify-center">
              <p className="primary-heading-number text-zinc-900 dark:text-white leading-none">{v}</p>
              <p className="secondary-text-small text-leadgaze-muted mt-2">{l}</p>
            </Card>
          ))}
        </div>
        <CardWidgetContainer title="Active Modules" contentClassName="px-2 pb-2 pt-2" headerClassName="p-2 xl:p-2 2xl:p-2" hideHeaderBorder={true}>
          <div className="flex flex-wrap gap-2">
            {WS.activeModules.map((mod: any) => {
               const isCRM = mod.name === 'CRM';
               return (
                 <Badge key={mod.key} variant="outline" className={`rounded-none px-2.5 py-0.5 text-xs font-bold border-transparent ${isCRM ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                   {mod.name}
                   <span className={`ml-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${isCRM ? 'bg-blue-200/50 dark:bg-blue-800/50' : 'bg-purple-200/50 dark:bg-purple-800/50'}`}>
                     25
                   </span>
                 </Badge>
               );
            })}
          </div>
        </CardWidgetContainer>
      </div>

      {/* Subscription Summary */}
      <CardWidgetContainer title="Subscription" headerClassName="p-2 xl:p-2 2xl:p-2" hideHeaderBorder={true}>
        <div className="flex flex-col gap-1 px-2">
          <div className="flex items-center justify-between border-b py-1">
            <span className="primary-text-regular text-leadgaze-muted mb-0">Current Plan</span>
            <PlanBadge plan={WS.plan} />
          </div>
          {subRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b py-1">
              <span className="primary-text-regular text-leadgaze-muted mb-0">{label}</span>
              <span className="primary-text-medium text-leadgaze-dark dark:text-white text-right">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-2 pb-2 pt-2 flex justify-end">
          <Button variant="default" className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2">
            Change Plan
          </Button>
        </div>
      </CardWidgetContainer>
    </div>
  );
}

// ─── Tab: Modules ─────────────────────────────────────────────────────────────

function ModulesTab() {
  return (
    <div className="flex flex-col gap-2">
      {MODULES_DATA.map((mod) => {
        const isDisabled = mod.status === 'Disabled';
        return (
          <div key={mod.id} className="card-container bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${mod.iconBg}`}>
                  {mod.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="primary-heading text-leadgaze-dark dark:text-white">{mod.name}</span>
                    <StatusBadge status={mod.status} />
                  </div>
                  <p className="secondary-text-small text-leadgaze-muted">
                    {isDisabled ? 'Not enabled for this workspace' : `Active since ${mod.activeSince}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isDisabled
                  ? <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white secondary-text-small-bold h-7 px-3">Enable Module</Button>
                  : <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 secondary-text-small-bold h-7 px-3">Disable</Button>}
                <Button size="sm" variant="outline" className="secondary-text-small-bold h-7 px-3">Configure</Button>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800">
              {/* Seat Usage */}
              <div className="px-4 py-3">
                <p className="secondary-text-small text-leadgaze-muted uppercase tracking-wider mb-2">Seat Usage</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {mod.seatUsed}
                  <span className="primary-text-regular text-leadgaze-muted font-normal"> / {mod.seatTotal} seats</span>
                </p>
                <div className="mt-2 bar-bg h-1.5 w-full overflow-hidden rounded-full">
                  <div className={`h-full rounded-full ${mod.barColor}`} style={{ width: `${mod.utilisation}%` }} />
                </div>
                <p className="secondary-text-small text-leadgaze-muted mt-1">
                  {isDisabled ? 'No seats allocated' : `${mod.utilisation}% utilisation`}
                </p>
              </div>

              {/* Entitlement */}
              <div className="px-4 py-3">
                <p className="secondary-text-small text-leadgaze-muted uppercase tracking-wider mb-2">Entitlement</p>
                {[
                  { k: 'Plan', v: mod.entitlement.plan },
                  { k: 'Billing', v: mod.entitlement.billing },
                  { k: 'Renewal', v: mod.entitlement.renewal },
                ].map(({ k, v }) => (
                  <div key={k} className="flex items-center justify-between py-1">
                    <span className="primary-text-regular text-leadgaze-muted">{k}</span>
                    <span className="primary-text-medium text-leadgaze-dark dark:text-white">{v}</span>
                  </div>
                ))}
              </div>

              {/* Feature Access */}
              <div className="px-4 py-3">
                <p className="secondary-text-small text-leadgaze-muted uppercase tracking-wider mb-2">Feature Access</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {mod.features.map((f) => (
                    <div key={f.name} className="flex items-center gap-1.5">
                      {f.on
                        ? <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                        : <X className="h-3 w-3 shrink-0 text-zinc-300 dark:text-zinc-600" />}
                      <span className={`secondary-text-small ${f.on ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'}`}>
                        {f.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared table page state + table components ───────────────────────────────

const MEMBERS_FIELDS = [
  { id: 'sno', key: 'sno', label: 'S. No.' },
  { id: 'name', key: 'name', label: 'Name' },
  { id: 'email', key: 'email', label: 'Email' },
  { id: 'role', key: 'role', label: 'Role' },
  { id: 'lastActive', key: 'lastActive', label: 'Last Active' },
  { id: 'status', key: 'status', label: 'Status' },
];

const DEFAULT_MEMBERS_VISIBILITY = MEMBERS_FIELDS.reduce((acc, field) => {
  acc[field.id] = true;
  return acc;
}, {} as Record<string, boolean>);

function MembersTab({ workspaceId, activeModules }: { workspaceId: string, activeModules: { key: string, name: string }[] }) {
  const queryClient = useQueryClient();
  const [activeModuleKey, setActiveModuleKey] = useState(activeModules.length > 0 ? activeModules[0].key : 'All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isAddColumnModalOpen, setAddColumnModalOpen] = useState(false);

  // Impersonation state
  const [impersonateTarget, setImpersonateTarget] = useState<any | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const impersonateReasonRef = useRef<HTMLTextAreaElement>(null);

  const { visibility, toggleVisibility, reset } = useColumnVisibility(
    MEMBERS_FIELDS,
    DEFAULT_MEMBERS_VISIBILITY
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['workspace-members', workspaceId, activeModuleKey, page, pageSize],
    queryFn: () => getWorkspaceMembersService({ workspaceId, module: activeModuleKey, page, limit: pageSize }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWorkspaceMemberService({ workspaceId, memberId: id }),
    onSuccess: () => {
      toast.success('Member removed successfully');
      setMemberToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
    onError: () => {
      toast.error('Failed to remove member');
      setMemberToRemove(null);
    }
  });

  const handleOpenImpersonate = (member: any) => {
    setImpersonateTarget(member);
    setImpersonateReason('');
  };

  const handleImpersonateSubmit = async () => {
    if (!impersonateTarget) return;
    const trimmedReason = impersonateReason.trim();
    if (!trimmedReason) {
      toast.error('Please provide a reason for impersonation');
      impersonateReasonRef.current?.focus();
      return;
    }

    setIsImpersonating(true);
    try {
      const webOrigin =
        process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';

      // Check if web portal already has an active logged-in session
      try {
        const checkResp = await fetch(`${webOrigin}/api/user-context`, {
          method: 'GET',
          credentials: 'include',
        });

        if (checkResp.ok) {
          const checkData = await checkResp.json();
          if (checkData?.authenticated && checkData?.user?.email) {
            toast.error(
              `You are already logged in to the web portal as ${checkData.user.email}. Please sign out from the web portal first, then try impersonating again.`,
              { duration: 8000 },
            );
            setIsImpersonating(false);
            return;
          }
        }
      } catch (err) {
        // If check fails (e.g. network issue), log warning and continue
        console.warn('Could not check web portal session state:', err);
      }

      // Web portal is logged out — create impersonation session
      const result = await startImpersonationService({
        target_user_id: impersonateTarget.id,
        workspace_id: '00000000-0000-0000-0000-000000000000',
        reason: trimmedReason,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resObj = (result as any)?.data ?? result;
      const sessionId = resObj?.session_id;
      const tokenHash = resObj?.token_hash;

      if (!sessionId || !tokenHash) {
        console.error('Impersonation payload missing session_id or token_hash:', result);
        toast.error('Failed to generate valid impersonation credentials');
        setIsImpersonating(false);
        return;
      }

      toast.success(
        `Impersonation session started for ${impersonateTarget.name}. Redirecting to web app...`,
      );
      setImpersonateTarget(null);

      const impersonateCallbackUrl = `${webOrigin}/api/impersonate?session_id=${encodeURIComponent(sessionId)}`;

      const callbackParams = new URLSearchParams({
        token_hash: tokenHash,
        type: 'magiclink',
        next: impersonateCallbackUrl,
      });

      setTimeout(() => {
        window.location.href = `${webOrigin}/auth/callback?${callbackParams.toString()}`;
      }, 800);
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? 'Failed to start impersonation';
      toast.error(message);
    } finally {
      setIsImpersonating(false);
    }
  };

  const members = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const visibleColumns = new Set(Object.keys(visibility).filter((k) => visibility[k]));

  return (
    <div className="flex flex-col gap-4">
      {activeModules.length > 0 && (
        <div className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 text-muted-foreground border border-zinc-200 dark:border-zinc-700">
          {activeModules.map((mod) => (
            <button
              key={mod.key}
              onClick={() => { setActiveModuleKey(mod.key); setPage(1); }}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1 text-sm font-medium ring-offset-background transition-all ${
                activeModuleKey === mod.key
                  ? 'bg-white dark:bg-zinc-950 text-blue-600 shadow-sm'
                  : 'hover:text-foreground'
              }`}
            >
              {mod.name}
            </button>
          ))}
        </div>
      )}
      <CustomTableContainer
      pagination={
        <TablePagination currentPage={page} totalPages={totalPages} totalCount={totalCount}
          pageSize={pageSize} onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} entityLabel="entries" />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-4"><Checkbox /></TableHead>
            {visibleColumns.has('sno') && <TableHead>S. No.</TableHead>}
            {visibleColumns.has('name') && <TableHead>Name</TableHead>}
            {visibleColumns.has('email') && <TableHead>Email</TableHead>}
            {visibleColumns.has('role') && <TableHead>Role</TableHead>}
            {visibleColumns.has('lastActive') && <TableHead>Last Active</TableHead>}
            {visibleColumns.has('status') && <TableHead>Status</TableHead>}
            <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
              <Button
                type="button"
                size="icon"
                className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                onClick={() => setAddColumnModalOpen(true)}
                title="Add Column"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isFetching ? (
             [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="p-4">
                    <Skeleton className="h-6 w-full rounded" />
                  </TableCell>
                </TableRow>
             ))
          ) : members.length === 0 ? (
             <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No members found.
                </TableCell>
             </TableRow>
          ) : (
            members.map((m: any) => (
              <TableRow key={m.id} className="hover:bg-muted/50 cursor-pointer">
                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                {visibleColumns.has('sno') && <TableCell className="primary-text-regular text-leadgaze-muted">{m.sno}</TableCell>}
                {visibleColumns.has('name') && <TableCell className="primary-text-medium text-leadgaze-dark dark:text-white">{m.name}</TableCell>}
                {visibleColumns.has('email') && <TableCell className="primary-text-regular text-leadgaze-muted">{m.email}</TableCell>}
                {visibleColumns.has('role') && <TableCell><span className="secondary-text-small-bold text-blue-600">{m.role}</span></TableCell>}
                {visibleColumns.has('lastActive') && <TableCell className="primary-text-regular text-leadgaze-muted">{m.lastActive}</TableCell>}
                {visibleColumns.has('status') && <TableCell><StatusBadge status={m.status} /></TableCell>}
                <TableCell className="text-right pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={m.status?.toLowerCase() === 'removed'}
                        className="gap-2 text-amber-600 focus:text-amber-600"
                        onSelect={() => handleOpenImpersonate(m)}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Impersonate User
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={m.status?.toLowerCase() === 'removed'} className="text-red-600" onClick={() => setMemberToRemove(m.id)}>Remove Member</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CustomTableContainer>
    
    <CustomDeleteDialog
      isOpen={!!memberToRemove}
      onOpenChange={(open) => !open && setMemberToRemove(null)}
      title="Remove Member"
      description="Are you sure you want to remove this member? This action cannot be undone."
      onConfirm={() => {
        if (memberToRemove) {
          removeMutation.mutate(memberToRemove);
        }
      }}
      isDeleting={removeMutation.isPending}
    />

    <AddColumnModal
      open={isAddColumnModalOpen}
      onOpenChange={setAddColumnModalOpen}
      columns={MEMBERS_FIELDS}
      visibility={visibility}
      onToggleColumn={toggleVisibility}
      onResetColumns={reset}
    />

    {/* Impersonation Reason Dialog */}
    <Dialog
      open={!!impersonateTarget}
      onOpenChange={(open) => { if (!open) setImpersonateTarget(null); }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-white" />
            Impersonate User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 px-2 mt-1 pb-1">
          {impersonateTarget && (
            <div className="text-sm text-muted-foreground mb-0">
              You are about to start an impersonation session for{' '}
              <span className="font-semibold text-foreground">
                {impersonateTarget.name}
              </span>{' '}
              ({impersonateTarget.email}). This session will expire in 30 minutes.
            </div>
          )}

          <div>
            <Label htmlFor="impersonate-reason">
              Reason for Access <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="impersonate-reason"
              ref={impersonateReasonRef}
              placeholder="e.g. Customer Support, Bug Investigation, Data Verification…"
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setImpersonateTarget(null)}
            disabled={isImpersonating}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="gap-2"
            onClick={handleImpersonateSubmit}
            disabled={isImpersonating || !impersonateReason.trim()}
          >
            {isImpersonating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Start Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}

function UsageAnalyticsTab({ workspaceId }: { workspaceId: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['workspace-usage', workspaceId],
    queryFn: () => getWorkspaceUsageAnalyticsService({ workspaceId }),
  });

  if (isLoading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading analytics...</div>;
  }

  const analyticsData = stats || [];

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {analyticsData.map(({ label, value }: { label: string, value: string }) => (
        <Card key={label} className="p-6">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">{value}</p>
          <p className="secondary-text-small text-leadgaze-muted mt-2">{label}</p>
        </Card>
      ))}
    </div>
  );
}

const INTEGRATION_ICONS: Record<string, string> = {
  'website-connector': '/images/web-icon.png',
  'zapier': '/images/zapier-icon.png',
  'google-ads': '/images/google-ads-icon.png',
  'meta-ads': '/images/meta-icon.png',
  'whatsapp': '/images/whatsapp-icon.png',
  'email-accounts': '/images/email-icon.png',
  'google-meet': '/images/google-meet-icon.png',
  'zoom': '/images/zoom-icon.png',
};

function IntegrationsTab({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['workspace-integrations', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/integrations`);
      if (!res.ok) throw new Error('Failed to fetch integrations');
      const json = await res.json();
      return json.data;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async ({ integrationId, connectionId }: { integrationId: string; connectionId: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/integrations?integrationId=${integrationId}&connectionId=${connectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to disconnect integration');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-integrations', workspaceId] });
    },
  });

  if (isLoading) {
    return <div className="p-8 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-leadgaze-primary" /></div>;
  }

  return (
    <div className="card-container bg-white dark:bg-zinc-900 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
      {(integrations || []).map((intg: any) => {
        const iconSrc = INTEGRATION_ICONS[intg.id] || '/images/web-icon.png';
        return (
          <div key={intg.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm`}>
              <Image src={iconSrc} width={24} height={24} alt={intg.name} className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="primary-text-medium text-leadgaze-dark dark:text-white font-semibold">{intg.name}</span>
                <span className="secondary-text-small text-leadgaze-muted bg-slate-100 px-1.5 py-0.5 rounded-sm">{intg.category}</span>
                {intg.isConnected
                  ? <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />Connected</span>
                  : <span className="text-[11px] text-zinc-500 font-medium bg-zinc-100 px-1.5 py-0.5 rounded-full">Available</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {intg.services.map((s: string, i: number) => (
                  <span key={s} className="secondary-text-small text-leadgaze-muted">
                    {s}{i < intg.services.length - 1 ? ' ·' : ''}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {intg.isConnected && intg.connectedSince && (
                <span className="secondary-text-small text-leadgaze-muted">Since {intg.connectedSince}</span>
              )}
              {intg.isConnected && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 secondary-text-small-bold h-7 px-3"
                  onClick={() => disconnectMutation.mutate({ integrationId: intg.id, connectionId: intg.connectionId })}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disconnect'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  return (
    <CustomTableContainer
      pagination={
        <TablePagination currentPage={page} totalPages={2} totalCount={25}
          pageSize={pageSize} onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} entityLabel="entries" />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-4"><Checkbox /></TableHead>
            <TableHead>S. No.</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="sticky right-0 bg-zinc-50 dark:bg-zinc-900 w-10 text-center">
              <button className="flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white mx-auto">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {AUDIT_LOGS.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/50">
              <TableCell className="pl-4"><Checkbox /></TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted">{row.sno}</TableCell>
              <TableCell className="primary-text-medium text-leadgaze-dark dark:text-white">{row.user}</TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted">{row.detail}</TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted font-mono">{row.ip}</TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted">{row.timestamp}</TableCell>
              <TableCell>
                <Badge className="bg-blue-50 text-blue-600 border-transparent secondary-text-small font-semibold">{row.action}</Badge>
              </TableCell>
              <TableCell className="text-right pr-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CustomTableContainer>
  );
}

function BillingTimelineTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const summaryStats = [
    { value: '$19,200', label: 'Total Revenue', sub: '8 months of billing', cls: 'text-emerald-600' },
    { value: '$2400', label: 'Last Invoice', sub: 'Paid · Aug 1 2026', cls: 'text-zinc-900 dark:text-white' },
    { value: '0', label: 'Payment Failures', sub: 'All payments cleared', cls: 'text-zinc-900 dark:text-white' },
    { value: '$0', label: 'Refunds Issued', sub: 'No refunds on record', cls: 'text-zinc-900 dark:text-white' },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {summaryStats.map(({ value, label, sub, cls }) => (
          <Card key={label} className="p-4">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="primary-text-medium text-leadgaze-dark dark:text-white">{label}</p>
            <p className="secondary-text-small text-leadgaze-muted mt-0.5">{sub}</p>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between py-1">
        <span className="primary-heading text-leadgaze-dark dark:text-white">Invoice &amp; Event History</span>
        <Button variant="outline" size="sm" className="gap-1.5 secondary-text-small-bold h-7">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>
      <CustomTableContainer
        pagination={
          <TablePagination currentPage={page} totalPages={2} totalCount={25}
            pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} entityLabel="entries" />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4"><Checkbox /></TableHead>
              <TableHead>S. No.</TableHead>
              <TableHead>Invoice / Event</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="sticky right-0 bg-zinc-50 dark:bg-zinc-900 w-10 text-center">
                <button className="flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white mx-auto">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BILLING_ROWS.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                <TableCell className="pl-4"><Checkbox /></TableCell>
                <TableCell className="primary-text-regular text-leadgaze-muted">{row.sno}</TableCell>
                <TableCell className="primary-text-medium text-leadgaze-dark dark:text-white">{row.invoice}</TableCell>
                <TableCell><span className="secondary-text-small-bold text-blue-600">{row.detail}</span></TableCell>
                <TableCell><span className="secondary-text-small-bold text-purple-600">{row.plan}</span></TableCell>
                <TableCell className="primary-text-medium text-leadgaze-dark dark:text-white">{row.amount}</TableCell>
                <TableCell><StatusBadge status={row.status} /></TableCell>
                <TableCell className="primary-text-regular text-leadgaze-muted">{row.date}</TableCell>
                <TableCell className="text-right pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Invoice</DropdownMenuItem>
                      <DropdownMenuItem>Download PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CustomTableContainer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'modules', label: 'Modules' },
  { value: 'members', label: 'Members' },
  { value: 'usage', label: 'Usage Analytics' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'audit-logs', label: 'Audit Logs' },
  { value: 'billing', label: 'Billing Timeline' },
];

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: workspaceData, isLoading } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => getWorkspaceByIdService({ id }),
  });

  if (isLoading) {
    return (
      <AppShell navbar={<AdminNavbar />}>
        <div className="p-8 flex justify-center items-center h-full">Loading workspace details...</div>
      </AppShell>
    );
  }

  if (!workspaceData) {
    return (
      <AppShell navbar={<AdminNavbar />}>
        <div className="p-8 flex justify-center items-center h-full">Workspace not found.</div>
      </AppShell>
    );
  }

  // Map backend response to the UI fields, applying fallbacks (like '-') where real data doesn't exist yet
  const WS = {
    name: workspaceData.name || '-',
    initials: workspaceData.name ? workspaceData.name.charAt(0).toUpperCase() : 'W',
    color: 'bg-blue-600',
    status: workspaceData.status || 'Active',
    plan: workspaceData.plan || 'Enterprise',
    ownerName: workspaceData.owner_name || '-',
    ownerEmail: workspaceData.owner_email || '-',
    domain: workspaceData.domain || '-',
    industry: workspaceData.industry || '-',
    created: workspaceData.created_at || '-',
    lastLogin: workspaceData.last_login || '-',
    seats: workspaceData.members_count || '-',
    mrr: workspaceData.mrr || '-',
    modules: workspaceData.modules ? workspaceData.modules.length : '-',
    members: workspaceData.members_count || '-',
    billingCycle: workspaceData.billing_cycle || '-',
    monthlyAmount: workspaceData.mrr || '-',
    renewalDate: workspaceData.renewal_date || '-',
    revenueGenerated: workspaceData.revenue_generated || '-',
    activeModules: workspaceData.modules ? workspaceData.modules.map((m: any) => ({ key: m.key, name: m.name })) : [],
  };

  return (
    <AppShell navbar={<AdminNavbar />}>
      {/*
        Everything here is a direct child of the scrollable container
        which already provides px-2 pt-2 gap-2 — no extra wrappers needed.
        Pattern mirrors the leads detail page exactly.
      */}

      {/* ── Sub-header: back + workspace identity + action ── */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="h-6 w-6 border border-leadgaze-border p-0">
            <Link href="/organization"><ArrowLeft className="h-3 w-3" /></Link>
          </Button>
          {/* Avatar */}
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white ${WS.color}`}>
            {WS.initials}
          </div>
          {/* Name + badges + owner */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="primary-heading-extra text-leadgaze-dark dark:text-white">{WS.name}</span>
              <StatusBadge status={WS.status} />
              <PlanBadge plan={WS.plan} />
            </div>
            <p className="secondary-text-small text-leadgaze-muted">
              {WS.ownerName} · {WS.ownerEmail}
            </p>
          </div>
        </div>
        {/* <Button className="secondary-text-small-bold bg-leadgaze-primary hover:bg-leadgaze-primary/90 text-white px-3 h-8">
          Login As Workspace
        </Button> */}
      </div>

      {/* ── Tabs bar + content ── */}
      <PageBody className="pb-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-2">
          {/* Tab triggers — border-top-bottom-gray matches leads detail pattern */}
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-top-bottom-gray bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className={TAB_TRIGGER}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab content — no extra padding; content manages its own gap */}
          <TabsContent value="overview" className="mt-0"><OverviewTab WS={WS} /></TabsContent>
          <TabsContent value="modules" className="mt-0"><ModulesTab /></TabsContent>
          <TabsContent value="members" className="mt-0"><MembersTab workspaceId={id} activeModules={WS.activeModules} /></TabsContent>
          <TabsContent value="usage" className="mt-0"><UsageAnalyticsTab workspaceId={id} /></TabsContent>
          <TabsContent value="integrations" className="mt-0"><IntegrationsTab workspaceId={id} /></TabsContent>
          <TabsContent value="audit-logs" className="mt-0"><AuditLogsTab /></TabsContent>
          <TabsContent value="billing" className="mt-0"><BillingTimelineTab /></TabsContent>
        </Tabs>
      </PageBody>
    </AppShell>
  );
}
