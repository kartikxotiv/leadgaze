'use client';

import React, { useState } from 'react';
import { Activity, Filter } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';

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

export function FundraisingActivitiesPage() {
  const [type, setType] = useState('all');

  return (
    <div className="flex h-full w-full flex-col gap-5 p-6">
      <div>
        <h1 className="text-3xl font-bold">Activities</h1>
        <p className="text-muted-foreground">Fundraising activity feed powered by the core Activities module.</p>
      </div>
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
