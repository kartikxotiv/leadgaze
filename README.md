# Leadgaze CRM

A modern, multi-tenant CRM (Customer Relationship Management) system built with Next.js, TypeScript, and Supabase.

## Features

### Core Functionality
- **Lead Management**: Create, import, score, and track leads
- **Deal Pipeline**: Manage sales deals and forecasts
- **Task Management**: Organize tasks and activities
- **Multi-Organization**: Support for multiple organizations per user
- **Workspace System**: Organize data within organizations
- **Role-Based Access**: Owner, Admin, Manager, Member, Viewer roles

### Authentication & Security
- JWT-based authentication
- Email OTP verification
- Organization switching
- User invitations
- Password reset flow

### Data Management
- Bulk CSV/Excel import
- Lead scoring and grading
- Duplicate detection and merging
- Activity tracking
- Notification system

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT + Supabase
- **UI Library**: Radix UI + Tailwind CSS
- **State Management**: Zustand
- **Form Handling**: React Hook Form

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

4. Set up the database:
```bash
# Run migrations
npm run supabase:migrate

# Seed config data
npm run seed:config
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
crm/
├── app/                    # Next.js App Router pages & APIs
│   ├── api/               # API routes
│   ├── pages/             # Application pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── leads/            # Lead-related components
│   ├── auth/             # Authentication components
│   └── ui/               # Base UI components
├── lib/                   # Utility libraries
│   ├── auth-service.ts   # Authentication logic
│   ├── data/             # Database access layer
│   └── types/            # TypeScript types
├── hooks/                 # Custom React hooks
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
├── docs/                 # Documentation
└── scripts/              # Database scripts
```

## Key Features Implementation

### Registration Flow
6-step registration process:
1. Email verification with OTP
2. Account details (name, password)
3. Organization details
4. Setup questions
5. Role selection
6. Team size

### Lead Management
- Create, update, delete leads
- Bulk import from CSV/Excel
- Lead scoring and grading
- Duplicate detection
- Activity tracking
- Status management

### Pipeline Management
- Create and manage deals
- Forecast revenue calculations
- Stage tracking
- Workspace-scoped deals

## Development

### Running Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # Lint code
```

### Database Migrations
```bash
# Run all migrations
npm run supabase:migrate

# Seed configuration data
npm run seed:config
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `JWT_SECRET` | Secret for JWT tokens |
| `NEXTAUTH_URL` | Application base URL |

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Private project - All rights reserved

