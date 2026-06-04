'use client';

import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@kit/ui/tabs';

import type { LeaveTab } from '../../hooks/use-leave-page';

export function LeavePageControls(props: {
  activeTab: LeaveTab;
  availableTabs: LeaveTab[];
  onTabChange: (value: LeaveTab) => void;
  onYearChange: (value: number) => void;
  selectedYear: number;
}) {
  return (
    <Card className={'shadow-sm'}>
      <CardContent
        className={
          'flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between'
        }
      >
        <div>
          <p className={'text-sm font-medium'}>Leave Year</p>
          <p className={'text-muted-foreground text-sm'}>
            Change the year to review leave balances, approvals, and reports.
          </p>
        </div>

        <div className={'flex flex-col gap-3 sm:flex-row sm:items-center'}>
          <Input
            className={'w-full sm:w-32'}
            min={2020}
            type={'number'}
            value={props.selectedYear}
            onChange={(event) =>
              props.onYearChange(
                Number(event.target.value || new Date().getFullYear()),
              )
            }
          />

          <Tabs
            value={props.activeTab}
            onValueChange={(value) => props.onTabChange(value as LeaveTab)}
          >
            <TabsList className={'h-auto flex-wrap justify-start'}>
              {props.availableTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className={'capitalize'}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
