'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Download,
  MoreVertical,
  Plus,
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

// ─── Static mock data ─────────────────────────────────────────────────────────

const WS = {
  name: 'Wayne Corp',
  initials: 'W',
  color: 'bg-blue-600',
  status: 'Active',
  plan: 'Enterprise',
  ownerName: 'Bruce Wayne',
  ownerEmail: 'bruce@waynecorp.com',
  domain: 'waynecorp.leadgaze.com',
  industry: 'Technology',
  created: '2025-01-15',
  lastLogin: '2026-08-03 09:12 AM',
  seats: 48,
  mrr: '$2400',
  modules: 2,
  members: 33,
  billingCycle: 'Monthly',
  monthlyAmount: '$2400/mo',
  renewalDate: '2026-09-03',
  revenueGenerated: '$19,200 (8 months)',
  activeModules: ['CRM', 'HRMS'],
};

const MEMBERS = Array.from({ length: 6 }, (_, i) => ({
  id: `m${i}`, sno: i + 1,
  name: 'Aman Kumar', email: 'bruce@waynecorp.com',
  role: 'Owner', lastActive: '2026-08-03 11:42', status: 'Active',
}));

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

const USAGE_STATS = [
  { label: 'Leads Created', value: '1,284' },
  { label: 'Emails Sent', value: '3,920' },
  { label: 'Meetings Scheduled', value: '148' },
  { label: 'Storage Used', value: '4.2 GB' },
  { label: 'API Calls', value: '82,410' },
  { label: 'Documents Uploaded', value: '237' },
];

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

function OverviewTab() {
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
      <CardWidgetContainer title="Workspace Info" className="lg:col-span-1">
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2">
              <span className="primary-text-regular text-leadgaze-muted">{label}</span>
              <span className="primary-text-medium text-leadgaze-dark dark:text-white text-right">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2">
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
            <Card key={l} className="p-3">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{v}</p>
              <p className="primary-text-regular text-leadgaze-muted">{l}</p>
            </Card>
          ))}
        </div>
        <CardWidgetContainer title="Active Modules" contentClassName="px-4 pb-3 pt-2">
          <div className="flex flex-wrap gap-2">
            {WS.activeModules.map((mod) => (
              <Badge key={mod} className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 text-xs font-semibold">
                {mod}
              </Badge>
            ))}
          </div>
        </CardWidgetContainer>
      </div>

      {/* Subscription Summary */}
      <div className="card-container rounded-[0.7px] bg-white dark:bg-zinc-900 lg:col-span-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="primary-heading text-leadgaze-dark dark:text-zinc-100">Subscription</h2>
        </div>
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 px-4 flex-1">
          <div className="flex items-center justify-between py-2">
            <span className="primary-text-regular text-leadgaze-muted">Current Plan</span>
            <PlanBadge plan={WS.plan} />
          </div>
          {subRows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <span className="primary-text-regular text-leadgaze-muted">{label}</span>
              <span className="primary-text-medium text-leadgaze-dark dark:text-white">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-3 pt-2">
          <Button className="w-full bg-leadgaze-primary hover:bg-leadgaze-primary/90 text-white secondary-text-small-bold">
            Change Plan
          </Button>
        </div>
      </div>
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

function MembersTab() {
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
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="sticky right-0 bg-zinc-50 dark:bg-zinc-900 w-10 text-center">
              <button className="flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white mx-auto">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MEMBERS.map((m) => (
            <TableRow key={m.id} className="hover:bg-muted/50 cursor-pointer">
              <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted">{m.sno}</TableCell>
              <TableCell className="primary-text-medium text-leadgaze-dark dark:text-white">{m.name}</TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted">{m.email}</TableCell>
              <TableCell><span className="secondary-text-small-bold text-blue-600">{m.role}</span></TableCell>
              <TableCell className="primary-text-regular text-leadgaze-muted">{m.lastActive}</TableCell>
              <TableCell><StatusBadge status={m.status} /></TableCell>
              <TableCell className="text-right pr-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Change Role</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
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

function UsageAnalyticsTab() {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {USAGE_STATS.map(({ label, value }) => (
        <Card key={label} className="p-4">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="primary-text-regular text-leadgaze-muted mt-0.5">{label}</p>
        </Card>
      ))}
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="card-container bg-white dark:bg-zinc-900 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
      {INTEGRATIONS.map((intg) => {
        const isConnected = intg.status === 'Connected';
        return (
          <div key={intg.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${intg.logoBg} ${intg.logoColor}`}>
              {intg.logo}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="primary-text-medium text-leadgaze-dark dark:text-white">{intg.name}</span>
                <span className="secondary-text-small text-leadgaze-muted">{intg.category}</span>
                {isConnected
                  ? <span className="flex items-center gap-1 secondary-text-small font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />Connected</span>
                  : <span className="secondary-text-small text-zinc-400">Available</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {intg.services.map((s, i) => (
                  <span key={s} className="secondary-text-small text-leadgaze-muted">
                    {s}{i < intg.services.length - 1 ? ' ·' : ''}
                  </span>
                ))}
                {isConnected && intg.lastSync && (
                  <span className="secondary-text-small text-leadgaze-muted">· Last sync {intg.lastSync}</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {isConnected && intg.connectedSince && (
                <span className="secondary-text-small text-leadgaze-muted">Since {intg.connectedSince}</span>
              )}
              {isConnected && (
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 secondary-text-small-bold h-7 px-3">
                  Disconnect
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

export default function WorkspaceDetailPage() {
  const [activeTab, setActiveTab] = useState('overview');

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
          <TabsContent value="overview" className="mt-0"><OverviewTab /></TabsContent>
          <TabsContent value="modules" className="mt-0"><ModulesTab /></TabsContent>
          <TabsContent value="members" className="mt-0"><MembersTab /></TabsContent>
          <TabsContent value="usage" className="mt-0"><UsageAnalyticsTab /></TabsContent>
          <TabsContent value="integrations" className="mt-0"><IntegrationsTab /></TabsContent>
          <TabsContent value="audit-logs" className="mt-0"><AuditLogsTab /></TabsContent>
          <TabsContent value="billing" className="mt-0"><BillingTimelineTab /></TabsContent>
        </Tabs>
      </PageBody>
    </AppShell>
  );
}
