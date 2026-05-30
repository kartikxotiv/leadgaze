'use client';

import React from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Video,
  User,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

const mockMeetings = [
  {
    id: 'meet-1',
    title: 'Series A Intro & Pitch Deck Review',
    investorName: 'Apex Capital',
    date: '2026-06-03',
    time: '10:00 AM - 10:45 AM',
    type: 'Video Call',
    attendees: ['David Miller (Partner)', 'Kartik Gupta (Founder)'],
    description: 'Initial walkthrough of current product milestones, user growth, and expansion goals.',
    status: 'upcoming'
  },
  {
    id: 'meet-2',
    title: 'Due Diligence Q&A Session',
    investorName: 'Blue Horizon Ventures',
    date: '2026-06-05',
    time: '2:00 PM - 3:00 PM',
    type: 'Video Call',
    attendees: ['Sarah Connor (Associate)', 'Kartik Gupta (Founder)'],
    description: 'Deep dive into market positioning, unit economics, and data room verification.',
    status: 'upcoming'
  },
  {
    id: 'meet-3',
    title: 'Initial Seed Extension Chat',
    investorName: 'Sarah Jenkins (Angel)',
    date: '2026-05-29',
    time: '11:00 AM - 11:30 AM',
    type: 'Coffee Meeting',
    attendees: ['Sarah Jenkins (Angel)', 'Kartik Gupta (Founder)'],
    description: 'Informal alignment on Seed round objectives and milestones achieved so far.',
    status: 'completed'
  }
];

export function FundraisingMeetingsPage() {
  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meetings & Events</h1>
          <p className="text-muted-foreground">Schedule and manage investor introduction calls, follow-ups, coffee chats, and partner reviews.</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Schedule Meeting
        </Button>
      </div>

      <div className="space-y-4">
        {mockMeetings.map((meeting) => (
          <Card key={meeting.id} className={`hover:border-foreground/20 transition-all ${meeting.status === 'completed' ? 'opacity-85' : ''}`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant={meeting.status === 'upcoming' ? 'default' : 'secondary'} className="capitalize">
                      {meeting.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="mr-1 h-3 w-3" /> {meeting.date} at {meeting.time}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{meeting.title}</h3>
                    <p className="text-sm font-medium text-primary mt-0.5">{meeting.investorName}</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground max-w-2xl">{meeting.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center">
                      <Video className="mr-1.5 h-3.5 w-3.5" /> {meeting.type}
                    </span>
                    <span className="flex items-center">
                      <User className="mr-1.5 h-3.5 w-3.5" /> {meeting.attendees.join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end md:self-start">
                  {meeting.status === 'upcoming' ? (
                    <>
                      <Button variant="outline" size="sm">Reschedule</Button>
                      <Button size="sm" variant="secondary">Join Call</Button>
                    </>
                  ) : (
                    <span className="text-xs text-green-600 dark:text-green-500 font-semibold flex items-center">
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Marked Completed
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
