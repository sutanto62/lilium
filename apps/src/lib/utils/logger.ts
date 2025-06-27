import { browser, dev } from '$app/environment';

// Browser-safe logger using Pino
const browserLogger = {
	debug: (...args: any[]) => {
		if (dev) console.debug(...args);
	},
	info: (...args: any[]) => {
		if (dev) console.info(...args);
	},
	warn: (...args: any[]) => {
		console.warn(...args);
	},
	error: (...args: any[]) => {
		console.error(...args);
	}
};

// Initialize Pino for browser
if (browser) {
	// Use dynamic import to avoid SSR issues
	import('pino').then((pinoModule) => {
		const pino = pinoModule.default;
		const pinoLogger = pino({
			level: dev ? 'debug' : 'info',
			browser: {
				// Use standard console transport for better PM2 compatibility
				transmit: {
					level: 'info',
					send: (level: string, logEvent: any) => {
						// For PM2 compatibility, use standard console methods
						// PM2 captures stdout/stderr, so we need to use console
						const { msg, ...rest } = logEvent;
						const logMessage = `${msg} ${Object.keys(rest).length > 0 ? JSON.stringify(rest) : ''}`;

						switch (level) {
							case 'debug':
								console.debug(logMessage);
								break;
							case 'info':
								console.info(logMessage);
								break;
							case 'warn':
								console.warn(logMessage);
								break;
							case 'error':
								console.error(logMessage);
								break;
							default:
								console.log(logMessage);
						}
					}
				}
			}
		});

		// Replace browser logger methods with Pino methods
		browserLogger.debug = pinoLogger.debug.bind(pinoLogger);
		browserLogger.info = pinoLogger.info.bind(pinoLogger);
		browserLogger.warn = pinoLogger.warn.bind(pinoLogger);
		browserLogger.error = pinoLogger.error.bind(pinoLogger);
	}).catch((error) => {
		// Fallback to console if Pino fails to load
		console.error('Failed to initialize Pino logger:', error);
		// browserLogger already uses console methods, so no change needed
	});
}

// Server-side logger - starts with console and upgrades to Winston
const serverLogger = {
	debug: console.debug,
	info: console.info,
	warn: console.warn,
	error: console.error
};

// Only initialize Winston on the server side
if (!browser) {
	// Use dynamic import to avoid browser bundling issues
	import('winston').then((winston) => {
		const { format, transports } = winston;
		const { combine, timestamp, label, printf, errors } = format;

		const myFormat = printf(({ level, message, label, timestamp, stack }: any) => {
			// Include stack trace for errors
			const stackTrace = stack ? `\n${stack}` : '';
			return `\x1b[90m${timestamp}\x1b[0m [${label}] ${level}: ${message}${stackTrace}`;
		});

		const shortTimestamp = timestamp({
			format: 'MMM DD, YY hh:mm:ss A'
		});

		const level = dev ? 'debug' : 'info';

		const winstonLogger = winston.createLogger({
			level: level,
			format: combine(
				errors({ stack: true }), // Include stack traces
				label({ label: 'lilium' }),
				shortTimestamp,
				myFormat
			),
			transports: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			],
			// Handle uncaught exceptions
			exceptionHandlers: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			],
			// Handle unhandled promise rejections
			rejectionHandlers: [
				new transports.Console({
					format: format.combine(format.colorize(), myFormat)
				})
			]
		});

		// Replace the server logger methods with Winston methods
		serverLogger.debug = winstonLogger.debug.bind(winstonLogger);
		serverLogger.info = winstonLogger.info.bind(winstonLogger);
		serverLogger.warn = winstonLogger.warn.bind(winstonLogger);
		serverLogger.error = winstonLogger.error.bind(winstonLogger);
	}).catch((error) => {
		// Fallback to console if Winston fails to load
		console.error('Failed to initialize Winston logger:', error);
		// serverLogger already uses console methods, so no change needed
	});
}

// Export the appropriate logger based on environment
export const logger = browser ? browserLogger : serverLogger;
