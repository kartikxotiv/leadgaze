'use client';

import React, { useState } from 'react';
import { Activity, Filter } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { FUNDRAISING_FEATURE_KEYS, FUNDRAISING_MODULE_KEYS, useFundraisingPermissions } from '../../utils';

const activityTypes = [
  'Investor Created',
  'Round Created',
  'Deal Created',
  'Stage Changed',
  'Meeting Scheduled',
  'Document Uploaded',
  'Note Added',
  'Follow-Up Updated',
];

export function FundraisingActivitiesPage({ workspaceId }: { workspaceId: string }) {
  const [type, setType] = useState('all');
  const { canAccess, isLoading } = useFundraisingPermissions(workspaceId);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  }

  if (!canAccess(FUNDRAISING_MODULE_KEYS.pipeline, FUNDRAISING_FEATURE_KEYS.view)) {
    return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view fundraising activities.</div>;
  }

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Input type="date" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Activity Types</SelectItem>{activityTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Investor" />
        <Input placeholder="Round" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4 font-semibold">Activity Feed</div>
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <Activity className="h-8 w-8" />
            <div>Connect this page to the core Activities module using fundraising entity mappings.</div>
            <div className="flex flex-wrap justify-center gap-2">{activityTypes.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
