# Pino + PM2 Logging Integration Guide

## Overview

This guide explains how Pino logging works with PM2 process management and provides best practices for production logging.

## How It Works

### 1. Pino → PM2 → Log Files

```
Your App → Pino Logger → Console Transport → stdout/stderr → PM2 → Log Files
```

- **Pino** handles structured logging, levels, and performance
- **PM2** captures stdout/stderr and manages log files
- **Console Transport** writes to process.stdout/process.stderr
- **PM2** automatically rotates and manages log files

### 2. Current Setup Analysis

Your current configuration:

- ✅ Pino for browser environments
- ✅ Winston for server-side logging
- ✅ PM2 with `merge_logs: true`
- ✅ Proper log formatting with timestamps
- ✅ Error handling with stack traces

## Pino vs Winston Comparison

| Feature                | Pino                  | Winston                |
| ---------------------- | --------------------- | ---------------------- |
| **Performance**        | Extremely fast (JSON) | Good (formatted)       |
| **Structured Logging** | Native JSON           | Requires configuration |
| **Bundle Size**        | Smaller               | Larger                 |
| **PM2 Integration**    | Excellent             | Excellent              |
| **Browser Support**    | Excellent             | Limited                |

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

## Pino Best Practices

### 1. Log Levels

```typescript
logger.error('Critical error with stack trace');
logger.warn('Warning message');
logger.info('General information');
logger.debug('Debug info (dev only)');
```

### 2. Structured Logging (Pino's Strength)

```typescript
logger.info('User action', {
	userId: '123',
	action: 'login',
	timestamp: new Date().toISOString(),
	userAgent: navigator.userAgent
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
		context: 'user-service',
		userId: user.id
	});
}
```

## Browser vs Server Logging

### Browser (Pino)

- Uses Pino with console transport
- Structured JSON logging
- PM2 captures via console methods
- Development-friendly formatting

### Server (Winston)

- Uses Winston with console transport
- Formatted text logging
- PM2 captures via console methods
- Production-optimized

## Production Considerations

### 1. Performance Benefits

Pino advantages:

- **Faster**: JSON serialization is faster than string formatting
- **Smaller**: Smaller bundle size in browser
- **Structured**: Better for log aggregation systems

### 2. Log Analysis

```bash
# Search for errors
pm2 logs lilium-web | grep "error"

# Count log entries
pm2 logs lilium-web | wc -l

# Monitor in real-time
pm2 logs lilium-web -f

# Parse JSON logs (if using file transport)
pm2 logs lilium-web | jq '.'
```

### 3. Log Aggregation

For advanced setups, consider:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log collection and forwarding
- **Cloud Logging**: AWS CloudWatch, Google Cloud Logging

## Monitoring & Debugging

### 1. Check Log Output

```bash
# Verify Pino is working in browser
pm2 logs lilium-web --lines 50

# Look for Pino format:
# {"level":30,"time":1234567890,"msg":"User logged in","userId":"123"}
```

### 2. Common Issues

- **No logs appearing**: Check PM2 process status
- **Format issues**: Verify Pino configuration
- **Performance**: Monitor log volume and rotation

### 3. Browser Console vs PM2

- **Development**: Logs appear in browser console
- **Production**: Logs captured by PM2 and stored in files
- **Both**: Use same logger API

## Integration Benefits

1. **Unified API**: Same logger interface for browser and server
2. **Structured Logging**: JSON format for better analysis
3. **Performance**: Pino's speed benefits
4. **PM2 Integration**: Seamless process management and logging
5. **Environment Awareness**: Different log levels for dev/prod

## Next Steps

1. Monitor log output in production
2. Consider adding log aggregation (ELK stack, etc.)
3. Set up log alerts for critical errors
4. Implement log retention policies
5. Consider migrating server-side to Pino for consistency

## Migration Path

If you want to migrate server-side to Pino:

```typescript
// Replace Winston with Pino on server
import pino from 'pino';

const logger = pino({
	level: dev ? 'debug' : 'info',
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true
		}
	}
});
```

This would provide:

- Consistent logging across browser and server
- Better performance
- Smaller bundle size
- Unified structured logging
