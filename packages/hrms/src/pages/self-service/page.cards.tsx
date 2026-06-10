'use client';

import {
  BellRing,
  FileText,
  LifeBuoy,
  Megaphone,
  PenLine,
  ShieldAlert,
  UserRound,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';

import type {
  SelfServiceAnnouncement,
  SelfServiceEmployeeProfile,
  SelfServiceMetricSummary,
} from '../../types/self-service.type';
import {
  formatCurrency,
  formatDate,
  getAnnouncementCategoryLabel,
  getProfileCompletion,
} from './page.data';
import { InfoTile, StatusBadge } from './page.shared';

export function SelfServiceAccessCard() {
  return (
    <CardWidgetContainer
      title="Self Service access is restricted"
      desc="Ask an administrator to grant self-service permissions for your role."
      contentClassName="hidden"
      icon2={<ShieldAlert className="text-leadgaze-muted h-5 w-5" />}
    >
      <div />
    </CardWidgetContainer>
  );
}

export function SelfServiceMetricCards(props: {
  metrics: SelfServiceMetricSummary;
}) {
  const items = [
    {
      description: 'Published net salary from your latest available payslip.',
      icon: <FileText className="h-4 w-4" />,
      label: 'Latest Net Pay',
      value: formatCurrency(props.metrics.latestNetPay),
    },
    {
      description: 'Open or in-progress HR requests raised from the portal.',
      icon: <LifeBuoy className="h-4 w-4" />,
      label: 'Open Requests',
      value: props.metrics.openRequests.toString(),
    },
    {
      description: 'Active notices published for the current workspace.',
      icon: <Megaphone className="h-4 w-4" />,
      label: 'Announcements',
      value: props.metrics.activeAnnouncements.toString(),
    },
    {
      description:
        'How complete your personal details are in the employee file.',
      icon: <UserRound className="h-4 w-4" />,
      label: 'Profile Completion',
      value: `${props.metrics.profileCompletion}%`,
    },
  ];
  const iconColors = [
    'bg-primary',
    'bg-activity-5',
    'bg-activity-4',
    'bg-activity-3',
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <Card
          key={item.label}
          className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
            <div className="space-y-1">
              <CardDescription className="secondary-text-small text-leadgaze-muted dark:text-white">
                {item.label}
              </CardDescription>
              <CardTitle className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                {item.value}
              </CardTitle>
            </div>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded text-white [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white ${iconColors[index % iconColors.length]}`}
            >
              {item.icon}
            </div>
          </CardHeader>
          <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
            <p className="secondary-text-small text-leadgaze-success">
              {item.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SelfServiceProfileCard(props: {
  canEdit: boolean;
  employee: SelfServiceEmployeeProfile;
  onEdit: () => void;
}) {
  const fullName = [props.employee.first_name, props.employee.last_name]
    .filter(Boolean)
    .join(' ');
  const initials =
    `${props.employee.first_name?.[0] ?? ''}${props.employee.last_name?.[0] ?? props.employee.first_name?.[1] ?? ''}`.toUpperCase();
  const profileCompletion = getProfileCompletion(props.employee);

  return (
    <CardWidgetContainer
      title={fullName || 'Employee'}
      desc={''}
      className="h-full"
      contentClassName="space-y-6 p-4"
      icon={
        <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold">
          {initials || 'SS'}
        </span>
      }
      icon2={
        props.canEdit ? (
          <Button variant="outline" onClick={props.onEdit}>
            <PenLine className="mr-2 h-4 w-4" />
            Update Details
          </Button>
        ) : null
      }
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          Employee ID {props.employee.employee_code}
        </Badge>
        {props.employee.department?.name ? (
          <Badge variant="outline">{props.employee.department.name}</Badge>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">Profile completion</p>
          <p className="text-muted-foreground text-sm">{profileCompletion}%</p>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Work email" value={props.employee.work_email} />
        <InfoTile
          label="Personal email"
          value={props.employee.personal_email ?? 'Not provided'}
        />
        <InfoTile
          label="Phone"
          value={props.employee.phone ?? 'Not provided'}
        />
        <InfoTile
          label="Emergency contact"
          value={
            props.employee.emergency_contact_name
              ? `${props.employee.emergency_contact_name}${props.employee.emergency_contact_phone ? ` (${props.employee.emergency_contact_phone})` : ''}`
              : 'Not provided'
          }
        />
        <InfoTile
          label="Reporting manager"
          value={props.employee.manager_name ?? 'Not assigned'}
        />
        <InfoTile
          label="Joining date"
          value={formatDate(props.employee.joining_date)}
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-muted-foreground text-xs uppercase">Address</p>
        <p className="mt-2 text-sm leading-6">
          {props.employee.address ?? 'No address on file yet.'}
        </p>
      </div>
    </CardWidgetContainer>
  );
}

export function SelfServiceAnnouncementsCard(props: {
  announcements: Array<SelfServiceAnnouncement>;
}) {
  return (
    <CardWidgetContainer
      title="Company Announcements"
      desc="Workspace notices, payroll reminders, and policy updates."
      className="h-full"
      contentClassName="space-y-3 p-4"
    >
      {props.announcements.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          No active announcements right now.
        </div>
      ) : (
        props.announcements.map((announcement) => (
          <div key={announcement.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              {announcement.is_pinned ? (
                <Badge variant="secondary">Pinned</Badge>
              ) : null}
              <StatusBadge
                label={getAnnouncementCategoryLabel(announcement.category)}
              />
            </div>
            <p className="mt-3 font-semibold">{announcement.title}</p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {announcement.summary ?? announcement.body}
            </p>
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1">
                <BellRing className="h-3.5 w-3.5" />
                Published {formatDate(announcement.published_at)}
              </span>
              {announcement.cta_label ? (
                <span>{announcement.cta_label}</span>
              ) : null}
            </div>
          </div>
        ))
      )}
    </CardWidgetContainer>
  );
}
