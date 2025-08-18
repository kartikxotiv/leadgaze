# CRM VPS Deployment Guide

This guide will help you deploy your CRM application to a VPS (Virtual Private Server) with PostgreSQL running on the same machine.

## Prerequisites

- A VPS with Ubuntu/Debian/CentOS (minimum 2GB RAM, 2 CPU cores)
- Root or sudo access to the VPS
- Domain name (optional, but recommended)

## Step 1: VPS Server Setup

### 1.1 Connect to your VPS
```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

### 1.2 Update the system
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install required software
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

## Step 2: Database Setup

### 2.1 Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE crm;
CREATE USER crmuser WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE crm TO crmuser;
ALTER USER crmuser CREATEDB;
\q
```

### 2.2 Configure PostgreSQL for connections
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Find and update:
listen_addresses = 'localhost'  # Keep as localhost for security

# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add this line for local connections:
local   crm             crmuser                                 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

## Step 3: Application Deployment

### 3.1 Clone your repository
```bash
cd /opt
sudo git clone your-repository-url crm-app
cd crm-app
sudo chown -R $USER:$USER /opt/crm-app
```

### 3.2 Install dependencies
```bash
npm install
```

### 3.3 Create environment file
```bash
cp .env.example .env.production.local
nano .env.production.local
```

### 3.4 Configure environment variables
```bash
# Production Environment Variables for VPS

# Database Configuration
DATABASE_URL=postgres://crmuser:your-strong-password@localhost:5432/crm

# OR use individual variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm
DB_USER=crmuser
DB_PASSWORD=your-strong-password

# Database Pool Configuration
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000

# Production settings
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
API_BASE_URL=http://your-vps-ip:3000

# If you have a domain
# API_BASE_URL=https://yourdomain.com

# Next.js Configuration
NEXTAUTH_URL=http://your-vps-ip:3000
NEXTAUTH_SECRET=your-nextauth-secret-32-characters-minimum

# Optional: Supabase (if using)
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3.5 Build and setup database
```bash
# Build the application
npm run build

# Setup database tables
npm run db:setup-prod

# Or if you need to reset the database
# NODE_ENV=production npm run db:migrate
```

## Step 4: Process Management with PM2

### 4.1 Create PM2 configuration
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'crm-app',
    script: 'npm',
    args: 'start',
    cwd: '/opt/crm-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production.local'
  }]
}
```

### 4.2 Start the application
```bash
# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 5: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 6: Nginx Reverse Proxy (Optional but Recommended)

### 6.1 Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/crm
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain or VPS IP

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

### 6.2 Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 7: SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Setup auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Testing the Deployment

### 8.1 Check application status
```bash
pm2 status
pm2 logs crm-app
```

### 8.2 Test database connection
```bash
curl http://localhost:3000/api/test
# or
curl http://your-vps-ip:3000/api/test
```

### 8.3 Access the application
Open your browser and navigate to:
- `http://your-vps-ip:3000` (without Nginx)
- `http://your-domain.com` (with Nginx)

## Step 9: Monitoring and Maintenance

### 9.1 Monitor application
```bash
pm2 monit
pm2 logs crm-app --lines 100
```

### 9.2 Database backup
```bash
# Create backup script
nano /opt/backup-crm.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U crmuser -d crm > $BACKUP_DIR/crm_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "crm_backup_*.sql" -mtime +7 -delete
```

```bash
chmod +x /opt/backup-crm.sh

# Add to crontab for daily backups
sudo crontab -e
# Add:
0 2 * * * /opt/backup-crm.sh
```

## Step 10: Updates and Maintenance

### 10.1 Application updates
```bash
cd /opt/crm-app
git pull origin main
npm install
npm run build
pm2 restart crm-app
```

### 10.2 System updates
```bash
sudo apt update && sudo apt upgrade -y
sudo systemctl restart postgresql
pm2 restart crm-app
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify credentials in `.env.production.local`
   - Check database exists: `sudo -u postgres psql -l`

2. **Application won't start**
   - Check PM2 logs: `pm2 logs crm-app`
   - Verify environment file exists and is readable
   - Check Node.js version: `node --version`

3. **Port already in use**
   - Check what's using port 3000: `sudo lsof -i :3000`
   - Change port in ecosystem.config.js if needed

4. **Permission issues**
   - Fix ownership: `sudo chown -R $USER:$USER /opt/crm-app`
   - Check file permissions: `ls -la`

### Performance Optimization

1. **Enable gzip compression in Nginx**
2. **Configure database connection pooling**
3. **Set up monitoring with tools like New Relic or DataDog**
4. **Configure log rotation**

## Security Checklist

- [ ] Use strong passwords for database
- [ ] Configure firewall properly
- [ ] Keep system updated
- [ ] Use SSL certificates
- [ ] Backup database regularly
- [ ] Monitor application logs
- [ ] Use non-root user for application
- [ ] Disable unnecessary services

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full PostgreSQL connection string | `postgres://user:pass@localhost:5432/crm` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `crm` |
| `DB_USER` | Database username | `crmuser` |
| `DB_PASSWORD` | Database password | `your-strong-password` |
| `NODE_ENV` | Environment | `production` |
| `JWT_SECRET` | JWT signing secret | `32+ character string` |
| `API_BASE_URL` | Base URL for API | `http://your-domain.com` |

This guide provides a complete setup for deploying your CRM application on a VPS with PostgreSQL. Follow each step carefully and test thoroughly before going live. 