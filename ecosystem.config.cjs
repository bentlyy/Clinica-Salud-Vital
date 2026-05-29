module.exports = {
  apps: [{
    name: 'clinic-api',
    script: 'dist/app.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '500M',
    memory_threshold: 400,
    max_restarts: 5,
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    listen_timeout: 15000,
    kill_timeout: 10000,
    wait_ready: true,
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
    node_args: [
      '--max-old-space-size=400',
      '--max-semi-space-size=16',
      '--optimize-for-size',
    ],
    env_development: {
      NODE_ENV: 'development',
      node_args: [
        '--max-old-space-size=400',
        '--inspect=9229',
      ],
    },
    env_profiling: {
      NODE_ENV: 'development',
      node_args: [
        '--max-old-space-size=512',
        '--inspect=9229',
      ],
    },
  }],
};
