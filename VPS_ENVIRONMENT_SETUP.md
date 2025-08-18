# VPS Environment Variables Setup (IP Address, No Domain)

This guide shows you how to set up environment variables for your VPS deployment using IP address without a domain.

## 🌐 VPS Environment Configuration

Your VPS IP address is: **89.116.134.1**

## 📋 VPS .env.production.local Template

Create this file on your VPS at `/opt/crm-app/.env.production.local`:

```bash
# =============================================================================
# CRM APPLICATION - VPS PRODUCTION ENVIRONMENT (IP ADDRESS, NO DOMAIN)
# =============================================================================

# Database Configuration (REQUIRED)
# Use localhost since PostgreSQL is on the same VPS
DATABASE_URL=postgres://crmuser:YOUR_STRONG_DB_PASSWORD@localhost:5432/crm

# Application Settings (REQUIRED)
NODE_ENV=production
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_AT_LEAST_64_CHARACTERS_FOR_PRODUCTION
API_BASE_URL=http://89.116.134.1:3000
PORT=3000

# Authentication (REQUIRED)
NEXTAUTH_URL=http://89.116.134.1:3000
NEXTAUTH_SECRET=YOUR_SUPER_SECURE_NEXTAUTH_SECRET_AT_LEAST_64_CHARACTERS
APP_URL=http://89.116.134.1:3000

# Database Pool Settings (PRODUCTION OPTIMIZED)
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
DB_SSL=false

# Supabase (OPTIONAL - only if using)
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anonymous-key

# Email Configuration (OPTIONAL - only if using email features)
# EMAIL_FROM=your-email@gmail.com
# EMAIL_FROM_NAME=CRM System
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# GMAIL_USER=your-email@gmail.com

# Production Settings
DEBUG=false
LOG_LEVEL=info
```

## 🔧 Step-by-Step VPS Setup

### 1. Connect to Your VPS
```bash
ssh root@89.116.134.1
# or
ssh your-username@89.116.134.1
```

### 2. Navigate to App Directory
```bash
cd /opt/crm-app
```

### 3. Create Environment File
```bash
nano .env.production.local
```

### 4. Fill in Your Specific Values

Replace these placeholders with your actual values:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `89.116.134.1` | Your VPS IP address | `89.116.134.1` |
| `YOUR_STRONG_DB_PASSWORD` | Strong PostgreSQL password | `MyStr0ng#DB$Pass2024!` |
| `YOUR_SUPER_SECURE_JWT_SECRET_AT_LEAST_64_CHARACTERS_FOR_PRODUCTION` | 64+ character JWT secret | (generate with command below) |
| `YOUR_SUPER_SECURE_NEXTAUTH_SECRET_AT_LEAST_64_CHARACTERS` | 64+ character NextAuth secret | (generate with command below) |

### 5. Generate Secure Secrets on VPS
```bash
# Generate strong JWT Secret (64 characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate strong NextAuth Secret (64 characters)
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

## 📝 Example VPS Configuration

Here's a complete example with your VPS IP address `89.116.134.1`:

```bash
# Database Configuration
DATABASE_URL=postgres://crmuser:MyStr0ng#DB$Pass2024!@localhost:5432/crm

# Application Settings
NODE_ENV=production
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
API_BASE_URL=http://89.116.134.1:3000
PORT=3000

# Authentication
NEXTAUTH_URL=http://89.116.134.1:3000
NEXTAUTH_SECRET=x1y2z3a4b5c6d7e8f9012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
APP_URL=http://89.116.134.1:3000

# Database Pool Settings
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000
DB_SSL=false

# Production Settings
DEBUG=false
LOG_LEVEL=info
```

## 🗄️ Database User Setup

Create the PostgreSQL user and database on your VPS:

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user (run these SQL commands)
CREATE DATABASE crm;
CREATE USER crmuser WITH ENCRYPTED PASSWORD 'MyStr0ng#DB$Pass2024!';
GRANT ALL PRIVILEGES ON DATABASE crm TO crmuser;
ALTER USER crmuser CREATEDB;
\q
```

## 🚀 Deployment Commands

After setting up environment variables:

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Setup database tables
npm run db:setup-prod

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔍 Testing Your Setup

### 1. Test Database Connection
```bash
# Test PostgreSQL connection
psql -U crmuser -d crm -h localhost

# Test application database connection
curl http://89.116.134.1:3000/api/test
```

### 2. Test Application
```bash
# Check if app is running
pm2 status

# View logs
pm2 logs crm-app

# Test API endpoints
curl http://89.116.134.1:3000/api/test
curl http://89.116.134.1:3000/api/organizations
```

### 3. Access from Browser
Open your browser and navigate to:
- `http://89.116.134.1:3000`

## 🔒 Security Considerations (IP-based deployment)

Since you're using IP without HTTPS:

### ⚠️ Security Warnings
- **Data transmitted unencrypted** over HTTP
- **No SSL/TLS protection** for sensitive information
- **Credentials visible** in network traffic
- **Not recommended for production** with real user data

### 🛡️ Minimal Security Measures
```bash
# Configure firewall
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw allow from YOUR_TRUSTED_IP to any port 3000
sudo ufw enable

# Use strong passwords
# Limit access by IP if possible
# Monitor logs regularly
```

## 🌍 Network Access Configuration

### Allow External Access
Make sure your VPS allows connections on port 3000:

```bash
# Check if port is open
sudo netstat -tlnp | grep 3000

# If using nginx as reverse proxy, configure:
sudo nano /etc/nginx/sites-available/crm
```

### Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name 89.116.134.1;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Common Issues & Solutions

### Issue: Can't connect from outside
**Solution:**
```bash
# Check VPS firewall
sudo ufw status

# Check application is binding to all interfaces
# In ecosystem.config.js, ensure no host binding to localhost only
```

### Issue: Database connection failed
**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists and user has permissions
sudo -u postgres psql -c "\l"
sudo -u postgres psql -c "\du"
```

### Issue: Environment variables not loaded
**Solution:**
```bash
# Check file exists and has correct name
ls -la /opt/crm-app/.env.production.local

# Check PM2 is loading the env file
pm2 show crm-app
```

## 🔄 Future Upgrade to Domain + HTTPS

When you get a domain, you'll need to update:

```bash
# Update these variables in .env.production.local
API_BASE_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
APP_URL=https://yourdomain.com

# Add SSL certificate with certbot
sudo certbot --nginx -d yourdomain.com
```

This setup will get your CRM running on your VPS using the IP address without a domain! 🚀 