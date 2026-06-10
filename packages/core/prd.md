# Leadgaze Core Module Architecture (Phase 1)

## Objective

Create a new reusable package:

```txt
packages/core
```

This package will provide shared platform capabilities that can be used by:

```txt
CRM
Fund Raising
HRMS
Inventory
Accounting
Future Modules
```

The goal is to prevent duplicate implementations of Notes, Meetings, Emails, Documents, Activities, and Reminders across modules.

---

# Important Rule

DO NOT modify existing CRM implementations.

Current CRM Notes, Emails, Meetings, Documents, etc. must continue working exactly as they are today.

This phase only introduces a new Core package that will be consumed by the Fund Raising module.

CRM migration to Core will happen in a future phase.

---

# Package Structure

Create:

```txt
packages/core

src/
├── notes/
├── meetings/
├── emails/
├── documents/
├── activities/
├── reminders/
├── types/
├── services/
└── index.ts
```

---

# Core Philosophy

Core is NOT a business module.

Core contains reusable platform capabilities only.

Allowed:

```txt
notes
meetings
emails
documents
activities
reminders
notifications
permissions
```

Not Allowed:

```txt
leads
contacts
accounts
opportunities
investors
rounds
employees
products
```

Business entities belong inside their respective modules.

---

# Generic Entity Pattern

All Core services must support any entity.

Use:

```ts
entityType: string;
entityId: string;
workspaceId: string;
```

Examples:

```txt
crm_lead
crm_contact
crm_account
crm_opportunity

fundraising_investor
fundraising_round
fundraising_deal

employee
inventory_product
```

Core should never know what these entities represent.

---

# Notes Capability

## Purpose

Attach notes to any entity.

Examples:

```txt
Lead Note
Investor Note
Deal Note
Employee Note
```

---

## Service Interface

```ts
createNote();
updateNote();
deleteNote();
getNotes();
```

---

## Required Fields

```ts
workspaceId;
entityType;
entityId;

note;

createdBy;
createdAt;
updatedAt;
```

---

## Example

```ts
notesService.create({
  workspaceId,
  entityType: 'fundraising_investor',
  entityId: investorId,
  note: 'Interested in fintech startups',
});
```

---

# Meetings Capability

## Purpose

Manage meetings against any entity.

---

## Service Interface

```ts
createMeeting();
updateMeeting();
cancelMeeting();
getMeetings();
```

---

## Required Fields

```ts
workspaceId;

entityType;
entityId;

title;
description;

startTime;
endTime;

createdBy;
```

---

## Example

```ts
meetingsService.create({
  workspaceId,
  entityType: 'fundraising_deal',
  entityId: dealId,
  title: 'Investor Pitch Call',
});
```

---

# Emails Capability

## Purpose

Track emails related to any entity.

---

## Service Interface

```ts
sendEmail();
getEmails();
getEmailThread();
```

---

## Required Fields

```ts
workspaceId;

entityType;
entityId;

subject;
body;

status;
sentAt;
```

---

## Example

```ts
emailsService.send({
  workspaceId,
  entityType: 'fundraising_investor',
  entityId: investorId,
});
```

---

# Documents Capability

## Purpose

Store and retrieve documents for any entity.

---

## Service Interface

```ts
uploadDocument();
deleteDocument();
getDocuments();
```

---

## Supported Examples

```txt
Pitch Deck
Financial Model
Term Sheet
Investor Documents
```

---

# Activities Capability

## Purpose

Track actions performed inside modules.

---

## Service Interface

```ts
logActivity();
getActivities();
```

---

## Example Activity Types

```txt
investor_created
round_created
deal_created

stage_changed

meeting_scheduled

document_uploaded

note_added
```

---

# Reminders Capability

## Purpose

Track reminders and follow-ups.

---

## Service Interface

```ts
createReminder();
updateReminder();
completeReminder();
getReminders();
```

---

## Examples

```txt
Follow-up Investor
Meeting Reminder
Send Proposal Reminder
```

---

# Database Structure

Create separate schema:

```txt
core
```

Create tables:

```txt
core.notes
core.meetings
core.emails
core.documents
core.activities
core.reminders
```

All tables must contain:

```txt
id
workspace_id

entity_type
entity_id

created_at
updated_at
created_by
```

This allows attaching records to any module entity.

---

# Fund Raising Integration

Fund Raising MUST use Core services.

Examples:

```txt
Investor Notes
→ core.notes

Investor Meetings
→ core.meetings

Investor Emails
→ core.emails

Investor Documents
→ core.documents

Investor Activities
→ core.activities

Investor Followups
→ core.reminders
```

---

# Example Entity Mapping

Investor:

```txt
entity_type = fundraising_investor
entity_id = investor_id
```

Funding Round:

```txt
entity_type = fundraising_round
entity_id = round_id
```

Deal:

```txt
entity_type = fundraising_deal
entity_id = deal_id
```

---

# UI Requirements For Fund Raising

Investor Detail Page:

```txt
Overview
Contacts
Notes
Meetings
Emails
Documents
Activities
```

Round Detail Page:

```txt
Overview
Notes
Meetings
Documents
Activities
```

Deal Detail Page:

```txt
Overview
Notes
Meetings
Emails
Documents
Activities
Follow-Ups
```

All data must come from Core services.

---

# Future CRM Migration

DO NOT perform now.

Future state:

```txt
CRM
  ↓
Core

Fund Raising
  ↓
Core

HRMS
  ↓
Core

Inventory
  ↓
Core
```

When CRM migration happens, CRM Notes, Meetings, Emails, Documents, Activities and Reminders will be moved to Core services.

No business logic should need to change because Core already uses the generic entity pattern.

---

# Phase 1 Deliverables

Implement:

```txt
packages/core
```

Create:

```txt
core.notes
core.meetings
core.emails
core.documents
core.activities
core.reminders
```

Expose reusable services.

Integrate Fund Raising with Core.

Do NOT modify CRM implementation.
