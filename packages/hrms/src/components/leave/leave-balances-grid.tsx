'use client';

import { Badge } from '@kit/ui/badge';
import { Card, CardContent } from '@kit/ui/card';

import type { LeaveBalance } from '../../types/leave.type';
import { formatNumber } from '../leave-page.utils';

export function LeaveBalancesGrid(props: { balances: LeaveBalance[] }) {
  return (
    <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
      {props.balances.length > 0 ? (
        props.balances.map((balance) => (
          <Card key={balance.leave_type.id} className={'shadow-sm'}>
            <CardContent className={'space-y-3 p-5'}>
              <div className={'flex items-center justify-between gap-3'}>
                <p className={'text-sm font-semibold'}>
                  {balance.leave_type.name}
                </p>
                {balance.leave_type.requires_hr_approval ? (
                  <Badge variant={'outline'}>Needs HR Approval</Badge>
                ) : null}
              </div>
              <div className={'flex items-end gap-2'}>
                <span className={'text-3xl font-bold'}>
                  {formatNumber(balance.available)}
                </span>
                <span className={'text-muted-foreground text-sm'}>
                  / {formatNumber(balance.total)} days left
                </span>
              </div>
              <div className={'bg-muted h-2 rounded-full'}>
                <div
                  className={'bg-primary h-full rounded-full'}
                  style={{
                    width: `${balance.total > 0 ? Math.min((balance.approved / balance.total) * 100, 100) : 0}%`,
                  }}
                />
              </div>
              <div
                className={
                  'text-muted-foreground grid grid-cols-4 gap-2 text-xs'
                }
              >
                <div>
                  <p>Carried</p>
                  <p className={'text-foreground font-semibold'}>
                    {formatNumber(balance.carried_forward)}
                  </p>
                </div>
                <div>
                  <p>Approved</p>
                  <p className={'text-foreground font-semibold'}>
                    {formatNumber(balance.approved)}
                  </p>
                </div>
                <div>
                  <p>Pending</p>
                  <p className={'text-foreground font-semibold'}>
                    {formatNumber(balance.pending)}
                  </p>
                </div>
                <div>
                  <p>Rejected</p>
                  <p className={'text-foreground font-semibold'}>
                    {formatNumber(balance.rejected)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className={'md:col-span-2 xl:col-span-4'}>
          <CardContent className={'p-6'}>
            <p className={'text-sm font-medium'}>No leave balances available</p>
            <p className={'text-muted-foreground mt-1 text-sm'}>
              Balances appear once leave types are configured and your account
              is linked to an employee profile.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
