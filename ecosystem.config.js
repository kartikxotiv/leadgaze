module.exports = {
  apps: [{
    name: 'crm-app',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 1, // Can be increased based on CPU cores
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production.local',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
} 