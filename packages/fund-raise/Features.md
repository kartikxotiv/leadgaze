# Leadgaze Fund Raising Module - Pages & Features Specification

## Overview

This document defines all pages, navigation, features, and actions for the Fund Raising module based on the current database design.

The goal is to provide enough information for implementation while keeping the MVP lean.

---

# Module Navigation

```txt
Fund Raising
│
├── Dashboard
├── Investors
├── Funding Rounds
├── Pipeline
├── Activities
└── Settings
```

---

# 1. Dashboard

Route:

```txt
/fundraising
```

Purpose:

Provide a quick overview of fundraising progress.

---

## Dashboard Cards

### Total Target Amount

Shows:

```txt
₹5,000,000
```

Source:

```txt
fundraising.rounds.target_amount
```

---

### Total Raised Amount

Shows:

```txt
₹2,500,000
```

Source:

```txt
fundraising.rounds.raised_amount
```

---

### Active Funding Rounds

Shows:

```txt
3 Active Rounds
```

Source:

```txt
fundraising.rounds.status
```

---

### Total Investors

Shows:

```txt
25 Investors
```

Source:

```txt
fundraising.investors
```

---

### Active Deals

Shows:

```txt
18 Active Deals
```

Source:

```txt
fundraising.deals
```

---

## Charts

### Funding Progress

Displays:

```txt
Target Amount vs Raised Amount
```

---

### Pipeline Distribution

Displays:

```txt
Lead
Contacted
Pitch Shared
Meeting Scheduled
Due Diligence
Negotiation
Committed
Funds Received
```

Count by stage.

---

## Upcoming Follow-Ups

Shows:

```txt
Investor
Round
Follow-Up Date
```

Source:

```txt
fundraising.deals.next_followup_date
```

---

# 2. Investors

Route:

```txt
/fundraising/investors
```

Purpose:

Manage investor organizations and individuals.

---

## Investor List

Columns:

```txt
Name
Investor Type
Ticket Size
Industry Focus
Status
Owner
Created Date
Actions
```

Source:

```txt
fundraising.investors
```

---

## Filters

```txt
Status
Investor Type
Industry Focus
Owner
```

---

## Actions

```txt
Add Investor
Edit Investor
Delete Investor
View Investor
```

Permission based.

---

## Add/Edit Investor Form

Fields:

```txt
Name
Investor Type
Website
LinkedIn URL
Description
Industry Focus
Geo Focus
Ticket Size Min
Ticket Size Max
Status
Owner
```

---

## Investor Details Page

Route:

```txt
/fundraising/investors/:id
```

Sections:

### Investor Information

Basic profile.

---

### Contacts

Source:

```txt
fundraising.investor_contacts
```

Actions:

```txt
Add Contact
Edit Contact
Delete Contact
```

Fields:

```txt
Name
Designation
Email
Phone
LinkedIn
Primary Contact
```

---

### Related Deals

Displays all deals associated with the investor.

---

### Notes

Uses Core Notes Module.

Entity:

```txt
entity_type = fundraising_investor
entity_id = investor_id
```

---

### Documents

Uses Core Documents Module.

Entity:

```txt
entity_type = fundraising_investor
entity_id = investor_id
```

---

### Activities

Uses Core Activities Module.

---

# 3. Funding Rounds

Route:

```txt
/fundraising/rounds
```

Purpose:

Manage all fundraising rounds.

---

## Round List

Columns:

```txt
Round Name
Type
Target Amount
Raised Amount
Valuation
Status
Start Date
Close Date
Actions
```

Source:

```txt
fundraising.rounds
```

---

## Actions

```txt
Create Round
Edit Round
Delete Round
View Round
```

---

## Add/Edit Round Form

Fields:

```txt
Round Name
Round Type
Target Amount
Raised Amount
Valuation
Currency
Status
Start Date
Close Date
```

---

## Round Details Page

Route:

```txt
/fundraising/rounds/:id
```

Sections:

### Round Information

Basic details.

---

### Associated Investors

Shows investors participating in the round.

Source:

```txt
fundraising.deals
```

---

### Pipeline Summary

Displays:

```txt
Lead Count
Due Diligence Count
Negotiation Count
Committed Count
Funds Received Count
```

---

### Notes

Core Notes.

```txt
entity_type = fundraising_round
```

---

### Documents

Core Documents.

```txt
entity_type = fundraising_round
```

---

### Activities

Core Activities.

---

# 4. Pipeline

Route:

```txt
/fundraising/pipeline
```

Purpose:

Track investor progress through fundraising stages.

---

## Kanban View

Columns:

```txt
Lead
Contacted
Pitch Shared
Meeting Scheduled
Due Diligence
Negotiation
Committed
Funds Received
Closed Lost
```

Source:

```txt
fundraising.pipeline_stages
```

---

## Deal Card

Displays:

```txt
Investor
Round
Expected Amount
Committed Amount
Next Follow-Up
Owner
```

Source:

```txt
fundraising.deals
```

---

## Actions

```txt
Move Stage
Edit Deal
Delete Deal
Schedule Follow-Up
Add Note
Create Meeting
Upload Document
```

---

## Deal Details Drawer/Page

Route:

```txt
/fundraising/deals/:id
```

---

### Deal Information

Fields:

```txt
Investor
Round
Stage
Expected Amount
Committed Amount
Probability
Owner
```

---

### Follow-Ups

Displays:

```txt
Next Follow-Up Date
Last Contact Date
```

---

### Notes

Core Notes.

```txt
entity_type = fundraising_deal
```

---

### Meetings

Core Meetings.

```txt
entity_type = fundraising_deal
```

---

### Documents

Core Documents.

```txt
entity_type = fundraising_deal
```

---

### Activities

Core Activities.

---

# 5. Activities

Route:

```txt
/fundraising/activities
```

Purpose:

Show all fundraising activity in one place.

---

## Activity Feed

Displays:

```txt
Investor Created
Round Created
Deal Created
Stage Changed
Meeting Scheduled
Document Uploaded
Note Added
Follow-Up Updated
```

Uses:

```txt
Core Activities Module
```

---

## Filters

```txt
Date Range
Activity Type
Investor
Round
User
```

---

# 6. Settings

Route:

```txt
/ fund raising/settings
```

Purpose:

Manage fundraising configurations.

---

## Pipeline Stages

Source:

```txt
fundraising.pipeline_stages
```

Actions:

```txt
Add Stage
Edit Stage
Reorder Stage
Archive Stage
```

---

## Investor Types

Manage:

```txt
VC
Angel
PE
Family Office
Corporate Investor
```

Can be static initially.

---

## Round Types

Manage:

```txt
Pre-Seed
Seed
Series A
Series B
Series C
Bridge
```

Can be static initially.

---

# Permissions

## Investors

```txt
view_investor
create_investor
edit_investor
delete_investor
```

---

## Funding Rounds

```txt
view_round
create_round
edit_round
delete_round
```

---

## Pipeline

```txt
view_pipeline
move_deal
edit_deal
delete_deal
```

---

## Activities

```txt
view_activities
```

---

## Settings

```txt
manage_fundraising_settings
```

---

# Core Module Integrations

The Fund Raising module must use Core services for:

```txt
Notes
Meetings
Documents
Emails
Activities
Reminders
Notifications
```

Entity Mapping:

```txt
fundraising_investor
fundraising_round
fundraising_deal
```

Example:

```txt
entity_type = fundraising_deal
entity_id = deal_id
```

This ensures the Fund Raising package remains reusable, modular, and capable of running standalone with Core services in any future project.
