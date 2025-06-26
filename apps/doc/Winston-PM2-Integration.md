# Winston + PM2 Logging Integration Guide

## Overview

This guide explains how Winston logging works with PM2 process management and provides best practices for production logging.

## How It Works

### 1. Winston → PM2 → Log Files

```
Your App → Winston Logger → Console Transport → stdout/stderr → PM2 → Log Files
```

- **Winston** handles log formatting, levels, and transport
- **PM2** captures stdout/stderr and manages log files
- **Console Transport** writes to process.stdout/process.stderr
- **PM2** automatically rotates and manages log files

### 2. Current Setup Analysis

Your current configuration:

- ✅ Winston with console transport
- ✅ PM2 with `merge_logs: true`
- ✅ Proper log formatting with timestamps
- ✅ Error handling with stack traces

## PM2 Log Management

### PM2 Log Commands

```bash
# View real-time logs
pm2 logs lilium-web

# View specific log file
pm2 logs lilium-web --lines 100

# Clear logs
pm2 flush

# Monitor logs with PM2 Plus
pm2 monit
```

### PM2 Log Configuration

Your `ecosystem.config.cjs` settings:

- `merge_logs: true` - Combines stdout/stderr into single log
- `log_date_format: 'YYYY-MM-DD HH:mm:ss Z'` - Timestamp format
- Logs stored in `~/.pm2/logs/` by default

## Winston Best Practices

### 1. Log Levels

```typescript
logger.error('Critical error with stack trace');
logger.warn('Warning message');
logger.info('General information');
logger.debug('Debug info (dev only)');
```

### 2. Structured Logging

```typescript
logger.info('User action', {
	userId: '123',
	action: 'login',
	timestamp: new Date().toISOString()
});
```

### 3. Error Logging

```typescript
try {
	// Some operation
} catch (error) {
	logger.error('Operation failed', {
		error: error.message,
		stack: error.stack,
		context: 'user-service'
	});
}
```

## Production Considerations

### 1. File Transport (Optional)

For additional log persistence, consider adding file transport:

```typescript
// Add to Winston config
new transports.File({
	filename: 'logs/error.log',
	level: 'error'
}),
	new transports.File({
		filename: 'logs/combined.log'
	});
```

### 2. Log Rotation

PM2 handles basic rotation, but for advanced needs:

- Use `winston-daily-rotate-file` for application-level rotation
- Configure PM2 log rotation settings

### 3. Performance

- Winston is async by default
- Console transport is fast for PM2 integration
- Avoid blocking operations in log handlers

## Monitoring & Debugging

### 1. Check Log Output

```bash
# Verify Winston is working
pm2 logs lilium-web --lines 50

# Look for Winston format:
# [lilium] info: Application started
# [lilium] error: Database connection failed
```

### 2. Common Issues

- **No logs appearing**: Check PM2 process status
- **Format issues**: Verify Winston configuration
- **Performance**: Monitor log volume and rotation

### 3. Log Analysis

```bash
# Search for errors
pm2 logs lilium-web | grep "error"

# Count log entries
pm2 logs lilium-web | wc -l

# Monitor in real-time
pm2 logs lilium-web -f
```

## Integration Benefits

1. **Centralized Logging**: All logs in one place via PM2
2. **Structured Format**: Winston provides consistent formatting
3. **Error Handling**: Automatic stack traces and error capture
4. **Environment Awareness**: Different log levels for dev/prod
5. **PM2 Integration**: Seamless process management and logging

## Next Steps

1. Monitor log output in production
2. Consider adding log aggregation (ELK stack, etc.)
3. Set up log alerts for critical errors
4. Implement log retention policies
