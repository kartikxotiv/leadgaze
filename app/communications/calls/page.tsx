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
import { Plus, Search, Phone, Clock, User } from "lucide-react";

interface CallLog {
  id: string;
  contact_name: string;
  phone_number: string;
  type: "Incoming" | "Outgoing" | "Missed";
  duration: number;
  date: string;
  notes: string;
  lead_id?: string;
}

const mockCallLogs: CallLog[] = [
  {
    id: "1",
    contact_name: "John Smith",
    phone_number: "+1-555-0123",
    type: "Outgoing",
    duration: 1245,
    date: "2024-01-25T10:30:00Z",
    notes: "Discussed pricing and timeline",
    lead_id: "1",
  },
  {
    id: "2",
    contact_name: "Sarah Johnson",
    phone_number: "+1-555-0124",
    type: "Incoming",
    duration: 892,
    date: "2024-01-24T14:15:00Z",
    notes: "Follow-up on proposal",
    lead_id: "2",
  },
  {
    id: "3",
    contact_name: "Mike Chen",
    phone_number: "+1-555-0125",
    type: "Missed",
    duration: 0,
    date: "2024-01-23T16:45:00Z",
    notes: "Need to call back",
    lead_id: "3",
  },
];

export default function CallLogsPage() {
  const [callLogs] = useState<CallLog[]>(mockCallLogs);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCalls = callLogs.filter(
    (call) =>
      call.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.phone_number.includes(searchTerm)
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Incoming":
        return "bg-green-100 text-green-800";
      case "Outgoing":
        return "bg-blue-100 text-blue-800";
      case "Missed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <DashboardLayout
      title="Call Logs"
      description="Track and manage all your phone communications"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Log Call
        </Button>
      }
    >
      <div className="space-y-6">
        {}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callLogs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Outgoing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {callLogs.filter((c) => c.type === "Outgoing").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Incoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {callLogs.filter((c) => c.type === "Incoming").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Missed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {callLogs.filter((c) => c.type === "Missed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {}
        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
            <CardDescription>
              Complete log of all phone communications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {call.contact_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {call.phone_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(call.type)}>
                          {call.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {formatDuration(call.duration)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(call.date).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {call.notes || "No notes"}
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
