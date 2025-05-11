module.exports = {
  apps: [{
    name: 'lilium-staging',
    script: 'build/index.js',
    instances: 1, // Changed from 'max' since we only have 1 vCPU
    exec_mode: 'fork', // Changed to 'fork' since we're using single instance
    node_args: '-r dotenv/config', // svelte not automatically loading .env file
    env: {
      NODE_ENV: 'staging',
      DOTENV_CONFIG_PATH: '.env.staging',
    },
    watch: false, // Disabled watch in production for better performance
    max_memory_restart: '1536M', // Set to 75% of total memory (2GB)
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 5, // Reduced to prevent excessive restarts
    min_uptime: '30s', // Increased to ensure stability
    listen_timeout: 8000, // Increased for Vite build time
    kill_timeout: 5000,
    source_map_support: false, // Disabled in production for better performance
    instance_var: 'INSTANCE_ID',
    wait_ready: true,
    autorestart: true,
    vizion: false, // Disabled git features for better performance,
    log_rotate: {
      max_size: '10M',
      interval: '1d',
      rotateInterval: '0 0 * * 0',
      maxFiles: '4'
    }
  },
  {
    name: 'lilium-production',
    script: 'build/index.js',
    instances: 1,
    exec_mode: 'fork',
    node_args: '-r dotenv/config',
    env: {
      NODE_ENV: 'production',
      DOTENV_CONFIG_PATH: '.env.production'
    },
    watch: false,
    max_memory_restart: '1536M',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 5,
    min_uptime: '30s',
    listen_timeout: 8000,
    kill_timeout: 5000,
    source_map_support: false,
    instance_var: 'INSTANCE_ID',
    wait_ready: true,
    autorestart: true,
    vizion: false,
    log_rotate: {
      max_size: '10M',
      interval: '7d',
      rotateInterval: '0 0 * * 0',
      maxFiles: '4'
    }
  }]
}
