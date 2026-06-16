# Product Requirements Document (PRD)

# Leadgaze Service Module (Helpdesk & Ticket Management)

Version: 1.0

Status: MVP Planning

Owner: Leadgaze Product Team

---

# 1. Overview

The Service Module is a standalone support and helpdesk system within Leadgaze.

Its primary purpose is to convert customer communications into manageable support tickets, allowing support teams to efficiently track, assign, communicate, and resolve customer issues.

The module must work independently from CRM, HRMS, Inventory, and other Leadgaze modules.

Organizations should be able to subscribe only to the Service Module without requiring any other Leadgaze products.

---

# 2. Goals

## Business Goals

- Centralize customer support operations.
- Reduce support response times.
- Track customer issues from creation to resolution.
- Improve support team accountability.
- Provide visibility into support team performance.
- Enable future SLA and AI capabilities.

## Product Goals

- Convert incoming emails into tickets.
- Manage customers and organizations.
- Track ticket ownership and progress.
- Track all ticket activities.
- Measure time spent on support work.
- Maintain complete communication history.

---

# 3. Module Scope

The Service Module will include:

### Customer Management

- Organizations
- Customers

### Ticket Management

- Ticket creation
- Ticket assignment
- Ticket statuses
- Priorities
- Categories

### Communication

- Email inbox integration
- Email threading
- Ticket conversations
- Internal notes
- Attachments

### Operations

- Time tracking
- Status duration tracking
- Activity history
- Team management

### Reporting

- Ticket reports
- Agent performance
- Time spent reporting
- Status analytics

---

# 4. Core Entities

## Organization

Represents a company or business.

Examples:

- Microsoft
- Google
- Infosys

Fields:

- Name
- Website
- Industry
- Phone
- Address

---

## Customer

Represents an individual contact.

Examples:

- John Smith
- Sarah Johnson

Fields:

- Name
- Email
- Phone
- Job Title
- Organization

Relationship:

One Organization can have multiple Customers.

---

## Ticket

Represents a support request.

Examples:

- Unable to Login
- Billing Issue
- Refund Request

Fields:

- Ticket Number
- Subject
- Description
- Status
- Priority
- Category
- Customer
- Organization
- Assigned Agent
- Created Date
- Updated Date
- Closed Date

---

# 5. Email Inbox Integration

Administrators can connect one or more support inboxes.

Examples:

- [support@company.com](mailto:support@company.com)
- [help@company.com](mailto:help@company.com)
- [billing@company.com](mailto:billing@company.com)

Supported Providers:

- Gmail
- Microsoft Outlook
- IMAP

---

# 6. Automatic Ticket Creation

When a new email arrives:

System should:

1. Read incoming email.
2. Identify customer.
3. Create customer if not found.
4. Create organization if required.
5. Generate support ticket.
6. Store email as first ticket message.
7. Notify assigned users.

Result:

Email
↓
Ticket Created

---

# 7. Email Threading

When customers reply to an email:

System should:

- Detect existing conversation.
- Append message to existing ticket.
- Not create duplicate tickets.

All communication must remain under the same ticket.

Example:

Ticket #1001

Customer:
Unable to login

Agent:
Please reset password

Customer:
Issue still exists

Agent:
Issue resolved

---

# 8. Ticket Assignment

Support managers can assign tickets to users.

Assignment Types:

### Manual Assignment

Manager selects agent.

### Future Enhancements

- Round Robin
- Team Assignment
- Skill-Based Assignment
- AI Assignment

---

# 9. Teams

Organizations can create support teams.

Examples:

- Technical Support
- Billing Team
- Escalation Team
- Customer Success Team

Users can belong to multiple teams.

---

# 10. Ticket Status Management

Default statuses:

- New
- Open
- In Progress
- Waiting For Customer
- Resolved
- Closed

Administrators should be able to create custom statuses.

---

# 11. Priority Management

Default priorities:

- Low
- Medium
- High
- Urgent
- Critical

Administrators can customize priorities.

---

# 12. Categories

Default categories:

- Technical Issue
- Billing
- Refund
- Complaint
- Feature Request
- Product Inquiry

Administrators can create additional categories.

---

# 13. Internal Notes

Agents can add private notes.

Requirements:

- Visible only to internal users.
- Not included in customer emails.
- Included in activity timeline.

Examples:

"Waiting for engineering team."

"Customer requested callback."

---

# 14. Attachments

System must support:

- Email attachments
- Agent uploads
- Customer uploads

Examples:

- Screenshots
- Documents
- Logs
- Invoices

---

# 15. Time Tracking (NEW FEATURE)

Purpose:

Measure effort spent by support agents on tickets.

---

## Manual Time Logging

Agents can log work against tickets.

Example:

Ticket #1001

Work Performed:
Investigated login issue

Time Logged:
45 Minutes

---

## Log Entry Fields

- Ticket
- User
- Description
- Start Time
- End Time
- Duration
- Logged Date

---

## Ticket Time Summary

Each ticket should display:

- Total Time Logged
- Time Logged By Agent
- Latest Time Entry

Example:

Ticket #1001

Total Time Logged:
4 Hours 35 Minutes

---

## Agent Performance Metrics

Reports should include:

- Hours Logged Per Agent
- Hours Logged Per Team
- Average Time Per Ticket

---

# 16. Ticket Activity Tracking (NEW FEATURE)

Purpose:

Track every change performed on a ticket.

This creates a complete audit trail.

---

## Activity Examples

Ticket Created

Ticket Assigned

Priority Changed

Status Changed

Customer Replied

Agent Replied

Attachment Added

Note Added

Ticket Closed

---

## Activity Timeline

Example:

09:00 AM
Ticket Created

09:05 AM
Assigned to Sarah

09:20 AM
Status Changed to In Progress

10:15 AM
Customer Replied

10:40 AM
Status Changed to Waiting For Customer

12:30 PM
Customer Replied

12:45 PM
Status Changed to In Progress

01:30 PM
Resolved

All events should be stored and viewable.

---

# 17. Status Duration Tracking (NEW FEATURE)

Purpose:

Measure how long a ticket remains in each status.

This is critical for reporting and future SLA management.

---

## Example

Ticket Lifecycle:

New
09:00 → 09:05

Open
09:05 → 09:20

In Progress
09:20 → 10:40

Waiting For Customer
10:40 → 12:30

In Progress
12:45 → 01:30

Resolved
01:30

---

## Calculated Metrics

For each ticket:

- Total Open Time
- Total In Progress Time
- Total Waiting Time
- Total Resolution Time

Example:

Ticket #1001

In Progress:
2 Hours 05 Minutes

Waiting For Customer:
1 Hour 50 Minutes

Total Resolution Time:
4 Hours 30 Minutes

---

## Reporting Requirements

Management should be able to see:

Average In Progress Time

Average Waiting Time

Average Resolution Time

Longest Waiting Tickets

Tickets Stuck In Status

Status Distribution Reports

---

# 18. Dashboard

Support Dashboard should display:

- Open Tickets
- New Tickets
- Unassigned Tickets
- Resolved Today
- High Priority Tickets
- Critical Tickets
- Average Resolution Time
- Average Response Time
- Total Time Logged
- Tickets By Status
- Tickets By Category

---

# 19. Reporting

Reports Required:

## Ticket Reports

- Open Tickets
- Closed Tickets
- Resolved Tickets

## Agent Reports

- Tickets Assigned
- Tickets Resolved
- Time Logged

## Team Reports

- Team Workload
- Team Resolution Metrics

## Status Reports

- Time In Status
- Bottleneck Analysis
- Waiting Time Analysis

---

# 20. Notifications

Notify users when:

- Ticket Assigned
- Ticket Reassigned
- Customer Replied
- Mentioned In Note
- Ticket Closed
- High Priority Ticket Created

Delivery Channels:

- In-App Notifications
- Email Notifications

---

# 21. Future Roadmap

Phase 2

- SLA Policies
- Escalation Rules
- Canned Responses
- Knowledge Base
- Customer Portal
- Automation Rules

Phase 3

- AI Ticket Categorization
- AI Priority Detection
- AI Suggested Replies
- AI Ticket Summaries
- AI Sentiment Analysis
- AI Auto Assignment

---

# 22. Success Metrics

The Service Module should enable organizations to:

- Manage all support requests from one platform.
- Track ticket ownership and accountability.
- Measure actual effort spent on customer issues.
- Understand where tickets spend most of their lifecycle.
- Improve response and resolution times.
- Build a scalable customer support operation.
