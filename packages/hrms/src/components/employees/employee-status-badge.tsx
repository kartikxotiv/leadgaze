'use client';

import { Badge } from '@kit/ui/badge';

import type { EmployeeStatus } from '../../types/employee.type';

const statusLabelMap: Record<EmployeeStatus, string> = {
  active: 'Active',
  exited: 'Exited',
  inactive: 'Inactive',
  invited: 'Invited',
  notice_period: 'Notice Period',
  probation: 'Probation',
};

export function EmployeeStatusBadge(props: { status: EmployeeStatus }) {
  if (props.status === 'notice_period') {
    return (
      <Badge className={'bg-red-500 text-white hover:bg-red-500'}>
        {statusLabelMap[props.status]}
      </Badge>
    );
  }

  if (props.status === 'probation') {
    return (
      <Badge variant={'outline'} className={'bg-background'}>
        {statusLabelMap[props.status]}
      </Badge>
    );
  }

  if (props.status === 'invited') {
    return (
      <Badge className={'bg-amber-500 text-white hover:bg-amber-500'}>
        {statusLabelMap[props.status]}
      </Badge>
    );
  }

  if (props.status === 'inactive' || props.status === 'exited') {
    return <Badge variant={'secondary'}>{statusLabelMap[props.status]}</Badge>;
  }

  return (
    <Badge variant={'secondary'} className={'font-medium'}>
      {statusLabelMap[props.status]}
    </Badge>
  );
}

export function getEmployeeStatusLabel(status: EmployeeStatus) {
  return statusLabelMap[status];
}
