# CRM Environment Variables Guide

This document lists all environment variables required for the CRM application based on codebase analysis.

## 🚨 CRITICAL VARIABLES (Required for basic functionality)

### Database Configuration
```bash
# Option 1: Full database URL (recommended)
DATABASE_URL=postgres://sidharthverma@localhost:5432/crm

# Option 2: Individual database variables (alternative to DATABASE_URL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm
DB_USER=sidharthverma
DB_PASSWORD=your-password
DB_SSL=false
```

### Application Core
```bash
NODE_ENV=development
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
```

## ⚡ IMPORTANT VARIABLES (Required for authentication)

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-32-characters-minimum
API_BASE_URL=http://localhost:3000
APP_URL=http://localhost:3000
PORT=3000
```

## 📊 DATABASE PERFORMANCE (Recommended)

```bash
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
```

## 📧 EMAIL CONFIGURATION (Optional - for email features)

### SMTP Configuration
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=CRM System
GMAIL_USER=your-email@gmail.com
```

### Alternative: SendGrid
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
```

## 🔷 SUPABASE CONFIGURATION (Optional - if using Supabase features)

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anonymous-key
```

## 🛠️ DEVELOPMENT SETTINGS (Optional)

```bash
DEBUG=true
LOG_LEVEL=debug
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 📋 COMPLETE .env.local TEMPLATE

Copy this template to your `.env.local` file:

```bash
# =============================================================================
# CRM APPLICATION - LOCAL DEVELOPMENT ENVIRONMENT VARIABLES
# =============================================================================

# Database Configuration (REQUIRED)
DATABASE_URL=postgres://sidharthverma@localhost:5432/crm

# Application Settings (REQUIRED)
NODE_ENV=development
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
API_BASE_URL=http://localhost:3000
PORT=3000

# Authentication (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-32-characters-minimum
APP_URL=http://localhost:3000

# Database Pool Settings (RECOMMENDED)
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000

# Supabase (OPTIONAL - only if using Supabase features)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anonymous-key

# Email Configuration (OPTIONAL - only if using email features)
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=CRM System
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GMAIL_USER=your-email@gmail.com

# Development Settings (OPTIONAL)
DEBUG=true
LOG_LEVEL=debug
```

## 🔍 VARIABLE USAGE IN CODEBASE

| Variable | Used In | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `lib/database.ts`, all scripts | PostgreSQL connection string |
| `JWT_SECRET` | All API routes, `lib/auth-service.ts` | JWT token signing |
| `NEXTAUTH_URL` | `lib/auth-service.ts`, auth routes | NextAuth base URL |
| `NEXTAUTH_SECRET` | Authentication system | Session encryption |
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts` | Supabase anonymous key |
| `EMAIL_FROM` | `lib/email-service.ts` | Email sender address |
| `NODE_ENV` | Throughout app | Environment detection |
| `API_BASE_URL` | Auth service | API base URL |
| `APP_URL` | Auth service | Application URL |

## 🚀 SETUP INSTRUCTIONS

### 1. Create Environment File
```bash
cp ENVIRONMENT_VARIABLES.md .env.local
# Then edit .env.local with your actual values
```

### 2. Generate Secrets
```bash
# Generate JWT Secret (32+ characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate NextAuth Secret (32+ characters) 
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Setup
Make sure PostgreSQL is running and create the database:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE crm;
```

### 4. Test Configuration
```bash
# Start development server
npm run dev

# Test API endpoint
curl http://localhost:3000/api/test
```

## 🔒 SECURITY NOTES

- ✅ `.env.local` is in `.gitignore` - never commit it
- ✅ Use strong, unique secrets (32+ characters)
- ✅ Different secrets for development vs production
- ✅ Keep database credentials secure
- ✅ Rotate secrets regularly

## 🐛 TROUBLESHOOTING

### Database Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql
# or
sudo systemctl status postgresql

# Test database connection
psql -U sidharthverma -d crm -h localhost
```

### Missing Variables Error
```bash
# Check loaded environment variables
node -e "require('dotenv').config({path: '.env.local'}); console.log('Loaded vars:', Object.keys(process.env).filter(k => !k.startsWith('npm_')).sort())"
```

### Authentication Issues
- Verify `JWT_SECRET` is at least 32 characters
- Ensure `NEXTAUTH_URL` matches your development URL
- Check `NEXTAUTH_SECRET` is set and strong

## 📝 PRODUCTION NOTES

For production deployment, use these additional/modified variables:

```bash
NODE_ENV=production
DATABASE_URL=postgres://username:password@your-vps-ip:5432/crm
API_BASE_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
DB_SSL=true
```

Refer to `README_VPS_DEPLOYMENT.md` for complete production setup instructions. 