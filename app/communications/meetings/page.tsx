"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Plus, Search, Calendar, Clock, Users, FileText } from "lucide-react";

interface MeetingNote {
  id: string;
  title: string;
  attendees: string[];
  date: string;
  duration: number;
  type: "Demo" | "Discovery" | "Negotiation" | "Follow-up" | "Internal";
  notes: string;
  action_items: string[];
  lead_id?: string;
}

const mockMeetingNotes: MeetingNote[] = [
  {
    id: "1",
    title: "TechCorp Demo Session",
    attendees: ["John Smith", "Jane Doe", "Mike Johnson"],
    date: "2024-01-25T14:00:00Z",
    duration: 60,
    type: "Demo",
    notes: "Demonstrated key features, positive feedback on UI/UX",
    action_items: ["Send pricing proposal", "Schedule follow-up call"],
    lead_id: "1",
  },
  {
    id: "2",
    title: "Global Industries Discovery Call",
    attendees: ["Sarah Johnson", "Team Lead"],
    date: "2024-01-24T10:30:00Z",
    duration: 45,
    type: "Discovery",
    notes: "Identified key pain points and requirements",
    action_items: ["Prepare custom demo", "Research integration options"],
    lead_id: "2",
  },
  {
    id: "3",
    title: "Weekly Sales Review",
    attendees: ["Sales Team", "Manager"],
    date: "2024-01-23T09:00:00Z",
    duration: 30,
    type: "Internal",
    notes: "Reviewed pipeline progress and upcoming opportunities",
    action_items: ["Update CRM records", "Prepare Q1 forecast"],
  },
];

export default function MeetingNotesPage() {
  const [meetingNotes] = useState<MeetingNote[]>(mockMeetingNotes);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMeetings = meetingNotes.filter(
    (meeting) =>
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.attendees.some((attendee) =>
        attendee.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Demo":
        return "bg-blue-100 text-blue-800";
      case "Discovery":
        return "bg-green-100 text-green-800";
      case "Negotiation":
        return "bg-purple-100 text-purple-800";
      case "Follow-up":
        return "bg-yellow-100 text-yellow-800";
      case "Internal":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout
      title="Meeting Notes"
      description="Track and manage all your meeting notes and action items"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Meeting
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetingNotes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  meetingNotes.filter((m) => {
                    const meetingDate = new Date(m.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return meetingDate > weekAgo;
                  }).length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {meetingNotes.reduce(
                  (sum, meeting) => sum + meeting.action_items.length,
                  0
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  meetingNotes.reduce(
                    (sum, meeting) => sum + meeting.duration,
                    0
                  ) / meetingNotes.length
                )}
                m
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting Notes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting History</CardTitle>
            <CardDescription>
              Complete record of all meetings and notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {meeting.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(meeting.type)}>
                          {meeting.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {meeting.attendees.length} attendees
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {meeting.duration}m
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(meeting.date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {meeting.action_items.length} items
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
