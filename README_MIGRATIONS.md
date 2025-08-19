# 🚀 Sequelize Migration Setup for CRM

## Overview

Your CRM project has been successfully migrated from `sequelize.sync()` to a **proper migration-based system**. This provides better version control, rollback capabilities, and production-safe database changes.

## 📁 New Structure

```
├── .sequelizerc              # Sequelize CLI configuration
├── config/
│   └── database.js           # Database connection config
├── migrations/               # Migration files (ordered by timestamp)
│   ├── 20240101000001-create-enums.js
│   ├── 20240101000002-create-functions.js
│   ├── 20240101000003-create-users-config.js
│   ├── 20240101000004-create-organization-config.js
│   ├── 20240101000005-create-organization-roles.js
│   ├── 20240101000006-create-leads-config.js
│   ├── 20240101000007-create-users.js
│   ├── 20240101000008-create-organizations.js
│   ├── 20240101000009-add-organization-foreign-key-to-users.js
│   ├── 20240101000010-create-user-organizations.js
│   ├── 20240101000011-create-user-invitations.js
│   ├── 20240101000012-create-authentication-tables.js
│   ├── 20240101000013-create-leads.js
│   ├── 20240101000014-create-deals-and-activities.js
│   ├── 20240101000015-create-remaining-tables.js
│   └── 20240101000016-create-indexes.js
└── seeders/                  # Seed files (for initial data)
```

## 🗄️ Database Schema Coverage

### ✅ Complete Migration Coverage

**22 Tables Created:**
- users, organizations, user_organizations
- organization_config, users_config, leads_config
- organization_roles, organization_workspaces
- user_invitations, user_sessions
- email_otps, email_verifications, password_reset_tokens
- leads, lead_scores, deals, activities, tasks
- notifications, automation_rules, scoring_rules
- org_user_accounts

**24 ENUM Types:**
- All custom PostgreSQL ENUMs from your schema
- activity_type, deal_stage, task_status, etc.

**PostgreSQL Functions & Triggers:**
- `prt_sync_reset_token()` function
- `update_updated_at_column()` function
- Trigger for password reset token sync

**90+ Database Indexes:**
- Performance indexes on all frequently queried columns
- Unique indexes for data integrity
- Composite indexes for complex queries

**All Constraints:**
- Foreign key relationships
- Check constraints for data validation
- Unique constraints for business rules

## 🚀 Usage Commands

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Undo last migration
npm run db:migrate:undo

# Undo all migrations (⚠️ DESTRUCTIVE)
npm run db:migrate:undo:all
```

### Database Management

```bash
# Create database
npm run db:create

# Drop database (⚠️ DESTRUCTIVE)
npm run db:drop

# Run seeds
npm run db:seed

# Undo all seeds
npm run db:seed:undo:all
```

## 🔄 Migration Order

Migrations run in strict dependency order:

1. **Extensions & ENUMs** - PostgreSQL extensions and custom types
2. **Functions** - Database functions and triggers  
3. **Config Tables** - Configuration tables (no dependencies)
4. **Core Tables** - Users and organizations
5. **Relationship Tables** - User-organization relationships
6. **Auth Tables** - Session and security tables
7. **Business Tables** - Leads, deals, activities, tasks
8. **Indexes** - Performance indexes

## ⚠️ Important Notes

### Migration Best Practices

1. **Never edit existing migrations** - Create new ones for changes
2. **Always test migrations** in development first
3. **Backup production** before running migrations
4. **Review migration status** before and after running

### Production Deployment

```bash
# 1. Check current status
npm run db:migrate:status

# 2. Run migrations
npm run db:migrate

# 3. Verify completion
npm run db:migrate:status
```

### Rollback Strategy

```bash
# Rollback last migration
npm run db:migrate:undo

# Check what was rolled back
npm run db:migrate:status
```

## 🆚 Differences from Old System

| Old System (`sync()`) | New System (Migrations) |
|----------------------|---------------------------|
| ❌ No version control | ✅ Full version control |
| ❌ No rollback | ✅ Rollback capability |
| ❌ Data loss risk | ✅ Production safe |
| ❌ No change tracking | ✅ Complete change history |
| ❌ Team sync issues | ✅ Team synchronized |

## 🔧 Troubleshooting

### Common Issues

**Migration fails:**
```bash
# Check the error, fix the issue, then:
npm run db:migrate:undo
# Fix the migration file
npm run db:migrate
```

**Database out of sync:**
```bash
# Check status
npm run db:migrate:status
# Manual fix may be needed
```

**Environment issues:**
- Verify `.env` database credentials
- Check `config/database.js` settings
- Ensure database exists and is accessible

## 🚀 Next Steps

1. **Remove old sync scripts** from your `scripts/` directory
2. **Update your models** to work without sync calls
3. **Create seed files** for initial data
4. **Set up CI/CD** to run migrations automatically

## 📝 Creating New Migrations

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-feature

# Create new seed
npx sequelize-cli seed:generate --name demo-users
```

---

**🎉 Congratulations!** Your CRM now has a professional, production-ready database migration system. No more `sequelize.sync()` worries! 