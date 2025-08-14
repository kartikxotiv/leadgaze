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
import { Plus, Search, Mail, Send, Inbox } from "lucide-react";

interface EmailLog {
  id: string;
  contact_name: string;
  email: string;
  subject: string;
  type: "Sent" | "Received";
  date: string;
  status: "Read" | "Unread" | "Replied";
  lead_id?: string;
}

const mockEmailLogs: EmailLog[] = [
  {
    id: "1",
    contact_name: "John Smith",
    email: "john@techcorp.com",
    subject: "Proposal for Enterprise License",
    type: "Sent",
    date: "2024-01-25T09:30:00Z",
    status: "Read",
    lead_id: "1",
  },
  {
    id: "2",
    contact_name: "Sarah Johnson",
    email: "sarah@global.com",
    subject: "Re: Implementation Timeline",
    type: "Received",
    date: "2024-01-24T16:20:00Z",
    status: "Replied",
    lead_id: "2",
  },
  {
    id: "3",
    contact_name: "Mike Chen",
    email: "mike@startupxyz.com",
    subject: "Welcome to our CRM platform",
    type: "Sent",
    date: "2024-01-23T11:15:00Z",
    status: "Unread",
    lead_id: "3",
  },
];

export default function EmailHistoryPage() {
  const [emailLogs] = useState<EmailLog[]>(mockEmailLogs);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmails = emailLogs.filter(
    (email) =>
      email.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Sent":
        return "bg-blue-100 text-blue-800";
      case "Received":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Read":
        return "bg-gray-100 text-gray-800";
      case "Unread":
        return "bg-yellow-100 text-yellow-800";
      case "Replied":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout
      title="Email History"
      description="Track and manage all your email communications"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Compose Email
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{emailLogs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {emailLogs.filter((e) => e.type === "Sent").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {emailLogs.filter((e) => e.type === "Received").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {emailLogs.filter((e) => e.status === "Unread").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Email Communications</CardTitle>
            <CardDescription>
              Complete history of all email interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
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
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">
                        {email.contact_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {email.email}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {email.subject}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(email.type)}>
                          {email.type === "Sent" ? (
                            <Send className="w-3 h-3 mr-1" />
                          ) : (
                            <Inbox className="w-3 h-3 mr-1" />
                          )}
                          {email.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(email.status)}>
                          {email.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(email.date).toLocaleString()}
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
