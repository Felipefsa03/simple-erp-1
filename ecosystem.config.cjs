// PM2 Configuration for LuminaFlow Server
// Run with: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [{
    name: 'luminaflow-api',
    script: './backend/server.mjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      API_PORT: 8787,
    },
    env_production: {
      NODE_ENV: 'production',
      API_PORT: 8787,
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 8000,
    kill_timeout: 5000,
  }],
};
